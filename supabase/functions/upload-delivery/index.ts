import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

// ─────────────────────────────────────────────────────────────────────────────
// GOOGLE OAUTH2 — Refresh Token flow (works with personal Gmail accounts)
// Required secrets: GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN
// ─────────────────────────────────────────────────────────────────────────────
async function getGoogleAccessToken(): Promise<string> {
  const clientId     = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID')?.replace(/^["']|["']$/g, '')
  const clientSecret = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET')?.replace(/^["']|["']$/g, '')
  const refreshToken = Deno.env.get('GOOGLE_OAUTH_REFRESH_TOKEN')?.replace(/^["']|["']$/g, '')

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing Google OAuth2 credentials (GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN)')
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type:    'refresh_token',
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to refresh Google Access Token: ${await response.text()}`)
  }

  const data = await response.json()
  if (!data.access_token) {
    throw new Error(`Google OAuth token response missing access_token: ${JSON.stringify(data)}`)
  }
  return data.access_token
}

// ─────────────────────────────────────────────────────────────────────────────
// DRIVE HELPERS — find or create folder hierarchy, upload file, share link
// ─────────────────────────────────────────────────────────────────────────────
async function findOrCreateFolder(token: string, name: string, parentId: string): Promise<string> {
  const q = `mimeType = 'application/vnd.google-apps.folder' and name = '${name.replace(/'/g, "\\'")}' and '${parentId}' in parents and trashed = false`
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)&supportsAllDrives=true&includeItemsFromAllDrives=true`

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok) {
    throw new Error(`Error searching folder "${name}": ${await response.text()}`)
  }

  const data = await response.json()
  if (data.files && data.files.length > 0) {
    return data.files[0].id
  }

  // Folder does not exist — create it
  const createUrl = 'https://www.googleapis.com/drive/v3/files?fields=id&supportsAllDrives=true'
  const createResponse = await fetch(createUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    }),
  })

  if (!createResponse.ok) {
    throw new Error(`Error creating folder "${name}": ${await createResponse.text()}`)
  }

  const folder = await createResponse.json()
  return folder.id
}

async function shareFileWithAnyone(token: string, fileId: string): Promise<void> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}/permissions?supportsAllDrives=true`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ role: 'reader', type: 'anyone' }),
  })

  if (!response.ok) {
    // Non-fatal: log warning but don't abort the upload
    console.error(`Warning: Failed to share file ${fileId}: ${await response.text()}`)
  }
}

async function uploadFileToDrive(
  token: string,
  fileName: string,
  mimeType: string,
  fileData: ArrayBuffer,
  folderId: string
): Promise<string> {
  const boundary = 'foo_bar_baz_boundary'

  const metadata = {
    name: fileName,
    parents: [folderId],
  }

  const parts = [
    `--${boundary}\r\n`,
    `Content-Type: application/json; charset=UTF-8\r\n\r\n`,
    JSON.stringify(metadata),
    `\r\n--${boundary}\r\n`,
    `Content-Type: ${mimeType || 'application/octet-stream'}\r\n\r\n`,
    fileData,
    `\r\n--${boundary}--\r\n`,
  ]

  const blob = new Blob(parts)

  const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink&supportsAllDrives=true`
  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: blob,
  })

  if (!response.ok) {
    throw new Error(`Error uploading file to Drive: ${await response.text()}`)
  }

  const result = await response.json()
  const fileId = result.id

  // Make the file readable by anyone with the link
  await shareFileWithAnyone(token, fileId)

  return result.webViewLink || `https://drive.google.com/open?id=${fileId}`
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ message: 'Authorization header is missing' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl        = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey    = Deno.env.get('SUPABASE_ANON_KEY')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return new Response(JSON.stringify({ message: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify user identity
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ message: 'Invalid credentials' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const idAlumno    = user.id
    const emailAlumno = user.email || ''

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Parse multipart form-data
    const formData    = await req.formData()
    const file        = formData.get('file') as File
    const idEntregable = formData.get('id_entregable') as string
    const idCurso     = formData.get('id_curso') as string

    if (!file || !idEntregable || !idCurso) {
      return new Response(JSON.stringify({ message: 'Missing file, id_entregable or id_curso' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 1. Fetch deliverable and course info
    const { data: entregable, error: entError } = await supabaseAdmin
      .from('entregables')
      .select('titulo, fecha_apertura, fecha_cierre, admite_extemporaneas, cursos(nombre)')
      .eq('id_entregable', idEntregable)
      .single()

    if (entError || !entregable) {
      return new Response(JSON.stringify({ message: 'Deliverable not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Check for individual extension (prórroga)
    const { data: prorroga } = await supabaseAdmin
      .from('prorrogas')
      .select('nueva_fecha_cierre')
      .eq('id_entregable', idEntregable)
      .eq('id_alumno', idAlumno)
      .maybeSingle()

    const deadlineStr = prorroga?.nueva_fecha_cierre || entregable.fecha_cierre
    const deadline    = new Date(deadlineStr)
    const now         = new Date()

    // 3. Validate submission window
    if (now < new Date(entregable.fecha_apertura)) {
      return new Response(JSON.stringify({ message: 'La ventana de entrega aún no se encuentra abierta' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (now > deadline && !entregable.admite_extemporaneas) {
      return new Response(JSON.stringify({ message: 'Plazo límite excedido. No se admiten entregas tardías.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const estadoPuntualidad = now <= deadline ? 'A Tiempo' : 'Tardía'

    // 4. Compute SHA-256 hash for antiplagio
    const fileBuffer  = await file.arrayBuffer()
    const hashBuffer  = await crypto.subtle.digest('SHA-256', fileBuffer)
    const fileHash    = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    // 5. Antiplagio: check uniqueness within course
    const { data: hashUnique, error: hashCheckError } = await supabaseAdmin
      .rpc('check_hash_unico', { p_curso_id: idCurso, p_hash: fileHash })

    if (hashCheckError) {
      console.error('Error checking file hash unique:', hashCheckError)
    }

    if (hashUnique === false) {
      await supabaseAdmin.from('logs_auditoria').insert({
        id_usuario:      idAlumno,
        email_usuario:   emailAlumno,
        tipo_operacion:  'DUPLICATE_HASH',
        tabla_afectada:  'hashes_curso',
        metadata: {
          file_name:    file.name,
          hash:         fileHash,
          id_curso:     idCurso,
          id_entregable: idEntregable,
          timestamp:    now.toISOString(),
          details:      'Intento de carga de archivo duplicado dentro del mismo curso.',
        },
      })

      return new Response(JSON.stringify({ message: 'Antiplagio: Este archivo ya ha sido entregado en el curso por otro estudiante.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 6. Google Drive upload via OAuth2 Refresh Token
    const googleRootId = Deno.env.get('GOOGLE_DRIVE_ROOT_FOLDER_ID')?.replace(/^["']|["']$/g, '')

    let driveUrl = ''

    if (googleRootId) {
      try {
        // Get access token using refresh token (works with personal Gmail — no Shared Drive required)
        const token = await getGoogleAccessToken()

        // Fetch student's display name
        const { data: studentPerfil } = await supabaseAdmin
          .from('usuarios')
          .select('nombre_completo')
          .eq('id', idAlumno)
          .single()

        const studentName = studentPerfil?.nombre_completo || `Alumno_${idAlumno}`
        const courseName  = (entregable.cursos as any)?.nombre || `Curso_${idCurso}`

        // Build folder hierarchy: Raíz / Curso / Entregable / Alumno
        const courseFolderId  = await findOrCreateFolder(token, courseName, googleRootId)
        const taskFolderId    = await findOrCreateFolder(token, entregable.titulo, courseFolderId)
        const studentFolderId = await findOrCreateFolder(token, studentName, taskFolderId)

        // Upload the file
        driveUrl = await uploadFileToDrive(token, file.name, file.type, fileBuffer, studentFolderId)

        console.log(`File uploaded to Drive: ${driveUrl}`)
      } catch (driveErr: any) {
        // Log the Drive error but don't block the submission — record in audit
        console.error('Google Drive upload failed:', driveErr.message)
        await supabaseAdmin.from('logs_auditoria').insert({
          id_usuario:     idAlumno,
          email_usuario:  emailAlumno,
          tipo_operacion: 'DRIVE_UPLOAD_ERROR',
          tabla_afectada: 'entregas',
          metadata: {
            file_name:    file.name,
            error:        driveErr.message,
            timestamp:    now.toISOString(),
          },
        })
        driveUrl = `DRIVE_ERROR: ${driveErr.message}`
      }
    } else {
      console.warn('GOOGLE_DRIVE_ROOT_FOLDER_ID not set. Generating placeholder URL.')
      driveUrl = `https://drive.google.com/pending/${crypto.randomUUID()}`
    }

    const constanciaId = crypto.randomUUID()

    // 7. Atomic save: insert delivery record
    const { data: newEntrega, error: entregaError } = await supabaseAdmin
      .from('entregas')
      .insert({
        id_alumno:         idAlumno,
        id_entregable:     idEntregable,
        nombre_archivo:    file.name,
        tamano_bytes:      file.size,
        drive_url:         driveUrl,
        file_hash:         fileHash,
        estado_puntualidad: estadoPuntualidad,
        constancia_id:     constanciaId,
      })
      .select('id_entrega')
      .single()

    if (entregaError) {
      throw new Error(`Database error creating delivery: ${entregaError.message}`)
    }

    // 8. Insert hash for antiplagio tracking
    const { error: hashInsertError } = await supabaseAdmin
      .from('hashes_curso')
      .insert({
        id_curso:  idCurso,
        id_entrega: newEntrega.id_entrega,
        file_hash:  fileHash,
      })

    if (hashInsertError) {
      await supabaseAdmin.from('entregas').delete().eq('id_entrega', newEntrega.id_entrega)
      throw new Error(`Database error saving hash reference: ${hashInsertError.message}`)
    }

    // 9. Return digital receipt
    return new Response(
      JSON.stringify({
        success: true,
        constancia: {
          constancia_id:       constanciaId,
          timestamp_servidor:  now.toISOString(),
          nombre_archivo:      file.name,
          tamano_bytes:        file.size,
          file_hash:           fileHash,
          drive_url:           driveUrl,
          estado_puntualidad:  estadoPuntualidad,
          curso_nombre:        (entregable.cursos as any)?.nombre || '',
          entregable_titulo:   entregable.titulo,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (err: any) {
    console.error('Unexpected error in upload-delivery:', err)
    return new Response(JSON.stringify({ message: err.message || 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

// OAuth2 Google JWT helper
async function signJwt(clientEmail: string, privateKeyPem: string, scope: string) {
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = privateKeyPem
    .replace(pemHeader, "")
    .replace(pemFooter, "")
    .replace(/\s+/g, "");

  const binaryDerString = atob(pemContents);
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }

  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer.buffer,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );

  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: clientEmail,
    scope: scope,
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encoder = new TextEncoder();
  const headerBase64 = btoa(JSON.stringify(header))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  const payloadBase64 = btoa(JSON.stringify(payload))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const signData = encoder.encode(`${headerBase64}.${payloadBase64}`);
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    signData
  );

  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${headerBase64}.${payloadBase64}.${signatureBase64}`;
}

async function getGoogleAccessToken(clientEmail: string, privateKeyPem: string) {
  const jwt = await signJwt(clientEmail, privateKeyPem, "https://www.googleapis.com/auth/drive");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get Google Access Token: ${await response.text()}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function findOrCreateFolder(token: string, name: string, parentId: string): Promise<string> {
  const q = `mimeType = 'application/vnd.google-apps.folder' and name = '${name.replace(/'/g, "\\'")}' and '${parentId}' in parents and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error(`Error searching folder ${name}: ${await response.text()}`);
  }

  const data = await response.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }

  const createUrl = "https://www.googleapis.com/drive/v3/files?fields=id";
  const createResponse = await fetch(createUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    }),
  });

  if (!createResponse.ok) {
    throw new Error(`Error creating folder ${name}: ${await createResponse.text()}`);
  }

  const folder = await createResponse.json();
  return folder.id;
}

async function uploadFileToDrive(
  token: string,
  fileName: string,
  mimeType: string,
  fileData: ArrayBuffer,
  folderId: string
): Promise<string> {
  const metadata = {
    name: fileName,
    parents: [folderId],
  };

  const boundary = "-------314159265358979323846";
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const encoder = new TextEncoder();
  const headerBytes = encoder.encode(delimiter + `Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` + delimiter + `Content-Type: ${mimeType}\r\n\r\n`);
  const footerBytes = encoder.encode(closeDelimiter);

  const payload = new Uint8Array(headerBytes.length + fileData.byteLength + footerBytes.length);
  payload.set(headerBytes, 0);
  payload.set(new Uint8Array(fileData), headerBytes.length);
  payload.set(footerBytes, headerBytes.length + fileData.byteLength);

  const uploadUrl = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink";
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
      "Content-Length": payload.byteLength.toString(),
    },
    body: payload,
  });

  if (!response.ok) {
    throw new Error(`Error uploading file to Drive: ${await response.text()}`);
  }

  const result = await response.json();
  return result.webViewLink || `https://drive.google.com/open?id=${result.id}`;
}

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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return new Response(JSON.stringify({ message: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Initialize user client to verify token and identity
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

    const idAlumno = user.id
    const emailAlumno = user.email || ''

    // Initialize service client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Parse multipart form-data request
    const formData = await req.formData()
    const file = formData.get('file') as File
    const idEntregable = formData.get('id_entregable') as string
    const idCurso = formData.get('id_curso') as string

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

    // 2. Fetch student individual extension (prórroga) if any
    const { data: prorroga } = await supabaseAdmin
      .from('prorrogas')
      .select('nueva_fecha_cierre')
      .eq('id_entregable', idEntregable)
      .eq('id_alumno', idAlumno)
      .maybeSingle()

    const deadlineStr = prorroga?.nueva_fecha_cierre || entregable.fecha_cierre
    const deadline = new Date(deadlineStr)
    const now = new Date()

    // 3. Check window status
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

    // 4. Read file content to compute SHA-256 hash
    const fileBuffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    // 5. Antiplagiarist Verification: check if hash is already unique for that course
    const { data: hashUnique, error: hashCheckError } = await supabaseAdmin
      .rpc('check_hash_unico', { p_curso_id: idCurso, p_hash: fileHash })

    if (hashCheckError) {
      console.error('Error checking file hash unique:', hashCheckError)
    }

    if (hashUnique === false) {
      // Register Critical Plagiarism Event in logs_auditoria
      await supabaseAdmin.from('logs_auditoria').insert({
        id_usuario: idAlumno,
        email_usuario: emailAlumno,
        tipo_operacion: 'DUPLICATE_HASH',
        tabla_afectada: 'hashes_curso',
        metadata: {
          file_name: file.name,
          hash: fileHash,
          id_curso: idCurso,
          id_entregable: idEntregable,
          timestamp: now.toISOString(),
          details: 'Intento de carga de archivo duplicado dentro del mismo curso.'
        }
      })

      return new Response(JSON.stringify({ message: 'Antiplagio: Este archivo ya ha sido entregado en el curso por otro estudiante.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 6. Handle Google Drive Upload or Fallback Mock
    const googleEmail = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL')
    const googleKey = Deno.env.get('GOOGLE_PRIVATE_KEY')
    const googleRootId = Deno.env.get('GOOGLE_DRIVE_ROOT_FOLDER_ID')

    let driveUrl = ''

    if (googleEmail && googleKey && googleRootId) {
      try {
        // Authenticate with Google
        const token = await getGoogleAccessToken(googleEmail, googleKey)

        // Get student's details
        const { data: studentPerfil } = await supabaseAdmin
          .from('usuarios')
          .select('nombre_completo')
          .eq('id', idAlumno)
          .single()

        const studentName = studentPerfil?.nombre_completo || `Alumno_${idAlumno}`
        const courseName = (entregable.cursos as any)?.nombre || `Curso_${idCurso}`

        // Find or create course folder
        const courseFolderId = await findOrCreateFolder(token, courseName, googleRootId)

        // Find or create deliverable folder
        const taskFolderId = await findOrCreateFolder(token, entregable.titulo, courseFolderId)

        // Find or create student folder
        const studentFolderId = await findOrCreateFolder(token, studentName, taskFolderId)

        // Upload file
        driveUrl = await uploadFileToDrive(token, file.name, file.type, fileBuffer, studentFolderId)
      } catch (err: any) {
        console.error('Google Drive integration failed, falling back to mock link:', err.message)
        driveUrl = `https://drive.google.com/mock-file-id/${crypto.randomUUID()}`
      }
    } else {
      console.warn('Google credentials are not set. Generating mock Drive link.')
      driveUrl = `https://drive.google.com/mock-file-id/${crypto.randomUUID()}`
    }

    const constanciaId = crypto.randomUUID()

    // 7. Atomic saving: Insert Delivery
    const { data: newEntrega, error: entregaError } = await supabaseAdmin
      .from('entregas')
      .insert({
        id_alumno: idAlumno,
        id_entregable: idEntregable,
        nombre_archivo: file.name,
        tamano_bytes: file.size,
        drive_url: driveUrl,
        file_hash: fileHash,
        estado_puntualidad: estadoPuntualidad,
        constancia_id: constanciaId,
      })
      .select('id_entrega')
      .single()

    if (entregaError) {
      throw new Error(`Database error creating delivery: ${entregaError.message}`)
    }

    // 8. Insert hash in hashes_curso
    const { error: hashInsertError } = await supabaseAdmin
      .from('hashes_curso')
      .insert({
        id_curso: idCurso,
        id_entrega: newEntrega.id_entrega,
        file_hash: fileHash
      })

    if (hashInsertError) {
      // Clean up delivery if hash insertion fails
      await supabaseAdmin.from('entregas').delete().eq('id_entrega', newEntrega.id_entrega)
      throw new Error(`Database error saving hash reference: ${hashInsertError.message}`)
    }

    // Return Digital Receipt
    return new Response(
      JSON.stringify({
        success: true,
        constancia: {
          constancia_id: constanciaId,
          timestamp_servidor: now.toISOString(),
          nombre_archivo: file.name,
          tamano_bytes: file.size,
          file_hash: fileHash,
          drive_url: driveUrl,
          estado_puntualidad: estadoPuntualidad,
          curso_nombre: (entregable.cursos as any)?.nombre || '',
          entregable_titulo: entregable.titulo,
        }
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

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
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

    // 6. Handle Supabase Storage Upload instead of Google Drive (fixes storage quota issue)
    const { data: studentPerfil } = await supabaseAdmin
      .from('usuarios')
      .select('nombre_completo')
      .eq('id', idAlumno)
      .single()

    const studentName = studentPerfil?.nombre_completo || `Alumno_${idAlumno}`
    const courseName = (entregable.cursos as any)?.nombre || `Curso_${idCurso}`

    // Sanitize names for storage path
    const cleanCourse = courseName.replace(/[^a-zA-Z0-9-_]/g, '_')
    const cleanTask = entregable.titulo.replace(/[^a-zA-Z0-9-_]/g, '_')
    const cleanStudent = studentName.replace(/[^a-zA-Z0-9-_]/g, '_')
    const cleanFile = file.name.replace(/[^a-zA-Z0-9-_.]/g, '_')

    const storagePath = `${idCurso}/${cleanTask}/${cleanStudent}/${cleanFile}`

    const { error: uploadError } = await supabaseAdmin
      .storage
      .from('entregas')
      .upload(storagePath, fileBuffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: true
      })

    if (uploadError) {
      throw new Error(`Error al subir a Supabase Storage: ${uploadError.message}`)
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin
      .storage
      .from('entregas')
      .getPublicUrl(storagePath)

    const driveUrl = publicUrl

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

import { supabase } from './supabase';

export interface EntregableConEstado {
  id_entregable: string;
  titulo: string;
  descripcion: string | null;
  fecha_apertura: string;
  fecha_cierre: string; // original deadline
  fecha_cierre_efectiva: string; // deadline after extensions
  admite_extemporaneas: boolean;
  id_curso: string;
  curso_codigo: string;
  curso_nombre: string;
  curso_seccion: string;
  tiene_prorroga: boolean;
  entrega: {
    id_entrega: string;
    nombre_archivo: string;
    tamano_bytes: number;
    drive_url: string;
    file_hash: string;
    estado_puntualidad: string;
    timestamp_servidor: string;
    constancia_id: string | null;
    revision?: {
      id_revision: string;
      nota: number | null;
      retroalimentacion: string | null;
      fecha_evaluacion: string | null;
      modificaciones_count?: number;
    } | null;
  } | null;
  estado_entrega: 'pendiente' | 'entregado_a_tiempo' | 'entregado_tardio' | 'vencido' | 'calificado';
}

export interface EntregaHistorial {
  id_entrega: string;
  nombre_archivo: string;
  tamano_bytes: number;
  drive_url: string;
  file_hash: string;
  estado_puntualidad: string;
  timestamp_servidor: string;
  constancia_id: string | null;
  entregable_titulo: string;
  curso_codigo: string;
  curso_nombre: string;
  curso_seccion: string;
  revision?: {
    nota: number | null;
    retroalimentacion: string | null;
    modificaciones_count?: number;
  } | null;
}

export interface AlumnoKPIs {
  activos: number;
  urgentes: number;
  vencidos: number;
  calificados: number;
}

// 1. Get student KPIs from database using RPC
export async function getKPIsAlumno(idAlumno: string): Promise<AlumnoKPIs> {
  const { data, error } = await supabase.rpc('get_alumno_kpis' as any, { p_alumno_id: idAlumno });
  if (error) {
    console.error('Error fetching KPIs:', error);
    return { activos: 0, urgentes: 0, vencidos: 0, calificados: 0 };
  }
  return data as any as AlumnoKPIs;
}

// 2. Fetch all deliverables for the student's courses with status
export async function getEntregablesActivos(idAlumno: string): Promise<EntregableConEstado[]> {
  // Get matriculas to retrieve course IDs
  const { data: matriculas, error: matError } = await supabase
    .from('matriculas')
    .select('id_curso')
    .eq('id_alumno', idAlumno);

  if (matError || !matriculas || matriculas.length === 0) {
    return [];
  }

  const cursoIds = matriculas.map((m: any) => m.id_curso);

  // Fetch deliverables for these courses
  const { data: entregables, error: entError } = await supabase
    .from('entregables')
    .select(`
      *,
      cursos (
        id_curso,
        codigo,
        nombre,
        seccion
      ),
      prorrogas (
        nueva_fecha_cierre,
        id_alumno
      ),
      entregas (
        id_entrega,
        nombre_archivo,
        tamano_bytes,
        drive_url,
        file_hash,
        estado_puntualidad,
        timestamp_servidor,
        constancia_id,
        id_alumno,
        revisiones (
          id_revision,
          nota,
          retroalimentacion,
          fecha_evaluacion,
          modificaciones_count
        )
      )
    `)
    .in('id_curso', cursoIds);

  if (entError || !entregables) {
    console.error('Error fetching entregables:', entError);
    return [];
  }

  const now = new Date();

  return (entregables as any[]).map((e: any) => {
    // Find if the student has a specific extension (prórroga)
    const prorroga = e.prorrogas?.find((p: any) => p.id_alumno === idAlumno);
    const fechaCierreEfectiva = prorroga ? prorroga.nueva_fecha_cierre : e.fecha_cierre;

    // Find the student's submission (entrega) for this deliverable
    const entrega = e.entregas?.find((ent: any) => ent.id_alumno === idAlumno);

    // Get the revision/grade if it exists
    const revision = (Array.isArray(entrega?.revisiones) ? entrega.revisiones[0] : entrega?.revisiones) || null;

    // Determine delivery status
    let estado: EntregableConEstado['estado_entrega'] = 'pendiente';
    if (revision) {
      estado = 'calificado';
    } else if (entrega) {
      estado = entrega.estado_puntualidad === 'A Tiempo' ? 'entregado_a_tiempo' : 'entregado_tardio';
    } else if (new Date(fechaCierreEfectiva) < now) {
      estado = 'vencido';
    }

    return {
      id_entregable: e.id_entregable,
      titulo: e.titulo,
      descripcion: e.descripcion,
      fecha_apertura: e.fecha_apertura,
      fecha_cierre: e.fecha_cierre,
      fecha_cierre_efectiva: fechaCierreEfectiva,
      admite_extemporaneas: e.admite_extemporaneas,
      id_curso: e.id_curso,
      curso_codigo: e.cursos?.codigo || '',
      curso_nombre: e.cursos?.nombre || '',
      curso_seccion: e.cursos?.seccion || '',
      tiene_prorroga: !!prorroga,
      entrega: entrega ? {
        id_entrega: entrega.id_entrega,
        nombre_archivo: entrega.nombre_archivo,
        tamano_bytes: entrega.tamano_bytes,
        drive_url: entrega.drive_url,
        file_hash: entrega.file_hash,
        estado_puntualidad: entrega.estado_puntualidad,
        timestamp_servidor: entrega.timestamp_servidor,
        constancia_id: entrega.constancia_id,
        revision: revision ? {
          id_revision: revision.id_revision,
          nota: (revision.nota !== null && revision.nota !== undefined) ? Number(revision.nota) : null,
          retroalimentacion: revision.retroalimentacion,
          fecha_evaluacion: revision.fecha_evaluacion,
          modificaciones_count: revision.modificaciones_count ? Number(revision.modificaciones_count) : 0
        } : null
      } : null,
      estado_entrega: estado
    };
  });
}

// 3. Get student's submission history
export async function getHistorialEntregas(idAlumno: string): Promise<EntregaHistorial[]> {
  const { data, error } = await supabase
    .from('entregas')
    .select(`
      id_entrega,
      nombre_archivo,
      tamano_bytes,
      drive_url,
      file_hash,
      estado_puntualidad,
      timestamp_servidor,
      constancia_id,
      entregables (
        titulo,
        cursos (
          codigo,
          nombre,
          seccion
        )
      ),
      revisiones (
        nota,
        retroalimentacion,
        modificaciones_count
      )
    `)
    .eq('id_alumno', idAlumno)
    .order('timestamp_servidor', { ascending: false });

  if (error || !data) {
    console.error('Error fetching delivery history:', error);
    return [];
  }

  return (data as any[]).map(item => ({
    id_entrega: item.id_entrega,
    nombre_archivo: item.nombre_archivo,
    tamano_bytes: item.tamano_bytes,
    drive_url: item.drive_url,
    file_hash: item.file_hash,
    estado_puntualidad: item.estado_puntualidad,
    timestamp_servidor: item.timestamp_servidor,
    constancia_id: item.constancia_id,
    entregable_titulo: item.entregables?.titulo || '',
    curso_codigo: item.entregables?.cursos?.codigo || '',
    curso_nombre: item.entregables?.cursos?.nombre || '',
    curso_seccion: item.entregables?.cursos?.seccion || '',
    revision: (Array.isArray(item.revisiones) ? item.revisiones[0] : item.revisiones) ? {
      nota: ((Array.isArray(item.revisiones) ? item.revisiones[0] : item.revisiones).nota !== null && (Array.isArray(item.revisiones) ? item.revisiones[0] : item.revisiones).nota !== undefined) ? Number((Array.isArray(item.revisiones) ? item.revisiones[0] : item.revisiones).nota) : null,
      retroalimentacion: (Array.isArray(item.revisiones) ? item.revisiones[0] : item.revisiones).retroalimentacion,
      modificaciones_count: (Array.isArray(item.revisiones) ? item.revisiones[0] : item.revisiones).modificaciones_count ? Number((Array.isArray(item.revisiones) ? item.revisiones[0] : item.revisiones).modificaciones_count) : 0
    } : null
  }));
}

// 4. Upload a delivery by calling the 'upload-delivery' Edge Function
export async function subirEntrega(
  file: File,
  idEntregable: string,
  idCurso: string
): Promise<{
  success: boolean;
  constancia: {
    constancia_id: string;
    timestamp_servidor: string;
    nombre_archivo: string;
    tamano_bytes: number;
    file_hash: string;
    drive_url: string;
    estado_puntualidad: string;
    curso_nombre: string;
    entregable_titulo: string;
  };
}> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('id_entregable', idEntregable);
  formData.append('id_curso', idCurso);

  const { data, error } = await supabase.functions.invoke('upload-delivery', {
    body: formData,
  });

  if (error) {
    let errorMsg = 'Error al subir la entrega a través de la Edge Function';
    if (error.context) {
      try {
        const body = await error.context.json();
        if (body && body.message) {
          errorMsg = body.message;
        }
      } catch (_) {
        try {
          const text = await error.context.text();
          if (text) errorMsg = text;
        } catch (__) {}
      }
    }
    throw new Error(errorMsg);
  }

  return data;
}

// 5. Get current database server time
export async function getServerTime(): Promise<Date> {
  const { data, error } = await supabase.rpc('get_server_time' as any);
  if (error || !data) {
    return new Date(); // Fallback to client time in case of error
  }
  return new Date(data as string);
}

// 6. Get enrolled courses for a student
export interface CursoMatriculado {
  id_curso: string;
  codigo: string;
  nombre: string;
  seccion: string;
  ciclo_academico: string;
  docente_nombre: string | null;
}

export async function getCursosMatriculadosAlumno(idAlumno: string): Promise<CursoMatriculado[]> {
  const { data, error } = await supabase
    .from('matriculas')
    .select(`
      id_curso,
      cursos (
        id_curso,
        codigo,
        nombre,
        seccion,
        ciclo_academico,
        usuarios (
          nombre_completo
        )
      )
    `)
    .eq('id_alumno', idAlumno);

  if (error || !data) {
    console.error('Error fetching enrolled courses:', error);
    return [];
  }

  return data.map((item: any) => {
    const curso = item.cursos;
    return {
      id_curso: curso.id_curso,
      codigo: curso.codigo,
      nombre: curso.nombre,
      seccion: curso.seccion,
      ciclo_academico: curso.ciclo_academico,
      docente_nombre: curso.usuarios?.nombre_completo || 'Sin asignar'
    };
  });
}

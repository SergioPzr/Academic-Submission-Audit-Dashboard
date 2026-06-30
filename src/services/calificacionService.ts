import { supabase } from './supabase';
import { registrarEventoManual } from './auditService';

export interface AlumnoCalificacion {
  id_alumno: string;
  nombre_completo: string;
  codigo_institucional: string | null;
  email: string;
  entrega: {
    id_entrega: string;
    nombre_archivo: string;
    tamano_bytes: number;
    drive_url: string;
    file_hash: string;
    estado_puntualidad: string;
    timestamp_servidor: string;
    revision: {
      id_revision: string;
      nota: number | null;
      retroalimentacion: string | null;
      fecha_evaluacion: string | null;
    } | null;
  } | null;
  estado_calificacion: 'No Entregado' | 'Entregado' | 'Calificado' | 'Tardío';
}

export async function getEntregasPorEntregable(
  idCurso: string,
  idEntregable: string
): Promise<AlumnoCalificacion[]> {
  // 1. Fetch all matriculas of the course
  const { data: matriculas, error: matError } = await supabase
    .from('matriculas')
    .select(`
      id_alumno,
      usuarios (
        id,
        nombre_completo,
        codigo_institucional,
        email
      )
    `)
    .eq('id_curso', idCurso);

  if (matError || !matriculas) {
    console.error('Error fetching matriculas for grading:', matError);
    return [];
  }

  // 2. Fetch all submissions (entregas) for this deliverable
  const { data: entregas, error: entError } = await supabase
    .from('entregas')
    .select(`
      *,
      revisiones (
        id_revision,
        nota,
        retroalimentacion,
        fecha_evaluacion
      )
    `)
    .eq('id_entregable', idEntregable);

  if (entError) {
    console.error('Error fetching entregas for grading:', entError);
    return [];
  }

  // Create lookup map of student submissions
  const entregasMap: Record<string, any> = {};
  (entregas || []).forEach((e: any) => {
    entregasMap[e.id_alumno] = e;
  });

  // 3. Map students to their submission and grading status
  return (matriculas as any[]).map((m: any) => {
    const student = m.usuarios;
    const entrega = entregasMap[student.id] || null;
    const revision = entrega?.revisiones?.[0] || null;

    let estado: AlumnoCalificacion['estado_calificacion'] = 'No Entregado';
    if (revision) {
      estado = 'Calificado';
    } else if (entrega) {
      estado = entrega.estado_puntualidad === 'Tardía' ? 'Tardío' : 'Entregado';
    }

    return {
      id_alumno: student.id,
      nombre_completo: student.nombre_completo,
      codigo_institucional: student.codigo_institucional,
      email: student.email,
      entrega: entrega
        ? {
            id_entrega: entrega.id_entrega,
            nombre_archivo: entrega.nombre_archivo,
            tamano_bytes: entrega.tamano_bytes,
            drive_url: entrega.drive_url,
            file_hash: entrega.file_hash,
            estado_puntualidad: entrega.estado_puntualidad,
            timestamp_servidor: entrega.timestamp_servidor,
            revision: revision
              ? {
                  id_revision: revision.id_revision,
                  nota: revision.nota ? Number(revision.nota) : null,
                  retroalimentacion: revision.retroalimentacion,
                  fecha_evaluacion: revision.fecha_evaluacion,
                }
              : null,
          }
        : null,
      estado_calificacion: estado,
    };
  });
}

export async function evaluarEntrega(
  idEntrega: string,
  nota: number,
  feedback: string,
  idProfesor: string
): Promise<any> {
  const { data, error } = await supabase
    .from('revisiones')
    .insert([
      {
        id_entrega: idEntrega,
        nota: nota,
        retroalimentacion: feedback,
        id_profesor: idProfesor,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function modificarEvaluacion(
  idRevision: string,
  nota: number,
  feedback: string
): Promise<any> {
  const { data, error } = await supabase
    .from('revisiones')
    .update({
      nota: nota,
      retroalimentacion: feedback,
      fecha_evaluacion: new Date().toISOString(),
    })
    .eq('id_revision', idRevision)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function buscarAlumnoEnCurso(termino: string, idCurso: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('matriculas')
    .select(`
      id_alumno,
      usuarios (
        id,
        nombre_completo,
        codigo_institucional,
        email
      )
    `)
    .eq('id_curso', idCurso);

  if (error) throw error;

  const filtered = (data || []).map((m: any) => m.usuarios).filter((u: any) => {
    if (!u) return false;
    const term = termino.toLowerCase();
    return u.nombre_completo.toLowerCase().includes(term) ||
      (u.codigo_institucional && u.codigo_institucional.toLowerCase().includes(term));
  });

  return filtered;
}

export async function exportarReporteCSV(
  idCurso: string,
  idEntregable: string,
  nombreCurso: string,
  tituloEntregable: string
): Promise<Blob> {
  const data = await getEntregasPorEntregable(idCurso, idEntregable);

  const headers = [
    'CÓDIGO ALUMNO',
    'NOMBRE ALUMNO',
    'ENTREGABLE',
    'ESTADO',
    'FECHA ENVÍO',
    'NOTA',
    'RETROALIMENTACIÓN'
  ];

  const rows = data.map((student) => {
    const formattedDate = student.entrega?.timestamp_servidor
      ? new Date(student.entrega.timestamp_servidor).toLocaleString('es-PE', { timeZone: 'America/Lima' })
      : '—';
    const score = student.entrega?.revision?.nota !== null && student.entrega?.revision?.nota !== undefined
      ? student.entrega.revision.nota.toFixed(2)
      : '—';
    const feedback = student.entrega?.revision?.retroalimentacion || '—';

    return [
      student.codigo_institucional || '—',
      student.nombre_completo,
      tituloEntregable,
      student.estado_calificacion,
      formattedDate,
      score,
      feedback
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row
        .map((val) => {
          const escaped = String(val).replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(',')
    )
  ].join('\n');

  await registrarEventoManual('EXPORT_REPORT', {
    curso_id: idCurso,
    entregable_id: idEntregable,
    curso_nombre: nombreCurso,
    entregable_titulo: tituloEntregable,
    total_alumnos: data.length
  });

  return new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
}


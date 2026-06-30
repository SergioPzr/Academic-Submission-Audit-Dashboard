import { supabase } from './supabase';

export interface CursoConStats {
  id_curso: string;
  codigo: string;
  nombre: string;
  seccion: string;
  ciclo_academico: string;
  total_alumnos: number;
  proximo_entregable: {
    id_entregable: string;
    titulo: string;
    fecha_cierre: string;
  } | null;
  stats: {
    a_tiempo: number;
    tardias: number;
    pendientes: number;
    calificados: number;
    pct_entregas: number;
    pct_calificacion: number;
  };
}

export interface ProfesorKPIs {
  cursos_a_cargo: number;
  estudiantes_activos: number;
  entregas_por_revisar: number;
  atrasos_detectados: number;
}

// Get all courses taught by a professor with stats for their next deliverable
export async function getMisCursos(idProfesor: string): Promise<CursoConStats[]> {
  // 1. Fetch courses
  const { data: cursos, error: cursosError } = await supabase
    .from('cursos')
    .select('*')
    .eq('id_profesor', idProfesor)
    .eq('estado', 'activo');

  if (cursosError || !cursos) {
    console.error('Error fetching professor courses:', cursosError);
    return [];
  }

  const result: CursoConStats[] = [];

  for (const curso of cursos) {
    // 2. Fetch next upcoming deliverable or most recent
    const { data: deliverable } = await supabase
      .from('entregables')
      .select('id_entregable, titulo, fecha_cierre')
      .eq('id_curso', curso.id_curso)
      .order('fecha_cierre', { ascending: true })
      .gte('fecha_cierre', new Date().toISOString())
      .limit(1);

    let proximoEntregable = null;
    let entregableId = null;

    if (deliverable && deliverable.length > 0) {
      proximoEntregable = {
        id_entregable: deliverable[0].id_entregable,
        titulo: deliverable[0].titulo,
        fecha_cierre: deliverable[0].fecha_cierre,
      };
      entregableId = deliverable[0].id_entregable;
    } else {
      // If no upcoming, get the latest closed one
      const { data: latestClosed } = await supabase
        .from('entregables')
        .select('id_entregable, titulo, fecha_cierre')
        .eq('id_curso', curso.id_curso)
        .order('fecha_cierre', { ascending: false })
        .limit(1);

      if (latestClosed && latestClosed.length > 0) {
        proximoEntregable = {
          id_entregable: latestClosed[0].id_entregable,
          titulo: latestClosed[0].titulo,
          fecha_cierre: latestClosed[0].fecha_cierre,
        };
        entregableId = latestClosed[0].id_entregable;
      }
    }

    // 3. Call RPC to get stats
    const { data: statsJson, error: statsError } = await supabase.rpc(
      'get_curso_stats' as any,
      { p_curso_id: curso.id_curso, p_entregable_id: entregableId }
    );

    let stats = {
      a_tiempo: 0,
      tardias: 0,
      pendientes: 0,
      calificados: 0,
      pct_entregas: 0,
      pct_calificacion: 0,
      total_alumnos: 0
    };

    if (!statsError && statsJson) {
      stats = statsJson as any;
    }

    result.push({
      id_curso: curso.id_curso,
      codigo: curso.codigo,
      nombre: curso.nombre,
      seccion: curso.seccion,
      ciclo_academico: curso.ciclo_academico,
      total_alumnos: stats.total_alumnos,
      proximo_entregable: proximoEntregable,
      stats: {
        a_tiempo: stats.a_tiempo,
        tardias: stats.tardias,
        pendientes: stats.pendientes,
        calificados: stats.calificados,
        pct_entregas: stats.pct_entregas,
        pct_calificacion: stats.pct_calificacion,
      },
    });
  }

  return result;
}

// Get global KPIs for a professor
export async function getKPIsProfesor(idProfesor: string): Promise<ProfesorKPIs> {
  // 1. Get courses
  const { data: cursos, error: cursosError } = await supabase
    .from('cursos')
    .select('id_curso')
    .eq('id_profesor', idProfesor)
    .eq('estado', 'activo');

  if (cursosError || !cursos) {
    return { cursos_a_cargo: 0, estudiantes_activos: 0, entregas_por_revisar: 0, atrasos_detectados: 0 };
  }

  const cursoIds = cursos.map((c) => c.id_curso);
  const cursosACargo = cursoIds.length;

  if (cursosACargo === 0) {
    return { cursos_a_cargo: 0, estudiantes_activos: 0, entregas_por_revisar: 0, atrasos_detectados: 0 };
  }

  // 2. Get students matriculados
  const { data: matriculas } = await supabase
    .from('matriculas')
    .select('id_alumno')
    .in('id_curso', cursoIds);

  const distinctAlumnos = new Set((matriculas || []).map((m) => m.id_alumno));
  const estudiantesActivos = distinctAlumnos.size;

  // 3. Get entregables
  const { data: entregables } = await supabase
    .from('entregables')
    .select('id_entregable, id_curso, fecha_cierre')
    .in('id_curso', cursoIds);

  const entregableIds = (entregables || []).map((e) => e.id_entregable);

  let entregasPorRevisar = 0;
  let atrasosDetectados = 0;

  if (entregableIds.length > 0) {
    // 4. Get entregas
    const { data: entregas } = await supabase
      .from('entregas')
      .select(`
        id_entrega,
        estado_puntualidad,
        revisiones (
          id_revision,
          nota
        )
      `)
      .in('id_entregable', entregableIds);

    if (entregas) {
      for (const entrega of entregas) {
        const review = (entrega as any).revisiones?.[0];
        if (!review || review.nota === null) {
          entregasPorRevisar++;
        }
        if (entrega.estado_puntualidad === 'Tardía') {
          atrasosDetectados++;
        }
      }
    }

    // 5. Also calculate students who haven't submitted yet for closed deliverables
    const now = new Date();
    const closedEntregables = (entregables || []).filter(e => new Date(e.fecha_cierre) < now);
    
    for (const ent of closedEntregables) {
      const { data: courseStudents } = await supabase
        .from('matriculas')
        .select('id_alumno')
        .eq('id_curso', ent.id_curso);
        
      if (courseStudents && courseStudents.length > 0) {
        const studentIds = courseStudents.map(cs => cs.id_alumno);
        const { data: submittedStudents } = await supabase
          .from('entregas')
          .select('id_alumno')
          .eq('id_entregable', ent.id_entregable)
          .in('id_alumno', studentIds);
          
        const submittedSet = new Set((submittedStudents || []).map(s => s.id_alumno));
        const missingCount = studentIds.filter(id => !submittedSet.has(id)).length;
        atrasosDetectados += missingCount;
      }
    }
  }

  return {
    cursos_a_cargo: cursosACargo,
    estudiantes_activos: estudiantesActivos,
    entregas_por_revisar: entregasPorRevisar,
    atrasos_detectados: atrasosDetectados,
  };
}

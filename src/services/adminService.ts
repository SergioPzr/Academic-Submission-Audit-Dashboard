import { supabase } from './supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MetricasAdmin {
  transacciones_24h: number;
  usuarios_activos: number;
  incidencias_criticas: number;
  almacenamiento_bytes: number;
}

export interface PuntoGrafico {
  fecha: string; // ISO date string
  total: number;
}

export interface DistribucionRol {
  nombre: string;
  cantidad: number;
}

export interface PicoCarga {
  hora: number;
  total: number;
}

export interface LogReciente {
  id_log: string;
  email_usuario: string | null;
  tipo_operacion: string;
  tabla_afectada: string | null;
  ip_cliente: string | null;
  timestamp_servidor: string;
}

export interface UsuarioCompleto {
  id: string;
  nombre_completo: string;
  codigo_institucional: string | null;
  email: string;
  facultad: string | null;
  estado: string;
  created_at: string;
  roles: { nombre: string } | null;
}

export interface CursoCompleto {
  id_curso: string;
  codigo: string;
  nombre: string;
  seccion: string;
  ciclo_academico: string;
  estado: string;
  created_at: string;
  usuarios: { nombre_completo: string } | null;
}

export interface NuevoCurso {
  codigo: string;
  nombre: string;
  seccion: string;
  ciclo_academico: string;
  id_profesor: string | null;
}

export interface FilaCSV {
  codigo: string;
  nombre: string;
  correo: string;
  curso: string;
  seccion: string;
}

export interface FilaCSVValidada extends FilaCSV {
  valida: boolean;
  error?: string;
  id_alumno?: string;
  id_curso?: string;
}

// ─── Métricas Globales ─────────────────────────────────────────────────────────

export async function getMetricasGlobales(): Promise<MetricasAdmin> {
  const { data, error } = await (supabase as any).rpc('get_admin_metrics');
  if (error) throw error;
  return data as MetricasAdmin;
}

export async function getTransaccionesGrafico(dias = 14): Promise<PuntoGrafico[]> {
  const { data, error } = await (supabase as any).rpc('get_transacciones_grafico', { p_dias: dias });
  if (error) throw error;
  return (data as any[]).map((d) => ({ fecha: d.fecha, total: Number(d.total) }));
}

export async function getDistribucionRoles(): Promise<DistribucionRol[]> {
  const { data, error } = await supabase
    .from('usuarios')
    .select('roles(nombre)')
    .eq('estado', 'activo');
  if (error) throw error;

  const conteo: Record<string, number> = {};
  for (const u of data as any[]) {
    const nombre = u.roles?.nombre ?? 'desconocido';
    conteo[nombre] = (conteo[nombre] ?? 0) + 1;
  }

  return Object.entries(conteo).map(([nombre, cantidad]) => ({ nombre, cantidad }));
}

export async function getPicosCarga(): Promise<PicoCarga[]> {
  const { data, error } = await supabase
    .from('logs_auditoria')
    .select('timestamp_servidor')
    .gte('timestamp_servidor', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
  if (error) throw error;

  const conteo: Record<number, number> = {};
  for (const log of data as any[]) {
    const hora = new Date(log.timestamp_servidor).getUTCHours() - 5; // UTC-5
    const horaAdj = ((hora % 24) + 24) % 24;
    conteo[horaAdj] = (conteo[horaAdj] ?? 0) + 1;
  }

  return Object.entries(conteo)
    .map(([hora, total]) => ({ hora: Number(hora), total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
}

export async function getLogsRecientes(limit = 10): Promise<LogReciente[]> {
  const { data, error } = await supabase
    .from('logs_auditoria')
    .select('id_log, email_usuario, tipo_operacion, tabla_afectada, ip_cliente, timestamp_servidor')
    .order('timestamp_servidor', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as LogReciente[];
}

// ─── Usuarios ──────────────────────────────────────────────────────────────────

export async function getUsuarios(): Promise<UsuarioCompleto[]> {
  const { data, error } = await supabase
    .from('usuarios')
    .select('id, nombre_completo, codigo_institucional, email, facultad, estado, created_at, roles(nombre)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as unknown as UsuarioCompleto[];
}

export async function getProfesores(): Promise<UsuarioCompleto[]> {
  const { data, error } = await supabase
    .from('usuarios')
    .select('id, nombre_completo, codigo_institucional, email, facultad, estado, created_at, roles(nombre)')
    .eq('estado', 'activo');
  if (error) throw error;
  const todos = data as unknown as UsuarioCompleto[];
  return todos.filter((u) => u.roles?.nombre === 'profesor');
}

export async function editarEstadoUsuario(id: string, estado: 'activo' | 'inactivo'): Promise<void> {
  const { error } = await supabase
    .from('usuarios')
    .update({ estado, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// ─── Cursos ────────────────────────────────────────────────────────────────────

export async function getCursos(): Promise<CursoCompleto[]> {
  const { data, error } = await supabase
    .from('cursos')
    .select('id_curso, codigo, nombre, seccion, ciclo_academico, estado, created_at, usuarios(nombre_completo)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as unknown as CursoCompleto[];
}

export async function crearCurso(datos: NuevoCurso): Promise<void> {
  const { error } = await supabase.from('cursos').insert({
    codigo: datos.codigo.toUpperCase(),
    nombre: datos.nombre,
    seccion: datos.seccion.toUpperCase(),
    ciclo_academico: datos.ciclo_academico,
    id_profesor: datos.id_profesor || null,
    estado: 'activo',
  });
  if (error) throw error;
}

export async function editarEstadoCurso(id: string, estado: 'activo' | 'inactivo'): Promise<void> {
  const { error } = await supabase.from('cursos').update({ estado }).eq('id_curso', id);
  if (error) throw error;
}

// ─── Matrícula Masiva ──────────────────────────────────────────────────────────

export async function validarFilasCSV(filas: FilaCSV[]): Promise<FilaCSVValidada[]> {
  const resultados: FilaCSVValidada[] = [];

  for (const fila of filas) {
    // Buscar alumno por código institucional
    const { data: alumno } = await supabase
      .from('usuarios')
      .select('id')
      .eq('codigo_institucional', fila.codigo.trim())
      .maybeSingle();

    // Buscar curso por código y sección
    const { data: curso } = await supabase
      .from('cursos')
      .select('id_curso')
      .eq('codigo', fila.curso.trim().toUpperCase())
      .eq('seccion', fila.seccion.trim().toUpperCase())
      .maybeSingle();

    if (!alumno) {
      resultados.push({ ...fila, valida: false, error: `Código ${fila.codigo} no encontrado` });
    } else if (!curso) {
      resultados.push({ ...fila, valida: false, error: `Curso ${fila.curso}/${fila.seccion} no encontrado` });
    } else {
      // Verificar si ya existe la matrícula
      const { data: mat } = await supabase
        .from('matriculas')
        .select('id_matricula')
        .eq('id_alumno', alumno.id)
        .eq('id_curso', curso.id_curso)
        .maybeSingle();

      if (mat) {
        resultados.push({ ...fila, valida: false, error: `Ya matriculado en ${fila.curso}` });
      } else {
        resultados.push({
          ...fila,
          valida: true,
          id_alumno: alumno.id,
          id_curso: curso.id_curso,
        });
      }
    }
  }

  return resultados;
}

export async function procesarMatriculaMasiva(filas: FilaCSVValidada[]): Promise<{ insertadas: number }> {
  // Llamar Edge Function bulk-enrollment si existe,
  // si no, insertar directamente (fallback sin transacción atómica)
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Sin sesión activa');

  try {
    const resp = await fetch(`${supabaseUrl}/functions/v1/bulk-enrollment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ filas: filas.filter((f) => f.valida) }),
    });
    if (!resp.ok) throw new Error(await resp.text());
    return resp.json();
  } catch (_err) {
    // Fallback: INSERT directo (sin atomicidad total)
    const inserts = filas
      .filter((f) => f.valida && f.id_alumno && f.id_curso)
      .map((f) => ({ id_alumno: f.id_alumno!, id_curso: f.id_curso! }));

    const { error } = await supabase.from('matriculas').insert(inserts);
    if (error) throw error;
    return { insertadas: inserts.length };
  }
}

export async function matricularAlumno(idAlumno: string, idCurso: string): Promise<void> {
  const { error } = await supabase
    .from('matriculas')
    .insert({ id_alumno: idAlumno, id_curso: idCurso });
  if (error) throw error;
}

export async function desmatricularAlumno(idAlumno: string, idCurso: string): Promise<void> {
  const { error } = await supabase
    .from('matriculas')
    .delete()
    .eq('id_alumno', idAlumno)
    .eq('id_curso', idCurso);
  if (error) throw error;
}

export async function getMatriculasAlumno(idAlumno: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('matriculas')
    .select('id_curso')
    .eq('id_alumno', idAlumno);
  if (error) throw error;
  return data || [];
}

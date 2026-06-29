import { supabase } from './supabase';
import type { Entrega, VentanaTiempo, LogAuditoria, AlumnoInfo } from './types';

export async function fetchEntregas(cursoId: string, entregableId: string): Promise<Entrega[]> {
  const { data, error } = await supabase
    .from('Entregas')
    .select('*')
    .eq('id_curso', cursoId)
    .eq('id_entregable', entregableId)
    .order('submitted_at', { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as Entrega[];
}

export async function updateEntregaGrade(
  entregaId: string,
  grade: number,
  feedback: string
): Promise<void> {
  const { error } = await supabase
    .from('Entregas')
    .update({
      nota_num: grade,
      retroalimentacion: feedback,
      estado_calificacion: 'CALIFICADO',
      ultima_modificacion: new Date().toISOString(),
    })
    .eq('id', entregaId);
  if (error) throw error;
}

export async function fetchVentanas(cursoId: string): Promise<VentanaTiempo[]> {
  const { data, error } = await supabase
    .from('Ventanas_Tiempo')
    .select('*')
    .eq('curso_id', cursoId)
    .order('fecha_apertura', { ascending: false });
  if (error) throw error;
  return (data ?? []) as VentanaTiempo[];
}

export async function deleteVentana(ventanaId: string): Promise<void> {
  const { error } = await supabase.from('Ventanas_Tiempo').delete().eq('id', ventanaId);
  if (error) throw error;
}

export async function createOrUpdateVentana(payload: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.functions.invoke('manage-schedule', { body: payload });
  if (error) throw error;
}

export async function assignExtension(payload: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.functions.invoke('assign-extension', { body: payload });
  if (error) throw error;
}

export async function fetchLogs(filters?: {
  dateFrom?: string;
  dateTo?: string;
  eventFilter?: string;
}): Promise<LogAuditoria[]> {
  let query = supabase
    .from('Logs_Auditoria')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  if (filters?.dateFrom) query = query.gte('created_at', new Date(filters.dateFrom).toISOString());
  if (filters?.dateTo) query = query.lte('created_at', new Date(filters.dateTo).toISOString());
  if (filters?.eventFilter) query = query.eq('event_type', filters.eventFilter);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as LogAuditoria[];
}

export async function countEntregasByEntregable(entregableId: string): Promise<number> {
  const { count, error } = await supabase
    .from('Entregas')
    .select('*', { count: 'exact', head: true })
    .eq('id_entregable', entregableId);
  if (error) throw error;
  return count ?? 0;
}

export async function fetchAdminMetrics() {
  const { count: usuarios } = await supabase.from('Profiles').select('*', { count: 'exact', head: true });
  const { count: cursos } = await supabase.from('Cursos').select('*', { count: 'exact', head: true });
  const { count: entregas } = await supabase.from('Entregas').select('*', { count: 'exact', head: true });
  return {
    totalUsuarios: usuarios ?? 0,
    totalCursos: cursos ?? 0,
    totalEntregas: entregas ?? 0,
    storageUsed: '—',
  };
}

export async function fetchStudents(): Promise<AlumnoInfo[]> {
  const { data, error } = await supabase
    .from('Profiles')
    .select('id, full_name, email')
    .order('full_name', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((p: Record<string, unknown>) => {
    const name: string = (p.full_name as string) || '';
    const parts = name.split(' ');
    const initials = parts.map((s: string) => s.charAt(0).toUpperCase()).join('').slice(0, 2) || '??';
    const colors = ['#818cf8', '#16a34a', '#d97706', '#dc2626', '#0891b2', '#9333ea'];
    const colorIdx = (p.id as string)?.length ?? 0;
    return {
      id: p.id as string,
      full_name: name,
      email: (p.email as string) || '',
      initials,
      avatar_color: colors[colorIdx % colors.length],
      avatar_bg: '#f1f5f9',
    };
  });
}

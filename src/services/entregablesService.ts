import { supabase } from './supabase';

export interface NuevoEntregable {
  id_curso: string;
  titulo: string;
  descripcion: string;
  fecha_apertura: string;
  fecha_cierre: string;
  admite_extemporaneas: boolean;
}

export interface Entregable {
  id_entregable: string;
  id_curso: string;
  titulo: string;
  descripcion: string | null;
  fecha_apertura: string;
  fecha_cierre: string;
  admite_extemporaneas: boolean;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface NuevaProrroga {
  id_entregable: string;
  id_alumno: string;
  nueva_fecha_cierre: string;
  otorgado_por: string;
}

export interface Prorrga {
  id_prorroga: string;
  id_entregable: string;
  id_alumno: string;
  nueva_fecha_cierre: string;
  otorgado_por: string;
  created_at?: string;
}

export interface AlumnoMatriculado {
  id: string;
  nombre_completo: string;
  codigo_institucional: string | null;
  email: string;
}

// 1. Create a deliverable (window)
export async function crearEntregable(data: NuevoEntregable): Promise<Entregable> {
  try {
    const { data: res, error } = await supabase.functions.invoke('manage-schedule', {
      body: { action: 'CREATE', ...data }
    });
    if (!error && res) return res as Entregable;
    console.warn('Edge Function manage-schedule failed, trying direct DB insert:', error);
  } catch (err) {
    console.warn('Could not call Edge Function manage-schedule, trying direct DB insert:', err);
  }

  // Fallback to direct DB insert
  const { data: insertData, error: dbError } = await supabase
    .from('entregables')
    .insert([data])
    .select()
    .single();

  if (dbError) throw dbError;
  return insertData as Entregable;
}

// 2. Edit a deliverable
export async function editarEntregable(id: string, data: Partial<NuevoEntregable>): Promise<Entregable> {
  try {
    const { data: res, error } = await supabase.functions.invoke('manage-schedule', {
      body: { action: 'UPDATE', id_entregable: id, ...data }
    });
    if (!error && res) return res as Entregable;
    console.warn('Edge Function manage-schedule failed, trying direct DB update:', error);
  } catch (err) {
    console.warn('Could not call Edge Function manage-schedule, trying direct DB update:', err);
  }

  // Fallback to direct DB update
  const { data: updateData, error: dbError } = await supabase
    .from('entregables')
    .update(data)
    .eq('id_entregable', id)
    .select()
    .single();

  if (dbError) throw dbError;
  return updateData as Entregable;
}

// 3. Delete a deliverable
export async function eliminarEntregable(id: string): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('manage-schedule', {
      body: { action: 'DELETE', id_entregable: id }
    });
    if (!error) return;
    console.warn('Edge Function manage-schedule failed, trying direct DB delete:', error);
  } catch (err) {
    console.warn('Could not call Edge Function manage-schedule, trying direct DB delete:', err);
  }

  // Fallback to direct DB delete
  const { error: dbError } = await supabase
    .from('entregables')
    .delete()
    .eq('id_entregable', id);

  if (dbError) throw dbError;
}

// 4. Assign an individual extension (prórroga)
export async function asignarProrroga(data: NuevaProrroga): Promise<Prorrga> {
  try {
    const { data: res, error } = await supabase.functions.invoke('assign-extension', {
      body: data
    });
    if (!error && res) return res as Prorrga;
    console.warn('Edge Function assign-extension failed, trying direct DB insert:', error);
  } catch (err) {
    console.warn('Could not call Edge Function assign-extension, trying direct DB insert:', err);
  }

  // Fallback to direct DB insert
  const { data: insertData, error: dbError } = await supabase
    .from('prorrogas')
    .insert([data])
    .select()
    .single();

  if (dbError) throw dbError;
  return insertData as Prorrga;
}

// 5. Get deliverables for a course
export async function getEntregablesPorCurso(idCurso: string): Promise<Entregable[]> {
  const { data, error } = await supabase
    .from('entregables')
    .select('*')
    .eq('id_curso', idCurso)
    .order('fecha_cierre', { ascending: true });

  if (error) {
    console.error('Error fetching entregables for course:', error);
    return [];
  }
  return (data || []) as Entregable[];
}

// 6. Get students enrolled in a course (for the search/extension modal)
export async function getAlumnosPorCurso(idCurso: string): Promise<AlumnoMatriculado[]> {
  const { data, error } = await supabase
    .from('matriculas')
    .select(`
      usuarios (
        id,
        nombre_completo,
        codigo_institucional,
        email
      )
    `)
    .eq('id_curso', idCurso);

  if (error) {
    console.error('Error fetching students for course:', error);
    return [];
  }

  // Flatten output
  return (data || [])
    .map((item: any) => item.usuarios)
    .filter(Boolean) as AlumnoMatriculado[];
}

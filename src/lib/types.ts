export type UserRole = 'alumno' | 'profesor' | 'administrador';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  created_at?: string;
}

export interface Curso {
  id: string;
  codigo: string;
  nombre: string;
  periodo: string;
  seccion: string;
  profesor_id: string;
  created_at: string;
}

export interface VentanaTiempo {
  id: string;
  curso_id: string;
  entregable_id: string;
  titulo: string;
  descripcion: string;
  fecha_apertura: string;
  fecha_cierre: string;
  created_at: string;
  updated_at: string;
}

export interface ProrrogaAlumno {
  id: string;
  id_alumno: string;
  id_entregable: string;
  nueva_fecha_cierre: string;
  created_at: string;
}

export interface Entrega {
  id: string;
  id_alumno: string;
  id_entregable: string;
  id_curso: string;
  drive_secure_url: string;
  file_hash: string;
  submitted_at: string;
  estado_puntualidad: 'A Tiempo' | 'Tardía' | 'Sin entregar';
  nota_num: number | null;
  retroalimentacion: string | null;
  estado_calificacion: 'PENDIENTE' | 'CALIFICADO';
  ultima_modificacion: string | null;
  created_at: string;
}

export interface AlumnoInfo {
  id: string;
  full_name: string;
  email: string;
  initials: string;
  avatar_color: string;
  avatar_bg: string;
}

export interface Matricula {
  id: string;
  alumno_id: string;
  curso_id: string;
  seccion: string;
  created_at: string;
}

export interface LogAuditoria {
  id: string;
  user_id: string;
  event_type: string;
  table_affected: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  ip_address: string;
  created_at: string;
}

export type EstadoFiltro = 'all' | 'atiempo' | 'tardia' | 'sinentregar' | 'calificado';

export type TaskStatus = "pending" | "soon" | "submitted" | "closed" | "graded";

export interface Assignment {
  id: number;
  title: string;
  description: string;
  course: string;
  open: Date;
  close: Date;
  icon: string;
  iconClass: string;
  // Lo siguiente lo completa el flujo de entrega / el backend, no el alumno a mano:
  submittedAt?: Date | null;
  driveLink?: string | null; // URL final en Drive, devuelta por la Edge Function de Escobar
  grade?: number | null;
  feedback?: string | null;
}

export interface StatusInfo {
  label: string;
  badgeClass: string;
  icon: string;
  cardClass: string;
}

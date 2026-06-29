import type { Assignment, StatusInfo, TaskStatus } from "../types/assignment";

/**
 * Calcula el estado de una tarea. `now` se inyecta (en vez de usar Date.now()
 * directamente) para que siempre se calcule contra la hora sincronizada del
 * servidor (ver useServerTime) y no contra el reloj local del navegador.
 */
export function getStatus(task: Assignment, now: Date): TaskStatus {
  if (task.grade !== undefined && task.grade !== null) return "graded";
  if (task.submittedAt) return "submitted";
  if (now.getTime() > task.close.getTime()) return "closed";
  if (task.close.getTime() - now.getTime() < 24 * 3600 * 1000) return "soon";
  return "pending";
}

const STATUS_MAP: Record<TaskStatus, StatusInfo> = {
  pending: { label: "A tiempo", badgeClass: "badge-indigo", icon: "📋", cardClass: "status-pending" },
  soon: { label: "Por vencer", badgeClass: "badge-amber", icon: "⚠️", cardClass: "status-soon" },
  submitted: { label: "Entregado", badgeClass: "badge-green", icon: "✅", cardClass: "status-submitted" },
  closed: { label: "Cerrado", badgeClass: "badge-red", icon: "🔒", cardClass: "status-closed" },
  graded: { label: "Calificado", badgeClass: "badge-blue", icon: "⭐", cardClass: "status-graded" },
};

export function statusInfo(status: TaskStatus): StatusInfo {
  return STATUS_MAP[status];
}

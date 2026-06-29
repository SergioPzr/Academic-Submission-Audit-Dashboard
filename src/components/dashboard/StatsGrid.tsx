import type { Assignment } from "../../types/assignment";
import { getStatus } from "../../utils/status";

interface StatsGridProps {
  assignments: Assignment[];
  serverNow: Date;
}

export function StatsGrid({ assignments, serverNow }: StatsGridProps) {
  const statuses = assignments.map((a) => getStatus(a, serverNow));

  const stats = [
    { label: "Total tareas", value: assignments.length, sub: "este período", dot: "#4f46e5" },
    { label: "A tiempo", value: statuses.filter((s) => s === "pending").length, sub: "sin entregar", dot: "#4f46e5" },
    { label: "Por vencer", value: statuses.filter((s) => s === "soon").length, sub: "menos de 24h", dot: "#d97706" },
    {
      label: "Entregadas",
      value: statuses.filter((s) => s === "submitted" || s === "graded").length,
      sub: "calificadas y pendientes",
      dot: "#16a34a",
    },
  ];

  return (
    <div className="stats-grid">
      {stats.map((s) => (
        <div className="stat-card" key={s.label}>
          <div className="stat-label">
            <span className="stat-dot" style={{ background: s.dot }} />
            {s.label}
          </div>
          <div className="stat-value">{s.value}</div>
          <div className="stat-sub">{s.sub}</div>
          <div className="progress-bar-wrap">
            <div
              className="progress-bar"
              style={{
                width: `${assignments.length ? (s.value / assignments.length) * 100 : 0}%`,
                background: s.dot,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

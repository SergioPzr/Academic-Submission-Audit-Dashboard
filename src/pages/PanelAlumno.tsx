import { useState } from "react";
import type { Assignment } from "../types/assignment";
import { getMockAssignments } from "../mocks/assignments.mock";
import { useServerTime } from "../providers/ServerTimeProvider";
import { useToast } from "../components/ui/Toast";
import { AlumnoLayout } from "../components/layout/AlumnoLayout";
import { StatsGrid } from "../components/dashboard/StatsGrid";
import { FilterBar, type FilterKey } from "../components/dashboard/FilterBar";
import { TasksList } from "../components/dashboard/TasksList";
import { TaskDetailModal } from "../components/modal/TaskDetailModal";

export function PanelAlumno() {
  // MOCK: en Fase C/D esto se reemplaza por un fetch a Supabase (tabla Entregables/Entregas)
  const [assignments, setAssignments] = useState<Assignment[]>(getMockAssignments);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const { getServerNow, synced } = useServerTime();
  const { showToast } = useToast();

  const selectedTask = assignments.find((a) => a.id === selectedTaskId) ?? null;

  function handleDelivered(taskId: number, result: { url: string; hash: string }) {
    setAssignments((prev) =>
      prev.map((a) =>
        a.id === taskId
          ? { ...a, submittedAt: getServerNow(), driveLink: result.url, grade: null, feedback: null }
          : a
      )
    );
    setSelectedTaskId(null);
    showToast("¡Entrega enviada correctamente!", "📤");
  }

  if (!synced) {
    return (
      <AlumnoLayout studentName="Cargando…" courseLabel="">
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-3)" }}>
          Sincronizando con el servidor…
        </div>
      </AlumnoLayout>
    );
  }

  const serverNow = getServerNow();

  return (
    <AlumnoLayout studentName="Ana García" courseLabel="Alumno — Ing. Sistemas">
      <StatsGrid assignments={assignments} serverNow={serverNow} />

      <div className="section-header">
        <div>
          <div className="section-title">Mis Entregables</div>
          <div className="section-sub">Haz clic en cualquier tarea para ver el detalle y entregar</div>
        </div>
        <FilterBar active={filter} onChange={setFilter} />
      </div>

      <TasksList
        assignments={assignments}
        serverNow={serverNow}
        filter={filter}
        onSelectTask={(task) => setSelectedTaskId(task.id)}
      />

      <TaskDetailModal task={selectedTask} onClose={() => setSelectedTaskId(null)} onDelivered={handleDelivered} />
    </AlumnoLayout>
  );
}

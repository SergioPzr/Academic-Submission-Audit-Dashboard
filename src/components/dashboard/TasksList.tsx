import type { Assignment } from "../../types/assignment";
import { getStatus } from "../../utils/status";
import { TaskCard } from "./TaskCard";
import type { FilterKey } from "./FilterBar";

interface TasksListProps {
  assignments: Assignment[];
  serverNow: Date;
  filter: FilterKey;
  onSelectTask: (task: Assignment) => void;
}

export function TasksList({ assignments, serverNow, filter, onSelectTask }: TasksListProps) {
  const filtered =
    filter === "all" ? assignments : assignments.filter((a) => getStatus(a, serverNow) === filter);

  if (filtered.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📭</div>
        <div className="empty-title">Sin tareas en esta categoría</div>
        <div className="empty-desc">No hay entregables que coincidan con el filtro seleccionado.</div>
      </div>
    );
  }

  return (
    <div className="tasks-list">
      {filtered.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          status={getStatus(task, serverNow)}
          serverNow={serverNow}
          onClick={() => onSelectTask(task)}
        />
      ))}
    </div>
  );
}

import type { Assignment, TaskStatus } from "../../types/assignment";
import { Badge } from "../ui/Badge";

interface ReviewBlockProps {
  status: TaskStatus;
  task: Assignment;
}

export function ReviewBlock({ status, task }: ReviewBlockProps) {
  if (status === "submitted") {
    return (
      <div className="review-block">
        <div className="review-header">
          <Badge label="Sin calificar" badgeClass="badge-gray" icon="🕐" />
        </div>
        <div className="review-comment">Tu entrega está siendo revisada por el profesor.</div>
      </div>
    );
  }

  if (status === "graded") {
    return (
      <div className="review-block">
        <div className="review-header">
          <Badge label="Calificado" badgeClass="badge-blue" icon="⭐" />
          <span className="score-pill">
            {task.grade}
            <span className="score-max">/20</span>
          </span>
        </div>
        <div className="review-comment">{task.feedback || "Sin comentarios adicionales."}</div>
      </div>
    );
  }

  return null;
}

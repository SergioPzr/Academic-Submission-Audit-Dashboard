import type { ReactNode } from "react";
import type { Assignment, TaskStatus } from "../../types/assignment";
import { statusInfo } from "../../utils/status";
import { fmtDate, msToCountdown, pad } from "../../utils/format";
import { Badge } from "../ui/Badge";

interface TaskCardProps {
  task: Assignment;
  status: TaskStatus;
  serverNow: Date;
  onClick: () => void;
}

export function TaskCard({ task, status, serverNow, onClick }: TaskCardProps) {
  const info = statusInfo(status);
  const remainingMs = task.close.getTime() - serverNow.getTime();
  const { days, hours, minutes } = msToCountdown(remainingMs);

  let countdownNode: ReactNode = null;
  if (status === "soon") {
    const urgent = remainingMs < 3600000;
    countdownNode = (
      <div className={`task-countdown ${urgent ? "urgent" : ""}`}>
        ⏱ {days}d {pad(hours)}h {pad(minutes)}m
      </div>
    );
  } else if (status === "pending") {
    countdownNode = <div className="task-countdown">{days}d {pad(hours)}h restantes</div>;
  } else if (status === "submitted") {
    countdownNode = <div className="task-countdown done">✅ Entregado</div>;
  } else if (status === "graded") {
    countdownNode = <div className="task-countdown done">⭐ {task.grade}/20</div>;
  } else if (status === "closed") {
    countdownNode = <div className="task-countdown closed">🔒 Cerrado</div>;
  }

  return (
    <div className={`task-card ${info.cardClass}`} onClick={onClick}>
      <div className={`task-icon ${task.iconClass}`}>{task.icon}</div>
      <div className="task-info">
        <div className="task-name">{task.title}</div>
        <div className="task-meta">
          <span className="task-meta-item">📚 {task.course}</span>
          <span className="task-meta-item">📅 Cierre: {fmtDate(task.close)}</span>
        </div>
      </div>
      <div className="task-right">
        <Badge label={info.label} badgeClass={info.badgeClass} />
        {countdownNode}
      </div>
    </div>
  );
}

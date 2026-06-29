import { useEffect } from "react";
import type { Assignment } from "../../types/assignment";
import { fmtDate } from "../../utils/format";
import { getStatus } from "../../utils/status";
import { useServerTime } from "../../providers/ServerTimeProvider";
import { useUploadDelivery } from "../../hooks/useUploadDelivery";
import { Modal, ModalHeader } from "./Modal";
import { Countdown } from "./Countdown";
import { UploadForm } from "./UploadForm";
import { ReviewBlock } from "./ReviewBlock";

interface TaskDetailModalProps {
  task: Assignment | null;
  onClose: () => void;
  onDelivered: (taskId: number, result: { url: string; hash: string }) => void;
}

export function TaskDetailModal({ task, onClose, onDelivered }: TaskDetailModalProps) {
  const { getServerNow } = useServerTime();
  const { state, progress, error, result, upload, cancel, reset } = useUploadDelivery();

  // Cuando la subida termina bien, propagamos el resultado al padre
  // (que actualiza el Assignment: submittedAt, driveLink, etc.)
  useEffect(() => {
    if (state === "success" && result && task) {
      onDelivered(task.id, result);
    }
  }, [state, result, task, onDelivered]);

  // Resetea el estado de subida cada vez que se abre una tarea distinta
  useEffect(() => {
    reset();
  }, [task?.id, reset]);

  if (!task) return null;

  const status = getStatus(task, getServerNow());
  const closed = status === "closed" && !task.submittedAt;

  return (
    <Modal open={!!task} onClose={onClose}>
      <ModalHeader title={task.title} subtitle={task.course} onClose={onClose} />
      <div className="modal-body">
        <p style={{ fontSize: 13.5, color: "var(--text-2)", marginBottom: 18, lineHeight: 1.6 }}>
          {task.description}
        </p>

        <div className="timeline-row">
          <div className="timeline-item">
            <div className="timeline-label">🟢 Apertura</div>
            <div className="timeline-date">{fmtDate(task.open)}</div>
          </div>
          <div className="timeline-item">
            <div className="timeline-label">🔴 Cierre estricto</div>
            <div className="timeline-date">{fmtDate(task.close)}</div>
          </div>
        </div>

        <Countdown closeDate={task.close} />

        {!closed && status !== "submitted" && status !== "graded" && (
          <UploadForm
            disabled={closed}
            state={state}
            progress={progress}
            error={error}
            onFileSelected={() => {}}
            onSubmit={upload}
            onCancel={cancel}
          />
        )}

        <ReviewBlock status={status} task={task} />
      </div>
    </Modal>
  );
}

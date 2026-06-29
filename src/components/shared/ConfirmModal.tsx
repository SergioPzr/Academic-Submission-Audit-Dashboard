import { cn } from '../../utils/cn';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/55 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-lg animate-[modalIn_0.2s_ease]">
        <h3 className="text-base font-semibold text-text-1 mb-2">{title}</h3>
        <p className="text-sm text-text-2 mb-6">{message}</p>
        <div className="flex gap-2.5 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-border-mid text-text-2 text-sm font-medium hover:bg-surface-2 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors',
              variant === 'danger' ? 'bg-red hover:bg-red/90' : 'bg-indigo hover:bg-indigo/90'
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

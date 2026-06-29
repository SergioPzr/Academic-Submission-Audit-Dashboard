import { cn } from '../../utils/cn';

type Estado = 'A Tiempo' | 'Tardía' | 'Sin entregar' | 'PENDIENTE' | 'CALIFICADO';

const estadoConfig: Record<string, { label: string; className: string }> = {
  'A Tiempo': { label: 'A Tiempo', className: 'bg-green-light text-green-700 border-green-mid' },
  Tardía: { label: 'Tardía', className: 'bg-amber-light text-amber-700 border-amber-mid' },
  'Sin entregar': { label: 'Sin entregar', className: 'bg-surface-2 text-text-2 border-border-mid' },
  PENDIENTE: { label: 'Sin calificar', className: 'bg-surface-2 text-text-2 border-border-mid' },
  CALIFICADO: { label: 'Calificado', className: 'bg-blue-light text-blue-700 border-blue-300' },
};

export default function BadgeEstado({ estado }: { estado: Estado }) {
  const config = estadoConfig[estado] ?? { label: estado, className: 'bg-surface-2 text-text-2' };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border',
        config.className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {config.label}
    </span>
  );
}

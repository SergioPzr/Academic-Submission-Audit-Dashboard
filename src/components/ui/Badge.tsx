interface BadgeProps {
  label: string;
  badgeClass: string; // "badge-green" | "badge-amber" | "badge-red" | "badge-blue" | "badge-gray" | "badge-indigo"
  icon?: string;
}

export function Badge({ label, badgeClass, icon }: BadgeProps) {
  return (
    <span className={`badge ${badgeClass}`}>
      {icon ? <span>{icon}</span> : <span className="badge-dot" />}
      {label}
    </span>
  );
}

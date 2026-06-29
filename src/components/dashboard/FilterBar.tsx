import type { TaskStatus } from "../../types/assignment";

export type FilterKey = TaskStatus | "all";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "pending", label: "A tiempo" },
  { key: "soon", label: "Por vencer" },
  { key: "submitted", label: "Entregadas" },
  { key: "graded", label: "Calificadas" },
  { key: "closed", label: "Cerradas" },
];

interface FilterBarProps {
  active: FilterKey;
  onChange: (key: FilterKey) => void;
}

export function FilterBar({ active, onChange }: FilterBarProps) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {FILTERS.map((f) => {
        const isActive = active === f.key;
        return (
          <button
            key={f.key}
            onClick={() => onChange(f.key)}
            style={{
              padding: "5px 12px",
              borderRadius: 100,
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              border: `1px solid ${isActive ? "var(--indigo)" : "var(--border-mid)"}`,
              background: isActive ? "var(--indigo)" : "none",
              color: isActive ? "#fff" : "var(--text-2)",
              transition: "all .15s",
            }}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}

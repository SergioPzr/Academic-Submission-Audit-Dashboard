interface TopbarProps {
  title: string;
  breadcrumb?: string;
  onToggleSidebar: () => void;
}

export default function Topbar({ title, breadcrumb, onToggleSidebar }: TopbarProps) {
  return (
    <header className="bg-white border-b border-border h-14 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden w-8 h-8 flex items-center justify-center rounded-md border border-border text-text-2 hover:bg-surface-2 text-sm"
        >
          ☰
        </button>
        <div>
          <h1 className="text-sm font-semibold text-text-1">{title}</h1>
          {breadcrumb && <span className="text-xs text-text-3 hidden sm:inline">{breadcrumb}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button className="w-8 h-8 flex items-center justify-center rounded-md border border-border text-text-2 hover:bg-surface-2 text-sm">
          🔔
        </button>
        <button className="w-8 h-8 flex items-center justify-center rounded-md border border-border text-text-2 hover:bg-surface-2 text-sm">
          ⚙️
        </button>
      </div>
    </header>
  );
}

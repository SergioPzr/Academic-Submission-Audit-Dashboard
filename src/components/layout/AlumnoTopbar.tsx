export function AlumnoTopbar() {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <span className="topbar-title">Panel del Alumno</span>
        <span className="topbar-breadcrumb">→ Mis Entregables</span>
      </div>
      <div className="topbar-right">
        <button className="topbar-btn" title="Notificaciones">
          🔔
        </button>
        <button className="topbar-btn" title="Configuración">
          ⚙️
        </button>
      </div>
    </header>
  );
}

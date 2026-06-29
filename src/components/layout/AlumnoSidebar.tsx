interface SidebarProps {
  studentName: string;
  courseLabel: string;
}

export function AlumnoSidebar({ studentName, courseLabel }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">
          <div className="logo-icon">📚</div>
          <div>
            <div className="logo-text">EduTrack</div>
            <div className="logo-sub">Entregables</div>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Principal</div>
        <button className="nav-item active">
          <span className="nav-icon">📋</span>
          <span>Mis Entregables</span>
        </button>
        <button className="nav-item">
          <span className="nav-icon">📅</span>
          <span>Cronograma</span>
        </button>
        <div className="nav-section-label">Académico</div>
        <button className="nav-item">
          <span className="nav-icon">📊</span>
          <span>Mis Calificaciones</span>
        </button>
        <button className="nav-item">
          <span className="nav-icon">📚</span>
          <span>Mis Cursos</span>
        </button>
      </nav>

      <div className="sidebar-role-switch">
        <div className="role-badge">
          <div className="role-avatar" style={{ background: "#4f46e5", color: "#fff" }}>
            {studentName
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")}
          </div>
          <div className="role-info">
            <div className="role-name">{studentName}</div>
            <div className="role-label">{courseLabel}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

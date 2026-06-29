import type { ReactNode } from "react";
import { AlumnoSidebar } from "./AlumnoSidebar";
import { AlumnoTopbar } from "./AlumnoTopbar";
import "../../styles/global.css";

interface AlumnoLayoutProps {
  studentName: string;
  courseLabel: string;
  children: ReactNode;
}

export function AlumnoLayout({ studentName, courseLabel, children }: AlumnoLayoutProps) {
  return (
    <div className="app">
      <AlumnoSidebar studentName={studentName} courseLabel={courseLabel} />
      <div className="main">
        <AlumnoTopbar />
        <div className="page">{children}</div>
      </div>
    </div>
  );
}

import type { Assignment } from "../types/assignment";

/**
 * MOCK — datos hardcodeados para poder maquetar y probar la UI sin backend.
 * En Fase C/D esto se reemplaza por una consulta real a Supabase
 * (tabla Entregables + Entregas, filtrada por RLS según el alumno autenticado).
 */
export function getMockAssignments(): Assignment[] {
  const now = Date.now();
  return [
    {
      id: 1,
      title: "Informe de Análisis Estadístico",
      description:
        "Elabora un informe completo aplicando técnicas de estadística descriptiva e inferencial al dataset proporcionado. Incluye gráficos, tablas y conclusiones bien fundamentadas.",
      course: "Estadística Aplicada — Grupo B",
      open: new Date(now - 3 * 86400000),
      close: new Date(now + 2 * 3600000 + 18 * 60000),
      icon: "📊",
      iconClass: "task-icon-amber",
    },
    {
      id: 2,
      title: "Exposición: Inteligencia Artificial",
      description:
        "Prepara una presentación de 10 diapositivas sobre el impacto de la IA en el sector educativo. Cita al menos 5 fuentes académicas publicadas después de 2020.",
      course: "Tecnologías Emergentes — Grupo A",
      open: new Date(now - 7 * 86400000),
      close: new Date(now - 2 * 86400000),
      icon: "🤖",
      iconClass: "task-icon-red",
    },
    {
      id: 3,
      title: "Diseño de Base de Datos Relacional",
      description:
        "Modela y normaliza hasta 3FN un sistema de gestión de biblioteca. Incluye el diagrama ER, el script SQL de creación y 10 consultas de prueba.",
      course: "Bases de Datos — Grupo C",
      open: new Date(now - 2 * 86400000),
      close: new Date(now + 5 * 86400000),
      icon: "🗄️",
      iconClass: "task-icon-indigo",
    },
    {
      id: 4,
      title: "Ensayo: Ética Profesional en Ingeniería",
      description:
        "Redacta un ensayo de 2000–2500 palabras sobre dilemas éticos en el ejercicio de la ingeniería de software.",
      course: "Ética Profesional — Grupo A",
      open: new Date(now - 10 * 86400000),
      close: new Date(now - 5 * 86400000),
      submittedAt: new Date(now - 6 * 86400000),
      driveLink: "https://drive.google.com/file/d/example1",
      grade: 17,
      feedback:
        "Excelente análisis del código deontológico. La argumentación es sólida y bien fundamentada.",
      icon: "📝",
      iconClass: "task-icon-green",
    },
    {
      id: 5,
      title: "Práctica de Programación Orientada a Objetos",
      description:
        "Implementa un sistema de gestión de inventario usando los principios SOLID. Debe incluir al menos 5 clases, herencia, polimorfismo e interfaces.",
      course: "POO Avanzada — Grupo B",
      open: new Date(now - 1 * 86400000),
      close: new Date(now + 18 * 3600000),
      submittedAt: new Date(now - 0.5 * 86400000),
      driveLink: "https://drive.google.com/file/d/example2",
      grade: null,
      feedback: null,
      icon: "💻",
      iconClass: "task-icon-blue",
    },
  ];
}

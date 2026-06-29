import { useState } from 'react';
import { exportToCSV } from '../../utils/csvExport';
import { fetchEntregas, fetchStudents } from '../../lib/data-service';

interface Props {
  cursoId: string;
  entregableId: string;
  cursoNombre: string;
}

export default function ExportarReporte({ cursoId, entregableId, cursoNombre }: Props) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    const [entregas, students] = await Promise.all([
      fetchEntregas(cursoId, entregableId),
      fetchStudents(),
    ]);
    const studentMap = new Map(students.map((s) => [s.id, s]));

    if (entregas.length === 0) {
      setExporting(false);
      alert('No hay datos para exportar.');
      return;
    }

    const rows = entregas.map((e) => {
      const st = studentMap.get(e.id_alumno) ?? { full_name: 'Desconocido', email: '' };
      return {
        Alumno: st.full_name,
        Email: st.email,
        Estado: e.estado_puntualidad,
        'Fecha Entrega': e.submitted_at || '—',
        Nota: e.nota_num ?? '—',
        Retroalimentacion: e.retroalimentacion ?? '—',
        Calificacion: e.estado_calificacion,
      };
    });

    exportToCSV(rows, `reporte-${cursoNombre.replace(/\s+/g, '-')}-${Date.now()}`);
    setExporting(false);
  };

  return (
    <button onClick={handleExport} disabled={exporting}
      className="px-4 py-2 rounded-lg border border-border-mid text-text-2 text-sm font-medium hover:bg-surface-2 transition-colors flex items-center gap-2 disabled:opacity-50">
      {exporting ? <span className="animate-pulse">Exportando...</span> : <><span>📥</span> Exportar Reporte</>}
    </button>
  );
}

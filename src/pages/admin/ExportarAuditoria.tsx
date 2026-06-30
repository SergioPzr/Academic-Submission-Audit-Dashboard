import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { exportarLogsCSV, type FiltrosAuditoria } from '../../services/auditService';
import Button from '../../components/ui/Button';

interface ExportarAuditoriaProps {
  filtros: FiltrosAuditoria;
  totalLogs: number;
  onShowMessage: (msg: string, type: 'success' | 'error') => void;
}

const ExportarAuditoria: React.FC<ExportarAuditoriaProps> = ({
  filtros,
  totalLogs,
  onShowMessage,
}) => {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (totalLogs === 0) {
      onShowMessage('No existen registros para los parámetros seleccionados', 'error');
      return;
    }

    setExporting(true);
    try {
      const blob = await exportarLogsCSV(filtros);
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const desde = filtros.fechaDesde || 'inicio';
      const hasta = filtros.fechaHasta || 'fin';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      link.setAttribute('download', `auditoria_${desde}_${hasta}_${timestamp}.csv`);
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      onShowMessage('Log de auditoría exportado exitosamente', 'success');
    } catch (err: any) {
      console.error('Error al exportar logs:', err);
      onShowMessage(err.message || 'Error al exportar los registros de auditoría', 'error');
    } finally {
      setExporting(false);
    }
  };

  const isDisabled = totalLogs === 0 || exporting;

  return (
    <Button
      onClick={handleExport}
      disabled={isDisabled}
      loading={exporting}
      variant="primary"
      size="sm"
      icon={<Download size={14} />}
      title={totalLogs === 0 ? 'No existen registros para exportar' : 'Exportar log de auditoría'}
      className="ml-4"
    >
      <span>Exportar CSV/Excel</span>
    </Button>
  );
};

export default ExportarAuditoria;

import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { exportarLogsCSV, type FiltrosAuditoria } from '../../services/auditService';

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
    <button
      onClick={handleExport}
      disabled={isDisabled}
      className="btn btn-primary"
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.5rem',
        opacity: isDisabled ? 0.6 : 1,
        cursor: isDisabled ? 'not-allowed' : 'pointer'
      }}
      title={totalLogs === 0 ? 'No existen registros para exportar' : 'Exportar log de auditoría'}
    >
      <Download size={16} />
      <span>{exporting ? 'Exportando...' : '↓ Exportar CSV/Excel'}</span>
    </button>
  );
};

export default ExportarAuditoria;

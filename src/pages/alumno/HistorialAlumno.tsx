import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getHistorialEntregas, type EntregaHistorial } from '../../services/entregasService';
import { formatInLimaTimezone, formatBytes } from '../../utils/dateUtils';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import ConstanciaModal from './ConstanciaModal';
import { FileDown, Search, Eye, FileText } from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

const HistorialAlumno: React.FC = () => {
  const { perfil } = useAuth();
  const [historial, setHistorial] = useState<EntregaHistorial[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Constancia Modal state
  const [selectedConstancia, setSelectedConstancia] = useState<any | null>(null);
  const [isConstanciaOpen, setIsConstanciaOpen] = useState<boolean>(false);

  useEffect(() => {
    if (!perfil?.id) return;

    const loadHistorial = async () => {
      try {
        const data = await getHistorialEntregas(perfil.id);
        setHistorial(data);
      } catch (err) {
        console.error('Error fetching delivery history:', err);
      } finally {
        setLoading(false);
      }
    };

    loadHistorial();
  }, [perfil?.id]);

  const handleExportCSV = () => {
    if (historial.length === 0) return;

    const headers = [
      'ID de Entrega',
      'Archivo',
      'Curso Código',
      'Curso Nombre',
      'Sección',
      'Tamaño',
      'Fecha de Envío (PET)',
      'Estado Puntualidad',
      'ID de Constancia',
      'Firma Hash (SHA-256)',
      'Nota'
    ];

    const rows = filteredHistorial.map(item => [
      item.id_entrega,
      item.nombre_archivo,
      item.curso_codigo,
      item.curso_nombre,
      item.curso_seccion,
      formatBytes(item.tamano_bytes),
      formatInLimaTimezone(item.timestamp_servidor),
      item.estado_puntualidad,
      item.constancia_id || 'N/A',
      item.file_hash,
      item.revision?.nota !== null && item.revision?.nota !== undefined ? item.revision.nota : 'Sin calificar'
    ]);

    const csvString = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const timestamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `historial_entregas_${perfil?.codigo_institucional || 'alumno'}_${timestamp}.csv`;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleVerConstancia = (item: EntregaHistorial) => {
    setSelectedConstancia({
      constancia_id: item.constancia_id,
      timestamp_servidor: item.timestamp_servidor,
      nombre_archivo: item.nombre_archivo,
      tamano_bytes: item.tamano_bytes,
      file_hash: item.file_hash,
      drive_url: item.drive_url,
      estado_puntualidad: item.estado_puntualidad,
      curso_nombre: item.curso_nombre,
      entregable_titulo: item.entregable_titulo
    });
    setIsConstanciaOpen(true);
  };

  const filteredHistorial = historial.filter(
    item =>
      item.nombre_archivo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.curso_nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.curso_codigo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.entregable_titulo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Historial de Entregas</h2>
          <p className="text-xs text-slate-400 font-medium mt-1">Consulta y descarga todos tus comprobantes y revisiones</p>
        </div>
        
        {historial.length > 0 && (
          <Button 
            variant="secondary"
            size="sm"
            className="flex items-center gap-2 text-xs font-semibold"
            onClick={handleExportCSV}
          >
            <FileDown size={16} />
            <span>Exportar CSV</span>
          </Button>
        )}
      </div>

      {historial.length === 0 ? (
        <EmptyState 
          title="Sin historial de entregas"
          description="Aún no has realizado ninguna entrega en la plataforma."
        />
      ) : (
        <Card className="overflow-hidden border border-slate-150 rounded-2xl">
          {/* Table Toolbar */}
          <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por archivo, curso o actividad..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="text-xs text-slate-400 ml-auto font-bold">
              Mostrando {filteredHistorial.length} de {historial.length} registros
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs text-slate-700">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr className="font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Archivo / Actividad</th>
                  <th className="px-6 py-4">Curso</th>
                  <th className="px-6 py-4">Tamaño</th>
                  <th className="px-6 py-4">Fecha de Envío</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">Calificación</th>
                  <th className="px-6 py-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredHistorial.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 font-semibold">
                      No se encontraron entregas que coincidan con la búsqueda.
                    </td>
                  </tr>
                ) : (
                  filteredHistorial.map((item) => (
                    <tr key={item.id_entrega} className="hover:bg-slate-50/30 transition">
                      <td className="px-6 py-4">
                        <div className="max-w-xs md:max-w-sm text-left">
                          <p className="font-bold text-slate-800 truncate" title={item.nombre_archivo}>
                            {item.nombre_archivo}
                          </p>
                          <p className="text-[10px] text-slate-400 font-semibold truncate mt-0.5">
                            Actividad: {item.entregable_titulo}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-left">
                          <p className="font-bold text-slate-700 font-mono">{item.curso_codigo}</p>
                          <p className="text-[10px] text-slate-400 font-semibold truncate mt-0.5 max-w-[150px]">{item.curso_nombre}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-500">
                        {formatBytes(item.tamano_bytes)}
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-medium whitespace-nowrap">
                        {formatInLimaTimezone(item.timestamp_servidor)}
                      </td>
                      <td className="px-6 py-4">
                        <Badge 
                          variant={item.estado_puntualidad === 'A Tiempo' ? 'success' : 'warning'}
                          label={item.estado_puntualidad}
                        />
                      </td>
                      <td className="px-6 py-4">
                        {item.revision ? (
                          <span className="font-mono font-bold text-purple-800 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200/50">
                            {item.revision.nota !== null ? String(item.revision.nota.toFixed(1)).padStart(4, '0') : 'NE'}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-bold italic">Pendiente</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button 
                            onClick={() => handleVerConstancia(item)}
                            className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                            title="Ver Constancia Digital"
                          >
                            <FileText size={16} />
                          </button>
                          {item.drive_url && (
                            <a 
                              href={item.drive_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
                              title="Descargar archivo original"
                            >
                              <Eye size={16} />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Constancia Modal */}
      <ConstanciaModal
        isOpen={isConstanciaOpen}
        onClose={() => setIsConstanciaOpen(false)}
        constancia={selectedConstancia}
      />
    </div>
  );
};

export default HistorialAlumno;

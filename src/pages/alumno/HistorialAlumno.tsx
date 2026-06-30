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

    // Create a Blob with UTF-8 BOM to properly support special characters in Excel
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
    <div className="space-y-6 animate-fade-in">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Historial de Entregas</h2>
          <p className="text-xs text-gray-500 mt-0.5">Consulta y descarga todos tus comprobantes y revisiones</p>
        </div>
        
        {historial.length > 0 && (
          <Button 
            variant="secondary"
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
        <Card className="overflow-hidden border border-gray-200">
          {/* Table Toolbar */}
          <div className="p-4 bg-gray-50 border-b flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por archivo, curso o actividad..."
                className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="text-xs text-gray-500 ml-auto font-medium">
              Mostrando {filteredHistorial.length} de {historial.length} registros
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-gray-700">
              <thead>
                <tr className="bg-gray-150 border-b font-semibold text-gray-600">
                  <th className="p-4">Archivo / Actividad</th>
                  <th className="p-4">Curso</th>
                  <th className="p-4">Tamaño</th>
                  <th className="p-4">Fecha de Envío</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4">Calificación</th>
                  <th className="p-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredHistorial.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500">
                      No se encontraron entregas que coincidan con la búsqueda.
                    </td>
                  </tr>
                ) : (
                  filteredHistorial.map((item) => (
                    <tr key={item.id_entrega} className="hover:bg-gray-50 transition">
                      <td className="p-4">
                        <div className="max-w-xs md:max-w-sm">
                          <p className="font-semibold text-gray-900 truncate" title={item.nombre_archivo}>
                            {item.nombre_archivo}
                          </p>
                          <p className="text-xs text-gray-400 font-medium truncate mt-0.5">
                            Actividad: {item.entregable_titulo}
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-bold text-gray-800">{item.curso_codigo}</p>
                          <p className="text-xs text-gray-500 truncate mt-0.5 max-w-[150px]">{item.curso_nombre}</p>
                        </div>
                      </td>
                      <td className="p-4 font-medium text-gray-600">
                        {formatBytes(item.tamano_bytes)}
                      </td>
                      <td className="p-4 text-gray-500 whitespace-nowrap">
                        {formatInLimaTimezone(item.timestamp_servidor)}
                      </td>
                      <td className="p-4">
                        <Badge 
                          variant={item.estado_puntualidad === 'A Tiempo' ? 'success' : 'warning'}
                          label={item.estado_puntualidad}
                        />
                      </td>
                      <td className="p-4">
                        {item.revision ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                              {item.revision.nota !== null ? String(item.revision.nota).padStart(2, '0') : 'NE'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Pendiente</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => handleVerConstancia(item)}
                            className="p-1.5 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition duration-200"
                            title="Ver Constancia Digital"
                          >
                            <FileText size={18} />
                          </button>
                          {item.drive_url && (
                            <a 
                              href={item.drive_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition duration-200"
                              title="Ver archivo original en Drive"
                            >
                              <Eye size={18} />
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

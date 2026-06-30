import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { formatInLimaTimezone, formatBytes } from '../../utils/dateUtils';
import { CheckCircle2, Printer, Copy, Check, X, FileText, Download } from 'lucide-react';
import Button from '../../components/ui/Button';

interface ConstanciaModalProps {
  isOpen: boolean;
  onClose: () => void;
  constancia: {
    constancia_id: string | null;
    timestamp_servidor: string;
    nombre_archivo: string;
    tamano_bytes: number;
    file_hash: string;
    drive_url?: string;
    estado_puntualidad: string;
    curso_nombre: string;
    entregable_titulo: string;
  } | null;
}

const ConstanciaModal: React.FC<ConstanciaModalProps> = ({ isOpen, onClose, constancia }) => {
  const { perfil } = useAuth();
  const [copied, setCopied] = useState(false);

  if (!isOpen || !constancia) return null;

  const handleCopyHash = () => {
    navigator.clipboard.writeText(constancia.file_hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const isLate = constancia.estado_puntualidad === 'Tardía';

  return (
    <div className="modal-overlay flex items-center justify-center fixed inset-0 z-50 overflow-y-auto" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}>
      <div 
        id="printable-constancia"
        className="bg-white w-full max-w-lg mx-4 rounded-xl shadow-lg border relative overflow-hidden"
        style={{ 
          borderColor: isLate ? 'var(--color-warning)' : 'var(--color-success)',
          borderTopWidth: '8px'
        }}
      >
        {/* Header */}
        <div className="p-6 border-b flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={28} className={isLate ? 'text-amber-500' : 'text-green-600'} />
            <div>
              <h3 className="text-lg font-bold text-gray-900">Constancia de Entrega Digital</h3>
              <p className="text-xs text-gray-500 font-mono">ID: {constancia.constancia_id || 'SIN_ID'}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition duration-250 no-print"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="text-center pb-4 border-b border-dashed">
            <span 
              className={`inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-2 ${
                isLate 
                  ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                  : 'bg-green-100 text-green-800 border border-green-300'
              }`}
            >
              Entrega {constancia.estado_puntualidad}
            </span>
            <p className="text-sm text-gray-600">
              El entregable ha sido subido al repositorio institucional de Google Drive.
            </p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
            <div>
              <span className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Estudiante</span>
              <span className="font-semibold text-gray-800">{perfil?.nombre_completo || 'Cargando...'}</span>
            </div>
            <div>
              <span className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Código</span>
              <span className="font-semibold text-gray-800 font-mono">{perfil?.codigo_institucional || 'N/A'}</span>
            </div>

            <div className="col-span-2">
              <span className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Curso</span>
              <span className="font-semibold text-gray-800">{constancia.curso_nombre}</span>
            </div>

            <div className="col-span-2">
              <span className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Entregable</span>
              <span className="font-semibold text-gray-800">{constancia.entregable_titulo}</span>
            </div>

            <div>
              <span className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha y Hora (PET)</span>
              <span className="font-semibold text-gray-800">{formatInLimaTimezone(constancia.timestamp_servidor)}</span>
            </div>
            <div>
              <span className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Tamaño</span>
              <span className="font-semibold text-gray-800">{formatBytes(constancia.tamano_bytes)}</span>
            </div>

            <div className="col-span-2 bg-gray-50 p-3 rounded-lg border">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText size={14} /> Archivo Subido
                </span>
                {constancia.drive_url && (
                  <a 
                    href={constancia.drive_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-xs font-medium text-emerald-700 hover:text-emerald-950 flex items-center gap-1 no-print"
                  >
                    <Download size={12} /> Ver en Drive
                  </a>
                )}
              </div>
              <span className="block font-semibold text-gray-800 truncate">{constancia.nombre_archivo}</span>
            </div>

            <div className="col-span-2 bg-slate-50 p-3 rounded-lg border font-mono text-xs">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Firma Digital (SHA-256)</span>
                <button 
                  onClick={handleCopyHash} 
                  className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-200 transition duration-250 flex items-center gap-1 no-print"
                  title="Copiar firma"
                >
                  {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                  <span>{copied ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>
              <span className="block text-slate-700 break-all bg-white p-2 border rounded mt-1 font-semibold">{constancia.file_hash}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3 no-print">
          <Button 
            variant="secondary" 
            onClick={handlePrint}
            className="flex items-center gap-2"
          >
            <Printer size={18} />
            <span>Imprimir</span>
          </Button>
          <Button 
            variant="primary" 
            onClick={onClose}
          >
            Aceptar
          </Button>
        </div>
      </div>
      
      {/* Printable styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-constancia, #printable-constancia * {
            visibility: visible;
          }
          #printable-constancia {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none !important;
            box-shadow: none !important;
            margin: 0;
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ConstanciaModal;

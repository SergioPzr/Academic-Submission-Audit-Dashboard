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
    <div className="modal-overlay" onClick={onClose}>
      <div 
        id="printable-constancia"
        className="modal-box max-w-lg overflow-hidden border-t-8 text-left"
        style={{ 
          borderColor: isLate ? '#F59E0B' : '#16A34A',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={24} className={isLate ? 'text-amber-500' : 'text-emerald-600'} />
            <div>
              <h3 className="text-sm font-bold text-slate-800">Constancia de Entrega</h3>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {constancia.constancia_id || 'SIN_ID'}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 transition no-print"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="text-center pb-4 border-b border-dashed border-slate-200">
            <span 
              className={`inline-block px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider mb-2 border ${
                isLate 
                  ? 'bg-amber-50 text-amber-700 border-amber-200' 
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              Entrega {constancia.estado_puntualidad}
            </span>
            <p className="text-xs text-slate-500 font-medium">
              El entregable ha sido subido de forma segura al repositorio institucional.
            </p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-xs">
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estudiante</span>
              <span className="font-bold text-slate-700 mt-1 block">{perfil?.nombre_completo || 'Cargando...'}</span>
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Código</span>
              <span className="font-bold text-slate-700 font-mono mt-1 block">{perfil?.codigo_institucional || 'N/A'}</span>
            </div>

            <div className="col-span-2">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Curso</span>
              <span className="font-bold text-slate-700 mt-1 block">{constancia.curso_nombre}</span>
            </div>

            <div className="col-span-2">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Entregable</span>
              <span className="font-bold text-slate-700 mt-1 block">{constancia.entregable_titulo}</span>
            </div>

            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fecha y Hora</span>
              <span className="font-bold text-slate-700 mt-1 block">{formatInLimaTimezone(constancia.timestamp_servidor)}</span>
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tamaño</span>
              <span className="font-bold text-slate-700 mt-1 block">{formatBytes(constancia.tamano_bytes)}</span>
            </div>

            <div className="col-span-2 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText size={14} /> Archivo Subido
                </span>
                {constancia.drive_url && (
                  <a 
                    href={constancia.drive_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-[10px] font-bold text-emerald-700 hover:underline flex items-center gap-1 no-print"
                  >
                    <Download size={12} /> Descargar Archivo
                  </a>
                )}
              </div>
              <span className="block font-bold text-slate-800 truncate">{constancia.nombre_archivo}</span>
            </div>

            <div className="col-span-2 bg-slate-50 p-3.5 rounded-xl border border-slate-100 font-mono text-[10px]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Firma Digital (SHA-256)</span>
                <button 
                  onClick={handleCopyHash} 
                  className="text-slate-400 hover:text-slate-600 flex items-center gap-1 no-print font-bold"
                  title="Copiar firma"
                >
                  {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                  <span>{copied ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>
              <span className="block text-slate-600 break-all bg-white p-2.5 border border-slate-200/50 rounded-lg mt-1 font-semibold">{constancia.file_hash}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 no-print">
          <Button 
            variant="secondary" 
            size="sm"
            onClick={handlePrint}
            icon={<Printer size={14} />}
          >
            Imprimir
          </Button>
          <Button 
            variant="primary" 
            size="sm"
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

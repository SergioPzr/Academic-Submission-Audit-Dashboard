import React, { useState, useRef } from 'react';
import { Upload, X, File, AlertCircle, Loader2 } from 'lucide-react';
import { subirEntrega, getServerTime, type EntregableConEstado } from '../../services/entregasService';
import Button from '../../components/ui/Button';
import { formatBytes } from '../../utils/dateUtils';

interface ModalEntregaProps {
  isOpen: boolean;
  onClose: () => void;
  entregable: EntregableConEstado | null;
  onSuccess: (constanciaData: any) => void;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

const ModalEntrega: React.FC<ModalEntregaProps> = ({ isOpen, onClose, entregable, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !entregable) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateFile = (selectedFile: File): boolean => {
    setError(null);
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(`El archivo excede el tamaño máximo permitido de ${formatBytes(MAX_FILE_SIZE)}.`);
      return false;
    }
    return true;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      if (validateFile(selectedFile)) {
        setFile(selectedFile);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (validateFile(selectedFile)) {
        setFile(selectedFile);
      }
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = () => {
    setFile(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !entregable) return;

    setUploading(true);
    setError(null);

    try {
      const serverTime = await getServerTime();
      const deadlineTime = new Date(entregable.fecha_cierre_efectiva).getTime();
      
      if (serverTime.getTime() > deadlineTime && !entregable.admite_extemporaneas) {
        throw new Error('El plazo de entrega para este entregable ha expirado y no se admiten entregas extemporáneas.');
      }

      const response = await subirEntrega(file, entregable.id_entregable, entregable.id_curso);
      
      if (response && response.success) {
        onSuccess(response.constancia);
        onClose();
        handleRemoveFile();
      } else {
        throw new Error('No se pudo procesar la entrega.');
      }
    } catch (err: any) {
      console.error('Error submitting file:', err);
      setError(err.message || 'Ocurrió un error inesperado al subir el archivo. Inténtelo nuevamente.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box max-w-lg" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 text-left">
          <div>
            <h3 className="text-base font-bold text-slate-800">Entregar Trabajo</h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">{entregable.curso_codigo} - {entregable.curso_nombre}</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 transition"
            disabled={uploading}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-left">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Actividad</label>
            <span className="block text-sm font-bold text-slate-800">{entregable.titulo}</span>
            {entregable.descripcion && (
              <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 border border-slate-100 p-3 rounded-xl mt-2">
                {entregable.descripcion}
              </p>
            )}
          </div>

          {/* Drag & drop zone */}
          {!file ? (
            <div
              className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
                dragActive 
                  ? 'border-emerald-500 bg-emerald-50/50' 
                  : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
              }`}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={handleButtonClick}
            >
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <Upload size={32} className={`mb-3 transition ${dragActive ? 'text-emerald-600' : 'text-slate-400'}`} />
              <p className="text-xs font-bold text-slate-700 text-center">
                Arrastra tu archivo aquí o <span className="text-emerald-700 hover:underline">haz clic para explorar</span>
              </p>
              <p className="text-[10px] text-slate-400 mt-2 text-center leading-relaxed">
                Formatos soportados: PDF, DOCX, XLSX, imágenes, ZIP/RAR
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5 text-center">
                Límite de tamaño: {formatBytes(MAX_FILE_SIZE)}
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl">
              <div className="flex items-center gap-3 truncate">
                <div className="bg-emerald-100/50 p-2 rounded-xl text-emerald-800">
                  <File size={22} />
                </div>
                <div className="truncate text-left">
                  <p className="text-xs font-bold text-slate-800 truncate">{file.name}</p>
                  <p className="text-[10px] text-slate-400 font-semibold">{formatBytes(file.size)}</p>
                </div>
              </div>
              {!uploading && (
                <button 
                  type="button"
                  onClick={handleRemoveFile} 
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-emerald-100/50 transition"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-semibold leading-relaxed">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={uploading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!file || uploading}
              className="flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Subiendo...</span>
                </>
              ) : (
                <span>Confirmar Entrega</span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalEntrega;

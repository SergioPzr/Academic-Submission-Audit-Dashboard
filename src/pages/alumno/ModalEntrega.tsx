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
      // 1. Verify window is open on the server first (as extra client-side check)
      const serverTime = await getServerTime();
      const deadlineTime = new Date(entregable.fecha_cierre_efectiva).getTime();
      
      if (serverTime.getTime() > deadlineTime && !entregable.admite_extemporaneas) {
        throw new Error('El plazo de entrega para este entregable ha expirado y no se admiten entregas extemporáneas.');
      }

      // 2. Upload file via service (invokes upload-delivery Edge Function)
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
    <div className="modal-overlay flex items-center justify-center fixed inset-0 z-50 overflow-y-auto" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white w-full max-w-lg mx-4 rounded-xl shadow-lg border relative overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b flex justify-between items-center bg-gray-50">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Entregar Trabajo</h3>
            <p className="text-xs text-gray-500 mt-0.5">{entregable.curso_codigo} - {entregable.curso_nombre}</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition duration-250"
            disabled={uploading}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-500 uppercase">Actividad</label>
            <span className="block text-base font-bold text-gray-800">{entregable.titulo}</span>
            {entregable.descripcion && (
              <p className="text-sm text-gray-600 bg-gray-50 p-2 border rounded">{entregable.descripcion}</p>
            )}
          </div>

          {/* Drag & drop zone */}
          {!file ? (
            <div
              className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-250 ${
                dragActive 
                  ? 'border-emerald-500 bg-emerald-50' 
                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
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
              <Upload size={36} className={`mb-3 ${dragActive ? 'text-emerald-500' : 'text-gray-400'}`} />
              <p className="text-sm font-semibold text-gray-700 text-center">
                Arrastra tu archivo aquí o <span className="text-emerald-700 hover:underline">haz clic para explorar</span>
              </p>
              <p className="text-xs text-gray-400 mt-1.5 text-center">
                Formatos soportados: Documentos (PDF, DOCX, XLSX), Código (.py, .java, etc.), Imágenes (PNG, JPG) y ZIP/RAR
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Límite de tamaño: {formatBytes(MAX_FILE_SIZE)}
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-center gap-3 truncate">
                <div className="bg-emerald-100 p-2 rounded-lg text-emerald-800">
                  <File size={24} />
                </div>
                <div className="truncate">
                  <p className="text-sm font-semibold text-gray-800 truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">{formatBytes(file.size)}</p>
                </div>
              </div>
              {!uploading && (
                <button 
                  type="button"
                  onClick={handleRemoveFile} 
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-emerald-100 transition duration-200"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="border-t pt-4 flex justify-end gap-3 bg-white">
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
                  <Loader2 size={16} className="animate-spin" />
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

import React, { useState, useRef, useCallback } from 'react';
import { Upload, CheckCircle, XCircle, AlertTriangle, FileText } from 'lucide-react';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import {
  validarFilasCSV,
  procesarMatriculaMasiva,
  type FilaCSV,
  type FilaCSVValidada,
} from '../../services/adminService';

function parseCSV(text: string): FilaCSV[] {
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length < 2) return [];

  const header = lines[0];
  const delim = header.includes(';') ? ';' : ',';
  const headers = header.split(delim).map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));

  return lines.slice(1).map((line) => {
    const values = line.split(delim).map((v) => v.trim().replace(/^"|"$/g, ''));
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = values[i] ?? ''; });
    return {
      codigo: obj['codigo'] ?? obj['código'] ?? obj['code'] ?? '',
      nombre: obj['nombre'] ?? obj['name'] ?? '',
      correo: obj['correo'] ?? obj['email'] ?? obj['correo_electronico'] ?? '',
      curso: obj['curso'] ?? obj['course'] ?? obj['codigo_curso'] ?? '',
      seccion: obj['seccion'] ?? obj['sección'] ?? obj['section'] ?? '',
    } as FilaCSV;
  });
}

const MatriculaMasiva: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rawFilas, setRawFilas] = useState<FilaCSV[]>([]);
  const [filasValidadas, setFilasValidadas] = useState<FilaCSVValidada[]>([]);
  const [validating, setValidating] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [resultado, setResultado] = useState<{ insertadas: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setError('Solo se aceptan archivos .CSV');
      return;
    }
    setError(null);
    setResultado(null);
    setFileName(file.name);
    const text = await file.text();
    const filas = parseCSV(text);
    if (filas.length === 0) {
      setError('El archivo está vacío o no tiene el formato correcto.');
      return;
    }
    setRawFilas(filas);
    setFilasValidadas([]);

    // Auto-validate
    setValidating(true);
    try {
      const validadas = await validarFilasCSV(filas);
      setFilasValidadas(validadas);
    } catch (err: any) {
      setError('Error al validar: ' + (err.message ?? 'Error desconocido'));
    } finally {
      setValidating(false);
    }
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const allValid = filasValidadas.length > 0 && filasValidadas.every((f) => f.valida);
  const validCount = filasValidadas.filter((f) => f.valida).length;
  const invalidCount = filasValidadas.filter((f) => !f.valida).length;

  const handleConfirmar = async () => {
    setProcessing(true);
    setError(null);
    try {
      const res = await procesarMatriculaMasiva(filasValidadas);
      setResultado(res);
      setFilasValidadas([]);
      setRawFilas([]);
      setFileName(null);
    } catch (err: any) {
      setError(err.message ?? 'Error al procesar la matrícula');
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setFileName(null);
    setRawFilas([]);
    setFilasValidadas([]);
    setResultado(null);
    setError(null);
  };

  return (
    <Card className="p-6 text-left space-y-6">
      {/* Success */}
      {resultado && (
        <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
          <CheckCircle size={48} className="text-emerald-500" />
          <h3 className="text-lg font-bold text-emerald-700">
            Matrícula procesada exitosamente
          </h3>
          <p className="text-xs text-slate-500 font-semibold leading-relaxed max-w-sm">
            Se insertaron <strong className="text-slate-800 font-extrabold">{resultado.insertadas}</strong> matrícula{resultado.insertadas !== 1 ? 's' : ''} en el sistema.
          </p>
          <Button variant="secondary" size="md" onClick={handleReset}>
            Cargar otro archivo
          </Button>
        </div>
      )}

      {!resultado && (
        <>
          {/* Dropzone */}
          {!fileName && (
            <div
              className={`csv-dropzone border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-50/50'
                  : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                style={{ display: 'none' }}
                onChange={handleInputChange}
                id="csv-file-input"
              />
              <Upload size={36} className="text-emerald-600 mb-3" />
              <p className="text-sm font-bold text-slate-700">
                Arrastra tu archivo CSV aquí
              </p>
              <p className="text-xs text-slate-400 font-medium mt-1">o haz click para seleccionarlo</p>
              
              <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200/50 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 mt-6">
                <FileText size={14} className="text-slate-400" />
                <span>Columnas requeridas: <code className="text-emerald-800 font-bold font-mono text-[10px]">codigo, nombre, correo, curso, seccion</code></span>
              </div>
            </div>
          )}

          {/* File loaded banner */}
          {fileName && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
              <div className="flex items-center gap-3">
                <FileText size={20} className="text-emerald-600" />
                <div className="text-left">
                  <p className="text-xs font-bold text-emerald-800">{fileName}</p>
                  <p className="text-[10px] text-emerald-600 font-semibold">{rawFilas.length} filas detectadas</p>
                </div>
              </div>
              <button 
                className="text-xs font-bold text-slate-500 hover:text-slate-700 underline" 
                onClick={handleReset}
              >
                Cambiar archivo
              </button>
            </div>
          )}

          {validating && (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
              <Spinner size="md" />
              <p className="text-xs text-slate-400 font-bold">
                Validando {rawFilas.length} registros contra la base de datos…
              </p>
            </div>
          )}

          {/* Validation Summary and Preview */}
          {filasValidadas.length > 0 && !validating && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-4 bg-slate-50/50 p-4 border border-slate-100 rounded-xl">
                <div className="flex items-center gap-1 text-xs font-bold text-emerald-700">
                  <CheckCircle size={14} />
                  <span>{validCount} válido{validCount !== 1 ? 's' : ''}</span>
                </div>
                {invalidCount > 0 && (
                  <div className="flex items-center gap-1 text-xs font-bold text-red-600 border-l border-slate-200 pl-4">
                    <XCircle size={14} />
                    <span>{invalidCount} con error{invalidCount !== 1 ? 'es' : ''}</span>
                  </div>
                )}
                {!allValid && (
                  <div className="flex items-center gap-1 text-xs font-bold text-amber-600 border-l border-slate-200 pl-4">
                    <AlertTriangle size={14} />
                    <span>Corrige los errores antes de confirmar</span>
                  </div>
                )}
              </div>

              {/* Preview table */}
              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="min-w-full divide-y divide-slate-100 text-xs">
                  <thead className="bg-slate-50/50">
                    <tr>
                      <th className="px-6 py-3.5 text-left font-bold text-slate-400 uppercase tracking-wider">#</th>
                      <th className="px-6 py-3.5 text-left font-bold text-slate-400 uppercase tracking-wider">Código</th>
                      <th className="px-6 py-3.5 text-left font-bold text-slate-400 uppercase tracking-wider">Nombre</th>
                      <th className="px-6 py-3.5 text-left font-bold text-slate-400 uppercase tracking-wider">Correo</th>
                      <th className="px-6 py-3.5 text-left font-bold text-slate-400 uppercase tracking-wider">Curso</th>
                      <th className="px-6 py-3.5 text-left font-bold text-slate-400 uppercase tracking-wider">Sección</th>
                      <th className="px-6 py-3.5 text-left font-bold text-slate-400 uppercase tracking-wider">Validación</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {filasValidadas.map((fila, i) => (
                      <tr 
                        key={i} 
                        className={`hover:bg-slate-50/30 transition ${
                          fila.valida ? '' : 'bg-red-50/20 hover:bg-red-50/40'
                        }`}
                      >
                        <td className="px-6 py-3.5 text-slate-400 font-bold">{i + 1}</td>
                        <td className="px-6 py-3.5 font-bold text-slate-700 font-mono">{fila.codigo}</td>
                        <td className="px-6 py-3.5 font-semibold text-slate-800 text-left">{fila.nombre}</td>
                        <td className="px-6 py-3.5 text-slate-500 font-semibold text-left">{fila.correo}</td>
                        <td className="px-6 py-3.5 font-bold text-slate-700 font-mono">{fila.curso}</td>
                        <td className="px-6 py-3.5 font-bold text-slate-700 font-mono">{fila.seccion}</td>
                        <td className="px-6 py-3.5 whitespace-nowrap">
                          {fila.valida ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                              <CheckCircle size={12} />
                              <span>OK</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-600 font-bold" title={fila.error}>
                              <XCircle size={12} />
                              <span>{fila.error}</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Confirm actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button variant="secondary" size="md" onClick={handleReset}>
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  disabled={!allValid || processing}
                  loading={processing}
                  onClick={handleConfirmar}
                >
                  Confirmar matrícula ({validCount})
                </Button>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 border border-red-200 bg-red-50 text-red-800 rounded-xl flex items-center gap-2 text-xs font-semibold mt-4">
              <AlertTriangle size={16} className="text-red-600" />
              <span>{error}</span>
            </div>
          )}
        </>
      )}
    </Card>
  );
};

export default MatriculaMasiva;

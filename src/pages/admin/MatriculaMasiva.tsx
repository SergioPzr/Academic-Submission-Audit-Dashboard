import React, { useState, useRef, useCallback } from 'react';
import { Upload, CheckCircle, XCircle, AlertTriangle, FileText } from 'lucide-react';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import {
  validarFilasCSV,
  procesarMatriculaMasiva,
  type FilaCSV,
  type FilaCSVValidada,
} from '../../services/adminService';

function parseCSV(text: string): FilaCSV[] {
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length < 2) return [];

  // Detect delimiter
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
    <div className="matricula-masiva">
      {/* Success */}
      {resultado && (
        <div className="matricula-success">
          <CheckCircle size={40} color="var(--color-success)" />
          <h3 style={{ marginTop: '1rem', color: 'var(--color-success)' }}>
            Matrícula procesada exitosamente
          </h3>
          <p className="text-subtitle" style={{ marginTop: '0.5rem' }}>
            Se insertaron <strong>{resultado.insertadas}</strong> matrícula{resultado.insertadas !== 1 ? 's' : ''} en el sistema.
          </p>
          <Button variant="secondary" onClick={handleReset} style={{ marginTop: '1.5rem' }}>
            Cargar otro archivo
          </Button>
        </div>
      )}

      {!resultado && (
        <>
          {/* Dropzone */}
          {!fileName && (
            <div
              className={`csv-dropzone${isDragging ? ' csv-dropzone-active' : ''}`}
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
              <Upload size={36} color="var(--color-primary)" style={{ marginBottom: '1rem' }} />
              <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                Arrastra tu archivo CSV aquí
              </p>
              <p className="text-subtitle">o haz click para seleccionarlo</p>
              <div className="csv-format-hint">
                <FileText size={14} />
                <span>Columnas requeridas: <code>codigo, nombre, correo, curso, seccion</code></span>
              </div>
            </div>
          )}

          {/* File loaded */}
          {fileName && (
            <div className="csv-file-loaded">
              <div className="csv-file-info">
                <FileText size={20} color="var(--color-primary)" />
                <span style={{ fontWeight: 500 }}>{fileName}</span>
                <span className="text-subtitle">· {rawFilas.length} filas detectadas</span>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={handleReset}>
                Cambiar archivo
              </button>
            </div>
          )}

          {validating && (
            <div className="admin-loading-center" style={{ padding: '2rem' }}>
              <Spinner size="md" />
              <p className="text-subtitle" style={{ marginTop: '0.75rem' }}>
                Validando {rawFilas.length} registros contra la base de datos…
              </p>
            </div>
          )}

          {/* Summary */}
          {filasValidadas.length > 0 && !validating && (
            <>
              <div className="csv-summary">
                <div className="csv-summary-item csv-summary-ok">
                  <CheckCircle size={16} />
                  <span>{validCount} válido{validCount !== 1 ? 's' : ''}</span>
                </div>
                {invalidCount > 0 && (
                  <div className="csv-summary-item csv-summary-error">
                    <XCircle size={16} />
                    <span>{invalidCount} con error{invalidCount !== 1 ? 'es' : ''}</span>
                  </div>
                )}
                {!allValid && (
                  <div className="csv-summary-item csv-summary-warn">
                    <AlertTriangle size={16} />
                    <span>Corrige los errores antes de confirmar</span>
                  </div>
                )}
              </div>

              {/* Preview table */}
              <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
                <table className="admin-table csv-preview-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>CÓDIGO</th>
                      <th>NOMBRE</th>
                      <th>CORREO</th>
                      <th>CURSO</th>
                      <th>SECCIÓN</th>
                      <th>VALIDACIÓN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filasValidadas.map((fila, i) => (
                      <tr key={i} className={fila.valida ? '' : 'csv-row-error'}>
                        <td>{i + 1}</td>
                        <td className="admin-td-mono">{fila.codigo}</td>
                        <td>{fila.nombre}</td>
                        <td className="admin-td-email">{fila.correo}</td>
                        <td className="admin-td-mono">{fila.curso}</td>
                        <td className="admin-td-mono">{fila.seccion}</td>
                        <td>
                          {fila.valida ? (
                            <span className="validation-ok">
                              <CheckCircle size={12} />
                              <span> OK</span>
                            </span>
                          ) : (
                            <span className="validation-error" title={fila.error}>
                              <XCircle size={12} />
                              <span> {fila.error}</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Confirm button */}
              <div className="csv-actions">
                <Button variant="secondary" onClick={handleReset}>
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  disabled={!allValid || processing}
                  loading={processing}
                  onClick={handleConfirmar}
                >
                  {processing ? 'Procesando…' : `Confirmar matrícula (${validCount})`}
                </Button>
              </div>
            </>
          )}

          {error && (
            <div className="admin-error-banner" style={{ marginTop: '1rem' }}>
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MatriculaMasiva;

import { useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';

export default function MatriculaUpload() {
  const [cursoId, setCursoId] = useState('');
  const [seccion, setSeccion] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    if (!file || !cursoId || !seccion) {
      setResult({ success: false, message: 'Completa todos los campos y selecciona un archivo CSV.' });
      return;
    }

    setUploading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('curso_id', cursoId);
    formData.append('seccion', seccion);

    const { data, error: invokeError } = await supabase.functions.invoke('bulk-enrollment', {
      body: formData,
    });

    setUploading(false);

    if (invokeError) {
      setResult({ success: false, message: 'Error al procesar la matrícula. Verifica el archivo.' });
      return;
    }

    if (data?.success) {
      setResult({
        success: true,
        message: `Matrícula completada. ${data.registros_procesados} alumnos registrados. Transacción: ${data.transaccion_id}`,
      });
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } else {
      setResult({
        success: false,
        message: data?.message ?? 'Error: algún código de alumno no existe en el sistema. Se ejecutó ROLLBACK total (RN-028).',
      });
    }
  };

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm p-5 max-w-lg">
      <h3 className="text-sm font-semibold text-text-1 mb-4 flex items-center gap-2">
        <span>📝</span> Matrícula Masiva (CSV)
      </h3>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-text-2 mb-1.5">ID del curso</label>
          <input type="text" value={cursoId} onChange={(e) => setCursoId(e.target.value)}
            placeholder="UUID del curso"
            className="w-full px-3 py-2 border border-border-mid rounded-lg text-sm outline-none focus:border-indigo transition-colors" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-2 mb-1.5">Sección</label>
          <input type="text" value={seccion} onChange={(e) => setSeccion(e.target.value)}
            placeholder="A / B / C"
            className="w-full px-3 py-2 border border-border-mid rounded-lg text-sm outline-none focus:border-indigo transition-colors" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-2 mb-1.5">Archivo CSV</label>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm text-text-2 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-indigo file:text-white hover:file:bg-indigo/90"
          />
          <p className="text-[10px] text-text-3 mt-1">El CSV debe contener una columna con los códigos de alumno.</p>
        </div>

        {result && (
          <div className={`text-xs flex items-center gap-1.5 p-2.5 rounded-lg ${
            result.success ? 'bg-green-light text-green' : 'bg-red-light text-red'
          }`}>
            <span>{result.success ? '✅' : '❌'}</span> {result.message}
          </div>
        )}

        <button onClick={handleUpload} disabled={uploading}
          className="w-full py-2.5 bg-indigo text-white rounded-lg text-sm font-medium hover:bg-indigo/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
          {uploading ? <span className="animate-pulse">Procesando...</span> : <>📤 Subir y Procesar</>}
        </button>
      </div>
    </div>
  );
}

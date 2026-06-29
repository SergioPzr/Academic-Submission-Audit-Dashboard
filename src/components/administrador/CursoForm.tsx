import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { validateRequired } from '../../utils/validators';

export default function CursoForm() {
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [periodo, setPeriodo] = useState('');
  const [seccion, setSeccion] = useState('');
  const [profesorId, setProfesorId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [creando, setCreando] = useState(false);

  const handleSubmit = async () => {
    const codeErr = validateRequired(codigo, 'El código');
    if (codeErr) { setError(codeErr); return; }
    const nameErr = validateRequired(nombre, 'El nombre del curso');
    if (nameErr) { setError(nameErr); return; }
    const perErr = validateRequired(periodo, 'El periodo');
    if (perErr) { setError(perErr); return; }
    const secErr = validateRequired(seccion, 'La sección');
    if (secErr) { setError(secErr); return; }

    setError(null);
    setCreando(true);

    const { error: insertError } = await supabase.from('Cursos_Secciones').insert({
      codigo,
      nombre_curso: nombre,
      periodo,
      seccion,
      profesor_id: profesorId || null,
    });

    setCreando(false);

    if (insertError) {
      setError('Error al registrar el curso.');
      return;
    }

    setSuccess(true);
    setCodigo('');
    setNombre('');
    setPeriodo('');
    setSeccion('');
    setProfesorId('');
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm p-5 max-w-lg">
      <h3 className="text-sm font-semibold text-text-1 mb-4 flex items-center gap-2">
        <span>📚</span> Registrar Curso y Asignar Docente
      </h3>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-text-2 mb-1.5">Código *</label>
            <input type="text" value={codigo} onChange={(e) => setCodigo(e.target.value)}
              className="w-full px-3 py-2 border border-border-mid rounded-lg text-sm outline-none focus:border-indigo transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-2 mb-1.5">Periodo *</label>
            <input type="text" value={periodo} onChange={(e) => setPeriodo(e.target.value)}
              placeholder="2025-I"
              className="w-full px-3 py-2 border border-border-mid rounded-lg text-sm outline-none focus:border-indigo transition-colors" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-text-2 mb-1.5">Nombre del curso *</label>
          <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)}
            className="w-full px-3 py-2 border border-border-mid rounded-lg text-sm outline-none focus:border-indigo transition-colors" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-text-2 mb-1.5">Sección *</label>
            <input type="text" value={seccion} onChange={(e) => setSeccion(e.target.value)}
              placeholder="A / B / C"
              className="w-full px-3 py-2 border border-border-mid rounded-lg text-sm outline-none focus:border-indigo transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-2 mb-1.5">Profesor ID</label>
            <input type="text" value={profesorId} onChange={(e) => setProfesorId(e.target.value)}
              placeholder="UUID del profesor"
              className="w-full px-3 py-2 border border-border-mid rounded-lg text-sm outline-none focus:border-indigo transition-colors" />
          </div>
        </div>

        {error && <div className="text-xs text-red flex items-center gap-1.5">⚠️ {error}</div>}
        {success && <div className="text-xs text-green flex items-center gap-1.5">✅ Curso registrado correctamente.</div>}

        <button onClick={handleSubmit} disabled={creando}
          className="w-full py-2.5 bg-indigo text-white rounded-lg text-sm font-medium hover:bg-indigo/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
          {creando ? <span className="animate-pulse">Registrando...</span> : <>✚ Registrar Curso</>}
        </button>
      </div>
    </div>
  );
}

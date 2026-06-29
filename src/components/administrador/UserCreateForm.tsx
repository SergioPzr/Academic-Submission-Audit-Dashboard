import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { validateDomain } from '../../utils/validators';

type UserRole = 'alumno' | 'profesor' | 'administrador';

export default function UserCreateForm() {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('alumno');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!email || !validateDomain(email)) { setError('Correo institucional @urp.edu.pe requerido.'); return; }
    if (!fullName.trim()) { setError('El nombre es obligatorio.'); return; }

    setError(null);
    setCreating(true);

    const { error: createError } = await supabase.auth.admin.createUser({
      email,
      password: crypto.randomUUID().slice(0, 12),
      email_confirm: true,
      user_metadata: { full_name: fullName, role },
    });
    if (createError) {
      setCreating(false);
      if (createError.message.includes('already')) {
        setError('El correo ya se encuentra registrado.');
      } else {
        setError('Error al crear el usuario.');
      }
      return;
    }

    setCreating(false);
    setSuccess(true);
    setEmail('');
    setFullName('');
    setRole('alumno');
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm p-5 max-w-lg">
      <h3 className="text-sm font-semibold text-text-1 mb-4 flex items-center gap-2"><span>👤</span> Crear Perfil de Usuario</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-text-2 mb-1.5">Correo *</label>
          <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(null); }}
            placeholder="usuario@urp.edu.pe"
            className="w-full px-3 py-2 border border-border-mid rounded-lg text-sm outline-none focus:border-indigo transition-colors" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-2 mb-1.5">Nombre completo *</label>
          <input type="text" value={fullName} onChange={(e) => { setFullName(e.target.value); setError(null); }}
            placeholder="Ej: Juan Pérez"
            className="w-full px-3 py-2 border border-border-mid rounded-lg text-sm outline-none focus:border-indigo transition-colors" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-2 mb-1.5">Rol *</label>
          <select value={role} onChange={(e) => setRole(e.target.value as UserRole)}
            className="w-full px-3 py-2 border border-border-mid rounded-lg text-sm outline-none focus:border-indigo transition-colors">
            <option value="alumno">Alumno</option>
            <option value="profesor">Profesor</option>
            <option value="administrador">Administrador</option>
          </select>
        </div>

        {error && <div className="text-xs text-red flex items-center gap-1.5">⚠️ {error}</div>}
        {success && <div className="text-xs text-green flex items-center gap-1.5">✅ Usuario creado correctamente.</div>}

        <button onClick={handleCreate} disabled={creating}
          className="w-full py-2.5 bg-indigo text-white rounded-lg text-sm font-medium hover:bg-indigo/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
          {creating ? <span className="animate-pulse">Creando...</span> : <>✚ Crear Usuario</>}
        </button>
      </div>
    </div>
  );
}

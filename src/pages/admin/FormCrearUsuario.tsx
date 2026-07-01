import React, { useEffect, useState } from 'react';
import { X, UserPlus, Info, Copy, Eye, EyeOff } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { supabase } from '../../services/supabase';

interface FormCrearUsuarioProps {
  onClose: () => void;
  onCreated: () => void;
}

interface Rol {
  id_rol: string;
  nombre: string;
}

function generarPasswordTemporal(): string {
  const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789@#!';
  let pass = '';
  for (let i = 0; i < 12; i++) {
    pass += chars[Math.floor(Math.random() * chars.length)];
  }
  return pass;
}

const FormCrearUsuario: React.FC<FormCrearUsuarioProps> = ({ onClose, onCreated }) => {
  const [roles, setRoles] = useState<Rol[]>([]);
  const [form, setForm] = useState({
    nombre_completo: '',
    codigo_institucional: '',
    email: '',
    id_rol: '',
    facultad: 'Facultad de Ingeniería',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    supabase.from('roles').select('id_rol, nombre').then(({ data }) => {
      if (data) setRoles(data as Rol[]);
    });
  }, []);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.nombre_completo.trim()) newErrors.nombre_completo = 'El nombre es requerido';
    if (!form.codigo_institucional.trim()) newErrors.codigo_institucional = 'El código es requerido';
    if (!/^[^\s@]+@urp\.edu\.pe$/.test(form.email))
      newErrors.email = 'Debe ser un correo @urp.edu.pe válido';
    if (!form.id_rol) newErrors.id_rol = 'Selecciona un rol';
    if (!form.facultad.trim()) newErrors.facultad = 'La facultad es requerida';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setSubmitError(null);
    const password = generarPasswordTemporal();

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sin sesión');

      const resp = await fetch(`${supabaseUrl}/functions/v1/admin-create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ ...form, password }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({ message: resp.statusText }));
        throw new Error(errData.message ?? 'Error en Edge Function');
      }

      setTempPassword(password);
      onCreated();
    } catch (err: any) {
      if (err.message.includes('Failed to fetch') || err.message.includes('404')) {
        setSubmitError(
          '⚠️ La Edge Function "admin-create-user" no está desplegada. ' +
          'Deplóyala primero con Supabase CLI.'
        );
      } else {
        setSubmitError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (tempPassword) {
      navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box-lg max-w-4xl" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center border border-emerald-100">
              <UserPlus size={18} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Crear Usuario</h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Solo administradores pueden crear cuentas</p>
            </div>
          </div>
          <button className="text-slate-400 hover:text-slate-600 transition" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Success Banner */}
        {tempPassword ? (
          <div className="p-6 text-center space-y-4">
            <div className="bg-emerald-50/50 border border-emerald-100 p-6 rounded-2xl space-y-3">
              <h4 className="font-bold text-emerald-800">
                ✓ Usuario creado exitosamente
              </h4>
              <p className="text-xs text-slate-500 font-medium">
                Guarda la contraseña temporal. No volverá a mostrarse en el sistema.
              </p>
              
              <div className="temp-password-box justify-center max-w-md mx-auto mt-4">
                <span className="text-sm font-bold font-mono tracking-wider text-emerald-950">
                  {showPass ? tempPassword : '•'.repeat(tempPassword.length)}
                </span>
                <button 
                  type="button"
                  className="text-slate-400 hover:text-slate-600 ml-2" 
                  onClick={() => setShowPass(!showPass)}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <Button variant="secondary" size="sm" className="ml-4 text-xs font-semibold py-1.5 px-3" onClick={handleCopy}>
                  {copied ? '¡Copiado!' : 'Copiar'}
                </Button>
              </div>
            </div>
            
            <Button variant="primary" size="md" onClick={onClose} className="w-full mt-6">
              Cerrar Ventana
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="p-6 grid grid-cols-1 md:grid-cols-5 gap-6 text-left">
              
              {/* Left Column: Input Fields */}
              <div className="md:col-span-3 space-y-4">
                <Input
                  id="nuevo-nombre"
                  label="Nombre completo *"
                  placeholder="Ej: García López, Ana María"
                  value={form.nombre_completo}
                  onChange={(e) => handleChange('nombre_completo', e.target.value)}
                  error={errors.nombre_completo}
                />
                
                <Input
                  id="nuevo-codigo"
                  label="Código institucional *"
                  placeholder="Ej: 20201234A"
                  value={form.codigo_institucional}
                  onChange={(e) => handleChange('codigo_institucional', e.target.value)}
                  error={errors.codigo_institucional}
                />
                
                <Input
                  id="nuevo-email"
                  label="Correo institucional *"
                  type="email"
                  placeholder="alumno@urp.edu.pe"
                  value={form.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  error={errors.email}
                />

                <div className="flex flex-col w-full">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 block" htmlFor="nuevo-rol">
                    Rol *
                  </label>
                  <select
                    id="nuevo-rol"
                    className={`bg-white border rounded-xl py-2.5 px-3.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all duration-200 cursor-pointer ${
                      errors.id_rol ? 'border-red-300' : 'border-slate-200'
                    }`}
                    value={form.id_rol}
                    onChange={(e) => handleChange('id_rol', e.target.value)}
                  >
                    <option value="">Seleccionar rol…</option>
                    {roles.map((r) => (
                      <option key={r.id_rol} value={r.id_rol}>
                        {r.nombre.charAt(0).toUpperCase() + r.nombre.slice(1)}
                      </option>
                    ))}
                  </select>
                  {errors.id_rol && <span className="text-xs text-red-600 font-medium mt-1">{errors.id_rol}</span>}
                </div>

                <Input
                  id="nuevo-facultad"
                  label="Facultad *"
                  placeholder="Facultad de Ingeniería"
                  value={form.facultad}
                  onChange={(e) => handleChange('facultad', e.target.value)}
                  error={errors.facultad}
                />
              </div>

              {/* Right Column: Validation rules */}
              <div className="md:col-span-2">
                <div className="h-full bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Info size={16} className="text-emerald-600" />
                    <span className="text-xs font-bold uppercase tracking-wider">Reglas de validación</span>
                  </div>
                  
                  <ul className="space-y-2 text-slate-500 text-xs font-medium pl-2 list-disc list-inside">
                    <li>El correo debe ser <strong className="text-slate-700 font-bold">@urp.edu.pe</strong></li>
                    <li>El código institucional debe ser único</li>
                    <li>La contraseña temporal se genera de forma segura</li>
                    <li>Solo usuarios activos pueden ingresar al portal</li>
                  </ul>

                  <div className="bg-amber-50/50 border border-amber-200/50 p-4 rounded-xl space-y-1.5 mt-8">
                    <p className="text-[10px] uppercase font-bold tracking-widest text-amber-700">
                      💡 Tip
                    </p>
                    <p className="text-[11px] text-amber-900 leading-relaxed font-semibold">
                      Para matrícula masiva de alumnos en un curso, usa la pestaña de <strong>Matrícula Masiva (CSV)</strong>.
                    </p>
                  </div>
                </div>
              </div>

            </div>

            {submitError && (
              <div className="mx-6 mb-4 p-4 border border-red-200 bg-red-50 text-red-800 rounded-xl flex items-center gap-2 text-xs font-semibold">
                <span>{submitError}</span>
              </div>
            )}

            <div className="flex justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100 rounded-b-2xl">
              <Button variant="secondary" type="button" onClick={onClose}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit" loading={loading} icon={<UserPlus size={14} />}>
                Crear usuario
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default FormCrearUsuario;

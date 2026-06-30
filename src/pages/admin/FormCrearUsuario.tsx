import React, { useEffect, useState } from 'react';
import { X, UserPlus, Info, Copy, Eye, EyeOff } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Spinner from '../../components/ui/Spinner';
import { supabase } from '../../services/supabase';
import { getProfesores } from '../../services/adminService';

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

      // Intentar llamar Edge Function admin-create-user
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
      // Si la Edge Function no está desplegada, mostrar instrucción clara
      if (err.message.includes('Failed to fetch') || err.message.includes('404')) {
        setSubmitError(
          '⚠️ La Edge Function "admin-create-user" no está desplegada. ' +
          'Ejecuta: npx supabase functions new admin-create-user y deplóyala primero.'
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
      <div className="modal-box modal-box-lg" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="modal-icon-badge">
              <UserPlus size={18} color="var(--color-accent)" />
            </div>
            <div>
              <h3 className="text-h3">Crear Usuario</h3>
              <p className="text-subtitle">Solo administradores pueden crear cuentas</p>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Success: show temp password */}
        {tempPassword ? (
          <div className="modal-body">
            <div className="success-banner">
              <h4 style={{ marginBottom: '0.5rem', color: 'var(--color-success)' }}>
                ✓ Usuario creado exitosamente
              </h4>
              <p className="text-subtitle" style={{ marginBottom: '1rem' }}>
                Guarda la contraseña temporal. No volverá a mostrarse.
              </p>
              <div className="temp-password-box">
                <span className="temp-password-text">
                  {showPass ? tempPassword : '•'.repeat(tempPassword.length)}
                </span>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowPass(!showPass)}>
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button className="btn btn-secondary btn-sm" onClick={handleCopy}>
                  <Copy size={14} />
                  <span style={{ marginLeft: '0.25rem' }}>{copied ? '¡Copiado!' : 'Copiar'}</span>
                </button>
              </div>
            </div>
            <Button variant="primary" onClick={onClose} style={{ marginTop: '1.5rem', width: '100%' }}>
              Cerrar
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="modal-body modal-body-cols">
              {/* Left: Form */}
              <div className="modal-form-col">
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

                <div className="input-group">
                  <label className="input-label" htmlFor="nuevo-rol">Rol *</label>
                  <select
                    id="nuevo-rol"
                    className={`input-field${errors.id_rol ? ' input-error' : ''}`}
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
                  {errors.id_rol && <span className="input-error-msg">{errors.id_rol}</span>}
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

              {/* Right: Rules */}
              <div className="modal-rules-col">
                <div className="rules-panel">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <Info size={16} color="var(--color-primary)" />
                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Reglas de validación</span>
                  </div>
                  <ul className="rules-list">
                    <li>El correo debe ser <strong>@urp.edu.pe</strong></li>
                    <li>El código institucional debe ser único</li>
                    <li>La contraseña temporal se genera automáticamente</li>
                    <li>El usuario deberá cambiarla en el primer inicio de sesión</li>
                    <li>Solo usuarios <strong>activos</strong> pueden autenticarse</li>
                  </ul>

                  <div className="tip-panel" style={{ marginTop: '1.5rem' }}>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-warning)', fontWeight: 600, marginBottom: '0.5rem' }}>
                      💡 Tip
                    </p>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                      Para matrícula masiva de alumnos en un curso, usa la pestaña <strong>Matrícula Masiva (CSV)</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {submitError && (
              <div className="admin-error-banner" style={{ margin: '0 1.5rem 1rem' }}>
                <span style={{ fontSize: '0.8125rem' }}>{submitError}</span>
              </div>
            )}

            <div className="modal-footer">
              <Button variant="secondary" type="button" onClick={onClose}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit" loading={loading} icon={<UserPlus size={14} />}>
                {loading ? 'Creando…' : 'Crear usuario'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default FormCrearUsuario;

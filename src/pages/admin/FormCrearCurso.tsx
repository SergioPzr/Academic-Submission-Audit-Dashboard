import React, { useEffect, useState } from 'react';
import { X, BookPlus } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { crearCurso, getProfesores, type UsuarioCompleto } from '../../services/adminService';

interface FormCrearCursoProps {
  onClose: () => void;
  onCreated: () => void;
}

const FormCrearCurso: React.FC<FormCrearCursoProps> = ({ onClose, onCreated }) => {
  const [profesores, setProfesores] = useState<UsuarioCompleto[]>([]);
  const [form, setForm] = useState({
    codigo: '',
    nombre: '',
    seccion: '',
    ciclo_academico: '2026-I',
    id_profesor: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    getProfesores().then(setProfesores).catch(() => {});
  }, []);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!/^[A-Za-z]{2}-\d{4}$/.test(form.codigo.trim()))
      newErrors.codigo = 'Formato requerido: XX-0000 (ej: IF-0712)';
    if (!form.nombre.trim()) newErrors.nombre = 'El nombre del curso es requerido';
    if (!form.seccion.trim()) newErrors.seccion = 'La sección es requerida';
    if (!form.ciclo_academico.trim()) newErrors.ciclo_academico = 'El ciclo académico es requerido';
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
    try {
      await crearCurso({
        codigo: form.codigo,
        nombre: form.nombre,
        seccion: form.seccion,
        ciclo_academico: form.ciclo_academico,
        id_profesor: form.id_profesor || null,
      });
      onCreated();
      onClose();
    } catch (err: any) {
      if (err.message?.includes('duplicate') || err.code === '23505') {
        setSubmitError(`El código "${form.codigo.toUpperCase()}" ya existe en el sistema.`);
      } else {
        setSubmitError(err.message ?? 'Error al crear el curso');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="modal-icon-badge">
              <BookPlus size={18} color="var(--color-accent)" />
            </div>
            <div>
              <h3 className="text-h3">Crear Curso</h3>
              <p className="text-subtitle">Registrar nuevo curso en el sistema</p>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
              <Input
                id="curso-codigo"
                label="Código del curso *"
                placeholder="Ej: IF-0712"
                value={form.codigo}
                onChange={(e) => handleChange('codigo', e.target.value)}
                error={errors.codigo}
              />
              <Input
                id="curso-seccion"
                label="Sección *"
                placeholder="Ej: IF-8A1"
                value={form.seccion}
                onChange={(e) => handleChange('seccion', e.target.value)}
                error={errors.seccion}
              />
            </div>

            <Input
              id="curso-nombre"
              label="Nombre del curso *"
              placeholder="Ej: Arquitectura y Evolución de Software"
              value={form.nombre}
              onChange={(e) => handleChange('nombre', e.target.value)}
              error={errors.nombre}
            />

            <Input
              id="curso-ciclo"
              label="Ciclo académico *"
              placeholder="Ej: 2026-I"
              value={form.ciclo_academico}
              onChange={(e) => handleChange('ciclo_academico', e.target.value)}
              error={errors.ciclo_academico}
            />

            <div className="input-group">
              <label className="input-label" htmlFor="curso-profesor">
                Docente asignado (opcional)
              </label>
              <select
                id="curso-profesor"
                className="input-field"
                value={form.id_profesor}
                onChange={(e) => handleChange('id_profesor', e.target.value)}
              >
                <option value="">Sin asignar</option>
                {profesores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre_completo} — {p.codigo_institucional ?? p.email}
                  </option>
                ))}
              </select>
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
            <Button variant="primary" type="submit" loading={loading} icon={<BookPlus size={14} />}>
              {loading ? 'Guardando…' : 'Crear curso'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FormCrearCurso;

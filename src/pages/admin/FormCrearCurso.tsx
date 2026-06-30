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
      <div className="modal-box max-w-lg" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center border border-emerald-100">
              <BookPlus size={18} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Crear Curso</h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Registrar nuevo curso en el sistema</p>
            </div>
          </div>
          <button className="text-slate-400 hover:text-slate-600 transition" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="text-left">
          <div className="p-6 space-y-4">
            
            <div className="grid grid-cols-2 gap-4">
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

            <div className="flex flex-col w-full">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 block" htmlFor="curso-profesor">
                Docente asignado (opcional)
              </label>
              <select
                id="curso-profesor"
                className="bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all duration-200 cursor-pointer"
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
            <div className="mx-6 mb-4 p-4 border border-red-200 bg-red-50 text-red-800 rounded-xl flex items-center gap-2 text-xs font-semibold">
              <span>{submitError}</span>
            </div>
          )}

          <div className="flex justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100 rounded-b-2xl">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" loading={loading} icon={<BookPlus size={14} />}>
              Crear curso
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FormCrearCurso;

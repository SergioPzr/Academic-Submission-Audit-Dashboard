import React, { useEffect, useState } from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { getTiposOperacion, type FiltrosAuditoria as FiltrosType } from '../../services/auditService';

interface FiltrosAuditoriaProps {
  onApplyFilters: (filtros: FiltrosType) => void;
  loading: boolean;
}

const FiltrosAuditoria: React.FC<FiltrosAuditoriaProps> = ({
  onApplyFilters,
  loading,
}) => {
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [emailUsuario, setEmailUsuario] = useState('');
  const [tipoOperacion, setTipoOperacion] = useState('Todas');
  const [tipos, setTipos] = useState<string[]>([]);

  useEffect(() => {
    getTiposOperacion()
      .then((data) => {
        setTipos(data);
      })
      .catch((err) => {
        console.error('Error al cargar tipos de operación:', err);
      });
  }, []);

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    onApplyFilters({
      fechaDesde,
      fechaHasta,
      emailUsuario,
      tipoOperacion,
    });
  };

  const handleClear = () => {
    setFechaDesde('');
    setFechaHasta('');
    setEmailUsuario('');
    setTipoOperacion('Todas');
    onApplyFilters({
      fechaDesde: '',
      fechaHasta: '',
      emailUsuario: '',
      tipoOperacion: 'Todas',
    });
  };

  return (
    <div className="card shadow-sm mb-6" style={{ padding: '1.5rem', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }}>
      <form onSubmit={handleApply} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        {/* Date Desde */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <label htmlFor="fechaDesde" className="text-subtitle font-semibold" style={{ fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>
            Desde
          </label>
          <input
            type="date"
            id="fechaDesde"
            className="input w-full"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            style={{ height: '42px' }}
          />
        </div>

        {/* Date Hasta */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <label htmlFor="fechaHasta" className="text-subtitle font-semibold" style={{ fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>
            Hasta
          </label>
          <input
            type="date"
            id="fechaHasta"
            className="input w-full"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            style={{ height: '42px' }}
          />
        </div>

        {/* User Email */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <label htmlFor="emailUsuario" className="text-subtitle font-semibold" style={{ fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>
            ID de usuario (Correo)
          </label>
          <input
            type="text"
            id="emailUsuario"
            placeholder="Buscar por correo..."
            className="input w-full"
            value={emailUsuario}
            onChange={(e) => setEmailUsuario(e.target.value)}
            style={{ height: '42px' }}
          />
        </div>

        {/* Operation Type Select */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <label htmlFor="tipoOperacion" className="text-subtitle font-semibold" style={{ fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>
            Tipo de operación
          </label>
          <select
            id="tipoOperacion"
            className="input w-full"
            value={tipoOperacion}
            onChange={(e) => setTipoOperacion(e.target.value)}
            style={{ height: '42px', padding: '0.5rem 1rem' }}
          >
            <option value="Todas">Todas</option>
            {tipos.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Action Buttons */}
        <div className="md:col-span-4" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.5rem', width: '100%' }}>
          <button
            type="button"
            onClick={handleClear}
            disabled={loading}
            className="btn btn-ghost"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RotateCcw size={16} />
            <span>Limpiar</span>
          </button>
          
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '140px', justifyContent: 'center' }}
          >
            <Search size={16} />
            <span>{loading ? 'Buscando...' : 'Aplicar filtros'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default FiltrosAuditoria;

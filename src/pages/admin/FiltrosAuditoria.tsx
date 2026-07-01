import React, { useEffect, useState } from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { getTiposOperacion, type FiltrosAuditoria as FiltrosType } from '../../services/auditService';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

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
    <Card className="p-6 mb-6">
      <form onSubmit={handleApply} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        {/* Date Desde */}
        <Input
          type="date"
          id="fechaDesde"
          label="Desde"
          value={fechaDesde}
          onChange={(e) => setFechaDesde(e.target.value)}
          disabled={loading}
        />

        {/* Date Hasta */}
        <Input
          type="date"
          id="fechaHasta"
          label="Hasta"
          value={fechaHasta}
          onChange={(e) => setFechaHasta(e.target.value)}
          disabled={loading}
        />

        {/* User Email */}
        <Input
          type="text"
          id="emailUsuario"
          label="ID de usuario (Correo)"
          placeholder="Buscar por correo..."
          value={emailUsuario}
          onChange={(e) => setEmailUsuario(e.target.value)}
          disabled={loading}
        />

        {/* Operation Type Select */}
        <div className="flex flex-col w-full text-left">
          <label htmlFor="tipoOperacion" className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
            Tipo de operación
          </label>
          <select
            id="tipoOperacion"
            className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-sm text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all duration-200 cursor-pointer"
            value={tipoOperacion}
            onChange={(e) => setTipoOperacion(e.target.value)}
            disabled={loading}
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
        <div className="md:col-span-4 flex justify-end gap-3 mt-2 w-full">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClear}
            disabled={loading}
            icon={<RotateCcw size={16} />}
          >
            Limpiar
          </Button>
          
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            icon={<Search size={16} />}
            className="min-w-[140px]"
          >
            Aplicar filtros
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default FiltrosAuditoria;

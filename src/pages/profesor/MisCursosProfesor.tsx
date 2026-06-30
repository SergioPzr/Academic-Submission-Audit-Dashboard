import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import Spinner from '../../components/ui/Spinner';
import StatCard from '../../components/ui/StatCard';
import EmptyState from '../../components/ui/EmptyState';
import CursoCard from './CursoCard';
import ModalCrearEntregable from './ModalCrearEntregable';
import { getMisCursos, getKPIsProfesor } from '../../services/cursosService';
import type { CursoConStats, ProfesorKPIs } from '../../services/cursosService';
import { BookOpen, Users, ClipboardCheck, AlertTriangle, Plus } from 'lucide-react';
import Button from '../../components/ui/Button';

const MisCursosProfesor: React.FC = () => {
  const { perfil } = useAuth();
  
  const [cursos, setCursos] = useState<CursoConStats[]>([]);
  const [kpis, setKpis] = useState<ProfesorKPIs>({
    cursos_a_cargo: 0,
    estudiantes_activos: 0,
    entregas_por_revisar: 0,
    atrasos_detectados: 0,
  });
  
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCursoId, setSelectedCursoId] = useState<string | undefined>(undefined);

  const loadDashboardData = useCallback(async () => {
    if (!perfil?.id) return;
    setLoading(true);
    try {
      const [cursosData, kpisData] = await Promise.all([
        getMisCursos(perfil.id),
        getKPIsProfesor(perfil.id),
      ]);
      setCursos(cursosData);
      setKpis(kpisData);
    } catch (err) {
      console.error('Error loading professor dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [perfil?.id]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleOpenCreateModal = (idCurso?: string) => {
    setSelectedCursoId(idCurso);
    setModalOpen(true);
  };

  const handleCreateSuccess = () => {
    loadDashboardData();
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center gap-3">
        <Spinner size="lg" />
        <span className="text-xs text-slate-400 font-bold">Cargando cursos y estadísticas...</span>
      </div>
    );
  }

  const cursosOptions = cursos.map((c) => ({
    id_curso: c.id_curso,
    nombre: c.nombre,
    codigo: c.codigo,
    seccion: c.seccion,
  }));

  return (
    <div className="space-y-6 text-left animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Mis Cursos</h2>
          <p className="text-xs text-slate-400 font-medium mt-1">Monitorea el avance de tus alumnos, califica entregas y gestiona cronogramas.</p>
        </div>
        <Button
          onClick={() => handleOpenCreateModal()}
          variant="primary"
          size="sm"
          icon={<Plus size={14} />}
          disabled={cursos.length === 0}
        >
          Crear entregable
        </Button>
      </div>

      {/* KPIs Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Cursos a cargo"
          value={kpis.cursos_a_cargo}
          icon={<BookOpen size={20} className="text-emerald-600" />}
        />
        <StatCard
          label="Estudiantes activos"
          value={kpis.estudiantes_activos}
          icon={<Users size={20} className="text-emerald-600" />}
        />
        <StatCard
          label="Entregas por revisar"
          value={kpis.entregas_por_revisar}
          icon={<ClipboardCheck size={20} className="text-emerald-600" />}
        />
        <StatCard
          label="Atrasos detectados"
          value={kpis.atrasos_detectados}
          icon={<AlertTriangle size={20} className="text-emerald-600" />}
        />
      </div>

      {/* Courses Grid */}
      {cursos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cursos.map((curso) => (
            <CursoCard
              key={curso.id_curso}
              curso={curso}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No tienes cursos asignados"
          description="Comunícate con el administrador para que te asigne tus asignaturas."
          icon={<BookOpen size={48} />}
        />
      )}

      {/* Create Modal */}
      <ModalCrearEntregable
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleCreateSuccess}
        idCurso={selectedCursoId}
        cursosList={cursosOptions}
      />
    </div>
  );
};

export default MisCursosProfesor;

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
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
        <span className="ml-3 text-gray-500 font-medium">Cargando cursos y estadísticas...</span>
      </div>
    );
  }

  // Map courses to options for the select menu inside modal
  const cursosOptions = cursos.map((c) => ({
    id_curso: c.id_curso,
    nombre: c.nombre,
    codigo: c.codigo,
    seccion: c.seccion,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Vista global de mis cursos</h2>
          <p className="text-sm text-gray-500 mt-1">Monitorea el avance de tus alumnos, califica entregas y gestiona cronogramas.</p>
        </div>
        <button
          onClick={() => handleOpenCreateModal()}
          className="btn btn-primary flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2.5 rounded shadow-sm transition-all"
          disabled={cursos.length === 0}
        >
          <Plus size={18} className="mr-1.5" />
          Crear entregable
        </button>
      </div>

      {/* KPIs Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Cursos a cargo"
          value={kpis.cursos_a_cargo}
          icon={<BookOpen size={24} className="text-emerald-600" />}
        />
        <StatCard
          label="Estudiantes activos"
          value={kpis.estudiantes_activos}
          icon={<Users size={24} className="text-emerald-600" />}
        />
        <StatCard
          label="Entregas por revisar"
          value={kpis.entregas_por_revisar}
          icon={<ClipboardCheck size={24} className="text-emerald-600" />}
        />
        <StatCard
          label="Atrasos detectados"
          value={kpis.atrasos_detectados}
          icon={<AlertTriangle size={24} className="text-emerald-600" />}
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

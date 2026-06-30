# Handoff: Módulo 3 — Portal del Profesor

> Documento para el integrante responsable del Módulo 3.  
> Fecha de entrega: 30 de junio de 2026  
> Estado del Módulo 2: ✅ Completado, build limpio, dev server activo.

---

## ✅ Lo que el Módulo 2 dejó listo para ti

### Supabase — Funciones RPC disponibles
| Función | Descripción | Firma |
|---|---|---|
| `get_alumno_kpis(p_alumno_id UUID)` | KPIs del alumno (activos, urgentes, vencidos, calificados) | `RETURNS JSON` |
| `get_server_time()` | Hora actual del servidor (UTC) | `RETURNS TIMESTAMPTZ` |

### Servicios reutilizables del Módulo 2
Todos estos métodos están en [`src/services/entregasService.ts`](file:///c:/Proyectos/Academic-Submission-Audit-Dashboard/src/services/entregasService.ts):

```ts
// Para usar en vistas del profesor si necesita consultar entregas
getEntregablesActivos(idAlumno: string): Promise<EntregableConEstado[]>
getHistorialEntregas(idAlumno: string): Promise<EntregaHistorial[]>
getServerTime(): Promise<Date>
```

### Componentes compartidos disponibles
| Componente | Ruta | Uso |
|---|---|---|
| `Countdown` | `src/components/shared/Countdown.tsx` | Muestra cuenta regresiva con colores de urgencia. Props: `fechaCierre: string`, `onExpire?: () => void` |
| `ConstanciaModal` | `src/pages/alumno/ConstanciaModal.tsx` | Modal de recibo digital (re-usable si el profesor necesita ver constancias) |
| `dateUtils.ts` | `src/utils/dateUtils.ts` | `formatInLimaTimezone(date)` y `formatBytes(bytes)` |

### Utilidades CSS disponibles (en `src/index.css`)
Se agregó un bloque completo de clases utilitarias al final del CSS:
- Flex, Grid, spacing (`gap-*`, `p-*`, `m-*`)
- Color text/background/border para emerald, amber, red, purple, gray
- `.animate-fade-in`, `.animate-spin`
- `.modal-overlay` — overlay para modales
- Responsive: `sm:`, `lg:` breakpoints

---

## 🔧 Lo que el Módulo 3 debe implementar

### Rutas ya registradas (placeholders activos en AppRouter)
```
/profesor             → MisCursosProfesor.tsx (ya existe como placeholder)
/profesor/monitor     → DummyPage — reemplazar con MonitorEnVivo.tsx
/profesor/calificacion → DummyPage — reemplazar con Calificacion.tsx
/profesor/cronograma  → DummyPage — reemplazar con CronogramaProfesor.tsx
```

### Archivo existente a reemplazar
[`src/pages/profesor/MisCursosProfesor.tsx`](file:///c:/Proyectos/Academic-Submission-Audit-Dashboard/src/pages/profesor/MisCursosProfesor.tsx) — actualmente es un placeholder básico.

### Tablas Supabase que usará el Módulo 3
| Tabla | Propósito |
|---|---|
| `cursos` | Lista de cursos del profesor (filtrar por `id_profesor = auth.uid()`) |
| `entregables` | Crear, editar y cerrar ventanas de entrega por curso |
| `matriculas` | Ver qué alumnos están en cada curso |
| `entregas` | Monitor en vivo (Realtime) para ver quién ha entregado |
| `prorrogas` | Otorgar extensiones individuales a alumnos |
| `revisiones` | Calificar entregas (INSERT/UPDATE) |

### Políticas RLS ya configuradas
El profesor tiene acceso a:
- **Leer** sus propios cursos (`id_profesor = auth.uid()`)
- **Leer** entregas de sus cursos (via `JOIN cursos`)
- **Insertar/actualizar** revisiones donde `id_profesor = auth.uid()`

> ⚠️ Las políticas de `cursos`, `entregables`, y `matriculas` **no tienen RLS habilitado** — el advisors de Supabase lo reportó. El Módulo 3 debe agregar políticas RLS para esas tablas antes de ir a producción (o coordinar con el responsable de seguridad).

### Migración 005 requerida (responsabilidad del Módulo 3)
Según el `gemini.md`, el Módulo 3 debe ejecutar la Migración 005:
- Funciones de stats de cursos
- Edge Functions `manage-schedule` y `assign-extension`

### Realtime ya habilitado en `entregas`
La tabla `entregas` ya está en la publicación de Supabase Realtime. Para el monitor en vivo, suscríbete así:

```ts
supabase.channel('profesor-monitor')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'entregas',
    // Filtra por id_entregable si es posible
  }, (payload) => {
    // Refrescar estado del monitor
  })
  .subscribe();
```

---

## 📁 Estructura del proyecto al finalizar el Módulo 2

```
src/
├── components/
│   ├── layout/         ✅ Shell, Sidebar, Topbar, NavItem
│   ├── ui/             ✅ Button, Badge, Card, Input, Spinner, EmptyState, StatCard
│   └── shared/
│       └── Countdown.tsx ✅ NUEVO en Módulo 2
├── hooks/
│   └── useAuth.tsx     ✅ { session, user, perfil, rol, loading, signOut }
├── pages/
│   ├── auth/Login.tsx  ✅
│   ├── alumno/         ✅ PanelAlumno, HistorialAlumno, CronogramaAlumno, ModalEntrega, ConstanciaModal
│   ├── profesor/       ⚠️  Solo MisCursosProfesor.tsx (placeholder) — Módulo 3 lo implementa
│   └── admin/PanelAdmin.tsx ⚠️ Placeholder — Módulo 5 lo implementa
├── router/AppRouter.tsx ✅ Todas las rutas registradas, student routes conectadas
├── services/
│   ├── supabase.ts       ✅
│   ├── authService.ts    ✅
│   └── entregasService.ts ✅ NUEVO en Módulo 2
├── types/database.types.ts ✅
└── utils/
    └── dateUtils.ts      ✅ NUEVO en Módulo 2
```

---

## 🔄 Patrón de carga de datos (seguir este patrón)

```tsx
// NO usar useState para cargar datos remotos
// SÍ usar este patrón establecido en el Módulo 2:

const [data, setData] = useState<MiTipo[]>([]);
const [loading, setLoading] = useState(true);

const loadData = useCallback(async () => {
  if (!perfil?.id) return;
  const result = await miServicio.getMisDatos(perfil.id);
  setData(result);
  setLoading(false);
}, [perfil?.id]);

useEffect(() => {
  loadData();
}, [loadData]);
```

---

## ⚡ Dev Server activo
El servidor corre en `http://localhost:5173` (proceso background activo).  
Para detenerlo: `Ctrl+C` en la terminal, o `npm run dev` de nuevo.

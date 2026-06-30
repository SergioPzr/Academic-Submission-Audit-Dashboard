# Instrucciones de Reparación y Rediseño — SRE-URP
**Para:** Gemini  
**Prioridad:** Crítica — La interfaz actual está rota debido a la eliminación de las clases CSS base que usan los componentes reutilizables del sistema.

---

## Diagnóstico del Problema

La sesión anterior reemplazó `src/index.css` con los tres imports de Tailwind CSS, **eliminando todas las clases CSS personalizadas** (`.card`, `.badge`, `.btn`, `.stat-card`, `.input-field`, `.nav-item`, etc.) que aún usan los componentes reutilizables del proyecto. Estos componentes NO fueron migrados a Tailwind inline, por lo que actualmente renderizan sin ningún estilo.

Hay además un error crítico de PostCSS:
```
[vite:css][postcss] @import must precede all other statements
```
Esto ocurre porque el `@import url('https://fonts.googleapis.com/...')` fue colocado **después** de las directivas `@tailwind`, cuando debe ir **antes** de ellas.

---

## Error #1 — Corregir `src/index.css`

El archivo debe tener el siguiente orden estricto:

```css
/* 1. PRIMERO: imports externos */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

/* 2. SEGUNDO: directivas de Tailwind */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* 3. TERCERO: variables CSS personalizadas */
:root { ... }

/* 4. CUARTO: clases de componentes custom */
.card { ... }
.btn { ... }
etc.
```

---

## Error #2 — Componentes Reutilizables Rotos

Los siguientes archivos usan clases CSS que ya no existen. Gemini debe **migrarlos completamente a Tailwind inline** (sin depender de clases del CSS global):

### `src/components/ui/Card.tsx`
Reescribir para que use `className` de Tailwind directamente:
```tsx
const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => (
  <div
    className={`bg-white rounded-2xl border border-slate-100 shadow-sm ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow duration-200' : ''} ${className}`}
    onClick={onClick}
  >
    {children}
  </div>
);
```

### `src/components/ui/Badge.tsx`
Reescribir con variantes Tailwind inline:
```tsx
const variantClasses = {
  success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border border-amber-200',
  error: 'bg-red-50 text-red-700 border border-red-200',
  neutral: 'bg-slate-100 text-slate-600 border border-slate-200',
};
// Usar: <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold ${variantClasses[variant]}`}>
```

### `src/components/ui/Button.tsx`
Reescribir con variantes Tailwind:
```tsx
const variantClasses = {
  primary: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-600/20',
  secondary: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200',
  ghost: 'bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-800',
};
const sizeClasses = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-4 py-2.5 text-sm rounded-xl',
  lg: 'px-6 py-3 text-base rounded-xl',
};
// Usar: <button className={`inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}>
```

### `src/components/ui/Input.tsx`
Reescribir con Tailwind:
```tsx
// input-field → bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 text-sm
// input-label → text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 block
// input-icon  → absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400
// input-error-msg → text-xs text-red-600 font-medium mt-1
```

### `src/components/ui/StatCard.tsx`
Reescribir con Tailwind (actualmente usa `.stat-card`, `.stat-card-label`, `.stat-card-value` que no existen):
```tsx
const StatCard = ({ label, value, icon, trend, className }) => (
  <div className={`bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-start justify-between gap-4 ${className}`}>
    <div className="flex flex-col gap-1">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</span>
      <span className="text-2xl font-extrabold text-slate-800 tabular-nums">{value}</span>
      {trend && (
        <span className={`text-xs font-semibold flex items-center gap-1 ${trend.isUpward ? 'text-emerald-600' : 'text-red-500'}`}>
          {trend.isUpward ? '↑' : '↓'} {trend.value}
        </span>
      )}
    </div>
    {icon && (
      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
        {icon}
      </div>
    )}
  </div>
);
```

---

## Error #3 — Clases CSS Críticas que Siguen Usándose en Pages

Los siguientes archivos utilizan clases CSS en línea (`className="..."`) que **ya no están definidas** en `index.css` tras el reemplazo. Gemini debe revisar y migrar cada uno a Tailwind inline:

| Archivo | Clases Rotas a Migrar |
|---|---|
| `src/pages/admin/UsuariosCursos.tsx` | `.tab-nav`, `.tab-btn`, `.tab-btn-active`, `.lista-usuarios-toolbar`, `.search-wrapper` |
| `src/pages/admin/ListaUsuarios.tsx` | `.admin-table`, `.admin-td-email`, `.admin-td-time`, `.admin-table-header`, `.search-input`, `.rol-select` |
| `src/pages/admin/MatriculaMasiva.tsx` | `.csv-dropzone`, `.csv-dropzone-active`, `.csv-file-loaded`, `.csv-summary`, `.csv-actions`, `.csv-preview-table` |
| `src/pages/admin/FormCrearUsuario.tsx` | `.modal-header`, `.modal-body`, `.modal-footer`, `.rules-panel`, `.rules-list`, `.success-banner`, `.temp-password-box` |
| `src/pages/admin/FormCrearCurso.tsx` | `.modal-header`, `.modal-body`, `.modal-footer`, `.input-group` |
| `src/pages/admin/LogAuditoria.tsx` | `.admin-table`, `.admin-table-header`, `.search-input` |
| `src/pages/alumno/ModalEntrega.tsx` | `.modal-overlay`, `.modal-box` |
| `src/pages/alumno/ConstanciaModal.tsx` | `.modal-overlay`, `.modal-box` |
| `src/pages/alumno/HistorialAlumno.tsx` | `.admin-table` |
| `src/pages/alumno/CronogramaAlumno.tsx` | `.card` |
| `src/pages/profesor/CronogramaProfesor.tsx` | `.card`, `.btn`, `.input-field` |
| `src/pages/profesor/MonitorVivo.tsx` | `.card`, `.admin-table`, `.stat-card` |
| `src/pages/profesor/MisCursosProfesor.tsx` | `.card`, `.btn-primary` |
| `src/pages/profesor/CursoCard.tsx` | `.card`, `.stat-card` |
| `src/components/shared/Countdown.tsx` | `.countdown-*` (si existe) |

---

## Cómo Debe Quedar `src/index.css` (Estructura Definitiva)

El archivo debe contener exclusivamente lo siguiente — **ninguna clase utilitaria manual de Tailwind** (como `.flex`, `.p-4`, `.text-sm`, etc.), solo clases de layout estructural que no pueden representarse fácilmente inline:

```css
/* ═══════════════════════════════════════════════════
   ORDEN CORRECTO: imports → tailwind → variables → componentes
════════════════════════════════════════════════════ */

@import url('https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

/* ─── Variables de Diseño ─── */
:root {
  --sidebar-width: 260px;
  --topbar-height: 70px;
}

/* ─── Base ─── */
* { box-sizing: border-box; }
body {
  font-family: 'Inter', system-ui, sans-serif;
  background-color: #F8FAFC;
  color: #0F172A;
  -webkit-font-smoothing: antialiased;
}

/* ─── Shell Layout (no pueden ser inline porque son posicionamiento global) ─── */
.shell-container {
  display: flex;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow-y: auto;
  min-width: 0;
}

.page-container {
  padding: 2rem;
  flex: 1;
  max-width: 1440px;
  width: 100%;
}

/* ─── Overlay / Modal backdrop (posicionamiento global) ─── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1.5rem;
  backdrop-filter: blur(6px);
  animation: fadeIn 0.15s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.modal-box {
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.04);
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
  animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-box-lg { max-width: 860px; }

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}

/* ─── Distribution bars (son SVG-like custom, difíciles de hacer inline) ─── */
.distribucion-bar-track {
  height: 6px;
  background: #E2E8F0;
  border-radius: 999px;
  overflow: hidden;
}
.distribucion-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #2E7D32, #22C55E);
  border-radius: 999px;
  transition: width 0.7s cubic-bezier(0.16, 1, 0.3, 1);
}
.pico-bar {
  background: linear-gradient(90deg, #F59E0B, #FCD34D);
}

/* ─── Custom scrollbar ─── */
::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 999px; }
::-webkit-scrollbar-thumb:hover { background: #94A3B8; }
```

---

## Guía de Diseño — Principios Modernos y Minimalistas

Gemini debe seguir estos principios al reimplementar cada página:

### Paleta de Colores
| Uso | Valor |
|---|---|
| Fondo principal | `#F8FAFC` (slate-50) |
| Superficie/Card | `#FFFFFF` |
| Borde suave | `#E2E8F0` (slate-200) |
| Texto principal | `#0F172A` (slate-900) |
| Texto secundario | `#64748B` (slate-500) |
| Acento primario | `#16A34A` (green-600) |
| Acento hover | `#15803D` (green-700) |
| Error | `#EF4444` |
| Warning | `#F59E0B` |
| Sidebar bg | `#0A1F14` |

### Tipografía
- Fuente: **Inter** (ya importada desde Google Fonts)
- Títulos de página: `text-2xl font-bold text-slate-800`
- Subtítulos: `text-sm text-slate-400 font-medium`
- Labels de input: `text-xs font-bold uppercase tracking-wider text-slate-500`
- Cuerpo de tabla: `text-sm text-slate-700`
- Badge/tag: `text-xs font-semibold`

### Espaciado y Radios
- Cards: `rounded-2xl` (border-radius: 16px)
- Botones medianos: `rounded-xl` (border-radius: 12px)
- Inputs: `rounded-xl`
- Spacing entre secciones: `gap-6` o `space-y-6`
- Padding interno de cards: `p-5` o `p-6`

### Sombras
- Cards en reposo: `shadow-sm` + `border border-slate-100`
- Cards en hover: `hover:shadow-md transition-shadow duration-200`
- Modales: `shadow-2xl` o `shadow: 0 20px 60px rgba(0,0,0,0.15)`

---

## Plan de Acción para Gemini — Orden de Ejecución

### Paso 1: Corregir `src/index.css` (URGENTE)
- Mover el `@import url(Google Fonts)` al inicio, antes de `@tailwind base`
- Agregar únicamente las clases de layout estructural listadas arriba

### Paso 2: Migrar Componentes Base a Tailwind Puro
1. `src/components/ui/Card.tsx` → Tailwind inline
2. `src/components/ui/Badge.tsx` → Tailwind inline con variantes
3. `src/components/ui/Button.tsx` → Tailwind inline con variantes
4. `src/components/ui/Input.tsx` → Tailwind inline
5. `src/components/ui/StatCard.tsx` → Tailwind inline

### Paso 3: Migrar Páginas de Admin
1. `UsuariosCursos.tsx` — Tabs de navegación, tabla de usuarios
2. `ListaUsuarios.tsx` — Tabla y buscador
3. `MatriculaMasiva.tsx` — Dropzone y tabla CSV
4. `FormCrearUsuario.tsx` — Modal con reglas y caja de contraseña temporal
5. `FormCrearCurso.tsx` — Modal de formulario
6. `LogAuditoria.tsx` — Tabla de logs y filtros

### Paso 4: Migrar Páginas de Alumno
1. `ModalEntrega.tsx` — Drag & drop de archivos
2. `ConstanciaModal.tsx` — Comprobante digital
3. `HistorialAlumno.tsx` — Tabla de historial
4. `CronogramaAlumno.tsx` — Vista de cronograma

### Paso 5: Migrar Páginas de Profesor
1. `MisCursosProfesor.tsx` — Cards de cursos
2. `CursoCard.tsx` — Card individual de curso
3. `CronogramaProfesor.tsx` — Gestión de ventanas temporales
4. `MonitorVivo.tsx` — Dashboard en tiempo real

### Paso 6: Validar Compilación
```powershell
npx tsc --noEmit
```
Debe retornar 0 errores.

---

## Resultado Esperado por Página

### Login
- **Split-screen** 60/40: panel izquierdo oscuro verde con stats, panel derecho con formulario
- Form con Google OAuth + contraseña institucional
- Inputs con borde suave, foco en verde, sin bordes default de navegador

### Sidebar
- Fondo oscuro (`#0A1F14`), ancho fijo 260px
- Logo `SRE-URP` con ícono en la cabecera
- Nav items con hover sutil y estado activo en `bg-emerald-600` sólido
- Botón de Cerrar Sesión en el footer con ícono y color de alerta al hover

### Topbar
- Fondo blanco con `border-b border-slate-100` + `backdrop-blur`
- Badge del portal del usuario (Alumno/Docente/Admin) centrado a la izquierda
- Avatar del usuario (iniciales) a la derecha con nombre y rol

### Panel Alumno
- Banner de bienvenida con gradiente verde
- Grid 2×2 de KPI cards (Activos, Urgentes, Vencidos, Calificados)
- Lista de entregables con countdown visible y botón de entrega
- Panel de calificadas con nota vigesimal prominente

### Panel Admin
- Grid 4 KPIs (transacciones, storage, usuarios, incidencias)
- Gráfico de líneas de actividad (14 días)
- Barra de distribución de roles y picos de carga
- Tabla de auditoría reciente

### Calificación Docente
- Selectores de curso/entregable en pills horizontales
- KPI row (entregados, calificados, sin entregar)
- Tabla de alumnos con búsqueda, nota y acciones
- Modal de evaluación con barra de intentos restantes

---

> **Nota crítica**: NO usar clases de Tailwind con valores arbitrarios complejos como `bg-[#1A3D2B]` excepto en el Sidebar y Login, donde el color de fondo no tiene equivalente exacto en la paleta estándar. Para todo lo demás, usar valores de la paleta de slate y emerald integrada.

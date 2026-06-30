> ## 🤖 INSTRUCCIONES PARA EL AGENTE — LEER ANTES DE EJECUTAR CUALQUIER COSA
>
> 1. **Lee este documento completo antes de ejecutar cualquier paso.**
> 2. **Ejecuta ÚNICAMENTE los bloques marcados con `<!-- ✅ EJECUTAR VÍA MCP -->`** usando la conexión MCP de Antigravity a Supabase. Ignora todo lo demás.
> 3. **Orden estricto:** Ejecuta las migraciones en el orden numérico indicado en la tabla "Orden de Ejecución de Migraciones" al final del documento. No saltes pasos.
> 4. **Verifica cada migración** con el bloque `<!-- ✅ VERIFICAR -->` correspondiente antes de continuar. Si la verificación falla, detente y reporta el error exacto.
> 5. **Si un paso falla:** detente, reporta el error completo y espera instrucciones. No intentes corregir automáticamente.
> 6. **Los bloques marcados con `<!-- 📋 REFERENCIA -->` son solo documentación de código frontend** — no los ejecutes.
> 7. **Las Edge Functions NO las creas tú.** Cuando encuentres `npx supabase functions new ...`, confirma que debe crearse manualmente por el desarrollador y continúa con el siguiente bloque SQL.
> 8. **Al finalizar todas las migraciones**, ejecuta el bloque de verificación final para confirmar que el esquema está completo.

---

# 🎓 SRE-URP — Plan de Desarrollo en 6 Módulos
### Sistema de Registro de Entregables Académicos · Universidad Ricardo Palma
**Stack:** React + TypeScript + Vite · Supabase (PostgreSQL + Auth + Realtime + Edge Functions) · Google Drive API  
**Desarrollado 100% con IA (Gemini)**

---

> ## ⚠️ Reglas Globales — Aplicables a TODOS los módulos
>
> 1. **NADA hardcodeado.** Toda la información (nombres, correos, roles, cursos, estados, notas, etc.) proviene **exclusivamente de la base de datos Supabase**. Cualquier dato que se muestre en pantalla debe ser consultado dinámicamente.
> 2. **Zona horaria:** Todo timestamp se almacena en UTC en la BD. La capa de presentación convierte a `America/Lima (UTC-5)`.
> 3. **Paleta de colores institucional** (basada en las referencias visuales):
>    - **Verde oscuro principal:** `#1A3D2B` (sidebar, headers)
>    - **Verde acento/botones:** `#2E7D32` o `#22C55E`
>    - **Fondo de página:** `#F7F8F6` o blanco puro `#FFFFFF`
>    - **Texto primario:** `#1C1C1C`
>    - **Amarillo alerta:** `#F59E0B`
>    - **Rojo error/vencido:** `#EF4444`
>    - **Verde éxito/a tiempo:** `#16A34A`
> 4. **Tipografía:** `Inter` (Google Fonts) para todo el sistema.
> 5. **Componente Shell común:** Sidebar oscuro de `240px` fijo, topbar con avatar del usuario desde Supabase Auth.
> 6. **RLS activo en todo momento:** Ningún componente frontend filtra datos por seguridad; esa responsabilidad es exclusiva de PostgreSQL RLS.
> 7. **Sin auto-registro.** Solo el Administrador crea cuentas.
> 8. **Supabase MCP:** Todos los integrantes tienen el IDE conectado al proyecto Supabase vía MCP. Ejecutar migraciones directamente desde el IDE.

---

## 📁 Estructura de Carpetas del Proyecto (Referencia Global)

```
src/
├── components/
│   ├── ui/               # Componentes atómicos (Button, Badge, Card, Input...)
│   ├── layout/           # Shell, Sidebar, Topbar, NavItem
│   └── shared/           # Countdown, StatusBadge, FileIcon, EmptyState
├── hooks/
│   ├── useAuth.ts        # Sesión y rol del usuario
│   ├── useSupabase.ts    # Cliente singleton de Supabase
│   └── useRealtime.ts    # Suscripciones Supabase Realtime
├── pages/
│   ├── auth/             # Login
│   ├── alumno/           # Panel, Historial, Cronograma
│   ├── profesor/         # MisCursos, Monitor, Calificación, Cronograma
│   └── admin/            # PanelGeneral, UsuariosCursos, LogAuditoria
├── services/
│   ├── supabase.ts       # Cliente Supabase configurado con env vars
│   ├── authService.ts    # Login, logout, refresh
│   ├── entregablesService.ts
│   ├── entregasService.ts
│   ├── calificacionService.ts
│   └── auditService.ts
├── types/
│   └── database.types.ts # Tipos generados automáticamente con Supabase CLI
├── utils/
│   ├── dateUtils.ts      # Conversión UTC → UTC-5, formato humano
│   └── hashUtils.ts      # SHA-256
└── router/
    └── AppRouter.tsx     # React Router con guards por rol
```

---

## 🗄️ Esquema de Base de Datos Supabase (Referencia Global)

> Ejecutar estas migraciones en orden vía MCP de Supabase antes de iniciar cualquier módulo.

### Migración 000 — Datos semilla (ejecutar después de 001 y 003)

<!-- ✅ EJECUTAR VÍA MCP -->
```sql
-- Roles base del sistema — requeridos para que RLS y el login funcionen
INSERT INTO roles (nombre) VALUES
  ('alumno'),
  ('profesor'),
  ('administrador')
ON CONFLICT (nombre) DO NOTHING;
```

<!-- ✅ VERIFICAR — debe retornar exactamente 3 filas: alumno, profesor, administrador -->
```sql
SELECT nombre FROM roles ORDER BY nombre;
```

### Migración 001 — Tablas principales

<!-- ✅ EJECUTAR VÍA MCP -->
```sql
-- Habilitar extensión pgcrypto para hashes
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tabla de roles
CREATE TABLE roles (
  id_rol        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre        TEXT NOT NULL UNIQUE  -- 'alumno', 'profesor', 'administrador'
);

-- Tabla de usuarios (vinculada a Supabase Auth)
CREATE TABLE usuarios (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre_completo TEXT NOT NULL,
  codigo_institucional TEXT UNIQUE,
  email         TEXT NOT NULL UNIQUE,
  id_rol        UUID NOT NULL REFERENCES roles(id_rol),
  facultad      TEXT DEFAULT 'Facultad de Ingeniería',
  estado        TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
  intentos_fallidos INT NOT NULL DEFAULT 0,
  bloqueado_hasta TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de cursos
CREATE TABLE cursos (
  id_curso      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo        TEXT NOT NULL UNIQUE,  -- e.g. 'IF-0712'
  nombre        TEXT NOT NULL,
  seccion       TEXT NOT NULL,         -- e.g. 'IF-8A1'
  ciclo_academico TEXT NOT NULL,       -- e.g. '2026-I'
  id_profesor   UUID REFERENCES usuarios(id),
  estado        TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de matrículas (relación N:M alumno-curso)
CREATE TABLE matriculas (
  id_matricula  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_alumno     UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  id_curso      UUID NOT NULL REFERENCES cursos(id_curso) ON DELETE CASCADE,
  fecha_matricula TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(id_alumno, id_curso)
);

-- Tabla de entregables
CREATE TABLE entregables (
  id_entregable UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_curso      UUID NOT NULL REFERENCES cursos(id_curso) ON DELETE CASCADE,
  titulo        TEXT NOT NULL,
  descripcion   TEXT,
  fecha_apertura TIMESTAMPTZ NOT NULL,
  fecha_cierre  TIMESTAMPTZ NOT NULL,
  admite_extemporaneas BOOLEAN NOT NULL DEFAULT false,
  created_by    UUID REFERENCES usuarios(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ck_fechas CHECK (fecha_cierre > fecha_apertura)
);

-- Tabla de prórrogas individuales
CREATE TABLE prorrogas (
  id_prorroga   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_entregable UUID NOT NULL REFERENCES entregables(id_entregable) ON DELETE CASCADE,
  id_alumno     UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nueva_fecha_cierre TIMESTAMPTZ NOT NULL,
  otorgado_por  UUID REFERENCES usuarios(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(id_entregable, id_alumno)
);

-- Tabla de entregas
CREATE TABLE entregas (
  id_entrega    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_entregable UUID NOT NULL REFERENCES entregables(id_entregable),
  id_alumno     UUID NOT NULL REFERENCES usuarios(id),
  nombre_archivo TEXT NOT NULL,
  tamano_bytes  BIGINT NOT NULL,
  drive_url     TEXT NOT NULL,
  file_hash     TEXT NOT NULL,
  estado_puntualidad TEXT NOT NULL CHECK (estado_puntualidad IN ('A Tiempo', 'Tardía')),
  timestamp_servidor TIMESTAMPTZ NOT NULL DEFAULT now(),
  constancia_id UUID DEFAULT gen_random_uuid(),
  UNIQUE(id_entregable, id_alumno)  -- máximo 1 entrega vigente por alumno por entregable
);

-- Tabla de hash antiplagio por curso
CREATE TABLE hashes_curso (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_curso      UUID NOT NULL REFERENCES cursos(id_curso),
  file_hash     TEXT NOT NULL,
  id_entrega    UUID REFERENCES entregas(id_entrega),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(id_curso, file_hash)   -- UNIQUE constraint antiplagio
);

-- Tabla de calificaciones/revisiones
CREATE TABLE revisiones (
  id_revision   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_entrega    UUID NOT NULL REFERENCES entregas(id_entrega) ON DELETE CASCADE UNIQUE,
  nota          NUMERIC(4,2) CHECK (nota >= 0 AND nota <= 20),
  retroalimentacion TEXT,
  id_profesor   UUID REFERENCES usuarios(id),
  fecha_evaluacion TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Tabla de log de auditoría (INMUTABLE - solo INSERT)
CREATE TABLE logs_auditoria (
  id_log        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_usuario    UUID REFERENCES usuarios(id),
  email_usuario TEXT,
  tipo_operacion TEXT NOT NULL,  -- 'LOGIN_SUCCESS', 'UPLOAD_FILE', etc.
  tabla_afectada TEXT,
  ip_cliente    TEXT,
  valor_anterior JSONB,
  valor_nuevo   JSONB,
  metadata      JSONB,
  timestamp_servidor TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

<!-- ✅ VERIFICAR — debe listar todas las tablas creadas: roles, usuarios, cursos, matriculas, entregables, prorrogas, entregas, hashes_curso, revisiones, logs_auditoria -->
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

### Migración 002 — Triggers de auditoría e inmutabilidad

<!-- ✅ EJECUTAR VÍA MCP -->
```sql
-- Función genérica de auditoría
CREATE OR REPLACE FUNCTION fn_audit_trigger()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO logs_auditoria (
    id_usuario, email_usuario, tipo_operacion, tabla_afectada,
    ip_cliente, valor_anterior, valor_nuevo
  ) VALUES (
    auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    TG_OP || '_' || TG_TABLE_NAME,
    TG_TABLE_NAME,
    current_setting('request.headers', true)::json->>'x-forwarded-for',
    CASE WHEN TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN row_to_json(OLD)::jsonb ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW)::jsonb ELSE NULL END
  );
  RETURN NEW;
END;
$$;

-- Triggers en tablas críticas
CREATE TRIGGER trg_audit_entregas
  AFTER INSERT OR UPDATE ON entregas
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER trg_audit_revisiones
  AFTER INSERT OR UPDATE ON revisiones
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER trg_audit_entregables
  AFTER INSERT OR UPDATE OR DELETE ON entregables
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER trg_audit_usuarios
  AFTER INSERT OR UPDATE OR DELETE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

-- Bloqueo absoluto de UPDATE/DELETE en logs_auditoria
CREATE OR REPLACE RULE no_update_logs AS ON UPDATE TO logs_auditoria DO INSTEAD NOTHING;
CREATE OR REPLACE RULE no_delete_logs AS ON DELETE TO logs_auditoria DO INSTEAD NOTHING;
```

<!-- ✅ VERIFICAR — debe retornar al menos 4 triggers (entregas, revisiones, entregables, usuarios) y 2 rules (no_update_logs, no_delete_logs) -->
```sql
SELECT trigger_name, event_object_table FROM information_schema.triggers
WHERE trigger_schema = 'public' ORDER BY event_object_table;

SELECT rulename, tablename FROM pg_rules WHERE tablename = 'logs_auditoria';
```

### Migración 003 — Row Level Security (RLS)

<!-- ✅ EJECUTAR VÍA MCP -->
```sql
-- Habilitar RLS en todas las tablas con datos sensibles
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE matriculas ENABLE ROW LEVEL SECURITY;
ALTER TABLE entregables ENABLE ROW LEVEL SECURITY;
ALTER TABLE entregas ENABLE ROW LEVEL SECURITY;
ALTER TABLE revisiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE prorrogas ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs_auditoria ENABLE ROW LEVEL SECURITY;

-- Función auxiliar para obtener el rol del usuario autenticado
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT r.nombre FROM usuarios u
  JOIN roles r ON r.id_rol = u.id_rol
  WHERE u.id = auth.uid()
$$;

-- POLÍTICAS: Usuarios
CREATE POLICY "admin_full_usuarios" ON usuarios
  FOR ALL USING (get_user_role() = 'administrador');

CREATE POLICY "self_read_usuario" ON usuarios
  FOR SELECT USING (id = auth.uid());

-- POLÍTICAS: Entregas (alumno solo ve las suyas)
CREATE POLICY "alumno_own_entregas" ON entregas
  FOR ALL USING (
    id_alumno = auth.uid()
    OR get_user_role() IN ('profesor', 'administrador')
  );

-- POLÍTICAS: Revisiones (profesor solo califica sus cursos)
CREATE POLICY "profesor_califica" ON revisiones
  FOR ALL USING (
    get_user_role() = 'administrador'
    OR id_profesor = auth.uid()
    OR EXISTS (
      SELECT 1 FROM entregas e
      JOIN entregables et ON et.id_entregable = e.id_entregable
      JOIN cursos c ON c.id_curso = et.id_curso
      WHERE e.id_entrega = revisiones.id_entrega
        AND (c.id_profesor = auth.uid() OR e.id_alumno = auth.uid())
    )
  );

-- POLÍTICAS: Logs de auditoría (solo administradores)
CREATE POLICY "admin_read_logs" ON logs_auditoria
  FOR SELECT USING (get_user_role() = 'administrador');

CREATE POLICY "system_insert_logs" ON logs_auditoria
  FOR INSERT WITH CHECK (true);
```

<!-- ✅ VERIFICAR — debe mostrar RLS habilitado (rowsecurity = true) en todas las tablas listadas -->
```sql
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

---

---

# MÓDULO 1 — Fundación: Autenticación, Diseño Base e Infraestructura del Proyecto

**Responsable:** Integrante 1  
**Alcance:** Setup del proyecto React/Vite/TS, design system completo, login, guard de rutas, shell layout y cliente Supabase.

---

## 🎯 Objetivo del Módulo

Establecer la base técnica y visual sobre la que todos los demás módulos construirán. Al finalizar este módulo, el proyecto debe poder iniciarse, mostrar el login, autenticar usuarios de 3 roles distintos y redirigirlos al shell de su rol correspondiente (con layout vacío pero funcional).

---

## 🖥️ Referencia Visual

La pantalla de login tiene **layout dividido en dos columnas**:
- **Columna izquierda (60%):** Fondo verde oscuro (`#1A3D2B`), logo institucional URP en la esquina superior izquierda, estadísticas del sistema (entregas registradas, disponibilidad, cursos activos) leídas desde la BD, y el nombre del sistema.
- **Columna derecha (40%):** Fondo crema/blanco, tarjeta de login centrada con botón de Google OAuth, separador "O CON CREDENCIALES", campos de correo y contraseña, botón "Iniciar sesión".

El **sidebar** (compartido por todos los roles) es verde oscuro `#1A3D2B`, `240px` de ancho, con el logo "SRE-URP" en la parte superior y los ítems de navegación según el rol del usuario autenticado (cargados dinámicamente desde la BD, no hardcodeados).

---

## 📋 Tareas Técnicas

### 1.1 Setup del Proyecto

- El proyecto ya existe con Vite + React + TypeScript. Instalar dependencias necesarias:
  ```bash
  npm install @supabase/supabase-js react-router-dom lucide-react date-fns
  ```
- Configurar variables de entorno en `.env.local`:
  ```
  VITE_SUPABASE_URL=<obtenida del MCP>
  VITE_SUPABASE_ANON_KEY=<obtenida del MCP>
  ```
- Crear `src/services/supabase.ts` — cliente singleton de Supabase.

### 1.2 Design System — `src/index.css`

Implementar con CSS variables todas las fichas del sistema de diseño:

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

:root {
  --color-primary-dark: #1A3D2B;
  --color-primary: #2E7D32;
  --color-accent: #22C55E;
  --color-bg: #F7F8F6;
  --color-surface: #FFFFFF;
  --color-text-primary: #1C1C1C;
  --color-text-secondary: #6B7280;
  --color-success: #16A34A;
  --color-warning: #F59E0B;
  --color-error: #EF4444;
  --color-border: #E5E7EB;
  --sidebar-width: 240px;
  --topbar-height: 64px;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.08);
  --shadow-md: 0 4px 16px rgba(0,0,0,0.10);
  font-family: 'Inter', sans-serif;
}
```

### 1.3 Componentes Base (`src/components/ui/`)

Crear los siguientes componentes reutilizables (usados por todos los módulos):

| Componente | Props clave |
|---|---|
| `Button.tsx` | `variant: 'primary' \| 'secondary' \| 'ghost'`, `size`, `loading`, `icon` |
| `Badge.tsx` | `variant: 'success' \| 'warning' \| 'error' \| 'neutral'`, `label` |
| `Card.tsx` | `children`, `className` |
| `Input.tsx` | `label`, `error`, `icon`, standard HTML input props |
| `Spinner.tsx` | `size` |
| `EmptyState.tsx` | `icon`, `title`, `description` |
| `StatCard.tsx` | `label`, `value`, `icon`, `trend` — usado en dashboards |

### 1.4 Layout Shell (`src/components/layout/`)

```
Shell.tsx         — Layout general: sidebar + topbar + <Outlet />
Sidebar.tsx       — Menú lateral con ítems según rol (leídos desde auth context)
Topbar.tsx        — Barra superior con nombre del usuario, rol y avatar (desde usuarios tabla)
NavItem.tsx       — Ítem individual del sidebar con ícono y estado activo
```

**Sidebar — Ítems por rol (dinámicos, no hardcodeados):**

```typescript
// Definir en un mapa — el contenido se renderiza condicionalmente por rol leído del JWT
const NAV_ITEMS = {
  alumno: [
    { label: 'Mis entregables', path: '/alumno', icon: 'LayoutGrid' },
    { label: 'Historial',       path: '/alumno/historial', icon: 'History' },
    { label: 'Cronograma',      path: '/alumno/cronograma', icon: 'Calendar' },  // ← NUEVO (requerido)
  ],
  profesor: [
    { label: 'Mis cursos',     path: '/profesor', icon: 'BookOpen' },
    { label: 'Monitor en vivo', path: '/profesor/monitor', icon: 'Activity' },
    { label: 'Calificación',   path: '/profesor/calificacion', icon: 'ClipboardCheck' },
    { label: 'Cronograma',     path: '/profesor/cronograma', icon: 'Calendar' }, // ← NUEVO (requerido)
  ],
  administrador: [
    { label: 'Panel general',  path: '/admin', icon: 'BarChart2' },
    { label: 'Usuarios & Cursos', path: '/admin/usuarios', icon: 'Users' },
    { label: 'Log de auditoría', path: '/admin/auditoria', icon: 'Shield' },
  ],
}
```

### 1.5 Autenticación (`src/pages/auth/Login.tsx`)

- **Login con email/contraseña** vía `supabase.auth.signInWithPassword()`
- **Login con Google OAuth** vía `supabase.auth.signInWithOAuth({ provider: 'google' })` — solo correos `@urp.edu.pe` (validación en hook `useAuth`)
- **Bloqueo de cuenta:** Si `intentos_fallidos >= 5` en tabla `usuarios`, mostrar mensaje de bloqueo y deshabilitar botón. El contador se actualiza en BD via trigger.
- **Las estadísticas del lado izquierdo** (12.4k entregas, 98.7% disponibilidad, 320 cursos activos) se cargan con queries COUNT reales a Supabase.
- Registrar `LOGIN_SUCCESS` / `LOGIN_FAILED` en `logs_auditoria` via Edge Function.

### 1.6 Guard de Rutas (`src/router/AppRouter.tsx`)

```typescript
// Rutas protegidas por rol — el rol se lee del JWT/perfil en Supabase
// Redirigir a /login si no hay sesión
// Redirigir a la ruta correspondiente al rol si intenta acceder a una ruta ajena
```

### 1.7 Custom Hook `useAuth.ts`

```typescript
export function useAuth() {
  // Retorna: { session, user, perfil, rol, loading, signOut }
  // `perfil` viene de la tabla `usuarios` JOIN `roles`
  // `rol` es el nombre del rol: 'alumno' | 'profesor' | 'administrador'
}
```

---

## 🗄️ Modificaciones Supabase (Módulo 1)

1. Ejecutar **Migraciones 001, 002 y 003** descritas en la sección global.
2. En el Dashboard de Supabase Auth → **Providers** → habilitar **Google OAuth** con las credenciales del proyecto.
3. Insertar los 3 roles iniciales (ya incluido en Migración 000 — solo si no se ejecutó antes):
<!-- ✅ EJECUTAR VÍA MCP -->
   ```sql
   INSERT INTO roles (nombre) VALUES ('alumno'), ('profesor'), ('administrador')
   ON CONFLICT (nombre) DO NOTHING;
   ```
4. Generar tipos TypeScript:
<!-- 📋 REFERENCIA — ejecutar manualmente en terminal, no via MCP -->
   ```bash
   npx supabase gen types typescript --project-id <project-id> > src/types/database.types.ts
   ```

---

---

# MÓDULO 2 — Portal del Estudiante: Entregables, Countdown y Carga de Archivos

**Responsable:** Integrante 2  
**Alcance:** Panel principal del alumno, cronograma estilo Google Calendar, contador regresivo, subida de archivos via Edge Function, constancia digital.  
**Depende de:** Módulo 1 (Shell, Auth, Supabase client)

---

## 🎯 Objetivo del Módulo

El alumno debe poder ver todos sus entregables organizados por estado, con un **cronograma visual tipo Google Calendar** que muestre los vencimientos, un contador regresivo sincronizado con el servidor, y un flujo completo de carga de archivos a Google Drive.

---

## 🖥️ Referencia Visual

**Panel principal del alumno (`/alumno`):**
- **Topbar:** Nombre del curso del sistema + "Portal del Estudiante", avatar del alumno con nombre y código (desde `usuarios`)
- **Tarjetas de resumen:** 4 KPIs leídos de la BD: ACTIVOS / PENDIENTES <24H / VENCIDOS / CALIFICADOS
- **Sección "Entregables Activos":** Cards horizontales con título, curso, descripción y countdown `DD:HH:MM:SS`. El contador se vuelve amarillo cuando faltan < 24h y rojo cuando faltan < 1h.
- **Sección "Calificados Recientemente":** Cards con nota `X/20` y comentario del profesor.

**Vista Historial (`/alumno/historial`):**
- Tabla con columnas: ARCHIVO / CURSO / TAMAÑO / FECHA DE ENVÍO / ESTADO / ACCIONES
- Estado badge: `A Tiempo` (verde) o `Tardía` (amarillo/naranja)
- Botón exportar en la esquina superior derecha

**Vista Cronograma (`/alumno/cronograma`):** ← **COMPONENTE NUEVO REQUERIDO**
- Interfaz similar a **Google Calendar** (vista mensual/semanal)
- Cada entregable aparece como un **evento de color** en el día de vencimiento
- Colores según estado: Verde (activo/a tiempo), Amarillo (urgente <24h), Rojo (vencido), Gris (calificado)
- Al hacer click en un evento, se despliega un popover con detalles del entregable (nombre, curso, fecha exacta, estado actual)
- Toggle entre **vista mensual** y **vista semanal**
- **TODOS los datos vienen de la BD** — query a `entregables` JOIN `matriculas` WHERE `id_alumno = auth.uid()`

---

## 📋 Tareas Técnicas

### 2.1 Páginas y Componentes (`src/pages/alumno/`)

```
PanelAlumno.tsx      — Panel principal con KPIs y cards de entregables
EntregableCard.tsx   — Card individual con countdown + botón "Entregar"
HistorialAlumno.tsx  — Tabla de historial de entregas
CronogramaAlumno.tsx — Vista tipo Google Calendar (NUEVO, requerido)
ModalEntrega.tsx     — Modal de carga de archivo con drag & drop
ConstanciaModal.tsx  — Constancia digital post-entrega
```

### 2.2 Componente Countdown (`src/components/shared/Countdown.tsx`)

```typescript
// Props: fechaCierre: string (ISO), onExpire?: () => void
// Sincronizar periódicamente con Supabase: SELECT now() -- hora del servidor
// Cambio de color: > 24h → verde, < 24h → amarillo (#F59E0B), < 1h → rojo (#EF4444)
// Al expirar: deshabilitar botón de entrega y mostrar mensaje
```

### 2.3 Cronograma tipo Google Calendar

Este es el componente más complejo del módulo. Implementar desde cero en CSS puro:

```typescript
// CronogramaAlumno.tsx
// - Renderizar una grilla de 7 columnas × N semanas para el mes seleccionado
// - Para cada día, query: entregables WHERE fecha_cierre::date = día AND alumno matriculado
// - Evento clickeable → Popover con datos del entregable
// - Header del calendario: navegación mes anterior/siguiente
// - Toggle: Vista Mensual | Vista Semanal
// - Distinguir visualmente: hoy, días pasados, días con eventos urgentes
// Estilo inspirado en Google Calendar pero con la paleta verde institucional
```

**Diseño del calendario:**
```
┌──────────────────────────────────────────────────────┐
│  < Junio 2026 >              [Mensual] [Semanal]     │
├──────┬──────┬──────┬──────┬──────┬──────┬────────────┤
│  LUN │  MAR │  MIE │  JUE │  VIE │  SAB │    DOM     │
├──────┼──────┼──────┼──────┼──────┼──────┼────────────┤
│  1   │  2   │  3   │  4   │  5   │  6   │    7       │
│      │      │ 🟢IF-07│     │      │      │            │
├──────┼──────┼──────┼──────┼──────┼──────┼────────────┤
│  8   │  9   │  10  │  11  │  12  │  13  │    14      │
│      │      │      │ 🔴IF-08│     │      │            │
└──────┴──────┴──────┴──────┴──────┴──────┴────────────┘
```

### 2.4 Modal de Entrega (`ModalEntrega.tsx`)

- Drag & Drop o click para seleccionar archivo
- Validar que la ventana esté abierta **consultando el servidor** (no el cliente)
- Llamar a la Edge Function `upload-delivery` con `multipart/form-data`
- Mostrar spinner durante la carga
- Al completar: mostrar `ConstanciaModal.tsx` con los datos devueltos por la Edge Function

### 2.5 Servicio de Entregas (`src/services/entregasService.ts`)

```typescript
// getEntregablesActivos(idAlumno: string): Promise<EntregableConEstado[]>
// getHistorialEntregas(idAlumno: string): Promise<EntregaHistorial[]>
// subirEntrega(file: File, idEntregable: string, idCurso: string): Promise<ConstanciaDigital>
// getKPIsAlumno(idAlumno: string): Promise<{ activos, pendientes24h, vencidos, calificados }>
// getEntregablesCalendario(idAlumno: string, mes: number, anio: number): Promise<EventoCalendario[]>
```

### 2.6 Edge Function — `upload-delivery`

> Esta Edge Function es responsabilidad del integrante de este módulo, coordinada con el Módulo 4 (Supabase).

```typescript
// supabase/functions/upload-delivery/index.ts
// 1. Verificar JWT del alumno (auth.uid())
// 2. Verificar ventana abierta: SELECT now() <= fecha_cierre FROM entregables
// 3. Calcular SHA-256 del archivo
// 4. Verificar UNIQUE(id_curso, file_hash) en hashes_curso — antiplagio
// 5. Subir a Google Drive via Service Account
// 6. INSERT en entregas con timestamp del servidor (DEFAULT now())
// 7. INSERT en hashes_curso
// 8. Retornar constancia digital
```

---

## 🗄️ Modificaciones Supabase (Módulo 2)

1. Crear la Edge Function `upload-delivery`:
<!-- 📋 REFERENCIA — ejecutar manualmente en terminal por el desarrollador del Módulo 2, no via MCP -->
   ```bash
   npx supabase functions new upload-delivery
   ```
2. Configurar secrets de Google Drive en Supabase:
<!-- 📋 REFERENCIA — ejecutar manualmente en terminal, no via MCP -->
   ```bash
   npx supabase secrets set GOOGLE_SERVICE_ACCOUNT_EMAIL=...
   npx supabase secrets set GOOGLE_PRIVATE_KEY=...
   npx supabase secrets set GOOGLE_DRIVE_ROOT_FOLDER_ID=...
   ```
3. Habilitar Realtime en la tabla `entregas`:
<!-- ✅ EJECUTAR VÍA MCP -->
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE entregas;
   ```
4. Crear función para calcular KPIs del alumno:
<!-- ✅ EJECUTAR VÍA MCP -->
   ```sql
   CREATE OR REPLACE FUNCTION get_alumno_kpis(p_alumno_id UUID)
   RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
   DECLARE
     v_activos INT; v_urgentes INT; v_vencidos INT; v_calificados INT;
   BEGIN
     SELECT COUNT(*) INTO v_activos FROM entregables e
     JOIN matriculas m ON m.id_curso = e.id_curso
     WHERE m.id_alumno = p_alumno_id
       AND now() BETWEEN e.fecha_apertura AND e.fecha_cierre;
     -- (similar para los demás KPIs)
     RETURN json_build_object('activos', v_activos, 'urgentes', v_urgentes,
                              'vencidos', v_vencidos, 'calificados', v_calificados);
   END;
   $$;
   ```

<!-- ✅ VERIFICAR — debe retornar la función get_alumno_kpis -->
```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name = 'get_alumno_kpis';
```

---

---

# MÓDULO 3 — Portal del Profesor: Dashboard de Cursos, Monitor en Vivo y Cronograma

**Responsable:** Integrante 3  
**Alcance:** Panel principal del profesor, monitor en tiempo real (WebSockets), gestión de cronogramas y ventanas de tiempo, prórrogas individuales, vista de cronograma estilo Google Calendar.  
**Depende de:** Módulo 1 (Shell, Auth)

---

## 🎯 Objetivo del Módulo

El profesor debe tener un dashboard con el estado consolidado de cada curso, acceso al monitor en vivo con Supabase Realtime, y herramientas para crear/editar entregables y sus ventanas de tiempo. También debe ver el **cronograma de sus cursos** en formato tipo Google Calendar.

---

## 🖥️ Referencia Visual

**Panel principal del profesor (`/profesor`):**
- Título "Vista global de mis cursos" + subtítulo + botón "+ Crear entregable" en la esquina superior derecha
- **4 KPIs globales:** CURSOS A CARGO / ESTUDIANTES ACTIVOS / ENTREGAS POR REVISAR / ATRASOS DETECTADOS
- **Cards de cursos** (una por curso): código + sección, nombre del curso, cantidad de matriculados, gráfico circular de progreso de entregas (%), y 4 mini-stats (A Tiempo / Tardías / Pendientes / Calificados). Barras de progreso dobles (avance entregas + avance calificación). Próximo entregable con fecha y dos botones: "Calificar" y "Monitor".

**Monitor en vivo (`/profesor/monitor`):**
- Subheader con nombre del curso + sección + nombre del entregable
- 3 KPIs: ENTREGAS EN SESIÓN / A TIEMPO / TARDÍAS
- Indicador "● EN VIVO" con texto "Auto-actualiza cada 3.5s"
- Tabla en tiempo real: HORA / CÓDIGO / ALUMNO / ARCHIVO / ESTADO / ACCIÓN

**Cronograma del Profesor (`/profesor/cronograma`):** ← **COMPONENTE NUEVO REQUERIDO**
- Similar al del alumno pero **con capacidad de edición**
- Click en un día vacío → Modal de "Crear Entregable"
- Click en un entregable existente → Modal de edición/prórroga
- Vista por curso (selector de curso en la cabecera del calendario)
- Distinguir visualmente: Entregables cerrados (gris), Activos (verde), Urgentes (amarillo), Futuros (azul)

---

## 📋 Tareas Técnicas

### 3.1 Páginas y Componentes (`src/pages/profesor/`)

```
PanelProfesor.tsx       — Dashboard con KPIs y cards de cursos
CursoCard.tsx           — Card individual con stats, progreso circular y botones
MonitorVivo.tsx         — Vista de tiempo real con WebSocket
CalificacionProfesor.tsx — Tabla de calificación (coordinado con Módulo 4)
CronogramaProfesor.tsx  — Calendario editable tipo Google Calendar
ModalCrearEntregable.tsx — Formulario de crear/editar entregable
ModalProrrogaIndividual.tsx — Asignar prórroga a alumno específico
```

### 3.2 Monitor en Vivo con Supabase Realtime

```typescript
// MonitorVivo.tsx
// 1. Al montar: establecer canal Realtime en tabla `entregas`
//    filtrando por id_curso actual
// 2. Escuchar eventos INSERT (nueva entrega) y UPDATE
// 3. Actualizar la tabla de estado sin recargar la página
// 4. Mostrar timestamp relativo "hace X minutos" de cada entrega
// 5. Botón "Pausar" desconecta el canal temporalmente

const channel = supabase
  .channel(`monitor-curso-${idCurso}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'entregas',
    filter: `id_entregable=eq.${idEntregable}`
  }, (payload) => { /* actualizar estado */ })
  .subscribe()
```

### 3.3 Gestión de Entregables y Ventanas

```typescript
// ModalCrearEntregable.tsx
// Campos: título, descripción, fecha_apertura, fecha_cierre, admite_extemporaneas
// Validación: fecha_cierre > fecha_apertura (también validada en BD con CONSTRAINT)
// Llamar: POST /functions/v1/manage-schedule con action: 'CREATE'
// Registrar CREATE_WINDOW en logs_auditoria (via trigger automático)

// ModalProrrogaIndividual.tsx  
// Buscar alumno del curso (SELECT con búsqueda por nombre o código)
// Ingresar nueva_fecha_cierre exclusiva para ese alumno
// INSERT en prorrogas → trigger registra EXTENSION_GRANTED en auditoría
```

### 3.4 Cronograma del Profesor (Calendario Editable)

- Mismo esquema de calendario que el del alumno (Módulo 2)
- Añadir: selector de curso en el header del calendario
- Click en celda vacía → `ModalCrearEntregable` con fecha pre-rellenada
- Click en evento existente → vista de opciones (Editar / Prórroga / Ver monitor)
- Indicador de "ventana abierta ahora" (borde parpadeante en verde)

### 3.5 Servicio de Cursos y Entregables (`src/services/`)

```typescript
// cursosService.ts
// getMisCursos(idProfesor: string): Promise<CursoConStats[]>
// getKPIsProfesor(idProfesor: string): Promise<ProfesorKPIs>

// entregablesService.ts
// crearEntregable(data: NuevoEntregable): Promise<Entregable>
// editarEntregable(id: string, data: Partial<Entregable>): Promise<Entregable>
// eliminarEntregable(id: string): Promise<void>  // Bloqueado si tiene entregas
// asignarProrroga(data: NuevaProrroga): Promise<Prorroga>
// getEntregablesPorCurso(idCurso: string): Promise<Entregable[]>
```

---

## 🗄️ Modificaciones Supabase (Módulo 3)

1. Crear función para obtener stats de un curso:
<!-- ✅ EJECUTAR VÍA MCP -->
   ```sql
   CREATE OR REPLACE FUNCTION get_curso_stats(p_curso_id UUID, p_entregable_id UUID)
   RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
   -- Retorna: { a_tiempo, tardias, pendientes, calificados, total_alumnos, pct_entregas, pct_calificacion }
   $$;
   ```

2. Crear Edge Function `manage-schedule`:
<!-- 📋 REFERENCIA — ejecutar manualmente en terminal por el desarrollador del Módulo 3, no via MCP -->
   ```bash
   npx supabase functions new manage-schedule
   # Validar zona horaria America/Lima, validar fechas, INSERT/UPDATE en entregables
   ```

3. Crear Edge Function `assign-extension`:
<!-- 📋 REFERENCIA — ejecutar manualmente en terminal, no via MCP -->
   ```bash
   npx supabase functions new assign-extension
   # INSERT en prorrogas con validación de pertenencia del alumno al curso del profesor
   ```

4. Habilitar Realtime en `entregables`:
<!-- ✅ EJECUTAR VÍA MCP -->
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE entregables;
   ```

5. RLS adicional para el profesor:
<!-- ✅ EJECUTAR VÍA MCP -->
   ```sql
   -- Profesor solo edita entregables de sus cursos
   CREATE POLICY "profesor_gestiona_entregables" ON entregables
     FOR ALL USING (
       get_user_role() = 'administrador'
       OR EXISTS (
         SELECT 1 FROM cursos c
         WHERE c.id_curso = entregables.id_curso
           AND c.id_profesor = auth.uid()
       )
     );
   ```

<!-- ✅ VERIFICAR — debe retornar la función get_curso_stats y la policy profesor_gestiona_entregables -->
```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name = 'get_curso_stats';

SELECT policyname FROM pg_policies
WHERE tablename = 'entregables' AND policyname = 'profesor_gestiona_entregables';
```

---

---

# MÓDULO 4 — Portal de Calificación: Revisión, Retroalimentación y Exportación

**Responsable:** Integrante 4  
**Alcance:** Vista de calificación del profesor, modal de evaluación, visualización de notas para el alumno, exportación CSV/Excel, realtime de notas.  
**Depende de:** Módulos 1, 2, 3

---

## 🎯 Objetivo del Módulo

Implementar el flujo completo de calificación: el profesor puede ver todas las entregas de su curso, abrir un archivo de Google Drive para revisarlo, ingresar una nota (0-20, sistema vigesimal) y retroalimentación. El alumno debe ver su nota actualizada en tiempo real (Supabase Realtime). Incluye exportación de reportes.

---

## 🖥️ Referencia Visual

**Vista Calificación (`/profesor/calificacion`):**
- Subheader: "Calificación · IF-0712 · Sec. IF-8A1" + nombre del entregable + cantidad de estudiantes
- Campo de búsqueda en la esquina superior derecha
- **Tabla principal** con columnas: CÓDIGO / ALUMNO / ESTADO / ENVIADO / ARCHIVO / NOTA / ACCIÓN
- Estado badges: `Entregado` (verde), `Tardío` (naranja), `No Entregado` (rojo)
- Botón "Evaluar" (para entregas sin nota) y "Modificar" (para entregas ya calificadas)
- Nota en verde `18/20`, `16/20`, etc.

**Vista Nota del Alumno (en PanelAlumno):**
- Card expandida con nota `17/20` en color verde prominente
- Comentario del profesor en texto plano
- Campo solo lectura (no editable por el alumno — RLS)

---

## 📋 Tareas Técnicas

### 4.1 Páginas y Componentes (`src/pages/profesor/`)

```
CalificacionProfesor.tsx  — Tabla de calificación del curso/entregable
ModalEvaluar.tsx          — Modal con enlace Drive + campos nota y feedback
ExportarReporte.tsx       — Función de generación y descarga CSV/Excel
```

### 4.2 Tabla de Calificación (`CalificacionProfesor.tsx`)

```typescript
// Al cargar: query JOIN a entregas + revisiones + usuarios
// Filtrado por: id_entregable seleccionado (viene de la navegación desde Módulo 3)
// Selector de entregable en el header (si el profesor tiene varios)
// Búsqueda en tiempo real por nombre de alumno o código
// Estado calculado dinámicamente:
//   - Si no hay entrega: "No Entregado"
//   - Si hay entrega sin revisión: "Entregado" o "Tardío"
//   - Si hay revisión: mostrar nota
```

### 4.3 Modal de Evaluación (`ModalEvaluar.tsx`)

```typescript
// Mostrar: nombre del alumno, código, nombre del archivo, fecha de envío, estado de puntualidad
// Botón "Ver archivo en Drive" → window.open(drive_url)
// Input de nota: numérico 0-20 con step 0.5, validado
// Textarea de retroalimentación: máximo 500 caracteres
// Al guardar: PATCH /rest/v1/revisiones o INSERT si no existe
// Trigger de BD registra OLD y NEW automáticamente en logs_auditoria
// Emite evento Realtime → el alumno ve la nota actualizada
```

### 4.4 Nota en tiempo real para el Alumno

En `PanelAlumno.tsx` (Módulo 2), añadir suscripción Realtime:

```typescript
// Canal: tabla `revisiones` filtrado por id_entrega del alumno
// Al recibir evento UPDATE → actualizar el card de "Calificado" sin recargar
```

### 4.5 Exportación de Reportes

```typescript
// ExportarReporte.tsx
// Generar CSV con: codigo_alumno, nombre, entregable, estado, fecha_envio, nota, feedback
// Usar la librería `xlsx` o construcción manual de CSV
// Nombre del archivo: `reporte_<nombre_curso>_<fecha>.csv`
// Registrar EXPORT_REPORT en logs_auditoria vía llamada explícita al servicio
```

### 4.6 Servicios (`src/services/calificacionService.ts`)

```typescript
// getEntregasPorEntregable(idEntregable: string): Promise<EntregaConAlumnoYRevision[]>
// evaluarEntrega(idEntrega: string, nota: number, feedback: string): Promise<Revision>
// modificarEvaluacion(idRevision: string, nota: number, feedback: string): Promise<Revision>
// exportarReporteCSV(idEntregable: string): Promise<Blob>
// buscarAlumnoEnCurso(termino: string, idCurso: string): Promise<Usuario[]>
```

---

## 🗄️ Modificaciones Supabase (Módulo 4)

1. Habilitar Realtime en `revisiones`:
<!-- ✅ EJECUTAR VÍA MCP -->
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE revisiones;
   ```

2. Crear vista materializada de calificación para performance:
<!-- ✅ EJECUTAR VÍA MCP -->
   ```sql
   CREATE VIEW vista_calificacion AS
   SELECT
     u.codigo_institucional AS codigo,
     u.nombre_completo AS alumno,
     e.id_entregable,
     e.estado_puntualidad,
     e.timestamp_servidor AS enviado,
     e.nombre_archivo AS archivo,
     e.drive_url,
     e.id_entrega,
     r.nota,
     r.retroalimentacion,
     r.id_revision
   FROM usuarios u
   LEFT JOIN entregas e ON e.id_alumno = u.id
   LEFT JOIN revisiones r ON r.id_entrega = e.id_entrega;
   ```

3. Agregar CHECK constraint de ciclo académico:
<!-- ✅ EJECUTAR VÍA MCP -->
   ```sql
   -- Función para validar si el ciclo del curso está vigente antes de editar nota
   CREATE OR REPLACE FUNCTION check_ciclo_vigente(p_entregable_id UUID)
   RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
     SELECT estado = 'activo' FROM cursos c
     JOIN entregables e ON e.id_curso = c.id_curso
     WHERE e.id_entregable = p_entregable_id
   $$;
   ```

4. RLS para revisiones:
<!-- ✅ EJECUTAR VÍA MCP -->
   ```sql
   -- Alumno: solo lectura de su propia revisión
   CREATE POLICY "alumno_read_own_revision" ON revisiones
     FOR SELECT USING (
       EXISTS (
         SELECT 1 FROM entregas e
         WHERE e.id_entrega = revisiones.id_entrega
           AND e.id_alumno = auth.uid()
       )
     );

   -- Alumno: no puede hacer INSERT/UPDATE/DELETE en revisiones
   CREATE POLICY "alumno_no_write_revision" ON revisiones
     FOR INSERT WITH CHECK (get_user_role() IN ('profesor', 'administrador'));
   ```

<!-- ✅ VERIFICAR — debe retornar la vista vista_calificacion y las 2 policies de revisiones -->
```sql
SELECT table_name FROM information_schema.views
WHERE table_schema = 'public' AND table_name = 'vista_calificacion';

SELECT policyname FROM pg_policies WHERE tablename = 'revisiones';
```

---

---

# MÓDULO 5 — Consola de Administración: Usuarios, Cursos y Matrícula Masiva

**Responsable:** Integrante 5  
**Alcance:** Panel general del administrador con métricas globales, gestión de usuarios y cursos (CRUD), matrícula masiva por CSV, habilitación/deshabilitación de cuentas.  
**Depende de:** Módulo 1 (Shell, Auth)

---

## 🎯 Objetivo del Módulo

El administrador tiene acceso total al sistema. Este módulo implementa la consola de administración completa: métricas globales en tiempo real, creación manual de usuarios, registro de cursos, asignación de docentes, y el flujo transaccional de matrícula masiva via CSV.

---

## 🖥️ Referencia Visual

**Panel General (`/admin`):**
- Título "Consola de administración" + subtítulo
- **4 KPIs globales:** TRANSACCIONES (24H) / ALMACENAMIENTO TOTAL / USUARIOS ACTIVOS / INCIDENCIAS CRÍTICAS
- **Gráfico de volumen de transacciones** (últimos 14 días) — datos de `logs_auditoria` agrupados por fecha
- **Distribución por rol:** Barras horizontales (Alumnos / Profesores / Administradores) con COUNT de la BD
- **Pico de carga:** Calculado desde los timestamps de `logs_auditoria`
- **Tabla de "Log de auditoría reciente"** — últimas 10 operaciones (preview del módulo de auditoría)

**Usuarios & Cursos (`/admin/usuarios`):**
- Dos tabs: "Crear usuario" y "Matrícula masiva (CSV)"
- **Crear usuario:** Formulario con campos: Nombre completo, Código institucional, Correo institucional (@urp.edu.pe), Rol (selector), Facultad. Panel lateral derecho con "Reglas de validación" y "Tip".
- **Matrícula masiva:** Zona de drag & drop para CSV, vista previa de las filas con validación en tiempo real (columna VALIDACIÓN: `✓ OK` en verde o `✗ ERROR` en rojo), botón "Confirmar matrícula" que procesa como transacción única.

---

## 📋 Tareas Técnicas

### 5.1 Páginas y Componentes (`src/pages/admin/`)

```
PanelAdmin.tsx          — Dashboard con métricas globales
GraficoTransacciones.tsx — Gráfico de línea de transacciones
UsuariosCursos.tsx      — Tabs: Crear usuario / Matrícula masiva
FormCrearUsuario.tsx    — Formulario de creación de usuario
MatriculaMasiva.tsx     — Carga CSV + vista previa + confirmar
FormCrearCurso.tsx      — Formulario de creación de curso (modal)
ListaUsuarios.tsx       — Tabla de todos los usuarios con búsqueda y acciones
```

### 5.2 Métricas Globales del Admin (`PanelAdmin.tsx`)

```typescript
// KPI: transacciones (24h) → SELECT COUNT(*) FROM logs_auditoria WHERE timestamp_servidor > now() - interval '24h'
// KPI: almacenamiento → Supabase Storage API o suma de tamano_bytes de entregas
// KPI: usuarios activos → SELECT COUNT(*) FROM usuarios WHERE estado = 'activo'
// KPI: incidencias críticas → SELECT COUNT(*) FROM logs_auditoria WHERE tipo_operacion LIKE '%FAILED%' OR tipo_operacion LIKE '%DUPLICATE%'
// Gráfico: GROUP BY (timestamp_servidor::date) últimos 14 días
// Distribución por rol: JOIN roles GROUP BY nombre
// Pico de carga: GROUP BY EXTRACT(HOUR FROM timestamp_servidor), tomar el top 2h
```

### 5.3 Creación Manual de Usuario (`FormCrearUsuario.tsx`)

```typescript
// 1. Validar email con regex @urp.edu.pe
// 2. Llamar a Edge Function `admin-create-user`:
//    a. supabase.auth.admin.createUser({ email, password: generado_automáticamente, email_confirm: true })
//    b. INSERT en usuarios (id: from auth, nombre_completo, codigo, id_rol, facultad)
//    c. Trigger registra CREATE_USER en auditoría
// 3. Mostrar contraseña temporal generada (o enviar por email si está configurado)
```

### 5.4 Matrícula Masiva (`MatriculaMasiva.tsx`)

```typescript
// Flujo:
// 1. Drag & drop / input de archivo CSV
// 2. Parsear CSV en el frontend (columnas: código, nombre, correo, curso, sección)
// 3. Validar cada fila: verificar que el código exista en `usuarios`
// 4. Mostrar tabla de preview con indicadores de validación por fila
// 5. Si TODAS las filas son válidas → habilitar botón "Confirmar matrícula"
// 6. Llamar a Edge Function `bulk-enrollment` que procesa en 1 transacción ACID
// 7. Si CUALQUIER código no existe → ROLLBACK total + mostrar error específico
```

### 5.5 Gestión de Cursos

```typescript
// FormCrearCurso.tsx — campos: código (IF-XXXX), nombre, sección, ciclo_académico, profesor (selector desde BD)
// ListaUsuarios.tsx — tabla con búsqueda, filtro por rol, botones Habilitar/Deshabilitar
// Deshabilitar cuenta: UPDATE usuarios SET estado='inactivo' + invalidar tokens en Supabase Auth Admin API
```

### 5.6 Servicios (`src/services/adminService.ts`)

```typescript
// getMetricasGlobales(): Promise<MetricasAdmin>
// getDistribucionRoles(): Promise<DistribucionRoles>
// getPicosCarga(): Promise<PicoCarga>
// getTransaccionesGrafico(dias: number): Promise<PuntoGrafico[]>
// crearUsuario(data: NuevoUsuario): Promise<Usuario>
// deshabilitarUsuario(idUsuario: string): Promise<void>
// crearCurso(data: NuevoCurso): Promise<Curso>
// asignarProfesor(idCurso: string, idProfesor: string): Promise<void>
// procesarMatriculaMasiva(filas: FilaCSV[]): Promise<ResultadoMatricula>
```

---

## 🗄️ Modificaciones Supabase (Módulo 5)

1. Crear Edge Function `admin-create-user`:
<!-- 📋 REFERENCIA — ejecutar manualmente en terminal por el desarrollador del Módulo 5, no via MCP -->
   ```bash
   npx supabase functions new admin-create-user
   # Requiere Service Role Key para usar auth.admin API
   # Solo invocable por usuarios con rol 'administrador' (validar en la función)
   ```

2. Crear Edge Function `bulk-enrollment`:
<!-- 📋 REFERENCIA — ejecutar manualmente en terminal, no via MCP -->
   ```bash
   npx supabase functions new bulk-enrollment
   # Ejecutar como transacción única con BEGIN/COMMIT/ROLLBACK explícito
   # Usar pg_advisory_lock para evitar race conditions en matrícula masiva
   ```

3. Función de métricas del admin:
<!-- ✅ EJECUTAR VÍA MCP -->
   ```sql
   CREATE OR REPLACE FUNCTION get_admin_metrics()
   RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
   -- Solo ejecutable por rol administrador (validar con get_user_role())
   -- Retorna: transacciones_24h, usuarios_activos, incidencias_criticas, distribucion_roles
   $$;
   ```

4. Función de gráfico de transacciones:
<!-- ✅ EJECUTAR VÍA MCP -->
   ```sql
   CREATE OR REPLACE FUNCTION get_transacciones_grafico(p_dias INT DEFAULT 14)
   RETURNS TABLE(fecha DATE, total BIGINT) LANGUAGE sql SECURITY DEFINER AS $$
     SELECT timestamp_servidor::date AS fecha, COUNT(*) AS total
     FROM logs_auditoria
     WHERE timestamp_servidor >= now() - (p_dias || ' days')::interval
     GROUP BY fecha
     ORDER BY fecha
   $$;
   ```

5. RLS del administrador (acceso total):
<!-- ✅ EJECUTAR VÍA MCP -->
   ```sql
   -- El administrador puede leer todos los datos
   CREATE POLICY "admin_all_cursos" ON cursos FOR ALL USING (get_user_role() = 'administrador');
   CREATE POLICY "admin_all_matriculas" ON matriculas FOR ALL USING (get_user_role() = 'administrador');
   CREATE POLICY "admin_all_entregables" ON entregables FOR ALL USING (get_user_role() = 'administrador');
   ```

<!-- ✅ VERIFICAR — debe retornar las 2 funciones y las 3 policies de admin -->
```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('get_admin_metrics', 'get_transacciones_grafico');

SELECT policyname, tablename FROM pg_policies
WHERE policyname IN ('admin_all_cursos', 'admin_all_matriculas', 'admin_all_entregables');
```

---

---

# MÓDULO 6 — Log de Auditoría Global, Seguridad Antiplagio e Integridad del Sistema

**Responsable:** Integrante 6  
**Alcance:** Vista del log de auditoría para el administrador (con filtros avanzados y exportación), lógica antiplagio SHA-256, triggers de inmutabilidad, edge cases de seguridad y exportación de logs.  
**Depende de:** Módulos 1, 5

---

## 🎯 Objetivo del Módulo

Implementar la capa de auditoría inmutable del sistema. Esto incluye la UI del log de auditoría global (con filtros avanzados), la lógica de detección de plagio (hash SHA-256), el bloqueo de modificaciones sobre la bitácora, y la exportación completa del historial de eventos con trazabilidad total.

---

## 🖥️ Referencia Visual

**Log de Auditoría (`/admin/auditoria`):**
- Título "Log de auditoría global" + subtítulo "Trazabilidad profunda · cumple RF-21 y exportable bajo demanda"
- Botón "↓ Exportar CSV/Excel" en la esquina superior derecha
- **Sección de filtros avanzados:**
  - Campo "Desde" (date picker)
  - Campo "Hasta" (date picker)
  - Campo "ID de usuario" (búsqueda por correo)
  - Selector "Tipo de operación" (Todas / LOGIN_SUCCESS / UPLOAD_FILE / GRADE_SUBMISSION / CREATE_WINDOW / etc.)
  - Botón "Aplicar filtros"
- **Texto de resultados:** "Mostrando X eventos · ordenado desc por timestamp" + badge "Retención: 7 años (RF-21)"
- **Tabla de eventos** con columnas: TIMESTAMP / USUARIO / OPERACIÓN / TABLA / IP / VALOR ANTERIOR / VALOR NUEVO
- Badges de operación con colores: Verde (LOGIN_SUCCESS, CREATE_WINDOW), Azul (UPDATE_USER), Amarillo (EXPORT_CSV), Rojo (LOGIN_FAILED, DELETE_USER, DUPLICATE_HASH), Morado (GRADE_SUBMISSION, UPLOAD_FILE), Gris (CRON_REMINDER)

---

## 📋 Tareas Técnicas

### 6.1 Páginas y Componentes (`src/pages/admin/`)

```
LogAuditoria.tsx         — Tabla de auditoría con filtros avanzados
FiltrosAuditoria.tsx     — Panel de filtros (fecha, usuario, operación)
OperacionBadge.tsx       — Badge con color según tipo de operación
ExportarAuditoria.tsx    — Lógica de exportación CSV/Excel del log
```

### 6.2 Log de Auditoría con Filtros (`LogAuditoria.tsx`)

```typescript
// Query con filtros dinámicos a tabla logs_auditoria
// Paginación: 50 registros por página con botones Anterior/Siguiente
// Ordenamiento: siempre DESC por timestamp_servidor
// Filtros aplicables:
//   - fecha_desde / fecha_hasta → WHERE timestamp_servidor BETWEEN
//   - email_usuario → WHERE email_usuario ILIKE '%término%'
//   - tipo_operacion → WHERE tipo_operacion = 'LOGIN_SUCCESS' (si no es "Todas")
// Los tipos de operación disponibles se cargan dinámicamente:
//   SELECT DISTINCT tipo_operacion FROM logs_auditoria ORDER BY tipo_operacion
```

### 6.3 Badge de Operación (`OperacionBadge.tsx`)

```typescript
// El color del badge se determina por el tipo_operacion leído de la BD
// Mapa de colores (no hardcodear nombres, sino categorías):
const OPERACION_COLORES: Record<string, string> = {
  'LOGIN_SUCCESS':       'success',
  'LOGIN_FAILED':        'error',
  'UPLOAD_FILE':         'purple',
  'GRADE_SUBMISSION':    'purple',
  'CREATE_WINDOW':       'success',
  'UPDATE_USER':         'info',
  'DELETE_USER':         'error',
  'DUPLICATE_HASH':      'error',
  'EXPORT_CSV':          'warning',
  'EXPORT_AUDIT_LOG':    'warning',
  'EXTENSION_GRANTED':   'info',
  'CRON_REMINDER':       'neutral',
  // Cualquier tipo no mapeado → 'neutral'
}
```

### 6.4 Exportación del Log de Auditoría

```typescript
// Al exportar: aplicar los mismos filtros activos en la pantalla
// Incluir todas las columnas: timestamp, email_usuario, tipo_operacion, tabla_afectada, ip_cliente, valor_anterior, valor_nuevo
// Registrar la exportación: INSERT en logs_auditoria con tipo_operacion = 'EXPORT_AUDIT_LOG'
//   y metadata: { filtros_aplicados: {...}, total_registros: N, exportado_por: email }
// Formato de nombre: `auditoria_<desde>_<hasta>_<timestamp>.csv`
```

### 6.5 Lógica Antiplagio (coordinada con Edge Function del Módulo 2)

Este módulo es responsable de garantizar que la lógica antiplagio esté correctamente implementada en la BD:

```sql
-- Función de verificación de hash (llamada dentro de upload-delivery)
CREATE OR REPLACE FUNCTION check_hash_unico(p_curso_id UUID, p_hash TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM hashes_curso
    WHERE id_curso = p_curso_id AND file_hash = p_hash
  )
$$;

-- Trigger que registra alerta crítica si se detecta hash duplicado
CREATE OR REPLACE FUNCTION fn_alerta_duplicado()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO logs_auditoria (tipo_operacion, tabla_afectada, metadata)
  VALUES ('DUPLICATE_HASH', 'hashes_curso', jsonb_build_object(
    'hash', NEW.file_hash, 'curso_id', NEW.id_curso, 'timestamp', now()
  ));
  RAISE EXCEPTION 'Hash duplicado detectado: plagio potencial';
END;
$$;
-- (Este trigger se activa en la Edge Function, no en la BD directamente, para poder hacer ROLLBACK completo)
```

### 6.6 Inmutabilidad Total del Log

Verificar y reforzar que las reglas SQL de inmutabilidad estén activas:

```sql
-- Verificar que las reglas existan
SELECT rulename, definition FROM pg_rules WHERE tablename = 'logs_auditoria';

-- Si no existen, recrear:
CREATE OR REPLACE RULE no_update_logs AS ON UPDATE TO logs_auditoria DO INSTEAD NOTHING;
CREATE OR REPLACE RULE no_delete_logs AS ON DELETE TO logs_auditoria DO INSTEAD NOTHING;

-- Test de inmutabilidad (debe retornar 0 filas afectadas):
UPDATE logs_auditoria SET tipo_operacion = 'HACKED' WHERE id_log = '<cualquier-id>';
DELETE FROM logs_auditoria WHERE id_log = '<cualquier-id>';
```

### 6.7 Servicio de Auditoría (`src/services/auditService.ts`)

```typescript
// getLogsAuditoria(filtros: FiltrosAuditoria): Promise<PaginatedResult<LogAuditoria>>
// getTiposOperacion(): Promise<string[]>  ← dinámico desde la BD
// exportarLogsCSV(filtros: FiltrosAuditoria): Promise<Blob>
// registrarEventoManual(tipo: string, metadata: Record<string, unknown>): Promise<void>
//   ↑ Usado para EXPORT_AUDIT_LOG y otras acciones explícitas del sistema
```

### 6.8 Seguridad Adicional — Validaciones del Sistema

Implementar y documentar los siguientes edge cases:

| Escenario | Comportamiento esperado |
|---|---|
| Alumno intenta acceder a `/admin` | Guard de rutas redirige a su panel, log `UNAUTHORIZED_ACCESS` |
| Token JWT expirado | Refresh automático; si falla, logout + redirigir a login |
| Hash SHA-256 duplicado en el mismo curso | ROLLBACK + DELETE del archivo de Drive + INSERT en logs_auditoria con `DUPLICATE_HASH` |
| Intento de DELETE en `logs_auditoria` | SQL RULE aborta silenciosamente (0 filas afectadas) |
| 5 intentos fallidos de login | `bloqueado_hasta = now() + interval '15 minutes'`, UI muestra mensaje |
| Exportación con filtros sin resultados | Botón "Exportar" deshabilitado, mensaje "No existen registros para los parámetros seleccionados" |

---

## 🗄️ Modificaciones Supabase (Módulo 6)

1. Verificar inmutabilidad del log (SQL RULES):
<!-- ✅ EJECUTAR VÍA MCP -->
   ```sql
   -- Confirmar que las reglas de inmutabilidad están activas
   SELECT * FROM pg_rules WHERE tablename = 'logs_auditoria';
   ```

2. Índices para performance en filtros del log:
<!-- ✅ EJECUTAR VÍA MCP -->
   ```sql
   CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs_auditoria (timestamp_servidor DESC);
   CREATE INDEX IF NOT EXISTS idx_logs_tipo_operacion ON logs_auditoria (tipo_operacion);
   CREATE INDEX IF NOT EXISTS idx_logs_email ON logs_auditoria (email_usuario);
   CREATE INDEX IF NOT EXISTS idx_logs_tabla ON logs_auditoria (tabla_afectada);
   ```

3. Función de paginación del log:
<!-- ✅ EJECUTAR VÍA MCP -->
   ```sql
   CREATE OR REPLACE FUNCTION get_logs_paginados(
     p_desde TIMESTAMPTZ DEFAULT NULL,
     p_hasta TIMESTAMPTZ DEFAULT NULL,
     p_email TEXT DEFAULT NULL,
     p_tipo TEXT DEFAULT NULL,
     p_limit INT DEFAULT 50,
     p_offset INT DEFAULT 0
   ) RETURNS TABLE (
     id_log UUID, timestamp_servidor TIMESTAMPTZ, email_usuario TEXT,
     tipo_operacion TEXT, tabla_afectada TEXT, ip_cliente TEXT,
     valor_anterior JSONB, valor_nuevo JSONB, total_count BIGINT
   ) LANGUAGE sql SECURITY DEFINER AS $$
     SELECT *, COUNT(*) OVER() AS total_count
     FROM logs_auditoria
     WHERE (p_desde IS NULL OR timestamp_servidor >= p_desde)
       AND (p_hasta IS NULL OR timestamp_servidor <= p_hasta)
       AND (p_email IS NULL OR email_usuario ILIKE '%' || p_email || '%')
       AND (p_tipo IS NULL OR tipo_operacion = p_tipo)
     ORDER BY timestamp_servidor DESC
     LIMIT p_limit OFFSET p_offset
   $$;
   ```

4. Política RLS para que solo administradores accedan al log:
<!-- ✅ EJECUTAR VÍA MCP -->
   ```sql
   -- Ya definida en migración 003, verificar:
   SELECT * FROM pg_policies WHERE tablename = 'logs_auditoria';
   ```

<!-- ✅ VERIFICAR FINAL — esquema completo. Debe retornar 10 tablas, 4 índices en logs_auditoria, y la función get_logs_paginados -->
```sql
-- Tablas
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' ORDER BY table_name;

-- Índices del log
SELECT indexname FROM pg_indexes
WHERE tablename = 'logs_auditoria';

-- Todas las funciones creadas
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public' ORDER BY routine_name;

-- Todas las políticas RLS activas
SELECT tablename, policyname FROM pg_policies
WHERE schemaname = 'public' ORDER BY tablename;
```

---

---

## 🔗 Mapa de Dependencias entre Módulos

```
MÓDULO 1 (Fundación + Auth)
    ├──→ MÓDULO 2 (Portal Alumno)
    │       └──→ necesita: Shell, useAuth, supabase client, design system
    ├──→ MÓDULO 3 (Portal Profesor)
    │       └──→ necesita: Shell, useAuth, supabase client, design system
    ├──→ MÓDULO 4 (Calificación)
    │       └──→ necesita: Módulo 2 (entregas) + Módulo 3 (entregables)
    ├──→ MÓDULO 5 (Admin + Usuarios)
    │       └──→ necesita: Shell, useAuth, supabase client
    └──→ MÓDULO 6 (Auditoría)
            └──→ necesita: Módulo 5 (admin shell), BD (logs_auditoria)
```

---

## 📅 Orden de Ejecución de Migraciones Supabase

Ejecutar en orden desde el IDE (MCP conectado):

| # | Migración | Módulo Responsable |
|---|---|---|
| 001 | Tablas principales (roles, usuarios, cursos, entregas, etc.) | Módulo 1 |
| 002 | Triggers de auditoría + inmutabilidad del log | Módulo 1 |
| 003 | Row Level Security (RLS) en todas las tablas | Módulo 1 |
| 004 | Funciones KPIs del alumno + Realtime entregas | Módulo 2 |
| 005 | Funciones stats de cursos + Edge Functions manage-schedule y assign-extension | Módulo 3 |
| 006 | Vistas de calificación + Realtime revisiones | Módulo 4 |
| 007 | Funciones métricas del admin + Edge Functions admin-create-user y bulk-enrollment | Módulo 5 |
| 008 | Índices del log de auditoría + función get_logs_paginados | Módulo 6 |

---

## 🤖 Instrucciones para el Agente de IA (Gemini) — Por Módulo

Cuando uses Gemini para desarrollar tu módulo, incluye **siempre** este contexto en tu prompt:

```
Contexto del proyecto:
- Stack: React + TypeScript + Vite + Supabase (PostgreSQL + Auth + Realtime + Edge Functions)
- Paleta: Verde oscuro #1A3D2B (sidebar), Verde botones #2E7D32, Fondo #F7F8F6
- Tipografía: Inter (Google Fonts)
- NADA hardcodeado: todos los datos vienen de Supabase
- Zona horaria: America/Lima (UTC-5) en presentación, UTC en BD
- Supabase conectado vía MCP al IDE
- RLS activo: no filtrar datos en el frontend, solo mostrar lo que Supabase devuelve
- No usar useState para datos remotos — usar consultas directas a Supabase con loading states
- Tailwind CSS está disponible (proyecto ya configurado)

Tarea específica: [DESCRIBE TU TAREA AQUÍ]
Módulo: [NÚMERO DE MÓDULO]
Componente: [NOMBRE DEL COMPONENTE]
```

---

*Documento generado el 30 de junio de 2026 · SRE-URP v1.0 · Arquitectura y Evolución de Software · Universidad Ricardo Palma*

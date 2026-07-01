# Sistema de Registro de Entregables Académicos
**Curso:** Arquitectura y Evolución de Software — Universidad Ricardo Palma  
**Stack:** React + Supabase (PostgreSQL + Auth + Realtime + Edge Functions) + Google Drive API

---

## 1. Problemática

En los cursos universitarios peruanos, la gestión de entregables académicos carece de un mecanismo centralizado que integre a alumnos, profesores y cronogramas institucionales en un único punto de control. Las plataformas existentes no ofrecen trazabilidad temporal exacta, carecen de integración automatizada con almacenamiento en la nube y no garantizan un registro auditable e inmutable de cada operación de carga.

---

## 2. Objetivos

### 2.1 Objetivo General
Desarrollar un sistema de información liviano para la gestión, control y auditoría de entregables académicos, centralizando la relación entre alumnos, profesores y cronogramas, con carga automatizada de archivos a Google Drive y trazabilidad temporal exacta de cada entrega.

### 2.2 Objetivos Específicos

- **Panel de control docente:** Dashboard unificado que consolide automáticamente el estado de entregas por curso, alumno y ventana de tiempo, eliminando la consolidación manual.
- **Control de plazos en tiempo real para el estudiante:** Interfaz con cuenta regresiva en tiempo real sobre ventanas de entrega activas y emisión automática de constancia digital de recepción.
- **Núcleo de integración con almacenamiento en la nube:** Edge Functions para procesar archivos y depositarlos estructuradamente en Google Drive.
- **Módulo de auditoría inmutable:** Componente que captura timestamps del servidor en el instante exacto del registro o modificación de la entrega.
- **Gestión de cronogramas y ventanas de tiempo:** Herramientas para que los docentes definan, extiendan o restrinjan ventanas temporales de forma dinámica.

---

## 3. Alcance — Límites del Sistema

| Subsistema | Descripción |
|---|---|
| Autenticación y RBAC | Login seguro para 3 roles (Administrador, Profesor, Alumno). Row Level Security para aislamiento de datos. |
| Cronogramas y Ventanas Temporales | Configuración dinámica de fechas de apertura/cierre. Alertas visuales y contadores regresivos sincronizados con el servidor. |
| Registro de Entregas (Cloud Storage) | Carga de archivos desde el dispositivo hacia Google Drive. Clasificación automática de puntualidad ("A Tiempo" / "Tardía") en el servidor. |
| Constancias Digitales | Generación automática de comprobante con metadatos: enlace, datos del alumno, curso y timestamp en milisegundos. |
| Auditoría Inmutable | Registro automático e irreversible de eventos críticos mediante triggers de PostgreSQL. |
| Dashboard y Métricas | Panel en tiempo real para profesores (WebSockets). Vista de métricas globales para Administrador. |

---

## 4. Arquitectura Propuesta

**Arquitectura de 3 capas sobre Supabase (BaaS):**

### Capa de Presentación (Frontend)
- SPA responsive en **React**
- Dos vistas según rol: Panel Docente y Panel Alumno
- Conexión directa con Supabase via SDK JS para autenticación y datos en tiempo real

### Capa de Lógica (Backend/API)
- **Supabase** como Backend-as-a-Service: API REST y Realtime auto-generada desde el esquema de BD
- **Supabase Auth:** gestión de usuarios/roles con Row Level Security
- **Edge Functions:** validación de enlaces de Drive y cálculo de estados de cumplimiento
- **Supabase Realtime:** WebSockets para actualización automática del dashboard docente

### Capa de Datos
- **PostgreSQL** gestionado por Supabase
- Tablas principales: `Usuarios`, `Cursos`, `Entregables`, `Ventanas_Tiempo`, `Entregas`, `Logs_Auditoria`
- Triggers y funciones de PostgreSQL para timestamps inmutables en cada registro/modificación

### Integración Externa
- **Google Drive API v3** — validación de formato, permisos y depósito estructurado de archivos

---

## 5. Tecnologías

| Componente | Tecnología | Justificación |
|---|---|---|
| Frontend | React.js | SPA responsive; componentes para contadores regresivos y alertas visuales dinámicas |
| Backend as a Service | Supabase | Centraliza autenticación, BD y lógica serverless; APIs REST auto-generadas |
| Motor de BD | PostgreSQL (en Supabase) | Triggers nativos, restricciones inmutables, audit log de solo escritura |
| Seguridad de Datos | Row Level Security (RLS) | Aislamiento por rol en la capa de datos; alumnos no acceden a datos de pares |
| Integración Externa | Google Drive API | Edge Function se autentica via Service Account y deposita archivos con estructura jerárquica |

---

## 6. Requisitos Funcionales

### Módulo 1: Autenticación y Control de Acceso (RBAC)

| ID | Requisito |
|---|---|
| RF-01 | Login único con credenciales Supabase Auth para los 3 roles |
| RF-02 | Asignación obligatoria de rol (Alumno/Profesor/Administrador) durante la creación del usuario |
| RF-03 | Restricción de rutas en el Frontend según rol del token JWT |
| RF-04 | RLS: el Alumno solo accede a sus propios registros de entrega |
| RF-05 | RLS: el Profesor solo edita cronogramas y revisiones de sus cursos asignados |
| RF-06 | El Administrador tiene permisos globales sobre cuentas, cursos y asignaciones |
| RF-07 | Logout invalida el token en cliente y servidor de forma síncrona |
| RF-08 | Bloqueo automático de cuenta tras 5 intentos fallidos consecutivos |

### Módulo 2: Gestión de Cronogramas y Ventanas Temporales (Profesor)

| ID | Requisito |
|---|---|
| RF-09 | El Profesor define fechas y horas exactas de apertura y cierre de cada entregable |
| RF-10 | Toda marca de tiempo en zona horaria `America/Lima` (UTC-5) |
| RF-11 | El Profesor puede modificar plazos (extender o recortar) de ventanas existentes |
| RF-12 | El Profesor puede registrar prórrogas individuales sin afectar el cronograma general |
| RF-13 | La recepción de entregas se bloquea automáticamente en el servidor al expirar el plazo |
| RF-14 | Prohibida la eliminación física de ventanas con entregas asociadas |
| RF-15 | El Profesor puede visualizar el historial de ventanas de sus cursos |

### Módulo 3: Interfaz del Estudiante y Control de Plazos en Tiempo Real

| ID | Requisito |
|---|---|
| RF-16 | Listado consolidado de entregables activos, pendientes, vencidos y calificados |
| RF-17 | Contador regresivo dinámico en formato `Días:Horas:Minutos:Segundos` por tarea activa |
| RF-18 | Sincronización periódica del contador con la hora nativa del servidor Supabase |
| RF-19 | Cambio de color del contador cuando falten menos de 24 horas para el cierre |
| RF-20 | Control de subida y botón de envío deshabilitados automáticamente al expirar el plazo |
| RF-21 | Mensaje de error explícito si el alumno intenta forzar envío fuera de tiempo |

### Módulo 4: Almacenamiento, Carga de Archivos e Historial

| ID | Requisito |
|---|---|
| RF-22 | El Alumno carga el archivo desde su dispositivo mediante control interactivo en la UI |
| RF-23 | Archivo depositado en Google Drive con ruta jerárquica: `/id_curso/nombre_tarea/nombre_alumno/` |
| RF-24 | Estado `"A Tiempo"` si el timestamp del servidor ≤ fecha de cierre |
| RF-25 | Estado `"Tardía"` si el timestamp del servidor > fecha de cierre (si el curso admite extemporáneas) |
| RF-26 | El Alumno puede reemplazar su archivo mientras la ventana o prórroga esté abierta |
| RF-27 | Bloqueada toda modificación, eliminación o reemplazo una vez expirado el plazo |
| RF-28 | Vista de Historial de Entregas: nombre de archivo, tamaño, fecha de recepción del servidor y estado de puntualidad |

### Módulo 5: Visualización, Calificación y Retroalimentación

| ID | Requisito |
|---|---|
| RF-29 | El Profesor selecciona una entrega para descargar/visualizar el archivo en Google Drive |
| RF-30 | El Profesor ingresa nota numérica (0–20, sistema vigesimal) y retroalimentación en texto plano |
| RF-31 | El Profesor puede editar nota y retroalimentación en cualquier momento del ciclo vigente |
| RF-32 | El Alumno visualiza nota y retroalimentación en su panel personal |
| RF-33 | Actualización inmediata en la vista del Alumno al guardar cambios el Profesor (Supabase Realtime) |
| RF-34 | Campos de calificación son de solo lectura para el Alumno (RLS) |

### Módulo 6: Seguridad e Integridad Antiplagio

| ID | Requisito |
|---|---|
| RF-35 | Hash SHA-256 generado automáticamente para cada archivo al momento de almacenarse |
| RF-36 | UNIQUE Constraint en BD para impedir hash idéntico dentro del mismo curso |
| RF-37 | Hash duplicado → ROLLBACK completo, eliminación del archivo del Storage y alerta crítica en auditoría |

### Módulo 7: Auditoría Inmutable

| ID | Requisito |
|---|---|
| RF-38 | Triggers PostgreSQL registran automáticamente toda operación INSERT/UPDATE en tablas críticas |
| RF-39 | Metadatos capturados: ID de usuario, tipo de operación, IP del cliente, tabla afectada, timestamp exacto del servidor |
| RF-40 | Bitácora registra: intentos de envío fuera de fecha, alertas de duplicados y modificaciones de notas |
| RF-41 | Historial de versiones (valores OLD y NEW) en logs al reemplazar archivo o editar calificación |
| RF-42 | Bloqueo absoluto de UPDATE/DELETE en la tabla de logs mediante SQL RULES o Triggers preventivos |

### Módulo 8: Panel de Control, Métricas y Dashboard

| ID | Requisito |
|---|---|
| RF-43 | Dashboard interactivo del Profesor con estados por alumno: A Tiempo / Tardía / Pendiente / Calificado |
| RF-44 | Actualización en tiempo real del panel vía Supabase Realtime (WebSockets) |
| RF-45 | Gráficos estadísticos de avance de entregas y promedios de notas por sección |
| RF-46 | Filtros y búsqueda por apellidos, códigos, estado de entrega y estado de calificación |
| RF-47 | Exportación de reporte académico en CSV o Excel (notas + observaciones) |
| RF-48 | Panel de métricas globales para el Administrador: volumen de transacciones, espacio en Storage, incidencias |

### Módulo 9: Mantenimiento y Operaciones en Lote

| ID | Requisito |
|---|---|
| RF-49 | El Administrador crea perfiles manualmente y asigna credenciales iniciales en Supabase Auth |
| RF-50 | El Administrador registra cursos, periodos académicos y asigna profesores a secciones |
| RF-51 | El Administrador realiza matrícula masiva de alumnos mediante CSV |
| RF-52 | Matrícula masiva procesada como transacción única; ROLLBACK total si algún código de alumno no existe |
| RF-53 | El Administrador deshabilita cuentas, revocando tokens JWT activos de forma inmediata |

---

## 7. Requisitos No Funcionales

### 7.1 Seguridad y Privacidad

| ID | Requisito |
|---|---|
| RNF-01 | Canales y protocolos nativos de React + Supabase; sin infraestructura de red externa |
| RNF-02 | Datos en reposo cifrados con AES-256 |
| RNF-03 | RLS estricto: ningún alumno autenticado puede leer registros de otro alumno |
| RNF-04 | API keys (Supabase Service Role Key, etc.) almacenadas como variables de entorno; nunca expuestas en el Frontend |
| RNF-05 | Tokens JWT con expiración máxima de 1 hora; refresh automático y transparente |

### 7.2 Rendimiento y Eficiencia

| ID | Requisito | Métrica |
|---|---|---|
| RNF-06 | Tiempo de respuesta API (lecturas/escrituras simples) | < 300 ms |
| RNF-07 | First Contentful Paint de la SPA en React | ≤ 2.0 s (10 Mbps) |
| RNF-08 | Latencia de actualización del Dashboard (Supabase Realtime) | ≤ 1.0 s |
| RNF-09 | Usuarios concurrentes soportados sin degradación | ≥ 500 |

### 7.3 Disponibilidad y Confiabilidad

| ID | Requisito |
|---|---|
| RNF-10 | Disponibilidad ≥ 99.5% durante el ciclo académico |
| RNF-11 | Reconexión automática con retries si la conexión a Supabase se interrumpe |
| RNF-12 | Operaciones críticas (registro de entrega + escritura de audit log) en una transacción ACID; si el log falla, la entrega se revierte |

### 7.4 Escalabilidad y Mantenibilidad

| ID | Requisito |
|---|---|
| RNF-13 | Esquema PostgreSQL normalizado hasta 3FN (excepto tablas de auditoría) |
| RNF-14 | Frontend React organizado en componentes reutilizables, custom hooks para Supabase y separación estricta de vistas por rol |
| RNF-15 | Edge Functions y consultas personalizadas en TypeScript con `strict: true` |

### 7.5 Compatibilidad y Usabilidad

| ID | Requisito |
|---|---|
| RNF-16 | Funcional en las 3 últimas versiones de Chrome, Firefox, Edge y Safari (móvil y escritorio) |
| RNF-17 | Diseño responsive con Tailwind CSS: 320px (móvil) hasta 1920px (escritorio) |
| RNF-18 | Toda lógica temporal (countdown, timestamps, auditoría) en UTC-5 (America/Lima), independiente de la configuración del dispositivo del alumno |

### 7.6 Restricciones de Infraestructura

| ID | Requisito |
|---|---|
| RNF-19 | Sin servidor dedicado (VPS); operación 100% serverless sobre Supabase |
| RNF-20 | Usuario de la app solo tiene permisos de DML permitidos por RLS; bloqueado `DROP TABLE` y alteración de esquemas |

---

## 8. Casos de Uso

### Módulo 1: Autenticación y RBAC

**CUS-01: Autenticar Usuario (Login)**
- **Actor:** Alumno / Profesor / Administrador
- **Precondición:** Usuario registrado en Supabase Auth con cuenta activa
- **Flujo principal:**
  1. El usuario ingresa correo y contraseña en el Frontend (React)
  2. El SDK de Supabase JS envía las credenciales a Supabase Auth
  3. Supabase retorna un token JWT + perfil del usuario
  4. El Frontend decodifica el token, identifica el rol (`id_rol`) y redirige al panel correspondiente
  5. Trigger registra `LOGIN_SUCCESS` en `Logs_Auditoria` (ID usuario + IP)
- **Alternativas:**
  - `3a. Credenciales incorrectas:` incrementa contador; registra `LOGIN_FAILED` en auditoría
  - `3b. Cuenta bloqueada:` Supabase deniega el acceso; mensaje de bloqueo temporal

**CUS-02: Cerrar Sesión (Logout)**
- **Flujo principal:**
  1. El usuario hace clic en "Cerrar Sesión"
  2. El SDK de Supabase Auth invalida el token en cliente y servidor
  3. El Frontend limpia sesión local y redirige al Login
  4. Registra `LOGOUT_SUCCESS` en auditoría
- **Alternativas:**
  - `2a. Falla de red:` el Frontend limpia el almacenamiento local de igual forma y fuerza redirección al Login

---

### Módulo 2: Gestión de Cronogramas (Profesor)

**CUS-03: Configurar Ventana de Entrega**
- **Flujo principal:**
  1. Profesor selecciona curso y hace clic en "Crear Entregable"
  2. Completa formulario: título, descripción, fechas de apertura y cierre
  3. Sistema valida fechas bajo zona horaria `America/Lima`
  4. Se inserta registro en `Ventanas_Tiempo`
  5. Trigger registra `CREATE_WINDOW` en auditoría (inmutable)
- **Alternativa `3a:`** Fecha de cierre ≤ apertura → error: "La fecha de cierre debe ser posterior a la fecha de apertura"

**CUS-04: Modificar Ventana de Entrega**
- **Flujo principal:**
  1. Profesor selecciona ventana y hace clic en "Editar"
  2. Modifica plazos y presiona "Guardar"
  3. Sistema valida zona horaria y actualiza `Ventanas_Tiempo`
  4. Trigger guarda valores OLD y NEW en auditoría
- **Alternativa `3a:`** Fecha de cierre ya pasada → error: "No se puede establecer una fecha de cierre anterior a la hora actual"

**CUS-05: Eliminar Ventana de Entrega**
- **Flujo principal:**
  1. Profesor selecciona "Eliminar" en una ventana
  2. Sistema verifica que no existan archivos subidos para esa tarea
  3. Se ejecuta borrado físico en `Ventanas_Tiempo`; se registra `DELETE_WINDOW_SUCCESS`
- **Alternativa `3a (Bloqueo):`** Si existe al menos una entrega → error: "No se puede eliminar la ventana de entrega porque ya existen archivos asociados"

**CUS-06: Registrar Prórroga Individual**
- **Flujo principal:**
  1. Profesor selecciona un alumno y elige "Asignar Prórroga"
  2. Ingresa nueva fecha y hora límite exclusiva para ese alumno
  3. Sistema inserta registro en `Prorrogas_Alumnos` (`id_alumno` + `nueva_fecha_cierre`)
  4. Se registra `EXTENSION_GRANTED` en auditoría
- **Alternativa `3a:`** RLS bloquea si el alumno no pertenece a las secciones del profesor

---

### Módulo 3: Interfaz del Estudiante

**CUS-07: Visualizar Contador y Estado de Tareas**
- **Flujo principal:**
  1. Alumno ingresa al panel; Frontend consulta `Ventanas_Tiempo` por cursos matriculados
  2. Renderiza lista ordenada: activas → pendientes → vencidas → calificadas
  3. Para tareas activas: inicia contador regresivo `Días:Horas:Minutos:Segundos`
  4. Sincronización periódica del contador con la hora del servidor
- **Alternativa `4a:`** Si faltan < 24 horas → contador cambia de color a tono de alerta (rojo)

---

### Módulo 4: Almacenamiento y Carga de Archivos

**CUS-08: Subir Archivo de Entrega**
- **Precondición:** Ventana de tiempo (o prórroga individual) activa en el servidor
- **Flujo principal:**
  1. Alumno selecciona entregable activo y carga su archivo
  2. Frontend envía el archivo a la Edge Function (`POST /functions/v1/upload-delivery`)
  3. Edge Function se autentica en Google Drive API (Service Account), sube el archivo a `/curso/tarea/alumno`
  4. Sistema evalúa timestamp del servidor: si ≤ cierre → estado `"A Tiempo"` en tabla `Entregas`
  5. Trigger registra `UPLOAD_SUCCESS` en auditoría
- **Alternativas:**
  - `4a. Plazo expirado en servidor:` Trigger cancela la operación → error: "Ventana de entrega cerrada. Plazo límite excedido"
  - `4b. Entrega extemporánea admitida:` Si el curso lo permite, se registra como `"Tardía"`

---

### Módulo 5: Calificación y Retroalimentación

**CUS-09: Evaluar Entrega de Estudiante**
- **Flujo principal:**
  1. Profesor selecciona una entrega en su panel
  2. Sistema recupera la ruta del archivo y permite abrir el visor de Google Drive
  3. Profesor ingresa nota (0–20) y observaciones en texto plano
  4. Sistema actualiza `Entregas`; Trigger guarda OLD y NEW en auditoría
- **Alternativa `3a:`** Nota fuera de rango → CHECK de BD rechaza la mutación y muestra error

**CUS-10: Modificar Calificación y Retroalimentación**
- **Flujo principal:**
  1. Profesor selecciona "Editar Calificación" de un alumno evaluado
  2. Modifica nota o retroalimentación y presiona "Actualizar"
  3. Sistema reescribe columnas en Supabase; Trigger de auditoría registra el cambio de notas
- **Alternativa `3a:`** Ciclo académico concluido → restricción lógica impide edición (modo solo lectura)

**CUS-11: Visualizar Calificación y Comentarios**
- **Flujo principal:**
  1. Alumno ingresa a su Panel de Entregas
  2. Frontend consulta registros vinculados al `id_alumno` autenticado (RLS)
  3. Sistema renderiza nota vigesimal y texto de comentarios del docente
- **Alternativa `3a:`** Intento de modificación externa → RLS del servidor bloquea la transacción

---

### Módulo 6: Seguridad Antiplagio

**CUS-12: Validar Unicidad de Archivos (Antiplagio)**
- **Actor:** Sistema (Proceso Automatizado)
- **Flujo principal:**
  1. Al procesar el almacenamiento, el sistema calcula el hash SHA-256 del archivo
  2. Se intenta insertar el hash en BD junto con el `id_curso`
  3. UNIQUE Constraint verifica que el hash no exista para ese curso
  4. Si no hay duplicado → transacción confirmada y entrega guardada
- **Alternativa `3a (Hash Duplicado):`** BD frena la inserción → ROLLBACK completo, archivo eliminado del Storage, alerta crítica en auditoría

---

### Módulo 7: Auditoría Inmutable

**CUS-13: Generar Bitácora de Eventos**
- **Actor:** Sistema (Proceso Automatizado)
- **Flujo principal:**
  1. Usuario o proceso ejecuta INSERT/UPDATE en tablas críticas
  2. Trigger BEFORE/AFTER de PostgreSQL se activa automáticamente
  3. Captura: ID de usuario, tipo de acción, IP del cliente, timestamp exacto del servidor
  4. Inserta en `Logs_Auditoria` de forma transparente
- **Alternativa `4a:`** Intento de DELETE/UPDATE en `Logs_Auditoria` → SQL RULE aborta la operación inmediatamente

---

### Módulo 8: Dashboard y Métricas

**CUS-14: Monitorear Entregas en Tiempo Real**
- **Actor:** Profesor
- **Flujo principal:**
  1. Profesor selecciona sección académica en su Dashboard
  2. Frontend establece canal WebSocket con Supabase Realtime
  3. Al completarse CUS-08, el servidor notifica el evento por el canal abierto
  4. Pantalla del Profesor se actualiza reactivamente sin recargar el navegador

**CUS-15: Exportar Reporte Académico**
- **Flujo principal:**
  1. Profesor presiona "Exportar Reporte"
  2. Frontend compila: alumnos, códigos, estados de entrega, notas y observaciones
  3. Sistema genera archivo CSV o Excel descargable
  4. Registra acción `EXPORT_REPORT` en auditoría

**CUS-16: Visualizar Métricas de Infraestructura**
- **Actor:** Administrador
- **Flujo principal:**
  1. Administrador accede al Panel de Métricas Globales
  2. Sistema contabiliza volumen de transacciones, solicitudes e incidencias
  3. Frontend grafica espacio total de almacenamiento en Supabase Storage

---

### Módulo 9: Mantenimiento y Operaciones en Lote

**CUS-17: Crear Perfil de Usuario Manualmente**
- **Flujo principal:**
  1. Administrador completa formulario de registro (nombre, correo)
  2. Asigna rol obligatorio (Alumno / Profesor / Administrador)
  3. Sistema crea identidad en Supabase Auth y perfil en las tablas relacionales
- **Alternativa `3a:`** Correo duplicado → Supabase Auth rechaza la operación

**CUS-18: Registrar Curso y Asignar Docente**
- **Flujo principal:**
  1. Administrador ingresa código de asignatura, periodo y sección
  2. Selecciona Profesor de lista desplegable
  3. Sistema escribe en `Cursos_Secciones` asignando la titularidad

**CUS-19: Procesar Matrícula Masiva**
- **Flujo principal:**
  1. Administrador selecciona curso + sección y sube CSV de matrícula
  2. Backend abre bloque de transacción única y lee el archivo fila a fila
  3. Por cada fila, verifica que el código de alumno exista en la tabla global de usuarios
  4. Si todos los códigos son válidos → COMMIT definitivo de toda la matrícula en lote
- **Alternativa `3a:`** Un solo código inexistente → ROLLBACK total del proceso → mensaje: "Proceso abortado. El código de estudiante especificado no existe en el sistema"

**CUS-20: Deshabilitar Cuenta de Usuario**
- **Flujo principal:**
  1. Administrador busca cuenta y presiona "Deshabilitar"
  2. Sistema cambia el perfil a inactivo en Supabase Auth
  3. Revoca tokens JWT activos de forma inmediata y síncrona
  4. Registra la baja en auditoría

**CUS-21: Exportar Log de Auditoría Histórica**
- **Actor:** Administrador
- **Flujo principal:**
  1. Administrador accede al panel "Auditoría de Sistema e Inmutabilidad"
  2. Aplica filtros (rango de fechas, ID de usuario, tipo de operación, tabla afectada) y presiona "Exportar Log"
  3. Sistema estructura la data y genera archivo CSV o Excel descargable
  4. Trigger registra `EXPORT_AUDIT_LOG` en el propio log (quién exportó, cuándo y con qué filtros)
- **Alternativa `2a:`** Filtros sin resultados → exportación deshabilitada; mensaje: "No existen registros de auditoría para los parámetros seleccionados"

---

## 9. Reglas de Negocio

| ID | Regla |
|---|---|
| RN-001 | Solo usuarios creados por el Administrador pueden acceder; no hay auto-registro |
| RN-002 | Toda operación requiere sesión autenticada y vigente; token expirado redirige al login |
| RN-003 | Las funcionalidades están determinadas exclusivamente por el rol; no modificable por parámetros de la petición |
| RN-004 | El correo institucional es identificador único e inmutable; solo el Administrador puede actualizarlo |
| RN-005 | Todo usuario debe tener rol asignado en el momento de creación; no se admiten usuarios sin rol |
| RN-006 | 5 intentos fallidos → cuenta bloqueada automáticamente; desbloqueo por tiempo o por Administrador |
| RN-007 | Cronogramas administrados exclusivamente por el Profesor asignado al curso |
| RN-008 | Un Profesor solo gestiona los cursos asignados explícitamente; RLS bloquea acceso a cursos ajenos |
| RN-009 | Fecha de apertura estrictamente anterior a la fecha de cierre; configuraciones inconsistentes son rechazadas |
| RN-010 | Entregas solo aceptadas con ventana en estado "Abierta"; ventana Pendiente o Cerrada bloquea toda operación |
| RN-011 | Las prórrogas son individuales; no modifican el cronograma general ni las ventanas de otros alumnos |
| RN-012 | Al vencer el plazo (o prórroga individual), el sistema cierra automáticamente la recepción desde el servidor; inaccesible desde el cliente |
| RN-013 | El timestamp de entrega es capturado exclusivamente por el servidor; no se aceptan timestamps del cliente |
| RN-014 | El reloj del servidor (NTP) es la única fuente de verdad para auditoría, puntualidad y control de ventanas |
| RN-015 | Clasificación automática e inmutable: "A Tiempo" si timestamp ≤ cierre; "Tardía" si es posterior; ningún actor puede alterarla |
| RN-016 | Solo se aceptan archivos físicos cargados desde el dispositivo del alumno; no se admiten registros incompletos |
| RN-017 | Máximo un registro vigente por alumno por entregable; reemplazos preservan historial en auditoría |
| RN-018 | Reemplazo de archivo permitido solo mientras la ventana esté abierta; bloqueado absolutamente al vencer el plazo |
| RN-019 | Hash SHA-256 único por archivo; hash duplicado en el mismo curso → ROLLBACK + eliminación + alerta crítica |
| RN-020 | Ventanas con entregas asociadas no pueden eliminarse a nivel de BD |
| RN-021 | Logs de auditoría son de solo escritura; ningún actor puede modificar o eliminar registros ya insertados |
| RN-022 | Toda acción crítica (creación, modificación, autenticación, intento fallido, exportación, cambio de nota) genera un registro automático en auditoría via trigger |
| RN-023 | Toda modificación sobre entrega, calificación o ventana preserva OLD y NEW en auditoría |
| RN-024 | Lógica temporal visible en UTC-5 (America/Lima); timestamps almacenados en UTC, conversión en capa de presentación |
| RN-025 | Calificaciones en rango 0–20 (sistema vigesimal); CHECK de BD rechaza valores fuera del rango |
| RN-026 | Edición de nota restringida al ciclo académico vigente; ciclo concluido → modo lectura |
| RN-027 | Desactivar una cuenta no elimina entregas, calificaciones, constancias ni logs; permanecen consultables por el Administrador |
| RN-028 | Matrícula masiva CSV procesada como transacción única (atómica); un código inexistente → ROLLBACK total |
| RN-029 | Un alumno no puede ver ni inferir el estado, archivo ni historial de ningún otro alumno (RLS en BD, no solo en UI) |
| RN-030 | Cada exportación de auditoría queda registrada en el log con identidad del Administrador, fecha y filtros aplicados |

---

## 10. Contratos API

### Autenticación (Supabase Auth)

**`POST /auth/v1/authorize?provider=google`** — Público

```json
// Response 200 — Sesión activa
{
  "access_token": "string (JWT Institucional)",
  "refresh_token": "string (UUID)",
  "user": {
    "id": "UUID",
    "email": "string (@urp.edu.pe)",
    "user_metadata": {
      "full_name": "Nombre Completo",
      "avatar_url": "URL_Foto"
    }
  }
}
```
> Restricción: el backend valida que el correo pertenezca al dominio `@urp.edu.pe`

---

### Gestión de Ventanas y Prórrogas (Edge Functions)

**`POST /functions/v1/manage-schedule`** — Rol: Profesor

```json
// Request
{
  "action": "CREATE | UPDATE",
  "curso_id": "UUID",
  "entregable_id": "UUID",
  "fecha_apertura": "string (ISO 8601)",
  "fecha_cierre": "string (ISO 8601)"
}

// Response 200
{
  "success": true,
  "message": "Ventana procesada correctamente.",
  "data": {
    "id_ventana": "UUID",
    "estado_calculado": "string"
  }
}
```

**`POST /functions/v1/assign-extension`** — Rol: Profesor

```json
// Request
{
  "id_alumno": "UUID",
  "id_entregable": "UUID",
  "nueva_fecha_cierre": "string (ISO 8601)"
}

// Response 200
{
  "success": true,
  "id_prorrogas_alumnos": "UUID",
  "timestamp_registro": "string"
}
```

---

### Núcleo de Carga y Almacenamiento (Edge Function Centralizada)

**`POST /functions/v1/upload-delivery`** — Rol: Alumno  
**Content-Type:** `multipart/form-data`

| Parámetro Form-Data | Descripción |
|---|---|
| `file` | Binario del archivo |
| `id_entregable` | UUID del entregable |
| `id_curso` | UUID del curso |

**API Externa:** Google Drive API v3 (`@googleapis/drive` para Node.js)  
**Autenticación Drive:** Service Account (Server-to-Server; sin OAuth2 del alumno)  
**Estructura en Drive:** `/ID_Curso/Nombre_Tarea/Nombre_Estudiante/`  
**Variables de Entorno:** `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_DRIVE_ROOT_FOLDER_ID`

```json
// Response 201
{
  "status": "A Tiempo | Tardía",
  "file_hash": "SHA-256-HEX",
  "drive_secure_url": "URL_Institucional",
  "constancia_digital": {
    "comprobante_id": "UUID",
    "timestamp_milisegundos": 1718562871000,
    "metadata_verificacion": "JWT_Firmado"
  }
}
```

---

### Calificación y Retroalimentación

**`PATCH /rest/v1/Entregas?id=eq.{id_entrega}`** — Rol: Profesor

```json
// Request
{
  "nota_num": 18.5,
  "retroalimentacion": "string (Comentarios del docente)"
}

// Response 200
{
  "id_entrega": "UUID",
  "nota_num": 18.5,
  "estado_calificacion": "CALIFICADO",
  "ultima_modificacion": "string (ISO 8601)"
}
```

---

### Matrícula Masiva (Edge Function Transaccional)

**`POST /functions/v1/bulk-enrollment`** — Rol: Administrador

```json
// Response 200
{
  "success": true,
  "registros_procesados": 45,
  "transaccion_id": "UUID"
}
```

---

### Canal de Tiempo Real (Supabase Realtime / WebSockets)

```
Canal: realtime:public:Entregas:curso_id=eq.{id_curso}
Eventos: INSERT / UPDATE
```

```json
// Broadcast Payload
{
  "topic": "realtime:public:Entregas",
  "event": "INSERT",
  "payload": {
    "id": "UUID",
    "id_alumno": "UUID",
    "estado_puntualidad": "A Tiempo"
  }
}
```

---

## 11. Modelo de Dominio

Entidades principales (10):

- **Profesor** y **Alumno** — actores académicos
- **Matrícula** — resuelve la relación N:M entre Alumno y Curso
- **Curso** — organiza un Cronograma que planifica los Entregables del ciclo
- **Entregable** — define una **VentanaTiempo**, extensible mediante una **Prórroga** individual
- **Entrega** — realizada por el Alumno por cada Entregable (hash + archivo + timestamp → estado de puntualidad)
- **Revisión** — asignada por el Profesor a cada Entrega (nota + retroalimentación)

---

## 11. Modelo de Dominio (Diagrama ER)

### Entidades y Atributos

#### Profesor
| Atributo | Tipo / Notas |
|---|---|
| `id_profesor` | PK |
| `nombre` | |
| `email` | |
| `estado` | |

#### Alumno
| Atributo | Tipo / Notas |
|---|---|
| `id_alumno` | PK |
| `nombre` | |
| `codigo` | |
| `estado` | |

#### Curso
| Atributo | Tipo / Notas |
|---|---|
| `id_curso` | PK |
| `nombre` | |
| `ciclo` | |
| `id_profesor` | FK → Profesor |
| `id_cronograma` | FK → Cronograma |

#### Matrícula
| Atributo | Tipo / Notas |
|---|---|
| `id_matricula` | PK |
| `fechaMatricula` | |
| `id_alumno` | FK → Alumno |
| `id_curso` | FK → Curso |

#### Cronograma
| Atributo | Tipo / Notas |
|---|---|
| `id_cronograma` | PK |
| `cicloAcademico` | |
| `fechaInicio` | |
| `fechaFin` | |
| `id_curso` | FK → Curso |

#### Entregable
| Atributo | Tipo / Notas |
|---|---|
| `id_entregable` | PK |
| `titulo` | |
| `descripción` | |
| `id_ventanaTiempo` | FK → VentanaTiempo |
| `id_cronograma` | FK → Cronograma |
| `admite_extemporaneas` | boolean |

#### VentanaTiempo
| Atributo | Tipo / Notas |
|---|---|
| `id_ventanaTiempo` | PK |
| `fechaApertura` | |
| `fechaCierre` | |
| `estado` | |
| `id_entregable` | FK → Entregable |

#### Prórroga
| Atributo | Tipo / Notas |
|---|---|
| `id_prorroga` | PK |
| `fechaCierreEspecial` | |
| `id_profesor` | FK → Profesor |
| `id_alumno` | FK → Alumno |
| `id_ventanaTiempo` | FK → VentanaTiempo |

#### Entrega
| Atributo | Tipo / Notas |
|---|---|
| `id_entrega` | PK |
| `rutaArchivo` | |
| `nombreArchivo` | |
| `tamano` | |
| `estado` | ("A Tiempo" / "Tardía") |
| `id_entregable` | FK → Entregable |
| `id_alumno` | FK → Alumno |

#### Revisión
| Atributo | Tipo / Notas |
|---|---|
| `id_entrega` | PK / FK → Entrega |
| `nota` | 0–20 (vigesimal) |
| `comentario` | |
| `fechaEvaluacion` | |
| `id_profesor` | FK → Profesor |

---

### Relaciones

| Relación | Entidades | Cardinalidad |
|---|---|---|
| `dicta` | Profesor → Curso | 1 : N |
| `matricula a` | Alumno ↔ Curso (via Matrícula) | N : M |
| `organiza` | Curso → Cronograma | 1 : 1 |
| `planifica` | Cronograma → Entregable | 1 : N |
| `define` | Entregable ↔ VentanaTiempo | 1 : 1 |
| `extiende` | VentanaTiempo ← Prórroga | 1 : N |
| `otorga` | Profesor → Prórroga | 1 : N |
| `recibe` | Alumno → Prórroga | 1 : N |
| `realiza` | Alumno → Entrega | 1 : N |
| `recibe` | Entregable → Entrega | 1 : N |
| `recibe` | Entrega → Revisión | 1 : 1 |
| `realiza` | Profesor → Revisión | 1 : N |

---

## 12. Escenarios de Calidad

### Seguridad — Cifrado y Autenticación (RNF-01, RNF-02, RNF-05)
- **Estímulo:** Alumno inicia sesión y registra su entrega desde el cliente React
- **Respuesta:** Canales nativos de Supabase/React; datos en reposo cifrados con AES-256; JWT con expiración máxima de 1 hora + refresh automático; si el refresh falla, la sesión se cierra
- **Medida:** 100% de datos en reposo cifrados; sesión nunca supera 1 hora sin renovación

### Privacidad — Aislamiento de Datos entre Alumnos (RNF-03)
- **Estímulo:** Alumno manipula URL o petición para acceder a entregas de un compañero
- **Respuesta:** RLS bloquea la consulta en BD antes de que llegue al Frontend; solo se devuelven registros del usuario autenticado
- **Medida:** 0% de accesos cruzados; RLS activo en 100% de tablas con datos personales

### Rendimiento — Sincronización en Tiempo Real (RNF-06, RNF-08, RNF-09)
- **Estímulo:** 500 alumnos envían entregas de forma simultánea en el horario de cierre
- **Respuesta:** Cada entrega se procesa sin degradación; Dashboard del Profesor actualizado vía Supabase Realtime sin recargar página
- **Medida:** Actualización en pantalla ≤ 1 s; respuesta de API ≤ 300 ms; soporte de ≥ 500 usuarios concurrentes

### Disponibilidad — Tolerancia a Fallos de Conexión (RNF-10, RNF-11)
- **Estímulo:** Conexión con Supabase interrumpida mientras un alumno registra su entrega
- **Respuesta:** Cliente React activa estrategia de retries; preserva estado local del formulario; al reconectarse, la entrega se procesa con timestamp correcto del servidor
- **Medida:** Reconexión automática sin pérdida de datos; disponibilidad ≥ 99.5%

### Confiabilidad — Integridad del Log de Auditoría (RNF-12, RNF-20)
- **Estímulo:** Alumno confirma su entrega dentro de la ventana habilitada
- **Respuesta:** Una única transacción ACID registra la entrega + escritura en auditoría; si el log falla → la entrega se revierte completa; GRANT/REVOKE impiden `DROP TABLE` sobre esquemas de auditoría
- **Medida:** 100% de entregas con log de auditoría; 0% de entregas sin traza trazable

### Usabilidad — Zona Horaria y Diseño Adaptativo (RNF-17, RNF-18)
- **Estímulo:** Alumno accede desde móvil con configuración regional distinta a Perú
- **Respuesta:** UI adaptada vía Tailwind CSS (320px–1920px); toda la lógica temporal del countdown opera en UTC-5 independiente del dispositivo
- **Medida:** UI consistente desde 320px hasta 1920px; countdown siempre en UTC-5

---

## 13. Conceptos de SSD Aplicados

1. **Mensajes del Sistema:** Cada acción del alumno en el flujo de subida genera un mensaje al sistema (procesamiento del archivo, autenticación en Drive, captura del timestamp y persistencia)
2. **Contratos de Operación:** Precondiciones, postcondiciones e invariantes definidas por caso de uso (ej.: modificar ventana → postcondición: cambio actualizado en BD + registrado inmutablemente en auditoría con OLD/NEW)
3. **Diagramas de Secuencia del Sistema (DSS):** Flujos principales modelan intercambio de mensajes actor↔sistema como caja negra (selección de entregable → subida → orquestación Drive → confirmación con timestamp)
4. **Contratos de API como extensión de contratos de operación:** La Edge Function de subida materializa la postcondición atómica: Drive + timestamp + clasificación + log
5. **Eventos del Sistema y Trazabilidad:** Cada mensaje que produce cambio de estado crítico queda capturado en el log de solo escritura
6. **Casos de Uso como fuente de los DSS:** Los flujos numerados mapean directamente secuencias de mensajes; los flujos alternativos representan escenarios de excepción en el modelado

---

## 14. Conceptos de la Plataforma (Supabase)

| Concepto | Descripción técnica |
|---|---|
| **Backend as a Service (BaaS)** | Supabase provee API REST, autenticación y BD sin servidor tradicional; el desarrollo se enfoca en lógica de negocio |
| **PostgreSQL** | Motor de BD con triggers nativos para timestamps inmutables y restricciones de solo escritura en auditoría |
| **Row Level Security (RLS)** | Políticas de aislamiento inyectadas directamente en la BD; el control de acceso por rol se aplica a nivel de datos, no solo en el cliente |
| **Supabase Auth** | Gestión de credenciales institucionales, tokens JWT (expiración 1 hora), refresh automático; base de identidad para las políticas RLS |
| **Supabase Realtime** | Suscripción a cambios en BD mediante WebSockets; alimenta la actualización automática del Dashboard docente sin recargar página |
| **Edge Functions** | Núcleo de integración con Google Drive: reciben el archivo, se autentican via Service Account, construyen la jerarquía de carpetas y capturan el timestamp del servidor |
| **API REST autogenerada** | Endpoints generados automáticamente desde el esquema relacional para operaciones estándar; la protección delegada a RLS y restricciones de BD |

---

## 15. Técnicas Aplicadas

- **Modelado de requisitos:** Especificación estructurada de RF y RNF con trazabilidad directa a componentes del sistema
- **Modelado UML:** Diagramas de casos de uso con flujos principales y alternativos
- **Diseño de reglas de negocio:** 30 reglas invariantes del dominio (RN-001 a RN-030) que rigen el comportamiento independientemente de la interfaz
- **Arquitectura en capas:** Separación de Presentación / Lógica de Negocio / Acceso a Datos
- **BaaS con Supabase:** PostgreSQL gestionado, Auth, API autogenerada y Realtime para reducir complejidad de infraestructura
- **Row Level Security:** Políticas de aislamiento en BD para RBAC y separación de visibilidad entre alumnos
- **Diseño append-only para auditoría:** Triggers + restricciones para logs inmutables con timestamps de servidor en precisión de milisegundos (UTC)
- **Diseño responsive:** Interfaces adaptables a dispositivos móviles con Tailwind CSS
- **Validación de datos por dominio:** Verificación de formato y dominio de enlaces (drive.google.com, docs.google.com) antes de persistir

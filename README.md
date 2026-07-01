<div align="center">

# SRE-URP
### Sistema de Registro de Entregables - Universidad Ricardo Palma
### Academic Submission Registry System - Universidad Ricardo Palma

[![Status](https://img.shields.io/badge/status-in%20development-yellow?style=flat-square)](https://github.com/SergioPzr/Academic-Submission-Audit-Dashboard)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)
[![Stack](https://img.shields.io/badge/stack-React%20%2B%20Supabase%20%2B%20PostgreSQL-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Methodology](https://img.shields.io/badge/methodology-Spec--Driven%20Development-blue?style=flat-square)](#spec-driven-development)
[![Architecture](https://img.shields.io/badge/architecture-TBD-lightgrey?style=flat-square)](#architecture--arquitectura)

</div>

---

## 1. Descripción General / Overview

### Español

**SRE-URP** es un sistema web full-stack para la gestión y auditoría de entregas académicas en la Universidad Ricardo Palma. Resuelve un problema concreto: la ausencia de un mecanismo centralizado, temporalmente exacto e imparcial para registrar cuándo un estudiante entregó su trabajo.

El sistema integra tres roles (Alumno, Profesor, Administrador), ventanas de entrega configurables con timestamps capturados exclusivamente del servidor, almacenamiento estructurado en Google Drive, calificación con retroalimentación y un log de auditoría inmutable a nivel de base de datos. Cada entrega es clasificada automáticamente como `"A Tiempo"` o `"Tardía"` según el reloj del servidor - no del cliente - con precisión de milisegundos.

El proyecto fue desarrollado siguiendo **Spec-Driven Development (SDD)**, metodología obligatoria del curso de Arquitectura y Evolución de Software (URP, 2026-I): la especificación completa - requisitos funcionales, reglas de negocio, contratos de API y modelo de dominio - precede a cualquier línea de código de producción.

> **Estado actual:** El prototipo de frontend está funcional. La integración completa con Google Drive, la cobertura de pruebas y la documentación de ADRs están en curso.

---

### English

**SRE-URP** is a full-stack web system for managing and auditing academic assignment submissions at Universidad Ricardo Palma. It addresses a concrete problem: the lack of a centralized, temporally accurate, and impartial mechanism to record when a student submitted their work.

The system integrates three roles (Student, Teacher, Administrator), configurable submission windows with timestamps captured exclusively server-side, structured storage in Google Drive, grading with feedback, and an immutable audit log enforced at the database level. Each submission is automatically classified as `"On Time"` or `"Late"` based on the server clock - not the client - with millisecond precision.

The project was developed following **Spec-Driven Development (SDD)**, the mandatory methodology for the Software Architecture and Evolution course (URP, 2026-I): the full specification - functional requirements, business rules, API contracts, and domain model - precedes any production code.

> **Current status:** The frontend prototype is functional. Full Google Drive integration, test coverage, and ADR documentation are in progress.

---

## 2. Funcionalidades Principales / Core Features

### Español

#### Vista del Alumno
- Listado de entregables con estado visual: Activo · Pendiente · Vencido · Calificado
- Contador regresivo en tiempo real (`DD:HH:MM:SS`) sincronizado periódicamente con el servidor
- Cambio de color automático cuando quedan menos de 24 horas para el cierre
- Carga de archivo al entregable activo; bloqueo automático al expirar el plazo
- Visualización de calificación (escala vigesimal 0–20), retroalimentación del docente y constancia digital de recepción
- Control de reenvío: reemplazos permitidos solo mientras la ventana esté abierta

#### Vista del Profesor
- Dashboard consolidado por curso/sección con estado en tiempo real (Supabase Realtime / WebSockets)
- Creación y edición de ventanas de entrega con fechas exactas en zona horaria `America/Lima` (UTC-5)
- Prórroga individual por alumno sin afectar el cronograma general del curso
- Vista del monitor en vivo: estado de cada alumno por entregable (A Tiempo / Tardía / Pendiente / Calificado)
- Calificación y retroalimentación por entrega con historial de modificaciones
- Exportación de reporte académico (notas + observaciones) en CSV

#### Vista del Administrador
- Gestión de usuarios (crear, deshabilitar, asignar rol); revocación inmediata de tokens JWT
- Registro de cursos y asignación de profesores por sección
- Matrícula masiva de alumnos mediante CSV procesada como transacción atómica (ROLLBACK total ante un solo error)
- Panel de métricas globales: volumen de transacciones, incidencias de auditoría
- Exportación filtrada del log completo de auditoría

#### Características del Sistema (transversales)
- Audit log inmutable: triggers de PostgreSQL capturan toda operación crítica con valores OLD/NEW, ID de actor, IP y timestamp del servidor
- Hash SHA-256 por archivo: constraint UNIQUE por curso previene duplicados con ROLLBACK automático
- Row Level Security (RLS) en toda la capa de datos: ningún alumno puede leer registros de otro
- Toda la lógica temporal opera en UTC-5, independiente de la configuración del dispositivo del usuario
- Operaciones críticas (entrega + log) ejecutadas en transacción ACID: si el log falla, la entrega se revierte

---

### English

#### Student View
- Assignment list with visual status: Active · Pending · Overdue · Graded
- Real-time countdown (`DD:HH:MM:SS`) periodically synchronized with the server
- Automatic color change when less than 24 hours remain before closing
- File upload for active assignment; automatic lock upon deadline expiry
- View of grade (0–20 vigesimal scale), teacher feedback, and digital receipt of submission
- Resubmission control: replacements allowed only while the window is open

#### Teacher View
- Consolidated dashboard per course/section with real-time status (Supabase Realtime / WebSockets)
- Creation and editing of submission windows with exact timestamps in `America/Lima` timezone (UTC-5)
- Individual extensions per student without affecting the general course schedule
- Live monitor: status of each student per assignment (On Time / Late / Pending / Graded)
- Grading and feedback per submission with modification history
- Academic report export (grades + observations) in CSV

#### Admin View
- User management (create, disable, assign role); immediate JWT token revocation
- Course registration and teacher assignment per section
- Bulk student enrollment via CSV processed as an atomic transaction (full ROLLBACK on any single error)
- Global metrics panel: transaction volume, audit incidents
- Filtered export of the full audit log

#### System-wide Features
- Immutable audit log: PostgreSQL triggers capture every critical operation with OLD/NEW values, actor ID, IP, and server timestamp
- SHA-256 hash per file: UNIQUE constraint per course prevents duplicates with automatic ROLLBACK
- Row Level Security (RLS) across the entire data layer: no student can read another student's records
- All temporal logic operates in UTC-5, regardless of the user's device configuration
- Critical operations (submission + log) executed in ACID transactions: if the log fails, the submission rolls back

---

## 3. Arquitectura / Architecture

### Español

> ⚠️ **TBD - La decisión arquitectónica formal está pendiente.** El sistema opera actualmente sobre una arquitectura de 3 capas sobre BaaS (Supabase), pero la elección de patrón definitivo será documentada en `docs/adr/` como parte del proceso SDD.

**Candidatas en evaluación:**

| Candidata | Justificación | Atributos de calidad prioritarios |
|---|---|---|
| **3-Layer + BaaS (Supabase)** | Infraestructura mínima; API REST y Auth auto-gestionadas | Mantenibilidad, velocidad de despliegue |
| **Microservicios ligeros** | Edge Functions como servicios independientes por dominio | Escalabilidad, separación de responsabilidades |
| **Hexagonal / Ports & Adapters** | Independencia del motor BaaS; facilita pruebas unitarias de lógica | Testeabilidad, modificabilidad |

**Atributos de calidad a justificar formalmente (ISO 25010):**
- **Seguridad:** RLS en capa de datos, tokens JWT con expiración, cifrado AES-256 en reposo
- **Confiabilidad:** Transacciones ACID para operaciones entrega+auditoría; log inmutable con SQL RULES
- **Rendimiento:** ≤ 300 ms para operaciones de lectura/escritura; ≤ 1 s de latencia en Realtime
- **Mantenibilidad:** TypeScript strict, componentes React por rol, hooks personalizados para Supabase
- **Integridad de datos:** Antiplagio con SHA-256 + constraint UNIQUE; timestamps exclusivamente del servidor

**Componentes actuales confirmados:**

```
React SPA (Vite + TypeScript)
    │
    ├── Supabase JS SDK  ──▶  Supabase Auth (JWT + RLS)
    │                    ──▶  PostgREST API (REST auto-generada)
    │                    ──▶  Supabase Realtime (WebSockets)
    │
    └── Edge Functions   ──▶  Google Drive API v3 (Service Account)
                         ──▶  PostgreSQL Triggers (audit log inmutable)
```

---

### English

> ⚠️ **TBD - The formal architectural decision is pending.** The system currently operates on a 3-layer BaaS (Supabase) architecture, but the definitive pattern will be documented in `docs/adr/` as part of the SDD process.

**Candidates under evaluation:**

| Candidate | Rationale | Priority quality attributes |
|---|---|---|
| **3-Layer + BaaS (Supabase)** | Minimal infrastructure; auto-managed REST API and Auth | Maintainability, deployment speed |
| **Lightweight Microservices** | Edge Functions as independent domain services | Scalability, separation of concerns |
| **Hexagonal / Ports & Adapters** | BaaS engine independence; facilitates unit testing of business logic | Testability, modifiability |

**Quality attributes to formally justify (ISO 25010):**
- **Security:** RLS at data layer, JWT tokens with expiration, AES-256 encryption at rest
- **Reliability:** ACID transactions for submission+audit operations; immutable log with SQL RULES
- **Performance:** ≤ 300 ms for read/write operations; ≤ 1 s latency on Realtime
- **Maintainability:** TypeScript strict, React components by role, custom Supabase hooks
- **Data integrity:** Anti-plagiarism with SHA-256 + UNIQUE constraint; server-side timestamps only

**Currently confirmed components:**

```
React SPA (Vite + TypeScript)
    │
    ├── Supabase JS SDK  ──▶  Supabase Auth (JWT + RLS)
    │                    ──▶  PostgREST API (auto-generated REST)
    │                    ──▶  Supabase Realtime (WebSockets)
    │
    └── Edge Functions   ──▶  Google Drive API v3 (Service Account)
                         ──▶  PostgreSQL Triggers (immutable audit log)
```

---

## 4. Stack Tecnológico / Tech Stack

| Componente / Component | Tecnología / Technology | Versión / Version | Estado / Status |
|---|---|---|---|
| Framework Frontend | React | 19.x | ✅ Confirmed |
| Language | TypeScript (`strict: true`) | ~6.0 | ✅ Confirmed |
| Build Tool | Vite | 8.x | ✅ Confirmed |
| Routing | React Router DOM | 7.x | ✅ Confirmed |
| Styling | Tailwind CSS | 3.x | ✅ Confirmed |
| Icons | Lucide React | 1.x | ✅ Confirmed |
| Backend as a Service | Supabase | 2.x SDK | ✅ Confirmed |
| Database | PostgreSQL (via Supabase) | Managed | ✅ Confirmed |
| Auth | Supabase Auth (JWT) | — | ✅ Confirmed |
| Realtime | Supabase Realtime (WebSockets) | — | ✅ Confirmed |
| Serverless Functions | Supabase Edge Functions (Deno) | — | ✅ Confirmed |
| Cloud Storage | Google Drive API v3 | — | ⚠️ In integration |
| Date utilities | date-fns | 4.x | ✅ Confirmed |
| Testing Framework | — | — | ⚠️ TBD |
| Linting | ESLint + typescript-eslint | 10.x / 8.x | ✅ Confirmed |

---
---

## 5. Modelo de Dominio / Domain Model

| Entidad / Entity | Campos clave / Key Fields | Notas |
|---|---|---|
| **Usuario** *(User)* | `id`, `nombre_completo`, `email`, `rol` (alumno/profesor/admin), `codigo_institucional`, `estado` | Creado solo por el Admin; sin auto-registro |
| **Curso** *(Course)* | `id_curso`, `nombre`, `codigo`, `seccion`, `ciclo`, `id_profesor` FK | Un profesor por sección; RLS filtra por asignación |
| **Matrícula** *(Enrollment)* | `id_matricula`, `id_alumno` FK, `id_curso` FK, `fecha_matricula` | Resuelve relación N:M Alumno↔Curso |
| **Entregable** *(Assignment)* | `id_entregable`, `titulo`, `descripcion`, `fecha_apertura`, `fecha_cierre`, `admite_extemporaneas`, `id_curso` FK | Timestamps en UTC; visualización en UTC-5 |
| **Prórroga** *(Extension)* | `id_prorroga`, `id_alumno` FK, `id_entregable` FK, `nueva_fecha_cierre`, `id_profesor` FK | Individual; no altera el cronograma general |
| **Entrega** *(Submission)* | `id_entrega`, `drive_url`, `nombre_archivo`, `tamano`, `hash_sha256`, `estado_puntualidad` (a_tiempo/tardia/pendiente), `submitted_at` (server-side), `id_alumno` FK, `id_entregable` FK | Timestamp capturado exclusivamente en el servidor |
| **Revisión** *(Review)* | `id_entrega` FK (PK), `nota_num` (0–20), `retroalimentacion`, `fecha_evaluacion`, `id_profesor` FK | CHECK de BD rechaza valores fuera del rango 0–20 |
| **LogAuditoria** *(AuditLog)* | `id_log`, `tabla_afectada`, `tipo_operacion`, `valores_anteriores` (JSON), `valores_nuevos` (JSON), `id_actor` FK, `ip_cliente`, `timestamp_servidor` | Solo escritura; UPDATE/DELETE bloqueados por SQL RULES |

**Invariantes críticas del dominio / Critical domain invariants:**
- El timestamp de entrega es generado por el servidor; cualquier valor del cliente es ignorado (RN-013, RN-014)
- `estado_puntualidad` es clasificado automáticamente e inmutablemente por el sistema (RN-015)
- `LogAuditoria` nunca puede ser modificado ni eliminado por ningún actor (RN-021)
- Hash SHA-256 duplicado dentro del mismo curso → ROLLBACK + eliminación del archivo + alerta crítica (RN-019)

---

## 6. Documentación de API / API Documentation

### Español

| Endpoint | Método | Rol requerido | Descripción | Estado |
|---|---|---|---|---|
| `/auth/v1/token` | `POST` | Público | Login con email/contraseña (Supabase Auth) | ✅ Activo |
| `/auth/v1/logout` | `POST` | Autenticado | Logout + invalidación de token | ✅ Activo |
| `/rest/v1/entregables` | `GET` / `POST` | Profesor / Admin | Listar o crear entregables | ✅ Activo |
| `/rest/v1/entregables?id=eq.{id}` | `GET` / `PATCH` / `DELETE` | Profesor | Obtener, editar o eliminar entregable | ✅ Activo |
| `/rest/v1/entregas` | `GET` | Alumno / Profesor | Listar entregas (filtradas por RLS) | ✅ Activo |
| `/rest/v1/entregas?id=eq.{id}` | `GET` | Alumno / Profesor | Detalle de una entrega | ✅ Activo |
| `/rest/v1/entregas?id=eq.{id}` | `PATCH` | Profesor | Registrar/actualizar calificación y feedback | ✅ Activo |
| `/rest/v1/logs_auditoria` | `GET` | Admin | Consultar log completo con filtros | ✅ Activo |
| `/functions/v1/upload-delivery` | `POST` | Alumno | Carga → Drive + timestamp + clasificación + audit | ⚠️ En integración |
| `/functions/v1/manage-schedule` | `POST` | Profesor | Crear/actualizar ventana de tiempo | ✅ Activo |
| `/functions/v1/assign-extension` | `POST` | Profesor | Registrar prórroga individual | ✅ Activo |
| `/functions/v1/bulk-enrollment` | `POST` | Admin | Matrícula masiva CSV (transacción atómica) | ✅ Activo |
| `realtime:public:entregas` | WebSocket | Profesor | Canal Realtime para actualizaciones en vivo | ✅ Activo |

---

### English

| Endpoint | Method | Required Role | Description | Status |
|---|---|---|---|---|
| `/auth/v1/token` | `POST` | Public | Login with email/password (Supabase Auth) | ✅ Active |
| `/auth/v1/logout` | `POST` | Authenticated | Logout + token invalidation | ✅ Active |
| `/rest/v1/entregables` | `GET` / `POST` | Teacher / Admin | List or create assignments | ✅ Active |
| `/rest/v1/entregables?id=eq.{id}` | `GET` / `PATCH` / `DELETE` | Teacher | Get, edit, or delete assignment | ✅ Active |
| `/rest/v1/entregas` | `GET` | Student / Teacher | List submissions (RLS-filtered) | ✅ Active |
| `/rest/v1/entregas?id=eq.{id}` | `GET` | Student / Teacher | Submission detail | ✅ Active |
| `/rest/v1/entregas?id=eq.{id}` | `PATCH` | Teacher | Record/update grade and feedback | ✅ Active |
| `/rest/v1/logs_auditoria` | `GET` | Admin | Query full audit log with filters | ✅ Active |
| `/functions/v1/upload-delivery` | `POST` | Student | Upload → Drive + timestamp + classification + audit | ⚠️ In integration |
| `/functions/v1/manage-schedule` | `POST` | Teacher | Create/update submission time window | ✅ Active |
| `/functions/v1/assign-extension` | `POST` | Teacher | Register individual extension | ✅ Active |
| `/functions/v1/bulk-enrollment` | `POST` | Admin | Bulk CSV enrollment (atomic transaction) | ✅ Active |
| `realtime:public:entregas` | WebSocket | Teacher | Realtime channel for live dashboard updates | ✅ Active |

---

## 7. Primeros Pasos / Getting Started

### Español

> ⚠️ **TBD - Las instrucciones completas de despliegue (variables de entorno de Supabase, Service Account de Google Drive, migraciones de BD) se documentarán una vez que la integración esté completa.**

**Para ejecutar el prototipo de frontend localmente:**

**Prerrequisitos:** Node.js ≥ 18 · npm ≥ 9

```bash
# 1. Clonar el repositorio
git clone https://github.com/SergioPzr/Academic-Submission-Audit-Dashboard.git
cd Academic-Submission-Audit-Dashboard

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
# Crear .env.local con tus credenciales de Supabase:
# VITE_SUPABASE_URL=https://<tu-proyecto>.supabase.co
# VITE_SUPABASE_ANON_KEY=<tu-anon-key>

# 4. Iniciar el servidor de desarrollo
npm run dev
# La aplicación estará disponible en http://localhost:5173
```

---

### English

> ⚠️ **TBD - Full deployment instructions (Supabase environment variables, Google Drive Service Account, database migrations) will be documented once integration is complete.**

**Prerequisites:** Node.js ≥ 18 · npm ≥ 9

```bash
# 1. Clone the repository
git clone https://github.com/SergioPzr/Academic-Submission-Audit-Dashboard.git
cd Academic-Submission-Audit-Dashboard

# 2. Install dependencies
npm install

# 3. Configure environment variables
# Create .env.local with your Supabase credentials:
# VITE_SUPABASE_URL=https://<your-project>.supabase.co
# VITE_SUPABASE_ANON_KEY=<your-anon-key>

# 4. Start the development server
npm run dev
# Application available at http://localhost:5173
```

---

## 8. Pruebas / Testing

### Español

> ⚠️ **TBD - El framework de pruebas no está confirmado.** Candidatos: Vitest (unitarias/integración) y Playwright (e2e). La selección se documentará en un ADR.

SDD exige trazabilidad directa entre especificación y prueba: cada requisito funcional y contrato de operación debe tener al menos un caso de prueba referenciado.

| Tipo de prueba | Objetivo en este proyecto | Estado |
|---|---|---|
| **Unitarias** | Lógica de clasificación de puntualidad, validaciones de zona horaria, helpers de fecha | ⚠️ TBD |
| **De contrato** | Verificar que los contratos de API no se rompen ante cambios de esquema | ⚠️ TBD |
| **De integración** | Flujo completo entrega → trigger PostgreSQL → escritura en audit log (ACID) | ⚠️ TBD |
| **End-to-end (e2e)** | Flujos críticos: login, subir entrega dentro/fuera de ventana, calificación, exportar log | ⚠️ TBD |

**Requisito de trazabilidad SDD:** cada prueba debe referenciar el ID del requisito (RF-XX) o regla de negocio (RN-XXX) que valida.

---

### English

> ⚠️ **TBD - The testing framework is not yet confirmed.** Candidates: Vitest (unit/integration) and Playwright (e2e). Selection will be documented in an ADR.

SDD mandates direct traceability between specification and test: each functional requirement and operation contract must have at least one referenced test case.

| Test type | Objective in this project | Status |
|---|---|---|
| **Unit** | Punctuality classification logic, timezone validations, date helpers | ⚠️ TBD |
| **Contract** | Verify API contracts don't break on schema changes | ⚠️ TBD |
| **Integration** | Full flow submission → PostgreSQL trigger → audit log write (ACID) | ⚠️ TBD |
| **End-to-end (e2e)** | Critical flows: login, submit within/outside window, grading, export log | ⚠️ TBD |

**SDD traceability requirement:** each test must reference the functional requirement ID (RF-XX) or business rule (RN-XXX) it validates.

---

## 9. Spec-Driven Development (SDD)

### Español

Este proyecto aplica **Spec-Driven Development** como metodología de ingeniería obligatoria (indicación del docente del curso Arquitectura y Evolución de Software, URP 2026-I, con uso obligatorio de agentes de inteligencia artificial). SDD establece que la especificación completa y verificable del sistema precede a cualquier implementación.

**Aplicación concreta en SRE-URP:**

1. **Especificación antes que código:** [`claude.md`](claude.md) contiene los 9 módulos, 53 requisitos funcionales (RF-01 a RF-53), 30 reglas de negocio (RN-001 a RN-030), contratos de API con payloads JSON, modelo de dominio completo y 12 escenarios de calidad - todo definido antes de escribir código de producción.

2. **OpenAPI antes que el backend:** Los contratos de las Edge Functions están especificados con request/response completos en `claude.md §10`. La especificación formal en `docs/openapi.yaml` está planificada.

3. **ADRs para decisiones arquitectónicas:** Cada decisión técnica significativa será registrada en `docs/adr/` con contexto, alternativas evaluadas y consecuencias.

4. **Trazabilidad spec→test:** Las pruebas referenciarán directamente los IDs de requisitos (RF-XX, RN-XXX) y contratos de operación definidos en la especificación.

5. **Contratos de operación como postcondiciones verificables:** Cada caso de uso define precondición, flujo y postcondición (ej.: CUS-08 Upload → postcondición: Drive + timestamp + clasificación + audit en transacción única ACID).

---

### English

This project applies **Spec-Driven Development** as the mandatory engineering methodology (as required by the Software Architecture and Evolution course instructor at URP 2026-I, with mandatory use of AI agents). SDD establishes that the complete, verifiable specification of the system precedes any implementation.

**Concrete application in SRE-URP:**

1. **Specification before code:** [`claude.md`](claude.md) contains all 9 modules, 53 functional requirements (RF-01 through RF-53), 30 business rules (RN-001 through RN-030), API contracts with JSON payloads, the complete domain model, and 12 quality scenarios - all defined before any production code.

2. **OpenAPI before the backend:** Edge Function contracts are specified with complete request/response examples in `claude.md §10`. The formal specification in `docs/openapi.yaml` is planned.

3. **ADRs for architectural decisions:** Each significant technical decision will be recorded in `docs/adr/` with context, evaluated alternatives, and consequences.

4. **Spec→test traceability:** Tests will directly reference requirement IDs (RF-XX, RN-XXX) and operation contracts defined in the specification.

5. **Operation contracts as verifiable postconditions:** Each use case defines precondition, flow, and postcondition (e.g., CUS-08 Upload → postcondition: Drive + timestamp + classification + audit in a single ACID transaction).

---

## 10. Equipo / Team

### Grupo 3 - Universidad Ricardo Palma

| Código / ID | Integrante / Member |
|---|---|
| 202311373 | Cordova Chavez, Josue Luis |
| 202310792 | Escobar Coaguila, Alvaro Fernando |
| 202311378 | Minaya Gamarra, Rogelio Luis |
| 202311379 | Pizarro Rojas, Sergio Alexis |
| 202310520 | Rodriguez Bejar, Daniel Andres |
| 202310517 | Silva Garcia, Eduardo Diego |

---

## 11. Contexto Académico / Academic Context

| Campo / Field | Detalle / Detail |
|---|---|
| **Universidad / University** | Universidad Ricardo Palma (URP) |
| **Facultad / Faculty** | Ingeniería — Ingeniería Informática / Engineering — Computer Science |
| **Curso / Course** | Arquitectura y Evolución de Software / Software Architecture and Evolution |
| **Ciclo académico / Academic term** | 2026-I · 7mo ciclo / 7th semester |
| **Tema asignado / Assigned topic** | Sistema de Registro de Entregables en Drive / Drive-based Assignment Submission System |
| **Metodología / Methodology** | Spec-Driven Development (SDD) |
| **Herramientas / Tools** | Agentes de IA: Gemini.ai, claude.ai y antigravity IDE (uso obligatorio a petición del docente) / AI agents (mandatory per instructor) |

---

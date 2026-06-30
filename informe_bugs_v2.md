# Informe de Bugs Críticos — SRE-URP
**Para:** Gemini (Siguiente sesión)  
**Prioridad:** MÁXIMA URGENCIA  
**Fecha:** 30 de junio de 2026  

---

## Resumen de Problemas

| # | Problema | Impacto | Causa Raíz |
|---|---|---|---|
| 1 | El archivo se sube a **Supabase Storage** en lugar de **Google Drive** | CRÍTICO | La Edge Function `upload-delivery` fue modificada en una sesión previa para usar Storage en lugar de Google Drive API |
| 2 | La **nota/calificación NO aparece** en el panel del alumno ni del profesor (a pesar de estar registrada en `revisiones`) | CRÍTICO | El Realtime del alumno escucha cambios en `entregas` (no en `revisiones`). La nota cae en `revisiones` y nunca dispara el re-render |
| 3 | Los **modales de Admin, Profesor y Alumno** presentan errores visuales | MODERADO | Las clases `.modal-overlay` y `.modal-box` no están siendo inyectadas correctamente desde `src/index.css` |

---

## BUG #1 — MÁXIMA PRIORIDAD: Archivos a Google Drive (no a Supabase Storage)

### Diagnóstico
La Edge Function `supabase/functions/upload-delivery/index.ts` actualmente:
1. Sube el archivo a **Supabase Storage** bucket `entregas`
2. Guarda la URL pública de Supabase Storage en `drive_url`

El flujo **correcto y esperado** es:
1. La Edge Function debe autenticarse con la **Google Drive API v3** usando la Service Account
2. Crear (si no existe) la carpeta raíz del proyecto en Drive
3. Crear la subcarpeta del **curso** dentro de la raíz
4. Crear la subcarpeta con el **nombre del alumno** dentro del curso
5. Subir el archivo dentro de esa subcarpeta del alumno
6. Guardar el `drive_url` del enlace de Google Drive (no de Supabase Storage) en la BD

### Credenciales Disponibles en Supabase Secrets
Los siguientes secrets **ya están configurados** en Supabase:
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` = `supabase-drive-bot@sistema-entregables-urp.iam.gserviceaccount.com`
- `GOOGLE_PRIVATE_KEY` = (clave privada RSA ya configurada)
- `GOOGLE_DRIVE_ROOT_FOLDER_ID` = (ID de la carpeta raíz en Drive ya configurada)

La Service Account ya tiene permisos de **Editor** sobre la carpeta raíz de Drive.

### Solución Requerida — Reescribir `supabase/functions/upload-delivery/index.ts`

Reemplazar completamente la sección de almacenamiento (paso 6 en adelante) con la autenticación a Google Drive API y el flujo de subida. El archivo debe:

1. **Obtener un token de acceso** de la Google Drive API autenticando con la Service Account (via JWT):
```typescript
// Construcción del JWT para Google Service Account
const header = { alg: 'RS256', typ: 'JWT' };
const now = Math.floor(Date.now() / 1000);
const claim = {
  iss: Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL'),
  scope: 'https://www.googleapis.com/auth/drive',
  aud: 'https://oauth2.googleapis.com/token',
  exp: now + 3600,
  iat: now,
};
// Firmar con la clave privada usando RS256 (usar crypto.subtle.importKey + sign)
// Luego hacer POST a https://oauth2.googleapis.com/token para obtener access_token
```

2. **Crear o encontrar la subcarpeta del curso** dentro de la carpeta raíz:
```
GET https://www.googleapis.com/drive/v3/files
?q=name='<nombre_curso>' and '<GOOGLE_DRIVE_ROOT_FOLDER_ID>' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false
```
Si no existe, crearla con `POST https://www.googleapis.com/drive/v3/files`.

3. **Crear o encontrar la subcarpeta del alumno** dentro de la carpeta del curso (mismo patrón).

4. **Subir el archivo** dentro de la carpeta del alumno:
```
POST https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart
```

5. **Dar permiso público de lectura** al archivo recién subido:
```
POST https://www.googleapis.com/drive/v3/files/<file_id>/permissions
Body: { "type": "anyone", "role": "reader" }
```

6. **Obtener el enlace de visualización** del archivo: `https://drive.google.com/file/d/<file_id>/view`

7. **Guardar ese enlace** en `drive_url` de la tabla `entregas`.

### Estructura de carpetas esperada en Drive
```
📁 [Carpeta Raíz del Proyecto en Drive]
  └── 📁 [Nombre del Curso] (ej: "Inteligencia Artificial")
        └── 📁 [Nombre del Entregable] (ej: "Prueba_1")
              └── 📁 [Nombre Completo del Alumno] (ej: "Alvaro_Fernando_Escobar_Coaguila")
                    └── 📄 archivo_entregado.pdf
```

> [!CAUTION]
> **NO usar Supabase Storage** bajo ninguna circunstancia para almacenar los archivos de entregas. El bucket `entregas` en Supabase Storage puede limpiarse. Todo debe ir a Google Drive.

---

## BUG #2 — CRÍTICO: La calificación no se muestra en el panel del alumno (ni del profesor)

### Diagnóstico
La causa raíz tiene **dos capas**:

#### Capa 1: El Realtime del alumno está suscrito a la tabla equivocada

En `src/pages/alumno/PanelAlumno.tsx`, línea ~67:
```typescript
// ❌ INCORRECTO: escucha solo cambios en 'entregas'
const entregasSubscription = supabase
  .channel('alumno-dashboard-realtime')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'entregas', filter: `id_alumno=eq.${perfil.id}` },
    () => loadData()
  )
  .subscribe();
```

**Problema:** Cuando el profesor califica, el INSERT va a la tabla `revisiones`, NO a `entregas`. La suscripción del alumno nunca recibe este evento y nunca llama a `loadData()`.

#### Capa 2: El profesor tampoco tiene Realtime para refrescar la vista

En `CalificacionProfesor.tsx`, `handleEvalSuccess` solo llama a `loadGradesData()` de forma síncrona después de guardar, pero esto funciona gracias a que el profesor acaba de hacer la acción. Sin embargo, si otro profesor actualiza, no se refleja.

### Solución Requerida

#### Fix en `src/pages/alumno/PanelAlumno.tsx`

Agregar una **segunda suscripción Realtime** a la tabla `revisiones`. Como la tabla `revisiones` no tiene un campo `id_alumno` directo, se debe suscribir sin filtro específico y dejar que `loadData()` haga el join correcto:

```typescript
useEffect(() => {
  if (!perfil?.id) return;
  
  loadData();

  // Suscripción 1: Cambios en 'entregas' del alumno (nueva entrega, reemplazo)
  const entregasChannel = supabase
    .channel('alumno-entregas-realtime')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'entregas', filter: `id_alumno=eq.${perfil.id}` },
      () => {
        console.log('Realtime: cambio en entregas');
        loadData();
      }
    )
    .subscribe();

  // Suscripción 2: Cambios en 'revisiones' (calificaciones del profesor)
  // No podemos filtrar por id_alumno directamente, así que escuchamos todos los cambios
  // loadData() internamente solo cargará las revisiones del alumno (filtradas por RLS)
  const revisionesChannel = supabase
    .channel('alumno-revisiones-realtime')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'revisiones' },
      () => {
        console.log('Realtime: cambio en revisiones (calificación recibida)');
        loadData();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(entregasChannel);
    supabase.removeChannel(revisionesChannel);
  };
}, [perfil?.id, loadData]);
```

#### Fix en `src/pages/alumno/PanelAlumno.tsx` — Sección "Calificados Recientemente"

Verificar que la sección de calificados (línea ~308-353) muestre el entregable cuando `estado_entrega === 'calificado'`. Revisar el filtro:
```typescript
// Debe ser 'calificado' (no 'Calificado')
const gradedDeliverables = entregables.filter(e => e.estado_entrega === 'calificado');
```

Verificar también que en `entregasService.ts`, función `getEntregablesActivos()` línea ~142-148, el estado se asigna así:
```typescript
if (revision) {
  estado = 'calificado'; // ← debe ser minúsculas
}
```

#### Fix en `src/services/entregasService.ts` — Verificar que revision se lee correctamente

En la query de `getEntregablesActivos`, la relación `revisiones` se hace como join a través de `entregas`. Verificar que el campo `retroalimentacion` (no `comentario`) está siendo mapeado:
```typescript
revision: revision ? {
  id_revision: revision.id_revision,
  nota: ...,
  retroalimentacion: revision.retroalimentacion,  // ← campo correcto en BD
  ...
}
```

La tabla `revisiones` tiene los campos: `nota`, `retroalimentacion` (no `comentario`). Confirmar que ningún lugar del código usa `comentario` para referirse a este campo.

---

## BUG #3 — MODERADO: Errores visuales en modales

### Diagnóstico
Los componentes modales usan las clases CSS `.modal-overlay` y `.modal-box` que deben estar definidas en `src/index.css`. Si los modales aparecen sin estilo o mal posicionados, las clases no están siendo aplicadas.

### Solución Requerida

Verificar que `src/index.css` contenga exactamente estas definiciones (en la sección de `@layer components` o como clases globales después de `@tailwind utilities`):

```css
/* Modal overlay - fondo oscuro superpuesto */
.modal-overlay {
  @apply fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4;
}

/* Modal box - contenedor del modal */
.modal-box {
  @apply bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto;
}
```

Si los modales específicos necesitan tamaños diferentes:
```css
.modal-box-lg {
  @apply bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto;
}

.modal-box-sm {
  @apply bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto;
}
```

---

## Plan de Implementación Sugerido

1. **PASO 1 (URGENTE):** Reescribir `supabase/functions/upload-delivery/index.ts` con la integración de Google Drive API. El código debe usar los secrets ya configurados.

2. **PASO 2 (URGENTE):** Modificar `src/pages/alumno/PanelAlumno.tsx` para agregar la suscripción Realtime a la tabla `revisiones`.

3. **PASO 3:** Verificar y corregir `src/index.css` para que `.modal-overlay` y `.modal-box` estén correctamente definidos.

4. **PASO 4:** Hacer una prueba completa del ciclo: Alumno sube archivo → aparece en Drive → Profesor califica → Alumno ve la nota en tiempo real.

---

## Archivos a Modificar

| Archivo | Modificación |
|---|---|
| `supabase/functions/upload-delivery/index.ts` | Reescribir sección de almacenamiento usando Google Drive API v3 |
| `src/pages/alumno/PanelAlumno.tsx` | Agregar suscripción Realtime a tabla `revisiones` |
| `src/index.css` | Verificar y corregir clases `.modal-overlay` y `.modal-box` |

---

## Contexto Adicional de la Base de Datos

### Esquema de `revisiones`
```
id_revision       UUID
id_entrega        UUID
nota              NUMERIC
retroalimentacion TEXT    ← (NO "comentario")
id_profesor       UUID
fecha_evaluacion  TIMESTAMPTZ
updated_at        TIMESTAMPTZ
modificaciones_count INTEGER
```

### RLS de `revisiones`
- **alumno_read_own_revision (SELECT):** El alumno puede leer revisiones donde `EXISTS (SELECT 1 FROM entregas e WHERE e.id_entrega = revisiones.id_entrega AND e.id_alumno = auth.uid())`
- **alumno_no_write_revision (INSERT):** Solo profesores/administradores pueden insertar
- **profesor_califica (ALL):** El profesor puede operar si `id_profesor = auth.uid()` o tiene relación con el curso

Las políticas RLS son correctas. El problema es únicamente el Realtime del frontend.

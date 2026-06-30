# Diagnóstico y Corrección: Google Drive 403 + Bug Modal UI

**Para:** Gemini  
**Prioridad:** MÁXIMA URGENCIA — Google Drive  
**Fecha:** 30 de junio de 2026  

---

## Error Exacto Observado

```json
{
  "error": {
    "code": 403,
    "message": "Service Accounts do not have storage quota. Leverage shared drives or use OAuth delegation",
    "errors": [
      {
        "message": "Service Accounts do not have storage quota...",
        "domain": "usageLimits",
        "reason": "storageQuotExceeded"
      }
    ]
  }
}
```

**Archivo donde ocurre:** `supabase/functions/upload-delivery/index.ts`  
**Línea exacta:** función `uploadFileToDrive` al hacer `POST https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`

---

## Causa Raíz — Explicación Técnica

Las **Service Accounts de Google NO tienen cuota de almacenamiento personal (My Drive)**. Cuando se llama a la Google Drive API con una Service Account sin el parámetro `supportsAllDrives=true`, la API intenta subir al "My Drive" de la cuenta de servicio, que tiene cuota = 0.

La solución correcta es **una de las siguientes tres opciones**, en orden de prioridad/facilidad:

---

## SOLUCIÓN PRIORITARIA: Opción A — Agregar `supportsAllDrives=true` en TODAS las llamadas a la API

> [!CAUTION]
> Esta es la causa raíz confirmada. TODAS las llamadas a la Google Drive API v3 deben incluir `supportsAllDrives=true` como query parameter. Sin esto, la Service Account intenta operar en su My Drive (sin cuota).

### Cambios en `supabase/functions/upload-delivery/index.ts`

#### 1. Función `findOrCreateFolder` — Agregar `supportsAllDrives=true` en búsqueda y creación

```typescript
async function findOrCreateFolder(token: string, name: string, parentId: string): Promise<string> {
  const q = `mimeType = 'application/vnd.google-apps.folder' and name = '${name.replace(/'/g, "\\'")}' and '${parentId}' in parents and trashed = false`;
  // ✅ Agregar supportsAllDrives=true e includeItemsFromAllDrives=true
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)&supportsAllDrives=true&includeItemsFromAllDrives=true`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error(`Error searching folder ${name}: ${await response.text()}`);
  }

  const data = await response.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }

  // ✅ Agregar supportsAllDrives=true también en la creación
  const createUrl = "https://www.googleapis.com/drive/v3/files?fields=id&supportsAllDrives=true";
  const createResponse = await fetch(createUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    }),
  });

  if (!createResponse.ok) {
    throw new Error(`Error creating folder ${name}: ${await createResponse.text()}`);
  }

  const folder = await createResponse.json();
  return folder.id;
}
```

#### 2. Función `uploadFileToDrive` — Agregar `supportsAllDrives=true`

```typescript
async function uploadFileToDrive(
  token: string,
  fileName: string,
  mimeType: string,
  fileData: ArrayBuffer,
  folderId: string
): Promise<string> {
  const boundary = "foo_bar_baz_boundary";

  const metadata = {
    name: fileName,
    parents: [folderId],
  };

  const parts = [
    `--${boundary}\r\n`,
    `Content-Type: application/json; charset=UTF-8\r\n\r\n`,
    JSON.stringify(metadata),
    `\r\n--${boundary}\r\n`,
    `Content-Type: ${mimeType || "application/octet-stream"}\r\n\r\n`,
    fileData,
    `\r\n--${boundary}--\r\n`
  ];

  const blob = new Blob(parts);

  // ✅ Agregar supportsAllDrives=true aquí también
  const uploadUrl = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink&supportsAllDrives=true";
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body: blob,
  });

  if (!response.ok) {
    throw new Error(`Error uploading file to Drive: ${await response.text()}`);
  }

  const result = await response.json();
  const fileId = result.id;

  // Make the file readable by anyone with the link
  await shareFileWithAnyone(token, fileId);

  return result.webViewLink || `https://drive.google.com/open?id=${fileId}`;
}
```

#### 3. Función `shareFileWithAnyone` — Agregar `supportsAllDrives=true`

```typescript
async function shareFileWithAnyone(token: string, fileId: string): Promise<void> {
  // ✅ Agregar supportsAllDrives=true también en permisos
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}/permissions?supportsAllDrives=true`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      role: "reader",
      type: "anyone",
    }),
  });

  if (!response.ok) {
    console.error(`Warning: Failed to share file ${fileId} with anyone: ${await response.text()}`);
  }
}
```

> [!IMPORTANT]
> Después de modificar el código, hay que **redesplegar la Edge Function** con:
> ```bash
> supabase functions deploy upload-delivery
> ```
> O hacerlo desde el MCP de Supabase con `deploy_edge_function`.

---

## SOLUCIÓN ALTERNATIVA: Opción B — Verificar que `GOOGLE_DRIVE_ROOT_FOLDER_ID` pertenece a una Shared Drive

Si después de agregar `supportsAllDrives=true` el error persiste, el problema puede ser que la carpeta raíz configurada está en "Mi Unidad" personal y no en una "Unidad Compartida" (Shared Drive / Team Drive).

### Verificación en la consola de Google Drive:
1. Abrir Google Drive en el navegador
2. Ir a la carpeta raíz del proyecto
3. Hacer clic derecho → "Obtener enlace"
4. Si la URL contiene `folders/1ABC...`, esa es una carpeta de Mi Unidad
5. Si contiene `drive/folders/1ABC...` dentro de una Unidad Compartida, está bien

### Cómo mover la carpeta a una Shared Drive:
1. Crear una nueva "Unidad compartida" en Google Drive
2. Agregar la Service Account `supabase-drive-bot@sistema-entregables-urp.iam.gserviceaccount.com` como **Administrador** de esa Unidad Compartida
3. Crear la carpeta raíz del proyecto DENTRO de esa Unidad Compartida
4. Copiar el ID de esa nueva carpeta raíz
5. Actualizar el secret `GOOGLE_DRIVE_ROOT_FOLDER_ID` en Supabase con el nuevo ID

> [!WARNING]
> Las Service Accounts únicamente pueden subir archivos a carpetas donde tienen permisos de administrador. Si la carpeta raíz está en "Mi Unidad" personal del propietario, la Service Account NO puede subir aunque sea compartida como "Editor", a menos que el dominio haya configurado delegación de dominio completo.

---

## SOLUCIÓN ALTERNATIVA: Opción C — Domain-Wide Delegation (OAuth Delegation)

Si el proyecto está bajo Google Workspace (Empresa/Universidad), se puede configurar **Domain-Wide Delegation** para que la Service Account actúe en nombre de un usuario real de la organización:

1. En Google Admin Console (`admin.google.com`):
   - Ir a **Seguridad → Control de API → Acceso a la API de Google Workspace**
   - Buscar "Administrar la delegación en todo el dominio"
   - Agregar el **Client ID** de la Service Account con el scope: `https://www.googleapis.com/auth/drive`

2. Modificar el JWT en la Edge Function para incluir el campo `sub` (usuario que se impersona):

```typescript
const payload = {
  iss: clientEmail,
  scope: "https://www.googleapis.com/auth/drive",
  aud: "https://oauth2.googleapis.com/token",
  exp: now + 3600,
  iat: now,
  // ✅ Impersonar al usuario propietario de la carpeta raíz
  sub: "usuario.propietario@dominio.edu.pe",  // Email del usuario real de Workspace
};
```

> [!NOTE]
> Esta opción solo funciona en cuentas de Google Workspace (no cuentas personales de Gmail). Si el Drive del proyecto está en una cuenta personal, esta opción NO aplica.

---

## PRUEBAS UNITARIAS PARA VERIFICAR EL FLUJO — Instrucciones Paso a Paso

Para depurar en qué capa exactamente falla el sistema, ejecutar las siguientes pruebas en orden:

### Test 1: Verificar que el Token de Google se obtiene correctamente

Crear un script temporal de prueba (`supabase/functions/test-drive/index.ts`):

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = { 'Access-Control-Allow-Origin': '*' }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const googleEmail = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL')?.replace(/^["']|["']$/g, '')
    const googleKey = Deno.env.get('GOOGLE_PRIVATE_KEY')?.replace(/^["']|["']$/g, '')?.replace(/\\n/g, '\n')
    const googleRootId = Deno.env.get('GOOGLE_DRIVE_ROOT_FOLDER_ID')?.replace(/^["']|["']$/g, '')

    if (!googleEmail || !googleKey || !googleRootId) {
      return new Response(JSON.stringify({ 
        step: 'secrets_check', 
        status: 'FAIL',
        has_email: !!googleEmail,
        has_key: !!googleKey,
        has_root_id: !!googleRootId
      }), { status: 500, headers: corsHeaders });
    }

    // Paso 1: Obtener token
    const token = await getGoogleAccessToken(googleEmail, googleKey);
    
    // Paso 2: Verificar acceso a la carpeta raíz
    const folderCheckUrl = `https://www.googleapis.com/drive/v3/files/${googleRootId}?supportsAllDrives=true&fields=id,name,driveId`;
    const folderResponse = await fetch(folderCheckUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const folderData = await folderResponse.json();

    return new Response(JSON.stringify({
      step: 'folder_check',
      status: folderResponse.ok ? 'OK' : 'FAIL',
      token_obtained: true,
      folder_info: folderData,
      is_shared_drive: !!folderData.driveId
    }), { 
      status: folderResponse.ok ? 200 : 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ step: 'exception', error: err.message }), {
      status: 500, headers: corsHeaders
    });
  }
})
```

**Cómo correr esta prueba:**
```bash
# Desplegar el endpoint de prueba (sin JWT requerido para facilitar la prueba)
supabase functions deploy test-drive --no-verify-jwt

# Llamar desde la terminal
curl -X POST https://<TU_PROYECTO>.supabase.co/functions/v1/test-drive
```

**Qué debes buscar en la respuesta:**
- `token_obtained: true` → La autenticación JWT con Google funciona ✅
- `is_shared_drive: true` → La carpeta raíz está en una Shared Drive ✅
- `is_shared_drive: false` → La carpeta raíz está en My Drive (causa del error 403) ❌
- `status: 'FAIL'` → Error al acceder a la carpeta raíz, puede ser permisos ❌

---

### Test 2: Verificar que se puede crear una subcarpeta de prueba

```typescript
// Agregar al test-drive/index.ts o ejecutar por separado
const testFolderUrl = `https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id`;
const testFolderResponse = await fetch(testFolderUrl, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    name: `TEST_FOLDER_${Date.now()}`,
    mimeType: "application/vnd.google-apps.folder",
    parents: [googleRootId],
  }),
});

const testFolderData = await testFolderResponse.json();

return new Response(JSON.stringify({
  step: 'folder_creation',
  status: testFolderResponse.ok ? 'OK' : 'FAIL',
  folder_created: testFolderData.id || null,
  error: testFolderResponse.ok ? null : testFolderData,
}), { headers: corsHeaders });
```

**Resultado esperado:**
- Si devuelve `{ folder_created: "1AbC..." }` → La Service Account puede crear carpetas ✅
- Si devuelve `{ "code": 403 }` → La Service Account NO tiene permisos en esa carpeta ❌

---

### Test 3: Verificar subida de un archivo mínimo

```typescript
// Subir un archivo de texto pequeño como prueba
const testContent = new TextEncoder().encode("TEST FILE CONTENT");
const boundary = "test_boundary";
const parts = [
  `--${boundary}\r\n`,
  `Content-Type: application/json; charset=UTF-8\r\n\r\n`,
  JSON.stringify({ name: "test_file.txt", parents: [googleRootId] }),
  `\r\n--${boundary}\r\n`,
  `Content-Type: text/plain\r\n\r\n`,
  testContent,
  `\r\n--${boundary}--\r\n`
];
const blob = new Blob(parts);

const uploadUrl = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink&supportsAllDrives=true";
const uploadResponse = await fetch(uploadUrl, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": `multipart/related; boundary=${boundary}`,
  },
  body: blob,
});

const uploadData = await uploadResponse.json();

return new Response(JSON.stringify({
  step: 'file_upload',
  status: uploadResponse.ok ? 'OK' : 'FAIL',
  file_id: uploadData.id || null,
  web_view_link: uploadData.webViewLink || null,
  error: uploadResponse.ok ? null : uploadData,
}), { headers: corsHeaders });
```

---

### Test 4: Verificar los secretos desde los logs de la Edge Function

Si las pruebas anteriores fallan sin respuesta clara, verificar los logs de la Edge Function en el dashboard de Supabase:

1. Ir a **Supabase Dashboard → Edge Functions → upload-delivery → Logs**
2. Reproducir el error subiendo un archivo desde la interfaz del Alumno
3. Buscar en los logs las líneas que empiecen con `console.error` o `Unexpected error`

También se puede habilitar logging adicional en la Edge Function:

```typescript
// Agregar justo después de obtener las credenciales en la sección 6 del upload-delivery:
console.log('GOOGLE_CREDENTIALS_STATUS:', {
  has_email: !!googleEmail,
  has_key_length: googleKey?.length || 0,
  has_root_id: !!googleRootId,
  root_id_value: googleRootId?.substring(0, 10) + '...' // Solo primeros 10 chars
});
```

---

## Resumen de Todos los Cambios Necesarios

### PASO 1 (OBLIGATORIO): Modificar `supabase/functions/upload-delivery/index.ts`

| Función | Cambio |
|---|---|
| `findOrCreateFolder` — búsqueda | Agregar `&supportsAllDrives=true&includeItemsFromAllDrives=true` a la URL del GET |
| `findOrCreateFolder` — creación | Agregar `&supportsAllDrives=true` a la URL del POST |
| `uploadFileToDrive` | Agregar `&supportsAllDrives=true` a la URL del POST multipart |
| `shareFileWithAnyone` | Agregar `?supportsAllDrives=true` a la URL del POST de permisos |

### PASO 2 (OBLIGATORIO): Redesplegar la Edge Function

Usar el MCP de Supabase con `deploy_edge_function` para la función `upload-delivery`.

### PASO 3 (CONDICIONAL): Verificar el tipo de carpeta raíz

Si después del paso 1 sigue dando 403:
1. Verificar en Google Drive si la carpeta raíz está en "Mi Unidad" o en una "Unidad Compartida"
2. Si está en "Mi Unidad" personal → Crear una Shared Drive (Unidad compartida) y mover todo ahí
3. Agregar la Service Account como Administrador de esa Unidad Compartida
4. Actualizar el secret `GOOGLE_DRIVE_ROOT_FOLDER_ID` en Supabase con el ID de la nueva carpeta raíz en la Shared Drive

---

## Bug Visual: Modal "Crear Entregable" — Descripción Superpuesta

### Causa
Las clases CSS `input-group`, `input-label` y `input-field` que usa el textarea de descripción NO están definidas en `src/index.css`. Esto hace que el elemento flote sin el espacio vertical necesario, superponiéndose con el campo de título.

### Fix ya aplicado (confirmado)
En [ModalCrearEntregable.tsx](file:///c:/Users/Oki/Documents/repos/Academic-Submission-Audit-Dashboard/src/pages/profesor/ModalCrearEntregable.tsx), reemplazar:

```tsx
// ❌ ANTES (clases CSS no definidas)
<div className="input-group">
  <label className="input-label">Descripción / Instrucciones</label>
  <textarea className="input-field min-h-[80px] py-2" ... />
</div>
```

```tsx
// ✅ DESPUÉS (Tailwind directo, bien estructurado)
<div className="flex flex-col w-full text-left">
  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
    Descripción / Instrucciones
  </label>
  <textarea
    className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all duration-200 min-h-[80px] resize-y"
    ...
  />
</div>
```

Lo mismo aplica para el selector de Curso en el mismo modal y el campo de búsqueda en `ModalProrrogaIndividual.tsx`.

---

## Checklist de Verificación Post-Fix

- [ ] Modificar la Edge Function `upload-delivery` con los 4 cambios de `supportsAllDrives=true`
- [ ] Redesplegar la Edge Function
- [ ] (Opcional) Desplegar `test-drive` sin JWT y llamar con `curl` para diagnóstico granular
- [ ] Verificar en los logs de Supabase que no aparece el error 403
- [ ] Subir un archivo desde la interfaz del Alumno y verificar que aparece en Google Drive
- [ ] Verificar que la carpeta se crea con la estructura: `Raíz / Curso / Entregable / Alumno / archivo`
- [ ] Eliminar la Edge Function `test-drive` después de confirmar el fix

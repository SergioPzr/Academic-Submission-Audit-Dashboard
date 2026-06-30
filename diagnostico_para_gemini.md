# Diagnóstico de Errores — SRE-URP para Gemini

> **Proyecto:** Academic Submission Audit Dashboard  
> **Supabase Project:** `myqxeogfveuicrwaahfa`  
> **Stack:** React + TypeScript + Vite + Supabase (PostgreSQL + Auth + Realtime)  
> **Dashboard:** https://supabase.com/dashboard/project/myqxeogfveuicrwaahfa

---

## Resumen Ejecutivo del Problema

El sistema tiene **3 problemas activos** que impiden el acceso completo:

1. **Recursión infinita en RLS de `matriculas`** → causa todos los 500 en `usuarios` y `cursos`
2. **`cursos` inaccessible para usuarios anónimos** → falla en la página de login
3. **Login con email/password devuelve 500** → probable causa relacionada con RLS

---

## Error Exacto en Consola del Navegador

```
GET https://myqxeogfveuicrwaahfa.supabase.co/rest/v1/usuarios?select=*%2Croles%28nombre%29&id=eq.<UUID>
500 (Internal Server Error)

Error fetching user profile: {
  code: '42P17',
  details: null,
  hint: null,
  message: 'infinite recursion detected in policy for relation "matriculas"'
}
```

```
HEAD https://myqxeogfveuicrwaahfa.supabase.co/rest/v1/cursos?select=*
500 (Internal Server Error)
```

---

## Diagnóstico Técnico Detallado

### La Cadena de Recursión Infinita

El error `42P17` ocurre porque las RLS policies crean un ciclo:

```
Query: usuarios WHERE id = X
  → evalúa policy "profesor_read_matriculados" en usuarios
    → EXISTS (SELECT 1 FROM matriculas m JOIN cursos c WHERE ...)
      → evalúa RLS policies de matriculas
        → policy de matriculas llama get_user_role()
          → get_user_role() hace SELECT FROM usuarios JOIN roles WHERE id = auth.uid()
            → evalúa RLS policies de usuarios DE NUEVO
              → evalúa "profesor_read_matriculados" DE NUEVO
                → EXISTS (SELECT 1 FROM matriculas ...) ← BUCLE INFINITO
```

**PostgreSQL detecta el ciclo y lanza `42P17`.**

### Estado Actual de las RLS Policies Relevantes

#### Tabla `usuarios` (RLS habilitado)

```sql
-- Policy 1: self_read_usuario (segura, no recursiva)
CREATE POLICY "self_read_usuario" ON public.usuarios
  FOR SELECT USING (id = auth.uid());

-- Policy 2: admin_full_usuarios (problemática si get_user_role() causa recursión)
CREATE POLICY "admin_full_usuarios" ON public.usuarios
  FOR ALL USING (get_user_role() = 'administrador');

-- Policy 3: profesor_read_matriculados (ORIGEN DEL PROBLEMA)
-- Esta policy hace EXISTS (FROM matriculas) que dispara RLS de matriculas
CREATE POLICY "profesor_read_matriculados" ON public.usuarios
  FOR SELECT USING (
    get_user_role() = 'profesor' AND
    EXISTS (
      SELECT 1 FROM matriculas m
      JOIN cursos c ON c.id_curso = m.id_curso
      WHERE m.id_alumno = usuarios.id AND c.id_profesor = auth.uid()
    )
  );
```

#### Función `get_user_role()` (ya corregida con SECURITY DEFINER)

```sql
-- Esta función YA fue marcada SECURITY DEFINER en la sesión anterior
-- pero el problema persiste porque la policy "profesor_read_matriculados"
-- llama a matriculas en su EXISTS subquery
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.nombre FROM usuarios u
  JOIN roles r ON r.id_rol = u.id_rol
  WHERE u.id = auth.uid()
$$;
```

#### Tabla `matriculas` (RLS habilitado, estructura desconocida)

Las policies de `matriculas` también llaman `get_user_role()` o hacen subqueries a `usuarios`, completando el ciclo.

---

## Las 3 Soluciones Necesarias

### Solución 1 — Romper la recursión en `usuarios`

La policy `profesor_read_matriculados` no debería existir en `usuarios`. Un profesor no necesita ver los registros de *otros* usuarios a través de la tabla `usuarios`. En cambio, debe consultar directamente su lista de alumnos cuando lo necesite desde la UI.

**Acción:** Eliminar la policy recursiva y reemplazarla por una que no haga subquery a `matriculas`:

```sql
-- Eliminar la policy problemática
DROP POLICY IF EXISTS "profesor_read_matriculados" ON public.usuarios;

-- Reemplazar por una policy simple: profesores pueden ver todos los usuarios
-- (Las RLS de otras tablas controlan qué datos ven realmente)
CREATE POLICY "profesor_read_usuarios" ON public.usuarios
  FOR SELECT
  USING (get_user_role() IN ('profesor', 'administrador') OR id = auth.uid());
```

### Solución 2 — Corregir las RLS policies de `matriculas`

Cualquier policy en `matriculas` que llame a `get_user_role()` o que haga subquery a `usuarios` debe ser reescrita con `SECURITY DEFINER` o simplificada.

**Primero, ver las policies actuales de matriculas:**

```sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'matriculas';
```

**Luego reescribirlas para romper el ciclo.** Ejemplo de pattern seguro:

```sql
-- En lugar de llamar get_user_role() dentro de la policy de matriculas,
-- usar auth.uid() directamente:
DROP POLICY IF EXISTS "<nombre_policy_actual>" ON public.matriculas;

CREATE POLICY "alumno_read_own_matriculas" ON public.matriculas
  FOR SELECT USING (id_alumno = auth.uid());

CREATE POLICY "profesor_read_matriculas_curso" ON public.matriculas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cursos c
      WHERE c.id_curso = matriculas.id_curso
        AND c.id_profesor = auth.uid()
    )
  );

CREATE POLICY "admin_all_matriculas" ON public.matriculas
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      JOIN roles r ON r.id_rol = u.id_rol
      WHERE u.id = auth.uid() AND r.nombre = 'administrador'
    )
  );
```

> [!IMPORTANT]
> El patrón `EXISTS (SELECT 1 FROM usuarios ...)` dentro de la policy de `matriculas` puede reproducir el ciclo si `usuarios` tiene una policy que vuelve a `matriculas`. Asegúrate de que ninguna policy de `usuarios` haga referencia a `matriculas` en su USING clause.

### Solución 3 — Permitir acceso anónimo a conteos de `cursos` y `entregas`

La página de Login (`Login.tsx`) consulta el conteo de `cursos` y `entregas` para mostrar estadísticas. Lo hace sin sesión de usuario (como rol `anon`). La RLS actual bloquea esto.

```sql
-- Verificar si ya existe (fue creada en la sesión anterior)
SELECT policyname FROM pg_policies 
WHERE tablename = 'cursos' AND policyname = 'anon_count_cursos';

-- Si no existe, crearla:
CREATE POLICY "anon_count_cursos" ON public.cursos
  FOR SELECT TO anon USING (true);

CREATE POLICY "anon_count_entregas" ON public.entregas
  FOR SELECT TO anon USING (true);
```

---

## Estado de los Usuarios de Prueba

Todos los usuarios ya existen correctamente en `auth.users` con `created_at`, `updated_at`, `email_confirmed_at` no nulos, y con registros en `auth.identities`:

| Email | UUID | Rol en `public.usuarios` |
|---|---|---|
| `202311379@urp.edu.pe` | `226543f6-47bc-4422-b1e0-db57009e0daf` | alumno |
| `profesor@urp.edu.pe` | `1ad28797-d727-4459-8fb5-81d4a8082ea2` | profesor |
| `admin@urp.edu.pe` | `45c8bf0a-3cdd-4349-9f3e-624c56315f1e` | administrador |

**Credenciales de email/password:**
- Profesor: `profesor@urp.edu.pe` / `ProfesorURP2024!`
- Admin: `admin@urp.edu.pe` / `AdminURP2024!`
- Alumno: login con Google OAuth (`202311379@urp.edu.pe`)

---

## Archivo a Revisar en el Código

La query que falla está en:

**[useAuth.tsx](file:///c:/Users/Oki/Documents/repos/Academic-Submission-Audit-Dashboard/src/hooks/useAuth.tsx)** — línea 38-42:

```typescript
const { data, error } = await supabase
  .from('usuarios')
  .select('*, roles(nombre)')  // Este join dispara la recursión
  .eq('id', userId)
  .single();
```

Esta query es correcta en sí misma. El problema es exclusivamente en las RLS policies del lado de Supabase.

---

## Plan de Acción para Gemini (en orden)

1. **Ejecutar diagnóstico completo de policies:**
   ```sql
   SELECT tablename, policyname, cmd, roles, qual
   FROM pg_policies
   WHERE tablename IN ('usuarios', 'cursos', 'matriculas', 'entregas', 'revisiones')
   ORDER BY tablename, policyname;
   ```

2. **Eliminar la policy `profesor_read_matriculados` de `usuarios`** y reemplazarla con la versión segura (sin subquery a `matriculas`).

3. **Revisar y reescribir las RLS policies de `matriculas`** para que no formen ciclo con `usuarios`.

4. **Verificar la policy `anon_count_cursos`** en `cursos` y crearla si no existe.

5. **Hacer test de verificación:**
   ```sql
   -- Debe retornar el perfil del alumno sin errores
   SELECT id, email, id_rol FROM public.usuarios 
   WHERE id = '226543f6-47bc-4422-b1e0-db57009e0daf';

   -- Debe retornar datos sin error 500
   SELECT COUNT(*) FROM public.cursos;
   ```

6. **Probar login en `http://localhost:5173`** con las credenciales de prueba.

---

## Notas Adicionales

- El proyecto usa **React + Vite en `localhost:5173`** (dev server corriendo).
- La página recarga al tablear por un bug de UX del componente Login — es independiente de los 500 y puede ignorarse por ahora.
- Google OAuth ya está configurado en Supabase y el callback en Google Cloud Console apunta a `https://myqxeogfveuicrwaahfa.supabase.co/auth/v1/callback`. Una vez que el error 500 en `usuarios` se resuelva, el login con Google también funcionará porque el alumno ya tiene un perfil válido.
- El código fuente del proyecto está en `c:\Users\Oki\Documents\repos\Academic-Submission-Audit-Dashboard`.

import { useCallback, useEffect, useRef, useState } from "react";

const RESYNC_INTERVAL_MS = 5 * 60 * 1000; // re-sincroniza cada 5 min

/**
 * MOCK de hora del servidor.
 * Fase C: reemplazar por una llamada real, por ejemplo:
 *   const res = await fetch(`${SUPABASE_URL}/functions/v1/server-time`);
 *   const { now } = await res.json();
 *   return new Date(now);
 * o leer el header `Date` de cualquier respuesta autenticada de Supabase.
 */
async function fetchServerTimeMock(): Promise<Date> {
  // Simula un pequeño desfase real de red/reloj para probar que el offset funciona.
  const simulatedDriftMs = 4000;
  return new Promise((resolve) => {
    setTimeout(() => resolve(new Date(Date.now() + simulatedDriftMs)), 150);
  });
}

/**
 * Hook que mantiene un `offset` entre la hora del servidor y la hora local.
 * El contador (useCountdown) debe usar siempre `getServerNow()`, nunca
 * `new Date()` directo, para que el alumno no pueda manipular su reloj local.
 *
 * NO usar este hook directamente en componentes de UI: usarlo a través de
 * <ServerTimeProvider> + useServerTime() (ver providers/ServerTimeProvider.tsx)
 * para que toda la app comparta una sola sincronización.
 */
export function useServerTimeSync() {
  const [offsetMs, setOffsetMs] = useState(0);
  const [synced, setSynced] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sync = useCallback(async () => {
    const before = Date.now();
    const serverNow = await fetchServerTimeMock();
    const after = Date.now();
    // Corrige la latencia de ida/vuelta usando el punto medio.
    const roundTrip = after - before;
    const localAtServerSample = before + roundTrip / 2;
    setOffsetMs(serverNow.getTime() - localAtServerSample);
    setSynced(true);
  }, []);

  useEffect(() => {
    sync();
    intervalRef.current = setInterval(sync, RESYNC_INTERVAL_MS);

    // Re-sincroniza si el alumno vuelve a la pestaña (pudo cambiar la hora local mientras estaba fuera)
    const onVisibility = () => {
      if (document.visibilityState === "visible") sync();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [sync]);

  const getServerNow = useCallback(() => new Date(Date.now() + offsetMs), [offsetMs]);

  return { getServerNow, synced };
}

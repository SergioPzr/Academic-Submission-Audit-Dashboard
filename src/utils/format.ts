export function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function fmtDate(d?: Date | null): string {
  if (!d) return "—";
  return d.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fmtTimestamp(d?: Date | null): string {
  if (!d) return "—";
  return (
    d.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" }) +
    " " +
    d.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  );
}

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  done: boolean;
}

/**
 * Convierte una diferencia en milisegundos a Días/Horas/Min/Seg.
 * `ms` debe calcularse SIEMPRE contra la hora del servidor (ver useServerTime),
 * nunca contra Date.now() puro, para que el alumno no pueda adelantar/atrasar
 * su reloj local y ganar tiempo.
 */
export function msToCountdown(ms: number): CountdownParts {
  if (ms <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true };
  let totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  totalSeconds %= 86400;
  const hours = Math.floor(totalSeconds / 3600);
  totalSeconds %= 3600;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds, done: false };
}

export function formatCountdown(parts: CountdownParts): string {
  if (parts.done) return "00:00:00:00";
  return `${pad(parts.days)}:${pad(parts.hours)}:${pad(parts.minutes)}:${pad(parts.seconds)}`;
}

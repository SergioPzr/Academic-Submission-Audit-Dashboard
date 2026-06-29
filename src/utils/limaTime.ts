export function toLimaTime(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleDateString('es-PE', {
    timeZone: 'America/Lima',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function toLimaTimestamp(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  const d = new Date(isoString);
  return (
    d.toLocaleDateString('es-PE', {
      timeZone: 'America/Lima',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }) +
    ' ' +
    d.toLocaleTimeString('es-PE', {
      timeZone: 'America/Lima',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  );
}

export function toLimaISO(date: Date): string {
  const offset = date.getTimezoneOffset();
  const limaOffset = -300;
  const diff = limaOffset + offset;
  const limaDate = new Date(date.getTime() + diff * 60000);
  return limaDate.toISOString().slice(0, 16);
}

export function getLimaNow(): Date {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const limaOffset = -300;
  const diff = limaOffset + offset;
  return new Date(now.getTime() + diff * 60000);
}

export function msToCountdown(ms: number) {
  if (ms <= 0) return { d: 0, h: 0, m: 0, s: 0, done: true };
  let s = Math.floor(ms / 1000);
  let m = Math.floor(s / 60);
  s %= 60;
  let h = Math.floor(m / 60);
  m %= 60;
  let d = Math.floor(h / 24);
  h %= 24;
  return { d, h, m, s, done: false };
}

export function pad(n: number): string {
  return String(n).padStart(2, '0');
}

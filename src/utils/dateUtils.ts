/**
 * Formats a given date/time string or Date object into the America/Lima (UTC-5) timezone.
 */
export function formatInLimaTimezone(
  dateInput: string | Date | number | null | undefined,
  formatStr: 'full' | 'date' | 'time' = 'full'
): string {
  if (!dateInput) return '--/--/---- --:--:--';
  const date = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  
  try {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    };

    const formatter = new Intl.DateTimeFormat('es-PE', options);
    const parts = formatter.formatToParts(date);
    const partMap = new Map(parts.map(p => [p.type, p.value]));
    
    const day = partMap.get('day') || '00';
    const month = partMap.get('month') || '00';
    const year = partMap.get('year') || '0000';
    const hour = partMap.get('hour') || '00';
    const minute = partMap.get('minute') || '00';
    const second = partMap.get('second') || '00';

    if (formatStr === 'date') {
      return `${day}/${month}/${year}`;
    }
    if (formatStr === 'time') {
      return `${hour}:${minute}:${second}`;
    }
    return `${day}/${month}/${year} ${hour}:${minute}:${second}`;
  } catch (err) {
    console.error('Error formatting date in Lima timezone:', err);
    return date.toLocaleString();
  }
}

/**
 * Formats a file size in bytes to a human-readable string (KB, MB, GB).
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

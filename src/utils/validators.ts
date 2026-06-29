export function validateDomain(email: string): boolean {
  return email.endsWith('@urp.edu.pe');
}

export function validateGrade(grade: number): string | null {
  if (isNaN(grade)) return 'La nota es obligatoria.';
  if (grade < 0 || grade > 20) return 'La nota debe estar entre 0 y 20.';
  return null;
}

export function validateVentanaDates(apertura: string, cierre: string): string | null {
  if (!apertura || !cierre) return 'Ambas fechas son obligatorias.';
  if (new Date(apertura) >= new Date(cierre))
    return 'La fecha de cierre debe ser posterior a la fecha de apertura.';
  return null;
}

export function validateDriveUrl(url: string): boolean {
  return url.startsWith('https://drive.google.com/') || url.startsWith('https://docs.google.com/');
}

export function validateRequired(value: string, fieldName: string): string | null {
  if (!value || !value.trim()) return `${fieldName} es obligatorio.`;
  return null;
}

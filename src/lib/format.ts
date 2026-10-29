import { TIMEZONE } from './constants';

export function ticketNo(id: number): string {
  return `HO-${String(id).padStart(3, '0')}`;
}

/** Accepts "HO-012", "ho12" or "12"; returns the numeric id or null. */
export function parseTicketNo(input: string): number | null {
  const m = input.trim().match(/^(?:ho-?)?0*(\d+)$/i);
  return m ? Number(m[1]) : null;
}

export function fmtDateTime(value: string | Date | null): string {
  if (!value) return '';
  return new Date(value).toLocaleString('en-IN', {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function fmtDate(value: string | Date | null): string {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-IN', { timeZone: TIMEZONE, day: '2-digit', month: 'short' });
}

export function fmtHours(hours: number | null): string {
  if (hours == null || Number.isNaN(hours)) return '–';
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 48) return `${hours.toFixed(1)} hrs`;
  return `${(hours / 24).toFixed(1)} days`;
}

export function ageInDays(value: string | Date): number {
  return Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000);
}

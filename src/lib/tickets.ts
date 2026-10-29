import { TZ_OFFSET } from './constants';
import { execute, query } from './db';
import { parseTicketNo } from './format';
import type { HistoryEntry, Role, Ticket } from './types';

export async function getTicket(id: number): Promise<Ticket | null> {
  const rows = await query<Ticket>('SELECT * FROM tickets WHERE id = ?', [id]);
  return rows[0] ?? null;
}

export async function getHistory(ticketId: number): Promise<HistoryEntry[]> {
  return query<HistoryEntry>('SELECT * FROM ticket_history WHERE ticket_id = ? ORDER BY created_at, id', [ticketId]);
}

export async function addHistory(
  ticketId: number,
  action: string,
  fromStatus: string | null,
  toStatus: string | null,
  note: string | null,
  doneBy: string,
): Promise<void> {
  await execute(
    'INSERT INTO ticket_history (ticket_id, action, from_status, to_status, note, done_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [ticketId, action, fromStatus, toStatus, note, doneBy, new Date()],
  );
}

export async function notify(role: Role, ticketId: number, message: string): Promise<void> {
  await execute('INSERT INTO notifications (role, ticket_id, message, is_read, created_at) VALUES (?, ?, ?, 0, ?)', [
    role,
    ticketId,
    message.slice(0, 300),
    new Date(),
  ]);
}

/**
 * Builds a WHERE clause from list filters shared by the ticket list and Excel export.
 * scope: complaints (everything except suggestions) | suggestions | all
 * status: active (not closed) | all | a specific status
 */
export function buildTicketFilter(params: URLSearchParams): { where: string; args: unknown[] } {
  const clauses: string[] = [];
  const args: unknown[] = [];

  const scope = params.get('scope') || 'all';
  if (scope === 'complaints') clauses.push("type <> 'Suggestion'");
  if (scope === 'suggestions') clauses.push("type = 'Suggestion'");

  const status = params.get('status') || 'all';
  if (status === 'active') clauses.push("status <> 'Closed'");
  else if (status !== 'all') {
    clauses.push('status = ?');
    args.push(status);
  }

  for (const [param, column] of [
    ['floor', 'floor'],
    ['category', 'category'],
    ['type', 'type'],
  ] as const) {
    const v = params.get(param);
    if (v) {
      clauses.push(`${column} = ?`);
      args.push(v);
    }
  }

  const assigned = params.get('assigned');
  if (assigned === '__none') clauses.push('assigned_to IS NULL');
  else if (assigned) {
    clauses.push('assigned_to = ?');
    args.push(assigned);
  }

  // Dates are picked in IST (YYYY-MM-DD) and compared against UTC timestamps.
  const from = params.get('from');
  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
    clauses.push('created_at >= ?');
    args.push(new Date(`${from}T00:00:00${TZ_OFFSET}`));
  }
  const to = params.get('to');
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
    clauses.push('created_at <= ?');
    args.push(new Date(`${to}T23:59:59.999${TZ_OFFSET}`));
  }

  const q = params.get('q')?.trim();
  if (q) {
    const id = parseTicketNo(q);
    if (id) {
      clauses.push('id = ?');
      args.push(id);
    } else {
      const like = `%${q}%`;
      clauses.push('(description LIKE ? OR area LIKE ? OR location_detail LIKE ? OR employee_name LIKE ?)');
      args.push(like, like, like, like);
    }
  }

  return { where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', args };
}

// Unresolved first (Open, Pending, In Progress), newest first within each group.
export const TICKET_ORDER =
  "ORDER BY FIELD(status, 'Open', 'Pending', 'In Progress', 'Closed'), created_at DESC";

import { execute, query } from '@/lib/db';
import { ticketNo } from '@/lib/format';
import { badRequest, serverError, str } from '@/lib/http';
import { addHistory, notify } from '@/lib/tickets';
import type { Ticket } from '@/lib/types';

/** Employee reopens a closed complaint using the private link from the closure email. */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const [ticket] = await query<Ticket>('SELECT * FROM tickets WHERE reopen_token = ?', [token]);
    if (!ticket || ticket.type === 'Suggestion') return badRequest('Ticket not found.', 404);
    if (ticket.status !== 'Closed') return badRequest('This ticket is already open and being worked on.');

    const body = await req.json().catch(() => ({}));
    const comment = str(body.comment, 1000);
    if (!comment) return badRequest('Please tell us what is still not resolved.');

    const res = await execute(
      `UPDATE tickets SET status = 'Open', reopen_count = reopen_count + 1, attended_by = NULL, action_taken = NULL,
         closed_by = NULL, closed_at = NULL, updated_at = ? WHERE id = ? AND status = 'Closed'`,
      [new Date(), ticket.id],
    );
    if (res.affectedRows === 0) return badRequest('This ticket is already open and being worked on.');

    await addHistory(ticket.id, 'Reopened', 'Closed', 'Open', comment, ticket.employee_name);
    await notify('supervisor', ticket.id, `Reopened ${ticketNo(ticket.id)} by ${ticket.employee_name}: ${comment}`);

    return Response.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}

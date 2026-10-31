import { ADMIN_NAME, denyUnless, SUPERVISOR_NAME } from '@/lib/auth';
import { execute } from '@/lib/db';
import { ticketNo } from '@/lib/format';
import { badRequest, appUrl, serverError, str } from '@/lib/http';
import { closedEmail, sendMail } from '@/lib/mail';
import { addHistory, getHistory, getTicket, notify } from '@/lib/tickets';
import type { Role } from '@/lib/types';

type Action = 'assign' | 'pending' | 'close';

/**
 * Who may do what:
 * - Complaints / requirements: supervisor assigns, marks pending and closes; HR & Admin may mark pending.
 * - Suggestions: HR & Admin marks pending and closes.
 * Closing a complaint requires the attending staff member.
 */
const ALLOWED: Record<'complaint' | 'suggestion', Record<Role, Action[]>> = {
  complaint: { supervisor: ['assign', 'pending', 'close'], admin: ['pending'] },
  suggestion: { supervisor: [], admin: ['pending', 'close'] },
};

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = Number((await params).id);
    const ticket = await getTicket(id);
    if (!ticket) return badRequest('Ticket not found.', 404);

    const body = await req.json().catch(() => ({}));
    const role: Role = body.role === 'admin' ? 'admin' : 'supervisor';
    const action = str(body.action) as Action;
    const isSuggestion = ticket.type === 'Suggestion';

    const denied = await denyUnless(role);
    if (denied) return denied;
    if (!ALLOWED[isSuggestion ? 'suggestion' : 'complaint'][role].includes(action)) {
      return badRequest('You are not allowed to do this on this ticket.', 403);
    }
    if (ticket.status === 'Closed') return badRequest('This ticket is already closed.');

    const actor = role === 'admin' ? ADMIN_NAME : SUPERVISOR_NAME;
    const now = new Date();

    if (action === 'assign') {
      const staff = str(body.staff, 100);
      if (!staff) return badRequest('Please choose a staff member.');
      await execute(
        "UPDATE tickets SET status = 'In Progress', assigned_to = ?, pending_reason = NULL, updated_at = ? WHERE id = ?",
        [staff, now, id],
      );
      await addHistory(id, ticket.assigned_to ? 'Reassigned' : 'Assigned', ticket.status, 'In Progress', `Assigned to ${staff}`, actor);
    } else if (action === 'pending') {
      const reason = str(body.reason, 500) || null;
      await execute("UPDATE tickets SET status = 'Pending', pending_reason = ?, updated_at = ? WHERE id = ?", [reason, now, id]);
      await addHistory(id, 'Marked Pending', ticket.status, 'Pending', reason, actor);
      if (role === 'admin' && !isSuggestion) {
        await notify('supervisor', id, `${ADMIN_NAME} marked ${ticketNo(id)} as Pending${reason ? `: ${reason}` : ''}`);
      }
    } else {
      const attendedBy = str(body.attendedBy, 100);
      const actionTaken = str(body.actionTaken, 2000) || null;
      if (!isSuggestion && !attendedBy) return badRequest('Name of the staff member who attended is mandatory to close.');

      const res = await execute(
        `UPDATE tickets SET status = 'Closed', attended_by = ?, action_taken = ?, closed_by = ?, closed_at = ?,
           pending_reason = NULL, updated_at = ? WHERE id = ? AND status <> 'Closed'`,
        [attendedBy || null, actionTaken, actor, now, now, id],
      );
      if (res.affectedRows === 0) return badRequest('This ticket is already closed.');
      const note = [attendedBy && `Attended by ${attendedBy}.`, actionTaken].filter(Boolean).join(' ') || null;
      await addHistory(id, 'Closed', ticket.status, 'Closed', note, actor);

      const closed = await getTicket(id);
      if (closed) {
        const reopenUrl = isSuggestion ? null : `${appUrl(req)}/reopen/${closed.reopen_token}`;
        const mail = closedEmail(closed, reopenUrl);
        await sendMail(closed.employee_email, mail.subject, mail.html);
      }
    }

    return Response.json({ ticket: await getTicket(id), history: await getHistory(id) });
  } catch (err) {
    return serverError(err);
  }
}

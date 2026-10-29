import { ADMIN_NAME, denyUnless, SUPERVISOR_NAME } from '@/lib/auth';
import { execute } from '@/lib/db';
import { badRequest, appUrl, serverError, str } from '@/lib/http';
import { closedEmail, sendMail } from '@/lib/mail';
import { addHistory, getHistory, getTicket } from '@/lib/tickets';

/**
 * Supervisor actions on complaints/requirements: assign, pending, close.
 * HR & Admin performs the same actions on suggestions.
 * Only these two roles can close; closure requires attending staff + action taken.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = Number((await params).id);
    const ticket = await getTicket(id);
    if (!ticket) return badRequest('Ticket not found.', 404);

    const isSuggestion = ticket.type === 'Suggestion';
    const denied = await denyUnless(isSuggestion ? 'admin' : 'supervisor');
    if (denied) return denied;
    const actor = isSuggestion ? ADMIN_NAME : SUPERVISOR_NAME;

    if (ticket.status === 'Closed') return badRequest('This ticket is already closed.');

    const body = await req.json().catch(() => ({}));
    const action = str(body.action);
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
      const reason = str(body.reason, 500);
      if (!reason) return badRequest('Reason for pendency is mandatory.');
      await execute("UPDATE tickets SET status = 'Pending', pending_reason = ?, updated_at = ? WHERE id = ?", [reason, now, id]);
      await addHistory(id, 'Marked Pending', ticket.status, 'Pending', reason, actor);
    } else if (action === 'close') {
      const attendedBy = str(body.attendedBy, 100);
      const actionTaken = str(body.actionTaken, 2000);
      if (!isSuggestion && !attendedBy) return badRequest('Name of the staff member who attended is mandatory to close.');
      if (!actionTaken) return badRequest(isSuggestion ? 'Review remarks are mandatory to close.' : 'Action taken is mandatory to close.');

      const res = await execute(
        `UPDATE tickets SET status = 'Closed', attended_by = ?, action_taken = ?, closed_by = ?, closed_at = ?,
           pending_reason = NULL, updated_at = ? WHERE id = ? AND status <> 'Closed'`,
        [attendedBy || null, actionTaken, actor, now, now, id],
      );
      if (res.affectedRows === 0) return badRequest('This ticket is already closed.');
      await addHistory(
        id,
        'Closed',
        ticket.status,
        'Closed',
        attendedBy ? `Attended by ${attendedBy}. ${actionTaken}` : actionTaken,
        actor,
      );

      const closed = await getTicket(id);
      if (closed) {
        const reopenUrl = isSuggestion ? null : `${appUrl(req)}/reopen/${closed.reopen_token}`;
        const mail = closedEmail(closed, reopenUrl);
        await sendMail(closed.employee_email, mail.subject, mail.html);
      }
    } else {
      return badRequest('Unknown action.');
    }

    return Response.json({ ticket: await getTicket(id), history: await getHistory(id) });
  } catch (err) {
    return serverError(err);
  }
}

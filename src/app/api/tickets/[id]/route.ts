import { denyUnless } from '@/lib/auth';
import { badRequest, serverError } from '@/lib/http';
import { getHistory, getTicket } from '@/lib/tickets';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await denyUnless('supervisor', 'admin');
  if (denied) return denied;
  try {
    const id = Number((await params).id);
    const ticket = await getTicket(id);
    if (!ticket) return badRequest('Ticket not found.', 404);
    return Response.json({ ticket, history: await getHistory(id) });
  } catch (err) {
    return serverError(err);
  }
}

import { randomBytes } from 'node:crypto';
import { AREAS, CATEGORY_NAMES, FLOORS, TICKET_TYPES } from '@/lib/constants';
import { denyUnless } from '@/lib/auth';
import { execute, query } from '@/lib/db';
import { ticketNo } from '@/lib/format';
import { badRequest, serverError, str } from '@/lib/http';
import { registeredEmail, sendMail } from '@/lib/mail';
import { savePhoto } from '@/lib/storage';
import { addHistory, buildTicketFilter, getTicket, notify, TICKET_ORDER } from '@/lib/tickets';
import type { Ticket } from '@/lib/types';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Employee registers a complaint / requirement / suggestion. Open to everyone. */
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const type = str(form.get('type'));
    const floor = str(form.get('floor'));
    const area = str(form.get('area'));
    const locationDetail = str(form.get('locationDetail'), 150) || null;
    const category = str(form.get('category'));
    const description = str(form.get('description'), 2000);
    const name = str(form.get('name'), 100);
    const email = str(form.get('email'), 150).toLowerCase();

    if (!(TICKET_TYPES as readonly string[]).includes(type)) return badRequest('Please choose a type.');
    if (!(FLOORS as readonly string[]).includes(floor)) return badRequest('Please choose a floor.');
    if (!(AREAS as readonly string[]).includes(area)) return badRequest('Please choose an area.');
    if (!CATEGORY_NAMES.includes(category)) return badRequest('Please choose a category.');
    if (description.length < 3) return badRequest('Please describe the issue.');
    if (name.length < 2) return badRequest('Please enter your name.');
    if (!EMAIL_RE.test(email)) return badRequest('Please enter a valid email address.');

    let photoUrl: string | null = null;
    const photo = form.get('photo');
    if (photo instanceof File && photo.size > 0) {
      if (!photo.type.startsWith('image/')) return badRequest('The attachment must be an image.');
      if (photo.size > MAX_PHOTO_BYTES) return badRequest('The photo is too large (max 5 MB).');
      photoUrl = await savePhoto(photo);
    }

    const now = new Date();
    const result = await execute(
      `INSERT INTO tickets (type, floor, area, location_detail, category, description, photo_url,
         employee_name, employee_email, status, reopen_token, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Open', ?, ?, ?)`,
      [type, floor, area, locationDetail, category, description, photoUrl, name, email,
        randomBytes(16).toString('hex'), now, now],
    );
    const id = result.insertId;
    const no = ticketNo(id);

    await addHistory(id, 'Registered', null, 'Open', null, name);
    await notify(
      type === 'Suggestion' ? 'admin' : 'supervisor',
      id,
      `New ${type.toLowerCase()} ${no}: ${category} – ${floor}, ${area}`,
    );

    const ticket = await getTicket(id);
    if (ticket) {
      const mail = registeredEmail(ticket);
      await sendMail(email, mail.subject, mail.html);
    }

    return Response.json({ ticketNo: no });
  } catch (err) {
    return serverError(err);
  }
}

/** Ticket list with filters, plus status counts for the same scope. Supervisor / admin only. */
export async function GET(req: Request) {
  const denied = await denyUnless('supervisor', 'admin');
  if (denied) return denied;
  try {
    const params = new URL(req.url).searchParams;
    const { where, args } = buildTicketFilter(params);
    const tickets = await query<Ticket>(`SELECT * FROM tickets ${where} ${TICKET_ORDER} LIMIT 500`, args);

    const scopeOnly = buildTicketFilter(new URLSearchParams({ scope: params.get('scope') || 'all' }));
    const countRows = await query<{ status: string; n: number }>(
      `SELECT status, COUNT(*) AS n FROM tickets ${scopeOnly.where} GROUP BY status`,
      scopeOnly.args,
    );
    const counts = Object.fromEntries(countRows.map((r) => [r.status, Number(r.n)]));

    return Response.json({ tickets, counts });
  } catch (err) {
    return serverError(err);
  }
}

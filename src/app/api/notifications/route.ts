import { denyUnless } from '@/lib/auth';
import { execute, query } from '@/lib/db';
import { badRequest, serverError } from '@/lib/http';
import type { Notification, Role } from '@/lib/types';

function roleParam(value: string | null): Role | null {
  return value === 'supervisor' || value === 'admin' ? value : null;
}

export async function GET(req: Request) {
  const role = roleParam(new URL(req.url).searchParams.get('role'));
  if (!role) return badRequest('Unknown role.');
  const denied = await denyUnless(role);
  if (denied) return denied;
  try {
    const items = await query<Notification>(
      'SELECT id, ticket_id, message, is_read, created_at FROM notifications WHERE role = ? ORDER BY id DESC LIMIT 30',
      [role],
    );
    const [{ n }] = await query<{ n: number }>('SELECT COUNT(*) AS n FROM notifications WHERE role = ? AND is_read = 0', [role]);
    return Response.json({ items, unread: Number(n) });
  } catch (err) {
    return serverError(err);
  }
}

/** Marks all notifications of the role as read. */
export async function POST(req: Request) {
  const role = roleParam(new URL(req.url).searchParams.get('role'));
  if (!role) return badRequest('Unknown role.');
  const denied = await denyUnless(role);
  if (denied) return denied;
  try {
    await execute('UPDATE notifications SET is_read = 1 WHERE role = ? AND is_read = 0', [role]);
    return Response.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}

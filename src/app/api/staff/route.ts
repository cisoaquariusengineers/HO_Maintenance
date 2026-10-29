import { denyUnless } from '@/lib/auth';
import { execute, query } from '@/lib/db';
import { badRequest, serverError, str } from '@/lib/http';
import type { Staff } from '@/lib/types';

export async function GET() {
  const denied = await denyUnless('supervisor', 'admin');
  if (denied) return denied;
  try {
    const staff = await query<Staff>('SELECT id, name, active FROM staff ORDER BY active DESC, name');
    return Response.json({ staff });
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: Request) {
  const denied = await denyUnless('admin');
  if (denied) return denied;
  try {
    const body = await req.json().catch(() => ({}));
    const name = str(body.name, 100);
    if (name.length < 2) return badRequest('Please enter a name.');
    await execute('INSERT INTO staff (name, active, created_at) VALUES (?, 1, ?)', [name, new Date()]);
    return Response.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}

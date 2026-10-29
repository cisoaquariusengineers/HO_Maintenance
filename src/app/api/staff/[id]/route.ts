import { denyUnless } from '@/lib/auth';
import { execute } from '@/lib/db';
import { badRequest, serverError, str } from '@/lib/http';

/** Rename a staff member or mark them active / inactive. Admin only. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await denyUnless('admin');
  if (denied) return denied;
  try {
    const id = Number((await params).id);
    const body = await req.json().catch(() => ({}));
    if (typeof body.name === 'string') {
      const name = str(body.name, 100);
      if (name.length < 2) return badRequest('Please enter a name.');
      await execute('UPDATE staff SET name = ? WHERE id = ?', [name, id]);
    }
    if (typeof body.active === 'boolean') {
      await execute('UPDATE staff SET active = ? WHERE id = ?', [body.active ? 1 : 0, id]);
    }
    return Response.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}

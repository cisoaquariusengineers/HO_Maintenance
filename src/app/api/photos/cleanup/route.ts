import { denyUnless } from '@/lib/auth';
import { execute, query } from '@/lib/db';
import { serverError } from '@/lib/http';
import { deletePhotos } from '@/lib/storage';

/** Frees photo storage: removes photos of tickets closed more than N days ago (ticket text is kept). */
export async function POST(req: Request) {
  const denied = await denyUnless('admin');
  if (denied) return denied;
  try {
    const body = await req.json().catch(() => ({}));
    const days = Math.max(30, Number(body.days) || 365);
    const before = new Date(Date.now() - days * 86_400_000);
    const rows = await query<{ id: number; photo_url: string }>(
      "SELECT id, photo_url FROM tickets WHERE status = 'Closed' AND closed_at < ? AND photo_url IS NOT NULL",
      [before],
    );
    if (rows.length) {
      await deletePhotos(rows.map((r) => r.photo_url));
      await execute('UPDATE tickets SET photo_url = NULL WHERE id IN (?)', [rows.map((r) => r.id)]);
    }
    return Response.json({ removed: rows.length });
  } catch (err) {
    return serverError(err);
  }
}

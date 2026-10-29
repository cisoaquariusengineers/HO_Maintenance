import { denyUnless } from '@/lib/auth';
import { query } from '@/lib/db';
import { serverError } from '@/lib/http';
import type { Ticket } from '@/lib/types';

type Count = { label: string; n: number };

/** Summary for the HR & Admin dashboard. ?days=30|90|365|0 (0 = all time). */
export async function GET(req: Request) {
  const denied = await denyUnless('admin');
  if (denied) return denied;
  try {
    const days = Number(new URL(req.url).searchParams.get('days') ?? 30);
    const since = days > 0 ? new Date(Date.now() - days * 86_400_000) : new Date(0);

    const byStatus = await query<Count>(
      'SELECT status AS label, COUNT(*) AS n FROM tickets WHERE created_at >= ? GROUP BY status',
      [since],
    );
    const byType = await query<Count>('SELECT type AS label, COUNT(*) AS n FROM tickets WHERE created_at >= ? GROUP BY type', [since]);
    const byFloor = await query<Count>(
      "SELECT floor AS label, COUNT(*) AS n FROM tickets WHERE created_at >= ? AND type <> 'Suggestion' GROUP BY floor ORDER BY n DESC",
      [since],
    );
    const byCategory = await query<Count>(
      "SELECT category AS label, COUNT(*) AS n FROM tickets WHERE created_at >= ? AND type <> 'Suggestion' GROUP BY category ORDER BY n DESC",
      [since],
    );
    const [avg] = await query<{ hours: number | null; closed: number }>(
      `SELECT AVG(TIMESTAMPDIFF(MINUTE, created_at, closed_at)) / 60 AS hours, COUNT(*) AS closed
       FROM tickets WHERE status = 'Closed' AND type <> 'Suggestion' AND created_at >= ?`,
      [since],
    );
    // Same floor + area + category reported more than once = repeat issue.
    const repeats = await query<{ floor: string; area: string; category: string; n: number; ids: string; last_at: string }>(
      `SELECT floor, area, category, COUNT(*) AS n, GROUP_CONCAT(id ORDER BY id) AS ids, MAX(created_at) AS last_at
       FROM tickets WHERE created_at >= ? AND type <> 'Suggestion'
       GROUP BY floor, area, category HAVING COUNT(*) > 1 ORDER BY n DESC, last_at DESC LIMIT 20`,
      [since],
    );
    const reopened = await query<{ n: number }>(
      'SELECT COUNT(*) AS n FROM tickets WHERE created_at >= ? AND reopen_count > 0',
      [since],
    );
    // Oldest unresolved tickets regardless of range, so nothing old goes unnoticed.
    const unresolved = await query<Ticket>(
      "SELECT * FROM tickets WHERE status <> 'Closed' ORDER BY created_at ASC LIMIT 15",
    );

    const num = (rows: Count[]) => rows.map((r) => ({ label: r.label, n: Number(r.n) }));
    return Response.json({
      byStatus: num(byStatus),
      byType: num(byType),
      byFloor: num(byFloor),
      byCategory: num(byCategory),
      avgResolutionHours: avg?.hours == null ? null : Number(avg.hours),
      closedCount: Number(avg?.closed ?? 0),
      reopenedCount: Number(reopened[0]?.n ?? 0),
      repeats: repeats.map((r) => ({ ...r, n: Number(r.n), ids: String(r.ids).split(',').map(Number) })),
      unresolved,
    });
  } catch (err) {
    return serverError(err);
  }
}

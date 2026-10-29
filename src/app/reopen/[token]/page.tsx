import Header from '@/components/Header';
import { query } from '@/lib/db';
import { fmtDateTime, ticketNo } from '@/lib/format';
import type { Ticket } from '@/lib/types';
import ReopenForm from './ReopenForm';

export const dynamic = 'force-dynamic';

export default async function ReopenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [ticket] = /^[a-f0-9]{32}$/.test(token)
    ? await query<Ticket>("SELECT * FROM tickets WHERE reopen_token = ? AND type <> 'Suggestion'", [token])
    : [];

  return (
    <>
      <Header title="Reopen Ticket" />
      <main className="mx-auto max-w-xl px-4 py-6">
        {!ticket ? (
          <div className="card p-8 text-center text-slate-600">This link is not valid.</div>
        ) : (
          <div className="space-y-4">
            <section className="card space-y-2 p-4 text-sm">
              <div className="text-lg font-bold text-brand-700">{ticketNo(ticket.id)}</div>
              <div className="text-slate-500">
                {ticket.category} · {[ticket.floor, ticket.area, ticket.location_detail].filter(Boolean).join(' – ')}
              </div>
              <p className="whitespace-pre-wrap">{ticket.description}</p>
              {ticket.status === 'Closed' && (
                <div className="rounded-lg bg-emerald-50 p-3">
                  <div className="text-xs text-emerald-700">Action taken · {fmtDateTime(ticket.closed_at)}</div>
                  <div className="whitespace-pre-wrap">{ticket.action_taken}</div>
                </div>
              )}
            </section>
            {ticket.status === 'Closed' ? (
              <ReopenForm token={token} />
            ) : (
              <div className="card p-4 text-sm text-slate-600">
                This ticket is currently <b>{ticket.status}</b> and is being worked on. No action needed.
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}

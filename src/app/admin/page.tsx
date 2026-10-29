'use client';

import { useCallback, useEffect, useState } from 'react';
import Header from '@/components/Header';
import NotificationBell from '@/components/NotificationBell';
import StatusBadge from '@/components/StatusBadge';
import TicketDrawer from '@/components/TicketDrawer';
import TicketList from '@/components/TicketList';
import { api } from '@/lib/api-client';
import { ageInDays, fmtDate, fmtHours, ticketNo } from '@/lib/format';
import type { Staff, Ticket } from '@/lib/types';
import { useStaff } from '@/lib/use-staff';

type Tab = 'overview' | 'tickets' | 'suggestions' | 'staff';
const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'tickets', label: 'All Tickets' },
  { key: 'suggestions', label: 'Suggestions' },
  { key: 'staff', label: 'Staff & Tools' },
];

export default function AdminPage() {
  const { staff, reload: reloadStaff } = useStaff();
  const [tab, setTab] = useState<Tab>('overview');
  const [selected, setSelected] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);
  const closeDrawer = useCallback(() => setSelected(null), []);

  return (
    <>
      <Header title="HR & Admin Dashboard">
        <NotificationBell role="admin" onOpenTicket={setSelected} onNew={refresh} />
      </Header>

      <nav className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm font-semibold transition ${
                tab === t.key ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-4 py-5">
        {tab === 'overview' && <Overview refreshKey={refreshKey} onSelect={setSelected} />}
        {tab === 'tickets' && (
          <TicketList scope="all" staff={staff} refreshKey={refreshKey} onSelect={setSelected} defaultStatus="all" showExport />
        )}
        {tab === 'suggestions' && (
          <TicketList scope="suggestions" staff={staff} refreshKey={refreshKey} onSelect={setSelected} showExport />
        )}
        {tab === 'staff' && <StaffAndTools staff={staff} onChange={reloadStaff} />}
      </main>

      {selected !== null && (
        <TicketDrawer ticketId={selected} role="admin" staff={staff} onClose={closeDrawer} onChanged={refresh} />
      )}
    </>
  );
}

/* ---------------- Overview ---------------- */

type Count = { label: string; n: number };
interface Stats {
  byStatus: Count[];
  byType: Count[];
  byFloor: Count[];
  byCategory: Count[];
  avgResolutionHours: number | null;
  closedCount: number;
  reopenedCount: number;
  repeats: { floor: string; area: string; category: string; n: number; ids: number[]; last_at: string }[];
  unresolved: Ticket[];
}

const RANGES = [
  { days: 30, label: 'Last 30 days' },
  { days: 90, label: 'Last 3 months' },
  { days: 365, label: 'Last 12 months' },
  { days: 0, label: 'All time' },
];

function Overview({ refreshKey, onSelect }: { refreshKey: number; onSelect: (id: number) => void }) {
  const [days, setDays] = useState(30);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Stats>(`/api/stats?days=${days}`)
      .then((s) => {
        setStats(s);
        setError('');
      })
      .catch((e) => setError(e.message));
  }, [days, refreshKey]);

  if (error) return <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>;
  if (!stats) return <p className="text-center text-sm text-slate-500">Loading…</p>;

  const status = (s: string) => stats.byStatus.find((x) => x.label === s)?.n ?? 0;
  const total = stats.byStatus.reduce((a, b) => a + b.n, 0);
  const suggestions = stats.byType.find((x) => x.label === 'Suggestion')?.n ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-slate-700">Summary</h2>
        <select className="input w-auto" value={days} onChange={(e) => setDays(Number(e.target.value))}>
          {RANGES.map((r) => (
            <option key={r.days} value={r.days}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Total received" value={total} />
        <Stat label="Open" value={status('Open')} tone="text-sky-700" />
        <Stat label="In progress" value={status('In Progress')} tone="text-amber-700" />
        <Stat label="Pending" value={status('Pending')} tone="text-red-700" />
        <Stat label="Closed" value={status('Closed')} tone="text-emerald-700" />
        <Stat label="Avg. resolution time" value={fmtHours(stats.avgResolutionHours)} small />
      </div>
      <p className="-mt-2 text-xs text-slate-500">
        Includes {suggestions} suggestion{suggestions === 1 ? '' : 's'} · {stats.reopenedCount} ticket
        {stats.reopenedCount === 1 ? ' was' : 's were'} reopened by employees · Average based on {stats.closedCount} closed complaint
        {stats.closedCount === 1 ? '' : 's'}.
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <Bars title="Floor-wise complaints" data={stats.byFloor} />
        <Bars title="Category-wise complaints" data={stats.byCategory} />
      </div>

      <section className="card p-4">
        <h3 className="mb-1 text-sm font-semibold text-slate-700">Unresolved – oldest first</h3>
        <p className="mb-3 text-xs text-slate-500">All tickets not yet closed, regardless of the period selected.</p>
        {stats.unresolved.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing pending. 🎉</p>
        ) : (
          <ul className="divide-y">
            {stats.unresolved.map((t) => {
              const age = ageInDays(t.created_at);
              return (
                <li key={t.id}>
                  <button onClick={() => onSelect(t.id)} className="flex w-full items-start gap-3 py-2.5 text-left text-sm hover:bg-slate-50">
                    <span className="w-16 shrink-0 font-semibold text-brand-700">{ticketNo(t.id)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">
                        {t.category} – {t.floor}, {t.area}
                      </span>
                      {t.status === 'Pending' && t.pending_reason && (
                        <span className="block truncate text-xs text-red-600">Pending: {t.pending_reason}</span>
                      )}
                    </span>
                    <span className={`shrink-0 text-xs font-semibold ${age >= 3 ? 'text-red-600' : 'text-slate-500'}`}>
                      {age === 0 ? 'today' : `${age}d`}
                    </span>
                    <span className="hidden shrink-0 sm:block">
                      <StatusBadge status={t.status} short />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="card p-4">
        <h3 className="mb-1 text-sm font-semibold text-slate-700">Repeat complaints</h3>
        <p className="mb-3 text-xs text-slate-500">Same floor, area and category reported more than once in the selected period.</p>
        {stats.repeats.length === 0 ? (
          <p className="text-sm text-slate-500">No repeat complaints.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2 pr-3">Location</th>
                  <th className="py-2 pr-3">Category</th>
                  <th className="py-2 pr-3">Times</th>
                  <th className="py-2 pr-3">Last</th>
                  <th className="py-2">Tickets</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {stats.repeats.map((r) => (
                  <tr key={`${r.floor}|${r.area}|${r.category}`}>
                    <td className="py-2 pr-3">
                      {r.floor}, {r.area}
                    </td>
                    <td className="py-2 pr-3">{r.category}</td>
                    <td className="py-2 pr-3 font-bold text-red-600">{r.n}</td>
                    <td className="whitespace-nowrap py-2 pr-3 text-slate-500">{fmtDate(r.last_at)}</td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-1">
                        {r.ids.map((id) => (
                          <button key={id} onClick={() => onSelect(id)} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-brand-700 hover:bg-brand-100">
                            {ticketNo(id)}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, tone = 'text-slate-900', small }: { label: string; value: number | string; tone?: string; small?: boolean }) {
  return (
    <div className="card p-3">
      <div className={`${small ? 'text-xl' : 'text-2xl'} font-bold ${tone}`}>{value}</div>
      <div className="text-xs font-medium text-slate-600">{label}</div>
    </div>
  );
}

function Bars({ title, data }: { title: string; data: Count[] }) {
  const max = Math.max(1, ...data.map((d) => d.n));
  return (
    <section className="card p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-700">{title}</h3>
      {data.length === 0 ? (
        <p className="text-sm text-slate-500">No data for this period.</p>
      ) : (
        <ul className="space-y-2.5">
          {data.map((d) => (
            <li key={d.label} className="text-sm">
              <div className="mb-1 flex justify-between gap-2">
                <span className="truncate text-slate-700">{d.label}</span>
                <span className="font-semibold">{d.n}</span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100">
                <div className="h-2.5 rounded-full bg-brand-500" style={{ width: `${(d.n / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ---------------- Staff & tools ---------------- */

function StaffAndTools({ staff, onChange }: { staff: Staff[]; onChange: () => void }) {
  const [newName, setNewName] = useState('');
  const [msg, setMsg] = useState('');
  const [cleanupDays, setCleanupDays] = useState(365);
  const [busy, setBusy] = useState(false);

  /** Runs an API call; a returned string is shown as the result message. */
  async function call(fn: () => Promise<unknown>) {
    setBusy(true);
    setMsg('');
    try {
      const result = await fn();
      if (typeof result === 'string') setMsg(result);
      onChange();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="card p-4">
        <h3 className="mb-1 text-sm font-semibold text-slate-700">Housekeeping staff</h3>
        <p className="mb-3 text-xs text-slate-500">These names appear when the supervisor assigns or closes a complaint.</p>
        <ul className="mb-4 divide-y">
          {staff.map((s) => (
            <StaffRow key={s.id} s={s} busy={busy} call={call} />
          ))}
        </ul>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            call(() => api('/api/staff', { method: 'POST', json: { name: newName } })).then(() => setNewName(''));
          }}
        >
          <input className="input" placeholder="New staff member name" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <button className="btn-primary" disabled={busy || newName.trim().length < 2}>
            Add
          </button>
        </form>
      </section>

      <section className="card p-4">
        <h3 className="mb-1 text-sm font-semibold text-slate-700">Free up photo storage</h3>
        <p className="mb-3 text-xs text-slate-500">
          Deletes photos of tickets closed more than the chosen period ago. Ticket details and history are kept.
        </p>
        <div className="flex gap-2">
          <select className="input" value={cleanupDays} onChange={(e) => setCleanupDays(Number(e.target.value))}>
            <option value={90}>Closed over 3 months ago</option>
            <option value={180}>Closed over 6 months ago</option>
            <option value={365}>Closed over 1 year ago</option>
          </select>
          <button
            className="btn-danger"
            disabled={busy}
            onClick={() => {
              if (!confirm('Delete these photos permanently?')) return;
              call(async () => {
                const r = await api<{ removed: number }>('/api/photos/cleanup', { method: 'POST', json: { days: cleanupDays } });
                return `Removed ${r.removed} photo${r.removed === 1 ? '' : 's'}.`;
              });
            }}
          >
            Delete
          </button>
        </div>
      </section>

      {msg && <p className="text-sm text-slate-700 lg:col-span-2">{msg}</p>}
    </div>
  );
}

function StaffRow({ s, busy, call }: { s: Staff; busy: boolean; call: (fn: () => Promise<unknown>) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(s.name);
  return (
    <li className="flex items-center gap-2 py-2 text-sm">
      {editing ? (
        <>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          <button
            className="btn-primary"
            disabled={busy}
            onClick={() => call(() => api(`/api/staff/${s.id}`, { method: 'PATCH', json: { name } })).then(() => setEditing(false))}
          >
            Save
          </button>
          <button className="btn-secondary" onClick={() => setEditing(false)}>
            Cancel
          </button>
        </>
      ) : (
        <>
          <span className={`flex-1 ${s.active ? '' : 'text-slate-400 line-through'}`}>{s.name}</span>
          <button className="text-sm font-medium text-brand-600" onClick={() => setEditing(true)}>
            Rename
          </button>
          <button
            className="text-sm font-medium text-slate-500"
            disabled={busy}
            onClick={() => call(() => api(`/api/staff/${s.id}`, { method: 'PATCH', json: { active: !s.active } }))}
          >
            {s.active ? 'Deactivate' : 'Activate'}
          </button>
        </>
      )}
    </li>
  );
}

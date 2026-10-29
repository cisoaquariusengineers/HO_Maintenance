'use client';

import { useEffect, useState } from 'react';
import StatusBadge from './StatusBadge';
import { api } from '@/lib/api-client';
import { CATEGORIES, FLOORS, STATUSES, STATUS_LABEL, TICKET_TYPES, type Status } from '@/lib/constants';
import { fmtDate, ticketNo } from '@/lib/format';
import type { Staff, Ticket } from '@/lib/types';

type Scope = 'complaints' | 'suggestions' | 'all';

const CARD_STYLE: Record<Status, string> = {
  Open: 'text-sky-700',
  'In Progress': 'text-amber-700',
  Pending: 'text-red-700',
  Closed: 'text-emerald-700',
};

const EMPTY_FILTERS = { floor: '', category: '', assigned: '', type: '', from: '', to: '', q: '' };

export default function TicketList({
  scope,
  staff,
  refreshKey,
  onSelect,
  defaultStatus = 'active',
  showExport = false,
}: {
  scope: Scope;
  staff: Staff[];
  refreshKey: number;
  onSelect: (id: number) => void;
  defaultStatus?: string;
  showExport?: boolean;
}) {
  const [status, setStatus] = useState(defaultStatus);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [search, setSearch] = useState('');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Debounce the free-text search.
  useEffect(() => {
    const t = setTimeout(() => setFilters((f) => (f.q === search ? f : { ...f, q: search })), 300);
    return () => clearTimeout(t);
  }, [search]);

  const params = new URLSearchParams({ scope, status, ...filters });
  for (const [k, v] of [...params.entries()]) if (!v) params.delete(k);
  const qs = params.toString();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api<{ tickets: Ticket[]; counts: Record<string, number> }>(`/api/tickets?${qs}`)
      .then((d) => {
        if (cancelled) return;
        setTickets(d.tickets);
        setCounts(d.counts);
        setError('');
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [qs, refreshKey]);

  const set = (k: keyof typeof EMPTY_FILTERS) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFilters({ ...filters, [k]: e.target.value });
  const activeFilterCount = Object.entries(filters).filter(([k, v]) => v && k !== 'q').length;
  const staffNames = staff.map((s) => s.name);

  return (
    <div className="space-y-4">
      {/* Status summary cards double as quick filters */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(status === s ? defaultStatus : s)}
            className={`card p-3 text-left transition hover:ring-brand-500 ${status === s ? 'ring-2 ring-brand-500' : ''}`}
          >
            <div className={`text-2xl font-bold ${CARD_STYLE[s]}`}>{counts[s] ?? 0}</div>
            <div className="text-xs font-medium text-slate-600">{STATUS_LABEL[s]}</div>
          </button>
        ))}
      </div>

      <div className="card p-3">
        <div className="flex flex-wrap gap-2">
          <input
            className="input min-w-0 flex-1 sm:max-w-xs"
            placeholder="Search ticket no. or text…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="active">Not closed</option>
            <option value="all">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <button className="btn-secondary" onClick={() => setShowFilters(!showFilters)}>
            Filters{activeFilterCount ? ` (${activeFilterCount})` : ''}
          </button>
          {showExport && (
            <a className="btn-secondary" href={`/api/export?${qs}`}>
              ⬇ Excel
            </a>
          )}
        </div>

        {showFilters && (
          <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-3 md:grid-cols-4 lg:grid-cols-7">
            <select className="input" value={filters.floor} onChange={set('floor')}>
              <option value="">All floors</option>
              {FLOORS.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
            <select className="input" value={filters.category} onChange={set('category')}>
              <option value="">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c.name}>{c.name}</option>
              ))}
            </select>
            {scope !== 'suggestions' && (
              <select className="input" value={filters.assigned} onChange={set('assigned')}>
                <option value="">Anyone assigned</option>
                <option value="__none">Not assigned</option>
                {staffNames.map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            )}
            {scope === 'all' && (
              <select className="input" value={filters.type} onChange={set('type')}>
                <option value="">All types</option>
                {TICKET_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            )}
            <label className="col-span-1 flex flex-col text-xs text-slate-500">
              From
              <input type="date" className="input" value={filters.from} onChange={set('from')} />
            </label>
            <label className="col-span-1 flex flex-col text-xs text-slate-500">
              To
              <input type="date" className="input" value={filters.to} onChange={set('to')} />
            </label>
            <button
              className="btn-secondary self-end"
              onClick={() => {
                setFilters(EMPTY_FILTERS);
                setSearch('');
                setStatus(defaultStatus);
              }}
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">{error}</div>}

      {!loading && tickets.length === 0 && !error && (
        <div className="card p-10 text-center text-sm text-slate-500">No tickets match these filters.</div>
      )}

      {tickets.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="card hidden overflow-hidden md:block">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Ticket No.</th>
                  <th className="px-4 py-3">Floor / Location</th>
                  <th className="px-4 py-3">Issue</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Assigned To</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {tickets.map((t) => (
                  <tr key={t.id} onClick={() => onSelect(t.id)} className="cursor-pointer hover:bg-brand-50">
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-brand-700">
                      {ticketNo(t.id)}
                      {t.reopen_count > 0 && <span className="ml-1 text-xs text-red-600" title="Reopened">↻</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div>{t.floor}</div>
                      <div className="text-xs text-slate-500">{t.area}</div>
                    </td>
                    <td className="max-w-xs px-4 py-3">
                      <div className="text-xs font-medium text-slate-500">
                        {t.type !== 'Complaint' && `${t.type} · `}
                        {t.category}
                      </div>
                      <div className="truncate">{t.description}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{fmtDate(t.created_at)}</td>
                    <td className="px-4 py-3 text-slate-600">{t.assigned_to || '—'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={t.status} short />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="space-y-2 md:hidden">
            {tickets.map((t) => (
              <li key={t.id}>
                <button onClick={() => onSelect(t.id)} className="card w-full p-3 text-left active:bg-brand-50">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-brand-700">
                      {ticketNo(t.id)}
                      {t.reopen_count > 0 && <span className="ml-1 text-xs text-red-600">↻ reopened</span>}
                    </span>
                    <StatusBadge status={t.status} short />
                  </div>
                  <div className="mt-1 text-sm font-medium">{t.category}</div>
                  <div className="line-clamp-2 text-sm text-slate-600">{t.description}</div>
                  <div className="mt-2 flex flex-wrap gap-x-3 text-xs text-slate-500">
                    <span>📍 {t.floor}, {t.area}</span>
                    <span>🗓 {fmtDate(t.created_at)}</span>
                    {t.assigned_to && <span>👤 {t.assigned_to}</span>}
                  </div>
                </button>
              </li>
            ))}
          </ul>
          {tickets.length >= 500 && (
            <p className="text-center text-xs text-slate-500">Showing the first 500 tickets. Use filters to narrow down.</p>
          )}
        </>
      )}
      {loading && <p className="text-center text-sm text-slate-500">Loading…</p>}
    </div>
  );
}

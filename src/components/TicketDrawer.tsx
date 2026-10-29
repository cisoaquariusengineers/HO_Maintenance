'use client';

import { useEffect, useState } from 'react';
import StaffPicker from './StaffPicker';
import StatusBadge from './StatusBadge';
import { api } from '@/lib/api-client';
import { fmtDateTime, ticketNo } from '@/lib/format';
import type { HistoryEntry, Role, Staff, Ticket } from '@/lib/types';

type Action = 'assign' | 'pending' | 'close';

export default function TicketDrawer({
  ticketId,
  role,
  staff,
  onClose,
  onChanged,
}: {
  ticketId: number;
  role: Role;
  staff: Staff[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    setTicket(null);
    setLoadError('');
    api<{ ticket: Ticket; history: HistoryEntry[] }>(`/api/tickets/${ticketId}`)
      .then((d) => {
        setTicket(d.ticket);
        setHistory(d.history);
      })
      .catch((e) => setLoadError(e.message));
  }, [ticketId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const isSuggestion = ticket?.type === 'Suggestion';
  const canAct = ticket && ticket.status !== 'Closed' && (isSuggestion ? role === 'admin' : role === 'supervisor');

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <aside className="relative flex h-full w-full flex-col bg-slate-50 shadow-2xl sm:max-w-lg">
        <div className="flex items-center justify-between border-b bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">{ticketNo(ticketId)}</span>
            {ticket && <StatusBadge status={ticket.status} />}
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close">
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {loadError && <p className="text-sm text-red-600">{loadError}</p>}
          {!ticket && !loadError && <p className="text-sm text-slate-500">Loading…</p>}

          {ticket && (
            <>
              <section className="card space-y-3 p-4 text-sm">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{ticket.type}</span>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{ticket.category}</span>
                  {ticket.reopen_count > 0 && (
                    <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                      Reopened ×{ticket.reopen_count}
                    </span>
                  )}
                </div>
                <p className="whitespace-pre-wrap text-[15px] text-slate-900">{ticket.description}</p>
                <Field label="Location" value={[ticket.floor, ticket.area, ticket.location_detail].filter(Boolean).join(' – ')} />
                <Field label="Raised by" value={`${ticket.employee_name} (${ticket.employee_email})`} />
                <Field label="Raised on" value={fmtDateTime(ticket.created_at)} />
                <Field label="Assigned to" value={ticket.assigned_to} />
                {ticket.status === 'Pending' && <Field label="Pending reason" value={ticket.pending_reason} highlight />}
                {ticket.status === 'Closed' && (
                  <>
                    <Field label="Attended by" value={ticket.attended_by} />
                    <Field label={isSuggestion ? 'Remarks' : 'Action taken'} value={ticket.action_taken} />
                    <Field label="Closed by" value={`${ticket.closed_by} · ${fmtDateTime(ticket.closed_at)}`} />
                  </>
                )}
                {ticket.photo_url && (
                  <a href={ticket.photo_url} target="_blank" rel="noreferrer" className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ticket.photo_url} alt="Attached" className="max-h-64 rounded-lg ring-1 ring-slate-200" />
                  </a>
                )}
              </section>

              {canAct && (
                <ActionPanel
                  key={ticket.updated_at}
                  ticket={ticket}
                  staff={staff}
                  onDone={(t, h) => {
                    setTicket(t);
                    setHistory(h);
                    onChanged();
                  }}
                />
              )}
              {ticket.status !== 'Closed' && !canAct && (
                <p className="rounded-lg bg-slate-100 p-3 text-xs text-slate-600">
                  {isSuggestion ? 'Suggestions are reviewed by HR & Admin.' : 'Only the housekeeping supervisor can update and close complaints.'}
                </p>
              )}

              <section className="card p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-700">History</h3>
                <ol className="relative space-y-4 border-l-2 border-slate-200 pl-4">
                  {history.map((h) => (
                    <li key={h.id} className="relative text-sm">
                      <span className="absolute -left-[23px] top-1 h-3 w-3 rounded-full border-2 border-white bg-brand-500" />
                      <div className="font-medium">{h.action}</div>
                      {h.note && <div className="whitespace-pre-wrap text-slate-600">{h.note}</div>}
                      <div className="text-xs text-slate-400">
                        {fmtDateTime(h.created_at)} · {h.done_by}
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

function Field({ label, value, highlight }: { label: string; value: string | null; highlight?: boolean }) {
  if (!value) return null;
  return (
    <div className={highlight ? 'rounded-lg bg-red-50 p-2' : ''}>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="whitespace-pre-wrap text-slate-900">{value}</div>
    </div>
  );
}

function ActionPanel({
  ticket,
  staff,
  onDone,
}: {
  ticket: Ticket;
  staff: Staff[];
  onDone: (t: Ticket, h: HistoryEntry[]) => void;
}) {
  const isSuggestion = ticket.type === 'Suggestion';
  const tabs: { key: Action; label: string }[] = isSuggestion
    ? [
        { key: 'pending', label: 'Pending' },
        { key: 'close', label: 'Review & Close' },
      ]
    : [
        { key: 'assign', label: ticket.assigned_to ? 'Reassign' : 'Assign' },
        { key: 'pending', label: 'Pending' },
        { key: 'close', label: 'Close' },
      ];
  const [tab, setTab] = useState<Action>(isSuggestion || ticket.assigned_to ? 'close' : 'assign');
  const [assignee, setAssignee] = useState(ticket.assigned_to ?? '');
  const [reason, setReason] = useState(ticket.pending_reason ?? '');
  const [attendedBy, setAttendedBy] = useState(ticket.assigned_to ?? '');
  const [actionTaken, setActionTaken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function run(body: Record<string, string>) {
    setError('');
    setBusy(true);
    try {
      const d = await api<{ ticket: Ticket; history: HistoryEntry[] }>(`/api/tickets/${ticket.id}/action`, {
        method: 'POST',
        json: body,
      });
      onDone(d.ticket, d.history);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function submit() {
    if (tab === 'assign') {
      if (!assignee.trim()) return setError('Please choose a staff member.');
      run({ action: 'assign', staff: assignee });
    } else if (tab === 'pending') {
      if (!reason.trim()) return setError('Reason for pendency is mandatory.');
      run({ action: 'pending', reason });
    } else {
      if (!isSuggestion && !attendedBy.trim()) return setError('Select the staff member who attended to the complaint.');
      if (!actionTaken.trim()) return setError(isSuggestion ? 'Enter your review remarks.' : 'Enter the action taken.');
      run({ action: 'close', attendedBy, actionTaken });
    }
  }

  return (
    <section className="card p-4">
      <div className="mb-4 grid grid-flow-col gap-1 rounded-lg bg-slate-100 p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key);
              setError('');
            }}
            className={`rounded-md px-2 py-2 text-sm font-semibold transition ${tab === t.key ? 'bg-white text-brand-700 shadow' : 'text-slate-600'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {tab === 'assign' && (
          <div>
            <label className="label">Assign work to</label>
            <StaffPicker staff={staff} value={assignee} onChange={setAssignee} />
          </div>
        )}
        {tab === 'pending' && (
          <div>
            <label className="label">Reason for pendency *</label>
            <textarea className="input min-h-[80px]" placeholder="e.g. Awaiting spare part / external plumber / approval"
              value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
          </div>
        )}
        {tab === 'close' && (
          <>
            {!isSuggestion && (
              <div>
                <label className="label">Attended by *</label>
                <StaffPicker staff={staff} value={attendedBy} onChange={setAttendedBy} />
              </div>
            )}
            <div>
              <label className="label">{isSuggestion ? 'Review remarks / decision *' : 'Action taken *'}</label>
              <textarea className="input min-h-[80px]" maxLength={2000}
                placeholder={isSuggestion ? 'e.g. Approved – will be implemented next month' : 'e.g. Replaced faulty tap washer, area cleaned'}
                value={actionTaken} onChange={(e) => setActionTaken(e.target.value)} />
            </div>
            {!isSuggestion && (
              <p className="text-xs text-slate-500">Close only after verifying the issue is resolved. The employee will be emailed.</p>
            )}
          </>
        )}

        {error && <div className="rounded-lg bg-red-50 p-2.5 text-sm text-red-700 ring-1 ring-red-200">{error}</div>}

        <button
          onClick={submit}
          disabled={busy}
          className={`w-full ${tab === 'close' ? 'btn-success' : tab === 'pending' ? 'btn-danger' : 'btn-primary'}`}
        >
          {busy
            ? 'Saving…'
            : tab === 'assign'
              ? 'Assign'
              : tab === 'pending'
                ? 'Mark as Pending'
                : isSuggestion
                  ? 'Close suggestion'
                  : 'Verify & Close'}
        </button>
      </div>
    </section>
  );
}

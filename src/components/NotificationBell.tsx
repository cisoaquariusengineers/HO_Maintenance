'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api-client';
import { fmtDateTime } from '@/lib/format';
import type { Notification, Role } from '@/lib/types';

const REFRESH_MS = 60_000;

/** In-app notifications: unread count on a bell, list on click. Refreshes every minute. */
export default function NotificationBell({
  role,
  onOpenTicket,
  onNew,
}: {
  role: Role;
  onOpenTicket: (id: number) => void;
  onNew?: () => void;
}) {
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const lastUnread = useRef<number | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await api<{ items: Notification[]; unread: number }>(`/api/notifications?role=${role}`);
      setItems(data.items);
      setUnread(data.unread);
      if (lastUnread.current !== null && data.unread > lastUnread.current) onNew?.();
      lastUnread.current = data.unread;
    } catch {
      /* keep the last known state */
    }
  }, [role, onNew]);

  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      await api(`/api/notifications?role=${role}`, { method: 'POST' }).catch(() => undefined);
      setUnread(0);
      lastUnread.current = 0;
    }
  }

  return (
    <div className="relative" ref={boxRef}>
      <button onClick={toggle} className="relative rounded-full p-2 hover:bg-brand-700" aria-label="Notifications">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-3 top-16 z-50 max-h-[70vh] overflow-y-auto rounded-xl bg-white text-slate-800 shadow-xl ring-1 ring-slate-200 sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-96">
          <div className="sticky top-0 border-b bg-white px-4 py-3 text-sm font-semibold">Notifications</div>
          {items.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-500">No notifications yet</p>
          ) : (
            <ul className="divide-y">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    className={`w-full px-4 py-3 text-left text-sm hover:bg-slate-50 ${n.is_read ? '' : 'bg-brand-50'}`}
                    onClick={() => {
                      setOpen(false);
                      if (n.ticket_id) onOpenTicket(n.ticket_id);
                    }}
                  >
                    <div className="text-slate-800">{n.message}</div>
                    <div className="mt-0.5 text-xs text-slate-500">{fmtDateTime(n.created_at)}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

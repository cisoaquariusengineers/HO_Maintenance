'use client';

import { useState } from 'react';
import { api } from '@/lib/api-client';

export default function ReopenForm({ token }: { token: string }) {
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="card p-6 text-center">
        <div className="mb-2 text-3xl">↻</div>
        <p className="font-semibold">Ticket reopened</p>
        <p className="mt-1 text-sm text-slate-500">The housekeeping supervisor has been notified.</p>
      </div>
    );
  }

  return (
    <form
      className="card space-y-3 p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!comment.trim()) return setError('Please tell us what is still not resolved.');
        setBusy(true);
        setError('');
        try {
          await api(`/api/reopen/${token}`, { method: 'POST', json: { comment } });
          setDone(true);
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="label" htmlFor="comment">
        What is still not resolved?
      </label>
      <textarea id="comment" className="input min-h-[90px]" maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} />
      {error && <div className="rounded-lg bg-red-50 p-2.5 text-sm text-red-700">{error}</div>}
      <button className="btn-danger w-full" disabled={busy}>
        {busy ? 'Reopening…' : 'Reopen ticket'}
      </button>
    </form>
  );
}

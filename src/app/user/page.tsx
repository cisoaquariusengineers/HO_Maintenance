'use client';

import { useEffect, useRef, useState } from 'react';
import Header from '@/components/Header';
import { api } from '@/lib/api-client';
import { compressImage } from '@/lib/compress-image';
import { AREAS, CATEGORIES, FLOORS, TICKET_TYPES, type TicketType } from '@/lib/constants';

const ME_KEY = 'hk_employee';
const FLOOR_SHORT: Record<string, string> = {
  'Ground Floor': 'Ground',
  '1st Floor': '1st',
  '2nd Floor': '2nd',
  '3rd Floor': '3rd',
  '4th Floor': '4th',
  '5th Floor': '5th',
};
const TYPE_HINT: Record<TicketType, string> = {
  Complaint: 'Something is not working or not clean',
  Requirement: 'You need something provided',
  Suggestion: 'An idea to improve the office',
};

export default function EmployeePage() {
  const [me, setMe] = useState({ name: '', email: '' });
  const [editingMe, setEditingMe] = useState(true);
  const [type, setType] = useState<TicketType>('Complaint');
  const [floor, setFloor] = useState('');
  const [area, setArea] = useState('');
  const [locationDetail, setLocationDetail] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(ME_KEY) || 'null');
      if (saved?.name && saved?.email) {
        setMe(saved);
        setEditingMe(false);
      }
    } catch {
      /* storage unavailable – user simply types their details */
    }
  }, []);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    const small = await compressImage(file);
    setPhoto(small);
    setPreview(URL.createObjectURL(small));
  }

  function clearPhoto() {
    setPhoto(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const missing = [
      !me.name.trim() && 'your name',
      !me.email.trim() && 'your email',
      !floor && 'floor',
      !area && 'area',
      !category && 'category',
      !description.trim() && 'description',
    ].filter(Boolean);
    if (missing.length) {
      setError(`Please fill in: ${missing.join(', ')}.`);
      return;
    }

    const fd = new FormData();
    fd.set('name', me.name);
    fd.set('email', me.email);
    fd.set('type', type);
    fd.set('floor', floor);
    fd.set('area', area);
    fd.set('locationDetail', locationDetail);
    fd.set('category', category);
    fd.set('description', description);
    if (photo) fd.set('photo', photo);

    setBusy(true);
    try {
      const res = await api<{ ticketNo: string }>('/api/tickets', { method: 'POST', body: fd });
      try {
        localStorage.setItem(ME_KEY, JSON.stringify({ name: me.name.trim(), email: me.email.trim() }));
      } catch {
        /* ignore */
      }
      setEditingMe(false);
      setDone(res.ticketNo);
      window.scrollTo({ top: 0 });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setType('Complaint');
    setFloor('');
    setArea('');
    setLocationDetail('');
    setCategory('');
    setDescription('');
    clearPhoto();
    setDone(null);
  }

  if (done) {
    return (
      <>
        <Header title="Raise a Ticket" />
        <main className="mx-auto max-w-xl px-4 py-8">
          <div className="card p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-3xl">✓</div>
            <p className="text-2xl font-bold text-slate-900">Thank you, {me.name}</p>
            <p className="mt-3 text-sm text-slate-600">
              A confirmation has been sent to <b>{me.email}</b>. You will get another email when it is{' '}
              {type === 'Suggestion' ? 'reviewed' : 'resolved'}.
            </p>
            <p className="mt-4 text-slate-600">
              Your ticket no. is <b className="text-lg tracking-wide text-brand-700">{done}</b>
            </p>
            <button className="btn-primary mt-6 w-full" onClick={reset}>
              Raise another ticket
            </button>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header title="Raise a Ticket" />
      <main className="mx-auto max-w-xl px-4 py-5">
        <form onSubmit={submit} className="space-y-4">
          {/* Who */}
          <section className="card p-4">
            {editingMe ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="name">Your name</label>
                  <input id="name" className="input" value={me.name} autoComplete="name"
                    onChange={(e) => setMe({ ...me, name: e.target.value })} />
                </div>
                <div>
                  <label className="label" htmlFor="email">Your email</label>
                  <input id="email" type="email" className="input" value={me.email} autoComplete="email"
                    onChange={(e) => setMe({ ...me, email: e.target.value })} />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <span className="text-slate-500">Raising as </span>
                  <b>{me.name}</b>
                  <div className="truncate text-slate-500">{me.email}</div>
                </div>
                <button type="button" className="text-sm font-medium text-brand-600" onClick={() => setEditingMe(true)}>
                  Change
                </button>
              </div>
            )}
          </section>

          {/* What kind */}
          <section className="card space-y-4 p-4">
            <div>
              <span className="label">Type</span>
              <div className="grid grid-cols-3 gap-2">
                {TICKET_TYPES.map((t) => (
                  <button key={t} type="button" onClick={() => setType(t)} className={`chip ${type === t ? 'chip-on' : 'chip-off'}`}>
                    {t}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-slate-500">{TYPE_HINT[type]}</p>
            </div>

            <div>
              <span className="label">Floor</span>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {FLOORS.map((f) => (
                  <button key={f} type="button" onClick={() => setFloor(f)}
                    className={`chip px-1 ${floor === f ? 'chip-on' : 'chip-off'}`}>
                    {FLOOR_SHORT[f]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="area">Area</label>
                <select id="area" className="input" value={area} onChange={(e) => setArea(e.target.value)}>
                  <option value="">Select area…</option>
                  {AREAS.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="spot">
                  Exact spot <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <input id="spot" className="input" placeholder="e.g. near Accounts, cabin 4" maxLength={150}
                  value={locationDetail} onChange={(e) => setLocationDetail(e.target.value)} />
              </div>
            </div>
          </section>

          {/* Category */}
          <section className="card p-4">
            <span className="label">Category</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {CATEGORIES.map((c) => (
                <button key={c.name} type="button" onClick={() => setCategory(c.name)}
                  className={`flex flex-col items-start rounded-lg border p-2.5 text-left transition ${
                    category === c.name ? 'border-brand-600 bg-brand-50 ring-2 ring-brand-100' : 'border-slate-200 hover:border-brand-500'
                  }`}>
                  <span className="text-xl">{c.icon}</span>
                  <span className="mt-1 text-sm font-semibold leading-tight">{c.name}</span>
                  <span className="mt-0.5 text-[11px] leading-tight text-slate-500">{c.hint}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Details */}
          <section className="card space-y-4 p-4">
            <div>
              <label className="label" htmlFor="desc">Description</label>
              <textarea id="desc" className="input min-h-[90px]" maxLength={2000}
                placeholder={type === 'Suggestion' ? 'Share your idea…' : 'Briefly describe the issue…'}
                value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>

            <div>
              <span className="label">
                Photo <span className="font-normal text-slate-400">(optional)</span>
              </span>
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => pickPhoto(e.target.files?.[0])} />
              {preview ? (
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="Selected" className="h-20 w-20 rounded-lg object-cover ring-1 ring-slate-200" />
                  <button type="button" className="btn-secondary" onClick={clearPhoto}>Remove</button>
                </div>
              ) : (
                <button type="button" className="btn-secondary w-full border-dashed" onClick={() => fileRef.current?.click()}>
                  📷 Take or attach a photo
                </button>
              )}
            </div>
          </section>

          {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">{error}</div>}

          <button type="submit" className="btn-primary w-full py-3.5 text-base" disabled={busy}>
            {busy ? 'Submitting…' : 'Submit'}
          </button>
        </form>
      </main>
    </>
  );
}

'use client';

import { useState } from 'react';
import type { Staff } from '@/lib/types';

const OTHER = '__other';

/** Dropdown of designated staff, with an "Other" option to type any housekeeping person's name. */
export default function StaffPicker({
  staff,
  value,
  onChange,
  id,
}: {
  staff: Staff[];
  value: string;
  onChange: (name: string) => void;
  id?: string;
}) {
  const names = staff.filter((s) => s.active).map((s) => s.name);
  const [other, setOther] = useState(value !== '' && !names.includes(value));

  return (
    <div className="space-y-2">
      <select
        id={id}
        className="input"
        value={other ? OTHER : value}
        onChange={(e) => {
          if (e.target.value === OTHER) {
            setOther(true);
            onChange('');
          } else {
            setOther(false);
            onChange(e.target.value);
          }
        }}
      >
        <option value="">Select staff member…</option>
        {names.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
        <option value={OTHER}>Other housekeeping person…</option>
      </select>
      {other && (
        <input className="input" placeholder="Type the person's name" value={value} onChange={(e) => onChange(e.target.value)} autoFocus />
      )}
    </div>
  );
}

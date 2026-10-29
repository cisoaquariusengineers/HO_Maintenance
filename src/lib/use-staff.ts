'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from './api-client';
import type { Staff } from './types';

export function useStaff() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const reload = useCallback(() => {
    api<{ staff: Staff[] }>('/api/staff')
      .then((d) => setStaff(d.staff))
      .catch(() => undefined);
  }, []);
  useEffect(reload, [reload]);
  return { staff, reload };
}

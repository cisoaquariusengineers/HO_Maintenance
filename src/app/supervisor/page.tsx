'use client';

import { useCallback, useState } from 'react';
import Header from '@/components/Header';
import NotificationBell from '@/components/NotificationBell';
import TicketDrawer from '@/components/TicketDrawer';
import TicketList from '@/components/TicketList';
import { useStaff } from '@/lib/use-staff';

export default function SupervisorPage() {
  const { staff } = useStaff();
  const [selected, setSelected] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);
  const closeDrawer = useCallback(() => setSelected(null), []);

  return (
    <>
      <Header title="Supervisor Dashboard">
        <button onClick={refresh} className="rounded-full p-2 hover:bg-brand-700" aria-label="Refresh" title="Refresh">
          ⟳
        </button>
        <NotificationBell role="supervisor" onOpenTicket={setSelected} onNew={refresh} />
      </Header>

      <main className="mx-auto max-w-6xl px-4 py-5">
        <TicketList scope="complaints" staff={staff} refreshKey={refreshKey} onSelect={setSelected} />
      </main>

      {selected !== null && (
        <TicketDrawer
          ticketId={selected}
          role="supervisor"
          staff={staff}
          onClose={closeDrawer}
          onChanged={refresh}
        />
      )}
    </>
  );
}

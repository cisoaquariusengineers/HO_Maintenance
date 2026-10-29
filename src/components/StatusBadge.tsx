import { STATUS_LABEL, type Status } from '@/lib/constants';

const STYLES: Record<Status, string> = {
  Open: 'bg-sky-100 text-sky-800 ring-sky-200',
  'In Progress': 'bg-amber-100 text-amber-800 ring-amber-200',
  Pending: 'bg-red-100 text-red-800 ring-red-200',
  Closed: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
};

export default function StatusBadge({ status, short = false }: { status: Status; short?: boolean }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${STYLES[status]}`}>
      {short ? status : STATUS_LABEL[status]}
    </span>
  );
}

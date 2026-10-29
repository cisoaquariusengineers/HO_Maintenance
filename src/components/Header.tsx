export default function Header({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 bg-brand-600 text-white shadow">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-wider text-brand-100">Aquarius House · HO Helpdesk</div>
          <h1 className="truncate text-lg font-semibold leading-tight">{title}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">{children}</div>
      </div>
    </header>
  );
}

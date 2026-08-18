export function Card({
  title,
  right,
  children,
}: {
  title?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface">
      {(title || right) && (
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h3 className="text-sm font-semibold tracking-wide text-ink">{title}</h3>
          {right}
        </div>
      )}
      <div className="px-5 pt-1 pb-5">{children}</div>
    </div>
  );
}

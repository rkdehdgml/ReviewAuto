export function Badge({
  tone = "ok",
  children,
}: {
  tone?: "ok" | "warn" | "danger";
  children: React.ReactNode;
}) {
  const classes =
    tone === "ok"
      ? "bg-ok-soft text-accent-dark"
      : tone === "warn"
        ? "bg-warn-soft text-warn"
        : "bg-danger-soft text-danger";

  return (
    <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${classes}`}>{children}</span>
  );
}

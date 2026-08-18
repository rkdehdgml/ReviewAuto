import { Header, type Step } from "./Header";

export function PageShell({
  current,
  maxWidth = "max-w-5xl",
  children,
}: {
  current?: Step;
  maxWidth?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header current={current} />
      <main className={`mx-auto w-full flex-1 ${maxWidth} px-5 py-6`}>{children}</main>
      <footer className="mx-auto w-full max-w-5xl px-5 pb-6 text-[11px] text-muted">
        자동화 범위는 임시저장까지입니다 — 발행은 항상 네이버에서 직접 진행합니다.
      </footer>
    </div>
  );
}

import Link from "next/link";

export type Step = "input" | "review" | "progress" | "done";

const STEPS: { key: Step; href: string; name: string; desc: string }[] = [
  { key: "input", href: "/", name: "입력", desc: "업체 · 가이드라인 · 사진" },
  { key: "review", href: "/review", name: "검수", desc: "초안 확인 · 수정" },
  { key: "progress", href: "/progress", name: "진행", desc: "임시저장 로그" },
  { key: "done", href: "/done", name: "완료", desc: "네이버에서 발행" },
];

/** current를 생략하면(설정 화면) 어떤 단계도 활성화되지 않은 채로 레일만 표시한다. */
export function Header({ current }: { current?: Step }) {
  const currentIndex = current ? STEPS.findIndex((s) => s.key === current) : -1;

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
        <div className="flex items-baseline gap-2.5">
          <Link href="/" className="font-display text-xl font-bold tracking-tight text-ink">
            Review<span className="text-accent">Auto</span>
          </Link>
          <span className="hidden text-xs text-muted sm:inline">체험단 리뷰 반자동화</span>
        </div>
        <Link
          href="/settings"
          className={`rounded-lg border border-line px-3 py-1.5 text-xs transition-colors hover:bg-page ${
            current === undefined ? "text-accent-dark" : "text-muted"
          }`}
        >
          ⚙ 설정
        </Link>
      </div>

      <nav className="mx-auto flex max-w-5xl items-center px-5 pb-3">
        {STEPS.map((step, i) => {
          const isCurrent = i === currentIndex;
          const isPassed = currentIndex > i;
          return (
            <div key={step.key} className="flex min-w-0 flex-1 items-center">
              <Link
                href={step.href}
                className={`min-w-0 flex-1 rounded-lg px-3 py-2 transition-colors ${isCurrent ? "bg-soft" : ""}`}
              >
                <div
                  className={`flex items-center gap-1.5 text-xs font-semibold ${
                    isCurrent ? "text-accent-dark" : isPassed ? "text-ink" : "text-muted"
                  }`}
                >
                  {isPassed && <span className="text-accent">✓</span>}
                  {step.name}
                </div>
                <div className="hidden truncate text-[11px] text-muted sm:block">{step.desc}</div>
              </Link>
              {i < STEPS.length - 1 && (
                <span className={`shrink-0 select-none px-1 ${isPassed ? "text-accent" : "text-line"}`} aria-hidden>
                  ›
                </span>
              )}
            </div>
          );
        })}
      </nav>
    </header>
  );
}

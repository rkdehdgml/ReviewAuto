import Link from "next/link";

export type Step = "input" | "review" | "progress" | "done";

const STEPS: { key: Step; label: string }[] = [
  { key: "input", label: "입력" },
  { key: "review", label: "검수" },
  { key: "progress", label: "진행" },
  { key: "done", label: "완료" },
];

export function StepRail({ current }: { current: Step }) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);

  return (
    <header className="flex items-center justify-between border-b border-hairline bg-surface px-6 py-3.5">
      <div className="flex items-center gap-8">
        <span className="font-display text-[15px] tracking-[0.02em] text-ink">리뷰오토</span>

        <nav className="flex items-center text-[13px]">
          {STEPS.map((step, i) => {
            const isDone = i < currentIndex;
            const isCurrent = i === currentIndex;
            return (
              <div key={step.key} className="flex items-center">
                {i > 0 && <span className="mx-3 h-px w-5 bg-hairline-strong" />}
                <span
                  className={`flex items-center gap-1.5 border-b pb-0.5 ${
                    isCurrent
                      ? "border-accent font-medium text-ink"
                      : isDone
                        ? "border-transparent text-ink-soft"
                        : "border-transparent text-ink-faint"
                  }`}
                >
                  <span className="font-mono text-[10px] tabular-nums text-ink-faint">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {step.label}
                  {isDone && <span className="text-accent">✓</span>}
                </span>
              </div>
            );
          })}
        </nav>
      </div>

      <Link
        href="/settings"
        className="rounded border border-hairline px-3 py-1.5 text-[13px] text-ink-soft transition-colors hover:border-hairline-strong hover:text-ink"
      >
        ⚙ 설정
      </Link>
    </header>
  );
}

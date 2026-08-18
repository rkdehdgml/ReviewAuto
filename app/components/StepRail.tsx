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
    <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-3">
      <nav className="flex items-center gap-2 text-sm">
        {STEPS.map((step, i) => {
          const isDone = i < currentIndex;
          const isCurrent = i === currentIndex;
          return (
            <div key={step.key} className="flex items-center gap-2">
              {i > 0 && <span className="text-neutral-300">›</span>}
              <span
                className={
                  isCurrent
                    ? "rounded-full bg-neutral-900 px-3 py-1 font-medium text-white"
                    : isDone
                      ? "rounded-full px-3 py-1 font-medium text-emerald-600"
                      : "rounded-full px-3 py-1 text-neutral-400"
                }
              >
                {isDone ? `✓ ${step.label}` : step.label}
              </span>
            </div>
          );
        })}
      </nav>
      <Link
        href="/settings"
        className="rounded-md border border-neutral-200 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50"
      >
        ⚙ 설정
      </Link>
    </header>
  );
}

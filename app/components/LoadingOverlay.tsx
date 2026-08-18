"use client";

import { useEffect, useState } from "react";

function ElapsedTimer() {
  const [sec, setSec] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      setSec(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const mm = String(Math.floor(sec / 60)).padStart(1, "0");
  const ss = String(sec % 60).padStart(2, "0");

  return (
    <div className="font-mono text-xs tabular-nums text-muted">
      경과 시간 {mm}:{ss}
    </div>
  );
}

export function LoadingOverlay({
  visible,
  stageText,
  onCancel,
}: {
  visible: boolean;
  stageText: string;
  onCancel?: () => void;
}) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/55 backdrop-blur-[2px]">
      <div className="flex min-w-[320px] flex-col items-center gap-4 rounded-2xl bg-surface px-10 py-9 shadow-2xl">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-soft border-t-accent" />
        <div className="text-base font-semibold text-ink">작업중...</div>
        <div className="text-sm text-muted">{stageText}</div>
        <ElapsedTimer key="elapsed-timer" />
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="mt-1 rounded-lg border border-line px-4 py-1.5 text-sm text-muted transition-colors hover:bg-page"
          >
            취소
          </button>
        )}
      </div>
    </div>
  );
}

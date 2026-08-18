"use client";

import { useEffect, useState } from "react";

function ElapsedTimer() {
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return <p className="font-mono text-xs tabular-nums text-ink-faint">경과 시간 {elapsedSec}초</p>;
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
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-paper/92 backdrop-blur-sm">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-hairline-strong border-t-accent" />
      <p className="font-display text-base text-ink">작업 중...</p>
      <p className="text-sm text-ink-soft">{stageText}</p>
      <ElapsedTimer key="elapsed-timer" />
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="mt-2 rounded border border-hairline px-4 py-1.5 text-sm text-ink-soft transition-colors hover:border-hairline-strong hover:text-ink"
        >
          취소
        </button>
      )}
    </div>
  );
}

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

  return <p className="text-xs tabular-nums text-neutral-400">경과 시간 {elapsedSec}초</p>;
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
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-white/80 backdrop-blur-sm">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-900" />
      <p className="text-base font-medium text-neutral-800">작업중...</p>
      <p className="text-sm text-neutral-500">{stageText}</p>
      <ElapsedTimer key="elapsed-timer" />
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="mt-2 rounded-md border border-neutral-300 px-4 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50"
        >
          취소
        </button>
      )}
    </div>
  );
}

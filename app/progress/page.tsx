"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { LoadingOverlay } from "../components/LoadingOverlay";
import { StepRail } from "../components/StepRail";
import { streamNdjson } from "../lib/stream-ndjson";
import { useSession } from "../providers";

type Status = "uploading" | "done" | "error";

export default function ProgressPage() {
  const router = useRouter();
  const { generateResult, input, setUploadResult } = useSession();

  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>("uploading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [screenshotFile, setScreenshotFile] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!generateResult) {
      router.replace("/");
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    streamNdjson(
      "/api/upload-draft",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftId: generateResult.draftId,
          businessName: input.businessName,
          draft: generateResult.draft,
        }),
        signal: controller.signal,
      },
      (event) => {
        if (event.stage === "uploading" && event.message) {
          setLogs((prev) => [...prev, event.message as string]);
        } else if (event.stage === "done") {
          setLogs((prev) => [...prev, event.message as string]);
          setStatus("done");
          setUploadResult({ success: true });
        } else if (event.stage === "error") {
          const message = event.error ?? "임시저장 중 오류가 발생했습니다.";
          setLogs((prev) => [...prev, `오류: ${message}`]);
          setStatus("error");
          setErrorMessage(message);
          setScreenshotFile((event.screenshotFile as string | undefined) ?? null);
          setUploadResult({ success: false, error: message, screenshotFile: event.screenshotFile as string | undefined });
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ).catch((err: any) => {
      if (err?.name === "AbortError") return;
      const message = err instanceof Error ? err.message : "임시저장 중 오류가 발생했습니다.";
      setLogs((prev) => [...prev, `오류: ${message}`]);
      setStatus("error");
      setErrorMessage(message);
      setUploadResult({ success: false, error: message });
    });
  }, [generateResult, input.businessName, router, setUploadResult]);

  if (!generateResult) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <StepRail current="progress" />
      <LoadingOverlay
        visible={status === "uploading"}
        stageText={logs[logs.length - 1] ?? "네이버 블로그에 임시저장하는 중..."}
        onCancel={() => abortControllerRef.current?.abort()}
      />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-6 py-10">
        <h1 className="font-display text-2xl text-ink">
          {status === "uploading" && "임시저장 진행 중"}
          {status === "done" && "임시저장 완료"}
          {status === "error" && "임시저장 실패"}
        </h1>

        <div className="flex flex-col gap-1 rounded border border-hairline bg-ink p-4 font-mono text-xs text-paper/85">
          {logs.length === 0 && <span className="text-paper/40">대기 중...</span>}
          {logs.map((line, i) => (
            <span key={i}>{line}</span>
          ))}
        </div>

        {status === "error" && (
          <div className="rounded border border-danger/25 bg-danger-soft p-4 text-sm text-danger">
            <p>{errorMessage}</p>
            {screenshotFile && (
              <div className="mt-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/screenshot?file=${encodeURIComponent(screenshotFile)}`}
                  alt="실패 시점 스크린샷"
                  className="max-w-full rounded border border-danger/25"
                />
              </div>
            )}
          </div>
        )}

        {status === "done" && (
          <button
            type="button"
            onClick={() => router.push("/done")}
            className="self-start rounded bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            완료 화면으로
          </button>
        )}
        {status === "error" && (
          <button
            type="button"
            onClick={() => router.push("/review")}
            className="self-start rounded border border-hairline px-5 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:border-hairline-strong hover:text-ink"
          >
            검수 화면으로 돌아가기
          </button>
        )}
      </main>
    </div>
  );
}

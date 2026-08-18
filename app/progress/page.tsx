"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "../components/Badge";
import { Card } from "../components/Card";
import { LoadingOverlay } from "../components/LoadingOverlay";
import { PageShell } from "../components/PageShell";
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
  const logBoxRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    logBoxRef.current?.scrollTo(0, logBoxRef.current.scrollHeight);
  }, [logs]);

  if (!generateResult) return null;

  return (
    <PageShell current="progress" maxWidth="max-w-2xl">
      <LoadingOverlay
        visible={status === "uploading"}
        stageText={logs[logs.length - 1] ?? "네이버 블로그에 임시저장하는 중..."}
        onCancel={() => abortControllerRef.current?.abort()}
      />

      <div className="flex flex-col gap-4">
        <Card
          title="임시저장 진행 로그"
          right={
            <Badge tone={status === "done" ? "ok" : status === "error" ? "danger" : "warn"}>
              {status === "done" ? "완료" : status === "error" ? "실패" : "진행 중"}
            </Badge>
          }
        >
          <div ref={logBoxRef} className="h-64 overflow-y-auto rounded-lg bg-ink p-4 font-mono text-xs leading-6 text-[#c8e6cf]">
            {logs.map((line, i) => (
              <div key={i} className={line.startsWith("오류") ? "text-[#f0a89e]" : undefined}>
                <span className="text-[#5a7060]">{String(i + 1).padStart(2, "0")} </span>
                {line}
              </div>
            ))}
            {status === "uploading" && <div className="animate-pulse">▌</div>}
          </div>
        </Card>

        {status === "error" && (
          <div className="rounded-lg border border-danger/25 bg-danger-soft p-4 text-sm text-danger">
            <p>{errorMessage}</p>
            {screenshotFile && (
              <div className="mt-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/screenshot?file=${encodeURIComponent(screenshotFile)}`}
                  alt="실패 시점 스크린샷"
                  className="max-w-full rounded-lg border border-danger/25"
                />
              </div>
            )}
          </div>
        )}

        {status === "done" && (
          <button
            type="button"
            onClick={() => router.push("/done")}
            className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-white transition hover:opacity-90"
          >
            완료 화면으로
          </button>
        )}
        {status === "error" && (
          <button
            type="button"
            onClick={() => router.push("/review")}
            className="w-full rounded-xl border border-line py-3 text-sm font-medium text-ink transition hover:bg-page"
          >
            검수 화면으로 돌아가기
          </button>
        )}
      </div>
    </PageShell>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { LoadingOverlay } from "../components/LoadingOverlay";
import type { EnvStatus, StyleProfile } from "../../lib/types";

const STALE_DAYS = 90;

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

function StatusRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className={`flex items-center gap-2 ${ok ? "text-success" : "text-ink-faint"}`}>
      <span>{ok ? "✓" : "✗"}</span>
      <span>{label}</span>
    </li>
  );
}

export default function SettingsPage() {
  const [status, setStatus] = useState<EnvStatus | null>(null);
  const [profile, setProfile] = useState<StyleProfile | null>(null);
  const [blogUrl, setBlogUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    fetch("/api/status")
      .then((res) => res.json())
      .then(setStatus)
      .catch(() => undefined);
    fetch("/api/style-profile")
      .then((res) => res.json())
      .then((data) => {
        setProfile(data.profile);
        if (data.profile?.blogUrl) setBlogUrl(data.profile.blogUrl);
      })
      .catch(() => undefined);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleAnalyze() {
    if (!blogUrl.trim()) {
      setError("네이버 블로그 주소를 입력해주세요.");
      return;
    }
    setError(null);
    setAnalyzing(true);
    try {
      const res = await fetch("/api/style-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blogUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        // 갱신 실패 시 기존 프로필 유지 — 서버가 실패 시 파일을 덮어쓰지 않으므로 여기서도 profile을 바꾸지 않는다.
        setError(data.error ?? "문체 분석에 실패했습니다.");
        return;
      }
      setProfile(data.profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "문체 분석 중 오류가 발생했습니다.");
    } finally {
      setAnalyzing(false);
    }
  }

  const isStale = profile ? daysSince(profile.analyzedAt) > STALE_DAYS : false;

  return (
    <div className="flex min-h-screen flex-col">
      <LoadingOverlay visible={analyzing} stageText="문체 분석 중..." />

      <header className="flex items-center justify-between border-b border-hairline bg-surface px-6 py-3.5">
        <h1 className="font-display text-[15px] text-ink">설정</h1>
        <Link href="/" className="text-[13px] text-ink-soft underline decoration-hairline-strong hover:text-ink">
          ← 입력 화면으로
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-9 px-6 py-10">
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-base text-ink">환경 체크</h2>
          {status ? (
            <>
              <ul className="flex flex-col gap-1 text-sm">
                <StatusRow ok={status.claudeCliInstalled} label="Claude Code CLI 설치됨" />
                <StatusRow ok={status.claudeCliLoggedIn} label="Claude Code 로그인됨" />
                <StatusRow ok={status.naverSessionExists} label="네이버 로그인 세션 (npm run login)" />
                <StatusRow ok={status.naverSearchApiConfigured} label="네이버 지역 검색 API 키 (.env)" />
              </ul>
              {status.anthropicApiKeyWarning && (
                <p className="rounded border border-warning/25 bg-warning-soft px-3 py-2 text-xs text-warning">
                  ⚠ ANTHROPIC_API_KEY 환경 변수가 설정되어 있습니다. claude -p가 Pro 구독 대신 API 과금으로
                  동작합니다.
                </p>
              )}
              {!status.naverSessionExists && (
                <p className="text-xs text-ink-faint">
                  터미널에서 <code className="rounded bg-paper px-1">npm run login</code>을 실행해 네이버에
                  로그인해주세요.
                </p>
              )}
              {!status.naverSearchApiConfigured && (
                <p className="text-xs text-ink-faint">
                  .env.example을 .env로 복사하고 NAVER_CLIENT_ID / NAVER_CLIENT_SECRET을 채워주세요. (없어도 가게
                  정보 없이 진행할 수 있습니다)
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-ink-faint">확인 중...</p>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display text-base text-ink">문체 프로필</h2>

          <div className="rounded border border-hairline bg-surface p-4 text-sm">
            {profile ? (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-ink">분석 완료</span>
                  {isStale && (
                    <span className="rounded-full bg-warning-soft px-2 py-0.5 text-xs text-warning">갱신 권장</span>
                  )}
                </div>
                <p className="text-xs text-ink-faint">
                  분석 일시: {new Date(profile.analyzedAt).toLocaleString()} · 글 {profile.sourcePostCount}개 분석
                </p>
                <p className="mt-2 text-ink-soft">{profile.profile.tone}</p>
              </div>
            ) : (
              <p className="text-ink-faint">아직 분석 전입니다.</p>
            )}
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-ink-soft">네이버 블로그 주소</span>
            <input
              className="rounded border border-hairline bg-surface px-3 py-2 text-ink outline-none placeholder:text-ink-faint focus:border-accent"
              placeholder="https://blog.naver.com/내아이디"
              value={blogUrl}
              onChange={(e) => setBlogUrl(e.target.value)}
            />
          </label>

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={analyzing}
            className="self-start rounded bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {profile ? "프로필 갱신" : "프로필 생성"}
          </button>
        </section>
      </main>
    </div>
  );
}

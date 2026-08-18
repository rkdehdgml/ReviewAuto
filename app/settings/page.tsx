"use client";

import { useEffect, useState } from "react";

import { Badge } from "../components/Badge";
import { Card } from "../components/Card";
import { LoadingOverlay } from "../components/LoadingOverlay";
import { PageShell } from "../components/PageShell";
import type { EnvStatus, StyleProfile } from "../../lib/types";

const STALE_DAYS = 90;

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
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

  const envRows = status
    ? [
        { name: "Claude Code 로그인", detail: status.claudeCliInstalled ? "Pro 구독 인증 확인됨" : "claude CLI 미설치", ok: status.claudeCliInstalled && status.claudeCliLoggedIn },
        { name: "네이버 세션", detail: status.naverSessionExists ? "저장된 세션 유효" : "npm run login 필요", ok: status.naverSessionExists },
        { name: "지역검색 API 키", detail: status.naverSearchApiConfigured ? ".env 설정 확인됨" : "미설정 — 없어도 진행 가능", ok: status.naverSearchApiConfigured },
        {
          name: "ANTHROPIC_API_KEY",
          detail: status.anthropicApiKeyWarning ? "설정됨 — 구독 대신 API 과금 발생" : "환경 변수 없음 (정상 — 구독 과금 방지)",
          ok: !status.anthropicApiKeyWarning,
        },
      ]
    : [];
  const allOk = envRows.every((r) => r.ok);

  return (
    <PageShell>
      <LoadingOverlay visible={analyzing} stageText="문체 분석 중..." />

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="환경 체크" right={status && <Badge tone={allOk ? "ok" : "warn"}>{allOk ? "모두 정상" : "확인 필요"}</Badge>}>
          {status ? (
            <ul className="flex flex-col gap-2.5 text-sm">
              {envRows.map((r) => (
                <li key={r.name} className="flex items-center justify-between gap-3 border-b border-soft py-1.5 last:border-0">
                  <div>
                    <div className="text-ink">{r.name}</div>
                    <div className="text-xs text-muted">{r.detail}</div>
                  </div>
                  <Badge tone={r.ok ? "ok" : "warn"}>{r.ok ? "정상" : "확인 필요"}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">확인 중...</p>
          )}
        </Card>

        <Card title="문체 프로필" right={profile && <Badge tone={isStale ? "warn" : "ok"}>{isStale ? "갱신 권장" : "최신"}</Badge>}>
          {profile ? (
            <div className="flex flex-col gap-1.5 text-sm text-ink">
              <div className="flex justify-between">
                <span className="text-muted">블로그</span>
                <span className="truncate">{profile.blogUrl.replace(/^https?:\/\//, "")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">분석 일시</span>
                <span>{new Date(profile.analyzedAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">분석 글 수</span>
                <span>{profile.sourcePostCount}개</span>
              </div>
              <div className="mt-3 rounded-lg bg-soft p-3 text-sm leading-relaxed text-ink">
                <span className="mb-1 block text-xs font-semibold text-accent-dark">문체 요약</span>
                {profile.profile.tone}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted">아직 분석 전입니다.</p>
          )}

          {error && <p className="mt-3 text-sm text-danger">{error}</p>}

          <label className="mt-4 flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-muted">네이버 블로그 주소</span>
            <input
              className="rounded-lg border border-line px-3 py-2 text-ink outline-none focus:ring-2 focus:ring-accent-soft"
              placeholder="https://blog.naver.com/내아이디"
              value={blogUrl}
              onChange={(e) => setBlogUrl(e.target.value)}
            />
          </label>

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={analyzing}
            className="mt-4 w-full rounded-lg bg-accent py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {profile ? "프로필 갱신" : "프로필 생성"}
          </button>
          <p className="mt-2 text-xs text-muted">
            RSS에서 최근 글을 다시 수집해 문체를 재분석합니다. 실패 시 기존 프로필이 유지됩니다.
          </p>
        </Card>
      </div>
    </PageShell>
  );
}

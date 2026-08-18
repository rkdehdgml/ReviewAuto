"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Card } from "../components/Card";
import { PageShell } from "../components/PageShell";
import { useSession } from "../providers";
import { countChars } from "../../lib/validate";

export default function DonePage() {
  const router = useRouter();
  const { generateResult, uploadResult, input, resetSession } = useSession();
  const [blogUrl, setBlogUrl] = useState("https://blog.naver.com");

  useEffect(() => {
    if (!generateResult || !uploadResult?.success) {
      router.replace("/");
      return;
    }
    fetch("/api/style-profile")
      .then((res) => res.json())
      .then((data) => {
        if (data?.profile?.blogUrl) setBlogUrl(data.profile.blogUrl);
      })
      .catch(() => undefined);
  }, [generateResult, uploadResult, router]);

  if (!generateResult || !uploadResult?.success) return null;

  const { draft, photoFiles } = generateResult;
  const { charCountNoSpace } = countChars(draft);

  function handleNewReview() {
    resetSession();
    router.push("/");
  }

  const rows: [string, string][] = [
    ["업체", input.businessName],
    ["제목", draft.title],
    ["글자수", `${charCountNoSpace}자 (공백 제외)`],
    ["사진", `${photoFiles.length}장 배치 완료`],
    ["저장 위치", "네이버 블로그 임시저장함"],
  ];

  return (
    <PageShell current="done" maxWidth="max-w-2xl">
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-accent/25 bg-accent-soft p-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-2xl text-white">
            ✓
          </div>
          <div className="font-semibold text-accent-dark">임시저장이 완료되었습니다</div>
          <div className="mt-1.5 text-sm text-muted">
            네이버 블로그 → 임시저장 글에서 최종 확인 후 직접 발행해 주세요.
          </div>
        </div>

        <Card title="이번 리뷰 요약">
          <ul className="flex flex-col gap-2 text-sm">
            {rows.map(([k, v]) => (
              <li key={k} className="flex justify-between gap-4 border-b border-soft py-1.5 last:border-0">
                <span className="shrink-0 text-muted">{k}</span>
                <span className="text-right text-ink">{v}</span>
              </li>
            ))}
          </ul>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <a
            href={blogUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-line py-3 text-center text-sm font-medium text-ink transition hover:bg-surface"
          >
            네이버 임시저장함 열기
          </a>
          <button
            type="button"
            onClick={handleNewReview}
            className="rounded-xl bg-ink py-3 text-sm font-semibold text-white transition hover:opacity-90"
          >
            새 리뷰 작성
          </button>
        </div>
      </div>
    </PageShell>
  );
}

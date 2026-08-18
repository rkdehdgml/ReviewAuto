"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { StepRail } from "../components/StepRail";
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

  return (
    <div className="flex min-h-screen flex-col">
      <StepRail current="done" />

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-10">
        <div className="rounded border border-success/25 bg-success-soft p-4 text-success">
          <p className="font-display text-base">임시저장에 성공했습니다</p>
          <p className="mt-1 text-sm text-ink-soft">네이버에서 임시저장 글을 열어 최종 확인 후 직접 발행해주세요.</p>
        </div>

        <div className="rounded border border-hairline bg-surface p-4 text-sm">
          <h2 className="mb-3 font-display text-base text-ink">이번 리뷰 요약</h2>
          <dl className="grid grid-cols-[100px_1fr] gap-y-2.5">
            <dt className="text-ink-faint">업체</dt>
            <dd className="text-ink">{input.businessName}</dd>
            <dt className="text-ink-faint">제목</dt>
            <dd className="text-ink">{draft.title}</dd>
            <dt className="text-ink-faint">글자수</dt>
            <dd className="text-ink">{charCountNoSpace}자 (공백 제외)</dd>
            <dt className="text-ink-faint">사진 수</dt>
            <dd className="text-ink">{photoFiles.length}장</dd>
            <dt className="text-ink-faint">저장 위치</dt>
            <dd className="text-ink">네이버 블로그 임시저장함</dd>
          </dl>
        </div>

        <div className="flex gap-3">
          <a
            href={blogUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            네이버 임시저장함 열기
          </a>
          <button
            type="button"
            onClick={handleNewReview}
            className="rounded border border-hairline px-5 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:border-hairline-strong hover:text-ink"
          >
            새 리뷰 작성
          </button>
        </div>
      </main>
    </div>
  );
}

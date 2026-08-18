"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

import { StepRail } from "../components/StepRail";
import { getObjectUrl } from "../lib/object-url";
import { useSession } from "../providers";
import type { Draft, DraftBlock } from "../../lib/types";
import { countChars, countKeywords } from "../../lib/validate";

export default function ReviewPage() {
  const router = useRouter();
  const { generateResult, setGenerateResult, photos, input } = useSession();

  useEffect(() => {
    if (!generateResult) router.replace("/");
  }, [generateResult, router]);

  const photoByName = useMemo(() => new Map(photos.map((p) => [p.file.name, p.file])), [photos]);

  if (!generateResult) return null;

  const { draft } = generateResult;

  function updateDraft(next: Draft) {
    setGenerateResult({ ...generateResult!, draft: next });
  }

  function updateBlock(index: number, block: DraftBlock) {
    const blocks = draft.blocks.slice();
    blocks[index] = block;
    updateDraft({ ...draft, blocks });
  }

  function moveBlock(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= draft.blocks.length) return;
    const blocks = draft.blocks.slice();
    [blocks[index], blocks[target]] = [blocks[target], blocks[index]];
    updateDraft({ ...draft, blocks });
  }

  const liveKeywordCounts = countKeywords(draft, Object.keys(draft.validation.keywordCounts));
  const { charCount, charCountNoSpace } = countChars(draft);
  const minCharRequired = draft.validation.minCharRequired || 1000;

  return (
    <div className="flex min-h-screen flex-col">
      <StepRail current="review" />

      <main className="mx-auto grid w-full max-w-5xl flex-1 grid-cols-[1fr_280px] gap-8 px-6 py-10">
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink-soft">제목</span>
            <input
              className="rounded border border-hairline bg-surface px-3 py-2 font-display text-lg text-ink outline-none focus:border-accent"
              value={draft.title}
              onChange={(e) => updateDraft({ ...draft, title: e.target.value })}
            />
          </label>

          <ul className="flex flex-col gap-3">
            {draft.blocks.map((block, i) => (
              <li key={i} className="rounded border border-hairline bg-surface p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-[11px] tracking-wide text-ink-faint">
                    {block.type === "text" ? "TEXT" : "IMAGE"} · {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex gap-2 text-xs text-ink-faint">
                    <button type="button" onClick={() => moveBlock(i, -1)} className="hover:text-ink">
                      ↑
                    </button>
                    <button type="button" onClick={() => moveBlock(i, 1)} className="hover:text-ink">
                      ↓
                    </button>
                  </div>
                </div>

                {block.type === "text" ? (
                  <textarea
                    className="min-h-24 w-full rounded border border-hairline bg-paper px-2.5 py-2 text-sm text-ink outline-none focus:border-accent"
                    value={block.content}
                    onChange={(e) => updateBlock(i, { ...block, content: e.target.value })}
                  />
                ) : (
                  <div className="flex items-center gap-3">
                    {photoByName.has(block.file) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getObjectUrl(photoByName.get(block.file)!)}
                        alt={block.file}
                        className="h-20 w-20 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded bg-paper text-xs text-ink-faint">
                        {block.file}
                      </div>
                    )}
                    <input
                      className="flex-1 rounded border border-hairline bg-paper px-2.5 py-2 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-accent"
                      placeholder="캡션 (선택)"
                      value={block.caption ?? ""}
                      onChange={(e) => updateBlock(i, { ...block, caption: e.target.value })}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => router.push("/progress")}
            className="self-start rounded bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            임시저장 실행
          </button>
        </div>

        <aside className="flex h-fit flex-col gap-5 rounded border border-hairline bg-surface p-4 text-sm">
          <h2 className="font-display text-base text-ink">검증</h2>

          <div>
            <p className="mb-1 text-xs font-medium tracking-wide text-ink-faint uppercase">글자수 (공백 제외)</p>
            <p className={charCountNoSpace >= minCharRequired ? "text-success" : "text-danger"}>
              {charCountNoSpace}자 / 최소 {minCharRequired}자
              <span className="text-ink-faint"> · 전체 {charCount}자</span>
            </p>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium tracking-wide text-ink-faint uppercase">키워드</p>
            <ul className="flex flex-col gap-0.5">
              {Object.entries(liveKeywordCounts).map(([kw, count]) => (
                <li key={kw} className={count > 0 ? "text-success" : "text-danger"}>
                  {count > 0 ? "✓" : "✗"} {kw} ({count}회)
                </li>
              ))}
              {Object.keys(liveKeywordCounts).length === 0 && <li className="text-ink-faint">키워드 없음</li>}
            </ul>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium tracking-wide text-ink-faint uppercase">공정위 문구</p>
            <p className={draft.disclosure.trim() ? "text-success" : "text-danger"}>
              {draft.disclosure.trim() ? `✓ ${draft.disclosure}` : "✗ 없음"}
            </p>
          </div>

          <div className="border-t border-hairline pt-4">
            <p className="mb-1 text-xs font-medium tracking-wide text-ink-faint uppercase">업체</p>
            <p className="text-ink-soft">{input.businessName}</p>
          </div>
        </aside>
      </main>
    </div>
  );
}

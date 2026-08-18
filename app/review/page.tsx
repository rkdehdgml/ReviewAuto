"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

import { StepRail } from "../components/StepRail";
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

      <main className="mx-auto grid w-full max-w-5xl flex-1 grid-cols-[1fr_280px] gap-6 px-6 py-8">
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-700">제목</span>
            <input
              className="rounded-md border border-neutral-300 px-3 py-2 font-medium"
              value={draft.title}
              onChange={(e) => updateDraft({ ...draft, title: e.target.value })}
            />
          </label>

          <ul className="flex flex-col gap-3">
            {draft.blocks.map((block, i) => (
              <li key={i} className="rounded-md border border-neutral-200 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-neutral-400">
                    {block.type === "text" ? "텍스트" : "사진"} #{i + 1}
                  </span>
                  <div className="flex gap-2 text-xs text-neutral-500">
                    <button type="button" onClick={() => moveBlock(i, -1)}>
                      ↑
                    </button>
                    <button type="button" onClick={() => moveBlock(i, 1)}>
                      ↓
                    </button>
                  </div>
                </div>

                {block.type === "text" ? (
                  <textarea
                    className="min-h-24 w-full rounded border border-neutral-200 px-2 py-1.5 text-sm"
                    value={block.content}
                    onChange={(e) => updateBlock(i, { ...block, content: e.target.value })}
                  />
                ) : (
                  <div className="flex items-center gap-3">
                    {photoByName.has(block.file) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={URL.createObjectURL(photoByName.get(block.file)!)}
                        alt={block.file}
                        className="h-20 w-20 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded bg-neutral-100 text-xs text-neutral-400">
                        {block.file}
                      </div>
                    )}
                    <input
                      className="flex-1 rounded border border-neutral-200 px-2 py-1.5 text-sm"
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
            className="self-start rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
          >
            임시저장 실행
          </button>
        </div>

        <aside className="flex flex-col gap-4 rounded-md border border-neutral-200 p-4 text-sm">
          <h2 className="font-semibold">검증</h2>

          <div>
            <p className="mb-1 font-medium text-neutral-600">글자수 (공백 제외)</p>
            <p className={charCountNoSpace >= minCharRequired ? "text-emerald-600" : "text-red-600"}>
              {charCountNoSpace}자 / 최소 {minCharRequired}자 (전체 {charCount}자)
            </p>
          </div>

          <div>
            <p className="mb-1 font-medium text-neutral-600">키워드</p>
            <ul className="flex flex-col gap-0.5">
              {Object.entries(liveKeywordCounts).map(([kw, count]) => (
                <li key={kw} className={count > 0 ? "text-emerald-600" : "text-red-600"}>
                  {count > 0 ? "✓" : "✗"} {kw} ({count}회)
                </li>
              ))}
              {Object.keys(liveKeywordCounts).length === 0 && <li className="text-neutral-400">키워드 없음</li>}
            </ul>
          </div>

          <div>
            <p className="mb-1 font-medium text-neutral-600">공정위 문구</p>
            <p className={draft.disclosure.trim() ? "text-emerald-600" : "text-red-600"}>
              {draft.disclosure.trim() ? `✓ ${draft.disclosure}` : "✗ 없음"}
            </p>
          </div>

          <div>
            <p className="mb-1 font-medium text-neutral-600">업체</p>
            <p className="text-neutral-500">{input.businessName}</p>
          </div>
        </aside>
      </main>
    </div>
  );
}

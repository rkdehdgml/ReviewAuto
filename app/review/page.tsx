"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "../components/Badge";
import { Card } from "../components/Card";
import { PageShell } from "../components/PageShell";
import { getObjectUrl } from "../lib/object-url";
import { useSession } from "../providers";
import type { Draft, DraftBlock } from "../../lib/types";
import { countChars, countKeywords } from "../../lib/validate";

export default function ReviewPage() {
  const router = useRouter();
  const { generateResult, setGenerateResult, photos } = useSession();
  const [editing, setEditing] = useState<number | null>(null);

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

  const checks = [
    ...Object.entries(liveKeywordCounts).map(([kw, count]) => ({
      label: `'${kw}' 키워드`,
      ok: count > 0,
      val: `${count}회`,
    })),
    {
      label: `글자수 (공백 제외 ${minCharRequired}자 이상)`,
      ok: charCountNoSpace >= minCharRequired,
      val: `${charCountNoSpace}자`,
    },
    { label: "공정위 문구", ok: draft.disclosure.trim().length > 0, val: draft.disclosure.trim() ? "포함" : "없음" },
  ];

  return (
    <PageShell current="review" maxWidth="max-w-6xl">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="초안 미리보기 — 문단을 눌러 수정" right={<span className="text-xs text-muted">▲▼로 순서 변경</span>}>
            <div className="rounded-lg border border-soft bg-page/40 p-5">
              <div className="mb-4 border-b border-soft pb-3">
                <input
                  value={draft.title}
                  onChange={(e) => updateDraft({ ...draft, title: e.target.value })}
                  className="w-full font-display text-lg leading-snug font-bold text-ink outline-none"
                />
                <div className="mt-2 inline-block rounded bg-soft px-2 py-1 text-xs text-muted">
                  {draft.disclosure || "공정위 문구 없음"}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {draft.blocks.map((block, i) => (
                  <div key={i} className={`group relative rounded-lg ${editing === i ? "bg-accent-soft" : ""}`}>
                    <div className="absolute -left-1 top-1 flex flex-col gap-0.5 opacity-0 transition group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => moveBlock(i, -1)}
                        className="h-5 w-5 rounded border border-line bg-surface text-xs text-muted"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => moveBlock(i, 1)}
                        className="h-5 w-5 rounded border border-line bg-surface text-xs text-muted"
                      >
                        ▼
                      </button>
                    </div>

                    {block.type === "text" ? (
                      editing === i ? (
                        <textarea
                          autoFocus
                          rows={3}
                          defaultValue={block.content}
                          onBlur={(e) => {
                            updateBlock(i, { ...block, content: e.target.value });
                            setEditing(null);
                          }}
                          className="w-full rounded-lg border border-accent px-3 py-2 text-sm leading-relaxed text-ink outline-none"
                        />
                      ) : (
                        <p
                          onClick={() => setEditing(i)}
                          className="cursor-text rounded-lg px-3 py-1.5 text-sm leading-relaxed text-ink hover:bg-page"
                        >
                          {block.content}
                        </p>
                      )
                    ) : (
                      <div className="flex items-center gap-3 px-3 py-1.5">
                        {photoByName.has(block.file) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={getObjectUrl(photoByName.get(block.file)!)}
                            alt={block.file}
                            className="h-16 w-24 shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-lg bg-soft text-xs text-muted">
                            {block.file}
                          </div>
                        )}
                        <div className="min-w-0 flex-1 text-xs text-muted">
                          <div className="font-medium text-ink">{block.file}</div>
                          <input
                            value={block.caption ?? ""}
                            onChange={(e) => updateBlock(i, { ...block, caption: e.target.value })}
                            placeholder="캡션 (선택)"
                            className="mt-0.5 w-full rounded border border-transparent bg-transparent italic outline-none focus:border-line focus:bg-surface focus:px-1.5 focus:py-0.5"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card title="자동 검증">
            <ul className="flex flex-col gap-2 text-sm">
              {checks.map((c) => (
                <li key={c.label} className="flex items-center justify-between border-b border-soft py-1.5 last:border-0">
                  <span className="text-ink">{c.label}</span>
                  <Badge tone={c.ok ? "ok" : "danger"}>{c.val}</Badge>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted">전체 {charCount}자 (공백 포함)</p>
          </Card>

          {draft.hashtags.length > 0 && (
            <Card title="해시태그">
              <div className="flex flex-wrap gap-1.5">
                {draft.hashtags.map((t) => (
                  <span key={t} className="rounded-full bg-soft px-2 py-1 text-xs text-accent-dark">
                    #{t}
                  </span>
                ))}
              </div>
            </Card>
          )}

          <button
            type="button"
            onClick={() => router.push("/progress")}
            className="w-full rounded-xl bg-ink py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            네이버 블로그 임시저장 실행
          </button>
          <p className="-mt-2 text-center text-xs text-muted">발행은 네이버에서 직접 진행합니다</p>
        </div>
      </div>
    </PageShell>
  );
}

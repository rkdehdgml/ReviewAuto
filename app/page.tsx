"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Card } from "./components/Card";
import { LoadingOverlay } from "./components/LoadingOverlay";
import { PageShell } from "./components/PageShell";
import { getObjectUrl } from "./lib/object-url";
import { streamNdjson } from "./lib/stream-ndjson";
import { type PhotoInput, useSession } from "./providers";
import type { PlaceResult } from "../lib/types";

type PlaceSearchState =
  | { kind: "idle" }
  | { kind: "searching" }
  | { kind: "results"; results: PlaceResult[] }
  | { kind: "empty" }
  | { kind: "failed" };

const fieldInput =
  "rounded-lg border border-line px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-accent-soft";
const fieldLabel = "flex flex-col gap-1 text-xs text-muted";

export default function InputPage() {
  const router = useRouter();
  const { input, setInput, place, setPlace, photos, setPhotos, setGenerateResult } = useSession();

  const [searchState, setSearchState] = useState<PlaceSearchState>({ kind: "idle" });
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stageText, setStageText] = useState("");

  const abortControllerRef = useRef<AbortController | null>(null);

  const hasBusinessName = Boolean(input.businessName.trim());

  async function runPlaceSearch() {
    setSearchState({ kind: "searching" });
    try {
      const params = new URLSearchParams({ businessName: input.businessName, location: input.location });
      const res = await fetch(`/api/place-search?${params}`);
      const data = await res.json();
      const results: PlaceResult[] = data.results ?? [];
      setSearchState(results.length > 0 ? { kind: "results", results } : { kind: "empty" });
    } catch {
      setSearchState({ kind: "failed" });
    }
  }

  // 디바운스 자동 지역 검색 (~0.5초 후 트리거, 트리거 시점에 검색중 표시)
  useEffect(() => {
    if (!hasBusinessName) return;
    const timer = setTimeout(runPlaceSearch, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasBusinessName, input.businessName, input.location]);

  function addPhotos(files: FileList | File[]) {
    const newPhotos: PhotoInput[] = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .map((f) => ({ file: f, description: "" }));
    setPhotos([...photos, ...newPhotos]);
  }

  function movePhoto(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= photos.length) return;
    const next = photos.slice();
    [next[index], next[target]] = [next[target], next[index]];
    setPhotos(next);
  }

  function removePhoto(index: number) {
    setPhotos(photos.filter((_, i) => i !== index));
  }

  function updateDescription(index: number, description: string) {
    const next = photos.slice();
    next[index] = { ...next[index], description };
    setPhotos(next);
  }

  async function handleSubmit() {
    setError(null);
    if (!input.businessName.trim()) {
      setError("업체명을 입력해주세요.");
      return;
    }
    if (!input.guideline.trim()) {
      setError("가이드라인을 입력해주세요.");
      return;
    }

    const form = new FormData();
    form.set("businessName", input.businessName);
    form.set("location", input.location);
    form.set("guideline", input.guideline);
    form.set("memo", input.memo);
    form.set("place", place ? JSON.stringify(place) : "");
    form.set("photoMeta", JSON.stringify(photos.map((p) => ({ description: p.description }))));
    for (const p of photos) form.append("photos", p.file);

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setLoading(true);
    setStageText("초안 생성을 준비하는 중...");

    try {
      await streamNdjson(
        "/api/generate",
        { method: "POST", body: form, signal: controller.signal },
        (event) => {
          if (event.stage === "generating" && event.message) {
            setStageText(event.message);
          } else if (event.stage === "done") {
            setGenerateResult({
              draftId: event.draftId as string,
              draft: event.draft as import("../lib/types").Draft,
              validation: event.validation as import("../lib/validate").ValidationResult,
              photoFiles: photos.map((p) => p.file.name),
            });
            router.push("/review");
          } else if (event.stage === "error") {
            setError(event.error ?? "초안 생성 중 오류가 발생했습니다.");
          }
        }
      );
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError(err instanceof Error ? err.message : "초안 생성 중 오류가 발생했습니다.");
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }

  function handleCancel() {
    abortControllerRef.current?.abort();
  }

  return (
    <PageShell current="input">
      <LoadingOverlay visible={loading} stageText={stageText} onCancel={handleCancel} />

      {error && (
        <div className="mb-4 rounded-lg border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="flex flex-col gap-4 lg:col-span-3">
          <Card title="업체 정보">
            <div className="grid grid-cols-2 gap-3">
              <label className={fieldLabel}>
                업체명
                <input
                  className={fieldInput}
                  value={input.businessName}
                  onChange={(e) => {
                    setInput({ ...input, businessName: e.target.value });
                    setPlace(null);
                  }}
                  placeholder="예: 카페 리뷰오토"
                />
              </label>
              <label className={fieldLabel}>
                위치
                <input
                  className={fieldInput}
                  value={input.location}
                  onChange={(e) => {
                    setInput({ ...input, location: e.target.value });
                    setPlace(null);
                  }}
                  placeholder="예: 서울 강남구"
                />
              </label>
            </div>

            <div className="mt-3">
              {!hasBusinessName && (
                <p className="text-sm text-muted">업체명을 입력하면 네이버 지역검색이 자동으로 실행됩니다.</p>
              )}
              {hasBusinessName && (
                <div className="mb-1.5 text-xs text-muted">
                  네이버 지역검색 결과 — 입력을 멈추면 자동으로 검색됩니다
                </div>
              )}

              {hasBusinessName && searchState.kind === "searching" && (
                <div className="flex items-center gap-2.5 rounded-lg border border-line px-3 py-3 text-sm text-muted">
                  <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-soft border-t-accent" />
                  검색중...
                </div>
              )}

              {hasBusinessName && searchState.kind === "results" && (
                <>
                  {searchState.results.map((r, i) => {
                    const selected = place?.name === r.name && place?.address === r.address;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setPlace(r)}
                        className={`mb-1.5 w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                          selected ? "border-accent bg-accent-soft" : "border-line hover:bg-page"
                        }`}
                      >
                        <span className="font-medium text-ink">{r.name}</span>
                        <span className="mt-0.5 block text-xs text-muted">
                          {[r.category, r.roadAddress ?? r.address].filter(Boolean).join(" · ")}
                        </span>
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setSearchState({ kind: "empty" })}
                    className="w-full rounded-lg border border-dashed border-line px-3 py-2 text-left text-xs text-muted transition hover:bg-page"
                  >
                    목록에 없나요? → 가게 정보 없이 진행
                  </button>
                </>
              )}

              {hasBusinessName && (searchState.kind === "empty" || searchState.kind === "failed") && (
                <div className="rounded-lg border border-line bg-soft px-3 py-3 text-sm">
                  <div className="text-ink">
                    {searchState.kind === "failed" ? "검색에 실패했습니다." : "가게 정보 없이 진행합니다."}
                  </div>
                  <div className="mt-0.5 text-xs text-muted">
                    입력한 업체명/위치만 사용해 초안을 생성합니다.{" "}
                    <button type="button" onClick={runPlaceSearch} className="text-accent-dark underline">
                      다시 검색
                    </button>
                  </div>
                </div>
              )}

              {place && <p className="mt-2 text-xs text-accent-dark">✓ 선택됨 · {place.name}</p>}
            </div>
          </Card>

          <Card title="체험단 가이드라인 (원문 붙여넣기)">
            <textarea
              rows={5}
              className={`w-full resize-none leading-relaxed ${fieldInput}`}
              value={input.guideline}
              onChange={(e) => setInput({ ...input, guideline: e.target.value })}
              placeholder="체험단 가이드라인을 그대로 붙여넣으세요."
            />
          </Card>

          <Card title="메모 (선택)">
            <textarea
              rows={2}
              className={`w-full resize-none ${fieldInput}`}
              value={input.memo}
              onChange={(e) => setInput({ ...input, memo: e.target.value })}
            />
          </Card>
        </div>

        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card title={`사진 (${photos.length})`} right={<span className="text-xs text-muted">드래그하여 추가</span>}>
            <div className="flex flex-col gap-2">
              {photos.map((p, i) => (
                <div key={`${p.file.name}-${i}`} className="flex items-center gap-3 rounded-lg border border-soft p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getObjectUrl(p.file)}
                    alt={p.file.name}
                    className="h-12 w-12 shrink-0 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium text-ink">{p.file.name}</div>
                    <input
                      value={p.description}
                      onChange={(e) => updateDescription(i, e.target.value)}
                      placeholder="한 줄 설명 (선택)"
                      className="mt-1 w-full rounded border border-line px-2 py-1 text-xs text-muted outline-none focus:ring-1 focus:ring-accent-soft"
                    />
                  </div>
                  <div className="flex flex-col gap-1 text-xs text-muted">
                    <button type="button" onClick={() => movePhoto(i, -1)} className="hover:text-ink">
                      ▲
                    </button>
                    <button type="button" onClick={() => movePhoto(i, 1)} className="hover:text-ink">
                      ▼
                    </button>
                  </div>
                  <button type="button" onClick={() => removePhoto(i)} className="text-muted hover:text-danger">
                    ×
                  </button>
                </div>
              ))}

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  addPhotos(e.dataTransfer.files);
                }}
                className={`rounded-lg border-2 border-dashed py-5 text-center text-xs transition ${
                  isDragging ? "border-accent bg-accent-soft text-ink" : "border-line text-muted"
                }`}
              >
                사진을 이곳에 끌어다 놓으세요
                <div className="mt-2">
                  <label className="cursor-pointer text-accent-dark underline">
                    파일 선택
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => e.target.files && addPhotos(e.target.files)}
                    />
                  </label>
                </div>
              </div>
            </div>
          </Card>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
          >
            초안 생성
          </button>
        </div>
      </div>
    </PageShell>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { LoadingOverlay } from "./components/LoadingOverlay";
import { StepRail } from "./components/StepRail";
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
    <div className="flex min-h-screen flex-col">
      <StepRail current="input" />
      <LoadingOverlay visible={loading} stageText={stageText} onCancel={handleCancel} />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-8">
        <h1 className="text-xl font-semibold">체험단 리뷰 초안 생성</h1>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-700">업체명</span>
            <input
              className="rounded-md border border-neutral-300 px-3 py-2"
              value={input.businessName}
              onChange={(e) => {
                setInput({ ...input, businessName: e.target.value });
                setPlace(null);
              }}
              placeholder="예: 카페 리뷰오토"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-700">위치</span>
            <input
              className="rounded-md border border-neutral-300 px-3 py-2"
              value={input.location}
              onChange={(e) => {
                setInput({ ...input, location: e.target.value });
                setPlace(null);
              }}
              placeholder="예: 서울 강남구"
            />
          </label>
        </div>

        <div className="rounded-md border border-neutral-200 p-3">
          {!hasBusinessName && (
            <p className="text-sm text-neutral-400">업체명을 입력하면 자동으로 검색됩니다.</p>
          )}
          {hasBusinessName && searchState.kind === "searching" && (
            <p className="flex items-center gap-2 text-sm text-neutral-500">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-600" />
              검색중...
            </p>
          )}
          {hasBusinessName && searchState.kind === "results" && (
            <ul className="flex flex-col gap-2">
              {searchState.results.map((r, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => setPlace(r)}
                    className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
                      place?.name === r.name && place?.address === r.address
                        ? "border-neutral-900 bg-neutral-900 text-white"
                        : "border-neutral-200 hover:bg-neutral-50"
                    }`}
                  >
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs opacity-70">
                      {[r.category, r.roadAddress ?? r.address].filter(Boolean).join(" · ")}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {hasBusinessName && (searchState.kind === "empty" || searchState.kind === "failed") && (
            <div className="flex items-center justify-between text-sm text-neutral-500">
              <span>
                {searchState.kind === "failed" ? "검색에 실패했습니다." : "검색 결과가 없습니다."} 가게 정보 없이
                진행할 수 있습니다.
              </span>
              <button type="button" className="text-neutral-700 underline" onClick={runPlaceSearch}>
                다시 검색
              </button>
            </div>
          )}
          {place && (
            <p className="mt-2 text-xs text-emerald-600">선택됨: {place.name}</p>
          )}
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">가이드라인 원문</span>
          <textarea
            className="min-h-32 rounded-md border border-neutral-300 px-3 py-2"
            value={input.guideline}
            onChange={(e) => setInput({ ...input, guideline: e.target.value })}
            placeholder="체험단 가이드라인을 그대로 붙여넣으세요."
          />
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-neutral-700">사진</span>
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
            className={`rounded-md border-2 border-dashed px-4 py-6 text-center text-sm ${
              isDragging ? "border-neutral-900 bg-neutral-50" : "border-neutral-300 text-neutral-400"
            }`}
          >
            사진을 이곳에 끌어다 놓으세요
            <div className="mt-2">
              <label className="cursor-pointer text-neutral-700 underline">
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

          {photos.length > 0 && (
            <ul className="flex flex-col gap-2">
              {photos.map((p, i) => (
                <li key={`${p.file.name}-${i}`} className="flex items-center gap-3 rounded-md border border-neutral-200 p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getObjectUrl(p.file)}
                    alt={p.file.name}
                    className="h-14 w-14 rounded object-cover"
                  />
                  <div className="flex-1">
                    <p className="text-xs text-neutral-500">{p.file.name}</p>
                    <input
                      className="mt-1 w-full rounded border border-neutral-200 px-2 py-1 text-sm"
                      placeholder="한 줄 설명 (선택)"
                      value={p.description}
                      onChange={(e) => updateDescription(i, e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <button type="button" onClick={() => movePhoto(i, -1)} className="text-xs text-neutral-500">
                      ↑
                    </button>
                    <button type="button" onClick={() => movePhoto(i, 1)} className="text-xs text-neutral-500">
                      ↓
                    </button>
                  </div>
                  <button type="button" onClick={() => removePhoto(i)} className="text-neutral-400 hover:text-red-500">
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">메모 (선택)</span>
          <textarea
            className="min-h-20 rounded-md border border-neutral-300 px-3 py-2"
            value={input.memo}
            onChange={(e) => setInput({ ...input, memo: e.target.value })}
          />
        </label>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          초안 생성
        </button>
      </main>
    </div>
  );
}

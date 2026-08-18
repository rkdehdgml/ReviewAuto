"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

import type { Draft, PlaceResult } from "../lib/types";
import type { ValidationResult } from "../lib/validate";

export interface PhotoInput {
  file: File;
  description: string;
}

export interface InputState {
  businessName: string;
  location: string;
  guideline: string;
  memo: string;
}

export interface GenerateResult {
  draftId: string;
  draft: Draft;
  validation: ValidationResult;
  photoFiles: string[]; // 원본 파일명 목록 (순서대로) — upload-draft 단계에서 재사용
}

export interface UploadResult {
  success: boolean;
  error?: string;
  screenshotFile?: string;
}

interface SessionContextValue {
  input: InputState;
  setInput: (input: InputState) => void;
  place: PlaceResult | null;
  setPlace: (place: PlaceResult | null) => void;
  photos: PhotoInput[];
  setPhotos: (photos: PhotoInput[]) => void;
  generateResult: GenerateResult | null;
  setGenerateResult: (result: GenerateResult | null) => void;
  uploadResult: UploadResult | null;
  setUploadResult: (result: UploadResult | null) => void;
  resetSession: () => void;
}

const EMPTY_INPUT: InputState = { businessName: "", location: "", guideline: "", memo: "" };

const SessionContext = createContext<SessionContextValue | null>(null);

export function Providers({ children }: { children: React.ReactNode }) {
  const [input, setInput] = useState<InputState>(EMPTY_INPUT);
  const [place, setPlace] = useState<PlaceResult | null>(null);
  const [photos, setPhotos] = useState<PhotoInput[]>([]);
  const [generateResult, setGenerateResult] = useState<GenerateResult | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);

  const resetSession = useCallback(() => {
    setInput(EMPTY_INPUT);
    setPlace(null);
    setPhotos([]);
    setGenerateResult(null);
    setUploadResult(null);
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      input,
      setInput,
      place,
      setPlace,
      photos,
      setPhotos,
      generateResult,
      setGenerateResult,
      uploadResult,
      setUploadResult,
      resetSession,
    }),
    [input, place, photos, generateResult, uploadResult, resetSession]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession은 <Providers> 내부에서만 사용할 수 있습니다.");
  }
  return ctx;
}

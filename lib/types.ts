import { z } from "zod";

// ── 초안 JSON 스키마 (claude -p 출력 계약) — plan §4 ──────────────────────

export const draftBlockSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("text"),
    content: z.string(),
  }),
  z.object({
    type: z.literal("image"),
    file: z.string(),
    caption: z.string().optional(),
  }),
]);

export const draftValidationSchema = z.object({
  keywordCounts: z.record(z.string(), z.number()),
  charCount: z.number(),
  charCountNoSpace: z.number(),
  minCharRequired: z.number(),
});

export const draftSchema = z.object({
  title: z.string(),
  blocks: z.array(draftBlockSchema),
  hashtags: z.array(z.string()),
  disclosure: z.string(),
  validation: draftValidationSchema,
});

export type DraftBlock = z.infer<typeof draftBlockSchema>;
export type DraftValidation = z.infer<typeof draftValidationSchema>;
export type Draft = z.infer<typeof draftSchema>;

// ── 문체 프로필 스키마 (data/style-profile.json) — plan §4 ────────────────

export const styleProfileSchema = z.object({
  blogUrl: z.string(),
  analyzedAt: z.string(),
  sourcePostCount: z.number(),
  profile: z.object({
    tone: z.string(),
    sentenceStyle: z.string(),
    expressions: z.array(z.string()),
    emojiUsage: z.string(),
    structureHabits: z.string(),
  }),
  fewShotSamples: z.array(z.string()),
});

export type StyleProfile = z.infer<typeof styleProfileSchema>;

/** claude -p가 문체 분석 시 반환해야 하는 부분 스키마 (메타데이터는 서버가 채운다) */
export const styleProfileContentSchema = z.object({
  profile: styleProfileSchema.shape.profile,
  fewShotSamples: z.array(z.string()),
});

export type StyleProfileContent = z.infer<typeof styleProfileContentSchema>;

// ── 가게 정보 (네이버 지역 검색 API) ───────────────────────────────────────

export interface PlaceResult {
  name: string;
  category?: string;
  address?: string;
  roadAddress?: string;
  phone?: string;
  link?: string;
}

// ── 입력 사진 ──────────────────────────────────────────────────────────

export interface InputPhoto {
  file: string; // 원본 파일명 (draft의 blocks[].file과 정확히 일치해야 함)
  path: string; // 서버 임시 저장 절대경로 (원본)
  resizedPath?: string; // vision 분석용 리사이즈 사본 경로
  description?: string; // 사용자가 입력한 한 줄 설명 (선택)
  order: number;
}

// ── 리뷰 생성 요청 입력 ────────────────────────────────────────────────

export interface GenerateRequestInput {
  businessName: string;
  location: string;
  guideline: string;
  memo?: string;
  place: PlaceResult | null;
  photos: InputPhoto[];
}

// ── 실행 상태 (SSE / 폴링) ────────────────────────────────────────────

export type JobStage = "idle" | "generating" | "uploading" | "done" | "error";

export interface JobStatus {
  stage: JobStage;
  message: string;
  startedAt?: string;
  updatedAt: string;
  error?: string;
}

// ── 작성 이력 ─────────────────────────────────────────────────────────

export interface HistoryEntry {
  id: string;
  businessName: string;
  title: string;
  createdAt: string;
  charCount: number;
  photoCount: number;
  draft: Draft;
}

// ── 환경 체크 (/api/status) ───────────────────────────────────────────

export interface EnvStatus {
  claudeCliInstalled: boolean;
  claudeCliLoggedIn: boolean;
  anthropicApiKeyWarning: boolean;
  naverSessionExists: boolean;
  naverSearchApiConfigured: boolean;
  styleProfileExists: boolean;
}

import type { Draft } from "./types";

export interface ValidationResult {
  ok: boolean;
  keywordCounts: Record<string, number>;
  missingKeywords: string[];
  charCount: number;
  charCountNoSpace: number;
  minCharRequired: number;
  meetsMinChar: boolean;
  disclosurePresent: boolean;
  photoFilesMatch: boolean;
  missingPhotoFiles: string[];
  unexpectedPhotoFiles: string[];
  duplicatePhotoFiles: string[];
  errors: string[];
}

function textOf(draft: Draft): string {
  return draft.blocks
    .filter((b) => b.type === "text")
    .map((b) => b.content)
    .join("\n");
}

/** 키워드가 본문(텍스트 블록)에서 실제로 등장한 횟수를 센다. */
export function countKeywords(draft: Draft, keywords: string[]): Record<string, number> {
  const body = textOf(draft);
  const counts: Record<string, number> = {};
  for (const keyword of keywords) {
    if (!keyword) continue;
    counts[keyword] = body.split(keyword).length - 1;
  }
  return counts;
}

export function countChars(draft: Draft): { charCount: number; charCountNoSpace: number } {
  const body = textOf(draft);
  return {
    charCount: body.length,
    charCountNoSpace: body.replace(/\s/g, "").length,
  };
}

/** 사진 블록의 file 값이 입력 파일명 목록과 정확히 1:1로 대응하는지 검사한다. */
export function checkPhotoFiles(
  draft: Draft,
  inputPhotoFiles: string[]
): {
  match: boolean;
  missing: string[];
  unexpected: string[];
  duplicates: string[];
} {
  const used = draft.blocks
    .filter((b) => b.type === "image")
    .map((b) => (b as Extract<Draft["blocks"][number], { type: "image" }>).file);

  const inputSet = new Set(inputPhotoFiles);
  const seen = new Set<string>();
  const duplicates: string[] = [];
  const unexpected: string[] = [];

  for (const file of used) {
    if (seen.has(file)) duplicates.push(file);
    seen.add(file);
    if (!inputSet.has(file)) unexpected.push(file);
  }

  const missing = inputPhotoFiles.filter((f) => !seen.has(f));

  return {
    match: missing.length === 0 && unexpected.length === 0 && duplicates.length === 0,
    missing,
    unexpected,
    duplicates,
  };
}

export interface ValidateDraftOptions {
  keywords: string[];
  minCharRequired: number;
  inputPhotoFiles: string[];
}

export function validateDraft(draft: Draft, opts: ValidateDraftOptions): ValidationResult {
  const errors: string[] = [];

  const keywordCounts = countKeywords(draft, opts.keywords);
  const missingKeywords = Object.entries(keywordCounts)
    .filter(([, count]) => count === 0)
    .map(([keyword]) => keyword);

  const { charCount, charCountNoSpace } = countChars(draft);
  const meetsMinChar = charCountNoSpace >= opts.minCharRequired;
  if (!meetsMinChar) {
    errors.push(
      `공백 제외 글자수 ${charCountNoSpace}자가 최소 기준 ${opts.minCharRequired}자에 미달합니다.`
    );
  }

  const disclosurePresent = draft.disclosure.trim().length > 0;
  if (!disclosurePresent) {
    errors.push("공정위 대가성 문구(disclosure)가 비어 있습니다.");
  }

  const photoCheck = checkPhotoFiles(draft, opts.inputPhotoFiles);
  if (!photoCheck.match) {
    if (photoCheck.missing.length > 0) {
      errors.push(`사용되지 않은 사진: ${photoCheck.missing.join(", ")}`);
    }
    if (photoCheck.unexpected.length > 0) {
      errors.push(`입력에 없는 파일명 사용: ${photoCheck.unexpected.join(", ")}`);
    }
    if (photoCheck.duplicates.length > 0) {
      errors.push(`중복 사용된 사진: ${photoCheck.duplicates.join(", ")}`);
    }
  }

  return {
    ok: meetsMinChar && disclosurePresent && photoCheck.match,
    keywordCounts,
    missingKeywords,
    charCount,
    charCountNoSpace,
    minCharRequired: opts.minCharRequired,
    meetsMinChar,
    disclosurePresent,
    photoFilesMatch: photoCheck.match,
    missingPhotoFiles: photoCheck.missing,
    unexpectedPhotoFiles: photoCheck.unexpected,
    duplicatePhotoFiles: photoCheck.duplicates,
    errors,
  };
}

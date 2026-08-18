import fs from "node:fs/promises";
import path from "node:path";

import type { BlogPost } from "./naver/rss";
import type { GenerateRequestInput, StyleProfile } from "./types";

const PROMPTS_DIR = path.join(process.cwd(), "prompts");

async function loadTemplate(name: string): Promise<string> {
  return fs.readFile(path.join(PROMPTS_DIR, name), "utf-8");
}

function fill(template: string, slots: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(slots)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

const DEFAULT_MIN_CHAR_REQUIRED = 1000;

export async function buildReviewPrompt(
  input: GenerateRequestInput,
  styleProfile: StyleProfile | null
): Promise<string> {
  const template = await loadTemplate("review.md");

  const photoList = input.photos
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((p, i) => {
      const desc = p.description ? ` — ${p.description}` : "";
      return `${i + 1}. 파일명: ${p.file} (Read 경로: ${p.resizedPath ?? p.path})${desc}`;
    })
    .join("\n");

  const placeInfo = input.place
    ? [input.place.name, input.place.category, input.place.roadAddress ?? input.place.address, input.place.phone]
        .filter(Boolean)
        .join(" / ")
    : "(조회 실패 또는 미확인 — 사용자 입력 정보만으로 작성)";

  return fill(template, {
    tone: styleProfile?.profile.tone ?? "(문체 프로필 없음 — 자연스러운 후기 톤으로 작성)",
    sentenceStyle: styleProfile?.profile.sentenceStyle ?? "",
    expressions: styleProfile?.profile.expressions.join(", ") ?? "",
    emojiUsage: styleProfile?.profile.emojiUsage ?? "",
    structureHabits: styleProfile?.profile.structureHabits ?? "",
    fewShotSamples: styleProfile?.fewShotSamples.map((s, i) => `[${i + 1}] ${s}`).join("\n\n") ?? "(없음)",
    businessName: input.businessName,
    location: input.location,
    placeInfo,
    guideline: input.guideline,
    memo: input.memo?.trim() ? input.memo : "(없음)",
    photoList: photoList || "(첨부 사진 없음)",
    minCharRequired: String(DEFAULT_MIN_CHAR_REQUIRED),
  });
}

export async function buildStyleAnalysisPrompt(posts: BlogPost[]): Promise<string> {
  const template = await loadTemplate("style-analysis.md");
  const postsText = posts
    .map((p, i) => `## 글 ${i + 1}: ${p.title}\n\n${p.content}`)
    .join("\n\n---\n\n");

  return fill(template, {
    postCount: String(posts.length),
    posts: postsText,
  });
}

export { DEFAULT_MIN_CHAR_REQUIRED };

import { NextResponse } from "next/server";

import { generateStyleProfileContent } from "../../../lib/claude/runner";
import { fetchRecentPosts } from "../../../lib/naver/rss";
import { buildStyleAnalysisPrompt } from "../../../lib/prompts";
import { readStyleProfile, writeStyleProfile } from "../../../lib/store";
import type { StyleProfile } from "../../../lib/types";

export async function GET() {
  const profile = await readStyleProfile();
  return NextResponse.json({ profile });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const blogUrl = typeof body?.blogUrl === "string" ? body.blogUrl.trim() : "";

  if (!blogUrl) {
    return NextResponse.json({ error: "blogUrl이 필요합니다." }, { status: 400 });
  }

  try {
    const posts = await fetchRecentPosts(blogUrl, 10);
    const prompt = await buildStyleAnalysisPrompt(posts);
    const content = await generateStyleProfileContent(prompt);

    const profile: StyleProfile = {
      blogUrl,
      analyzedAt: new Date().toISOString(),
      sourcePostCount: posts.length,
      profile: content.profile,
      fewShotSamples: content.fewShotSamples,
    };

    // 성공 시에만 기존 프로필을 교체한다 (실패 시 기존 프로필 유지 — plan §Phase3)
    await writeStyleProfile(profile);

    return NextResponse.json({ profile });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "문체 분석 중 알 수 없는 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

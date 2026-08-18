/**
 * Phase 1 PoC — 네이버 블로그 임시저장 자동화 실현 가능성 검증.
 *
 * 하드코딩된 텍스트 2블록 + 사진 1장을 스마트에디터 ONE에 입력하고 임시저장까지 실행한다.
 * 이 스크립트가 성공해야 이 프로젝트 전체가 성립한다 — 가장 리스크가 큰 단계를 먼저 검증한다.
 *
 * 사용법: npm run poc:naver-draft -- <사진파일경로>
 * (사전에 `npm run login`으로 로그인 세션을 저장해두어야 한다)
 */
import path from "node:path";

import type { Draft, InputPhoto } from "../lib/types";
import { assertSessionValid, launchNaverContext, naverSessionExists, uploadDraft } from "../lib/naver/uploader";

async function main() {
  const photoArg = process.argv[2];
  if (!photoArg) {
    console.error("사용법: npm run poc:naver-draft -- <사진파일경로>");
    process.exit(1);
  }

  if (!(await naverSessionExists())) {
    console.error("네이버 로그인 세션이 없습니다. 먼저 `npm run login`을 실행해주세요.");
    process.exit(1);
  }

  const photoPath = path.resolve(photoArg);
  const photoFile = path.basename(photoPath);

  const draft: Draft = {
    title: "[PoC] ReviewAuto 자동 입력 테스트",
    blocks: [
      { type: "text", content: "이것은 Playwright 자동화 PoC를 위한 첫 번째 문단입니다." },
      { type: "image", file: photoFile, caption: "테스트 사진" },
      { type: "text", content: "이것은 두 번째 문단이며, 임시저장이 정상 동작하는지 확인합니다." },
    ],
    hashtags: ["PoC", "테스트"],
    disclosure: "이 글은 ReviewAuto 개발 테스트용으로 작성되었습니다.",
    validation: {
      keywordCounts: {},
      charCount: 0,
      charCountNoSpace: 0,
      minCharRequired: 0,
    },
  };

  const photos: InputPhoto[] = [{ file: photoFile, path: photoPath, order: 0 }];

  console.log("브라우저를 여는 중...");
  const context = await launchNaverContext({ headless: false });
  const page = await context.newPage();

  try {
    await assertSessionValid(page);
  } finally {
    await page.close();
  }

  await uploadDraft(context, {
    draft,
    photos,
    onProgress: (message) => console.log(`[진행] ${message}`),
  });

  console.log("\n✅ 임시저장까지 완료했습니다. 네이버 블로그에서 결과를 직접 확인해주세요.");
  console.log("(발행 버튼은 자동으로 누르지 않습니다.)");

  await context.close();
}

main().catch((err) => {
  console.error("\n❌ PoC 실패:", err);
  process.exit(1);
});

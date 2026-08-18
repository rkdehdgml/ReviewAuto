import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { generateDraft } from "../../../lib/claude/runner";
import { createAnalysisCopies, cleanupTempFiles } from "../../../lib/images/resize";
import { AlreadyRunningError, acquireLock, releaseLock } from "../../../lib/lock";
import { createNdjsonStream } from "../../../lib/ndjson";
import { buildReviewPrompt, DEFAULT_MIN_CHAR_REQUIRED } from "../../../lib/prompts";
import { readStyleProfile, saveDraft, savePhotoManifest, uploadDir, writeJobStatus } from "../../../lib/store";
import type { GenerateRequestInput, InputPhoto, PlaceResult } from "../../../lib/types";
import { validateDraft } from "../../../lib/validate";

const LOCK_NAME = "job";

async function saveUploadedPhotos(draftId: string, form: FormData): Promise<InputPhoto[]> {
  const dir = uploadDir(draftId);
  await fs.mkdir(dir, { recursive: true });

  const files = form.getAll("photos").filter((f): f is File => f instanceof File);
  const metaRaw = form.get("photoMeta");
  const meta: { description?: string }[] = metaRaw ? JSON.parse(String(metaRaw)) : [];

  const usedNames = new Set<string>();
  const photos: InputPhoto[] = [];

  for (const [index, file] of files.entries()) {
    let name = file.name;
    const ext = path.extname(name);
    const base = path.basename(name, ext);
    let suffix = 1;
    while (usedNames.has(name)) {
      name = `${base} (${suffix})${ext}`;
      suffix += 1;
    }
    usedNames.add(name);

    const dest = path.join(dir, name);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(dest, buffer);

    photos.push({
      file: name,
      path: dest,
      description: meta[index]?.description,
      order: index,
    });
  }

  return photos;
}

export async function POST(request: Request) {
  try {
    acquireLock(LOCK_NAME);
  } catch (err) {
    if (err instanceof AlreadyRunningError) {
      return new Response(JSON.stringify({ error: err.message }), { status: 409 });
    }
    throw err;
  }

  const form = await request.formData();

  return createNdjsonStream(async (write, signal) => {
    let resizedPaths: string[] = [];
    try {
      const draftId = randomUUID();

      write({ stage: "generating", message: "입력을 정리하는 중..." });
      const businessName = String(form.get("businessName") ?? "");
      const location = String(form.get("location") ?? "");
      const guideline = String(form.get("guideline") ?? "");
      const memo = String(form.get("memo") ?? "");
      const placeRaw = form.get("place");
      const place: PlaceResult | null = placeRaw ? JSON.parse(String(placeRaw)) : null;

      const photos = await saveUploadedPhotos(draftId, form);

      write({ stage: "generating", message: "사진 분석용 리사이즈 사본 생성 중..." });
      resizedPaths = await createAnalysisCopies(photos.map((p) => p.path));
      photos.forEach((p, i) => {
        p.resizedPath = resizedPaths[i];
      });
      await savePhotoManifest(draftId, photos);

      const input: GenerateRequestInput = { businessName, location, guideline, memo, place, photos };

      write({ stage: "generating", message: "문체 프로필 불러오는 중..." });
      const styleProfile = await readStyleProfile();

      write({ stage: "generating", message: "사진 분석 및 초안 작성 중... (1~2분 소요)" });
      const prompt = await buildReviewPrompt(input, styleProfile);
      let draft = await generateDraft(prompt, signal);

      const inputPhotoFiles = photos.map((p) => p.file);
      let validation = validateDraft(draft, {
        keywords: Object.keys(draft.validation.keywordCounts),
        minCharRequired: draft.validation.minCharRequired || DEFAULT_MIN_CHAR_REQUIRED,
        inputPhotoFiles,
      });

      if (!validation.meetsMinChar) {
        write({ stage: "generating", message: "글자수 미달 — 보강 재생성 중..." });
        const retryPrompt = `${prompt}\n\n---\n방금 작성한 글이 공백 제외 ${validation.charCountNoSpace}자로 최소 기준 ${validation.minCharRequired}자에 못 미칩니다. 내용을 더 보강해 분량을 늘려 다시 작성하세요.`;
        draft = await generateDraft(retryPrompt, signal);
        validation = validateDraft(draft, {
          keywords: Object.keys(draft.validation.keywordCounts),
          minCharRequired: draft.validation.minCharRequired || DEFAULT_MIN_CHAR_REQUIRED,
          inputPhotoFiles,
        });
      }

      await saveDraft(draftId, draft);
      await writeJobStatus({ stage: "done", message: "초안 생성 완료", updatedAt: new Date().toISOString() });

      write({ stage: "done", message: "초안 생성 완료", draftId, draft, validation, photos });
    } catch (err) {
      await writeJobStatus({
        stage: "error",
        message: "초안 생성 실패",
        updatedAt: new Date().toISOString(),
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    } finally {
      await cleanupTempFiles(resizedPaths);
      releaseLock(LOCK_NAME);
    }
  }, request.signal);
}


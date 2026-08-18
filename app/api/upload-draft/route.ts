import { z } from "zod";

import { AlreadyRunningError, acquireLock, releaseLock } from "../../../lib/lock";
import { NaverUploadError, launchNaverContext, uploadDraft } from "../../../lib/naver/uploader";
import { createNdjsonStream } from "../../../lib/ndjson";
import { appendHistory, loadPhotoManifest, writeJobStatus } from "../../../lib/store";
import { draftSchema } from "../../../lib/types";
import { countChars } from "../../../lib/validate";

const LOCK_NAME = "job";

const requestSchema = z.object({
  draftId: z.string(),
  businessName: z.string(),
  draft: draftSchema,
});

export async function POST(request: Request) {
  try {
    acquireLock(LOCK_NAME);
  } catch (err) {
    if (err instanceof AlreadyRunningError) {
      return new Response(JSON.stringify({ error: err.message }), { status: 409 });
    }
    throw err;
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    releaseLock(LOCK_NAME);
    return new Response(JSON.stringify({ error: "잘못된 요청입니다.", issues: parsed.error.issues }), {
      status: 400,
    });
  }
  const { draftId, businessName, draft } = parsed.data;

  return createNdjsonStream(async (write) => {
    let context: Awaited<ReturnType<typeof launchNaverContext>> | undefined;
    try {
      write({ stage: "uploading", message: "저장된 사진 정보를 불러오는 중..." });
      const photos = await loadPhotoManifest(draftId);
      if (!photos) {
        throw new Error("업로드된 사진 정보를 찾을 수 없습니다. 초안을 다시 생성해주세요.");
      }

      write({ stage: "uploading", message: "네이버 블로그 브라우저를 여는 중..." });
      context = await launchNaverContext({ headless: false });

      const onAbort = () => {
        context?.close().catch(() => undefined);
      };
      request.signal.addEventListener("abort", onAbort);

      await uploadDraft(context, {
        draft,
        photos,
        onProgress: (message) => write({ stage: "uploading", message }),
      });

      request.signal.removeEventListener("abort", onAbort);

      const { charCount } = countChars(draft);
      await appendHistory({
        businessName,
        title: draft.title,
        charCount,
        photoCount: photos.length,
        draft,
      });

      await writeJobStatus({ stage: "done", message: "임시저장 완료", updatedAt: new Date().toISOString() });
      write({ stage: "done", message: "임시저장 완료" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await writeJobStatus({
        stage: "error",
        message: "임시저장 실패",
        updatedAt: new Date().toISOString(),
        error: message,
      });
      write({
        stage: "error",
        error: message,
        screenshotFile: err instanceof NaverUploadError ? err.screenshotFile : undefined,
      });
    } finally {
      await context?.close().catch(() => undefined);
      releaseLock(LOCK_NAME);
    }
  }, request.signal);
}

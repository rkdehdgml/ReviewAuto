import fs from "node:fs/promises";
import path from "node:path";

import { type BrowserContext, type Page, chromium } from "playwright";

import type { Draft, InputPhoto } from "../types";
import { naverSelectors } from "./selectors";

const SESSION_DIR = path.join(process.cwd(), ".naver-session");
const SCREENSHOT_DIR = path.join(process.cwd(), "data", "error-screenshots");
const WRITE_URL = "https://blog.naver.com/GoBlogWrite.naver";

export class NaverUploadError extends Error {
  constructor(
    message: string,
    /** data/error-screenshots/ 안의 파일명 (경로 아님) — /api/screenshot?file= 로 조회 */
    public readonly screenshotFile?: string
  ) {
    super(message);
    this.name = "NaverUploadError";
  }
}

/** 사람 속도를 모사하기 위한 1~3초 랜덤 딜레이 */
async function humanDelay(page: Page, minMs = 1000, maxMs = 3000) {
  const ms = minMs + Math.random() * (maxMs - minMs);
  await page.waitForTimeout(ms);
}

export async function naverSessionExists(): Promise<boolean> {
  try {
    const stat = await fs.stat(SESSION_DIR);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

/**
 * 저장된 세션(userDataDir)으로 persistent context를 연다.
 * 로그인 자체는 하지 않는다 — `npm run login`으로 미리 저장된 세션을 재사용할 뿐이다.
 */
export async function launchNaverContext(options?: { headless?: boolean }): Promise<BrowserContext> {
  await fs.mkdir(SESSION_DIR, { recursive: true });
  return chromium.launchPersistentContext(SESSION_DIR, {
    headless: options?.headless ?? false,
    viewport: { width: 1280, height: 900 },
    // 클립보드 붙여넣기 방식 입력(typeViaClipboard)에 필요
    permissions: ["clipboard-read", "clipboard-write"],
  });
}

/** 글쓰기 페이지 진입 시 로그인 페이지로 리다이렉트되면 세션 만료로 판단한다. */
export async function assertSessionValid(page: Page): Promise<void> {
  await page.goto(WRITE_URL, { waitUntil: "domcontentloaded" });
  const loginInput = page.locator(naverSelectors.loginPageIdInput);
  const isLoginPage = await loginInput.isVisible().catch(() => false);
  if (isLoginPage) {
    throw new NaverUploadError(
      "네이버 세션이 만료되었습니다. 터미널에서 `npm run login`을 다시 실행해 로그인해주세요."
    );
  }
}

/** "이전에 작성 중이던 글" 복구 팝업이 뜨면 취소하고 새 글로 시작한다. */
async function dismissRestorePopupIfPresent(page: Page): Promise<void> {
  const dialog = page.locator(naverSelectors.restorePopup.dialog);
  const visible = await dialog.isVisible().catch(() => false);
  if (!visible) return;
  const cancelButton = page.locator(naverSelectors.restorePopup.cancelButton);
  await cancelButton.click();
  await humanDelay(page, 300, 800);
}

function getEditorFrame(page: Page) {
  return page.frameLocator(naverSelectors.mainFrame);
}

async function typeViaClipboard(page: Page, locator: ReturnType<Page["locator"]>, text: string) {
  await locator.click();
  await page.evaluate((t) => navigator.clipboard.writeText(t), text);
  const isMac = process.platform === "darwin";
  await page.keyboard.press(isMac ? "Meta+V" : "Control+V");
}

async function saveScreenshot(page: Page, label: string): Promise<string> {
  await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
  const fileName = `${label}-${Date.now()}.png`;
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, fileName), fullPage: true }).catch(() => undefined);
  return fileName;
}

export interface UploadDraftOptions {
  draft: Draft;
  photos: InputPhoto[];
  onProgress?: (message: string) => void;
}

/**
 * blocks JSON을 순서대로 스마트에디터 ONE에 입력하고 임시저장한다.
 * 발행 버튼은 절대 클릭하지 않는다 — 자동화 범위는 임시저장까지.
 */
export async function uploadDraft(context: BrowserContext, options: UploadDraftOptions): Promise<void> {
  const { draft, photos, onProgress } = options;
  const photosByFile = new Map(photos.map((p) => [p.file, p]));
  const page = await context.newPage();

  try {
    onProgress?.("네이버 블로그 글쓰기 페이지 진입 중...");
    await assertSessionValid(page);
    await dismissRestorePopupIfPresent(page);

    const frame = getEditorFrame(page);

    onProgress?.("제목 입력 중...");
    await typeViaClipboard(page, frame.locator(naverSelectors.titleArea), draft.title);
    await humanDelay(page);

    // 제목 다음 본문으로 이동 (Tab 또는 Enter로 본문 포커스)
    await page.keyboard.press("Enter");
    await humanDelay(page, 500, 1200);

    for (const [index, block] of draft.blocks.entries()) {
      onProgress?.(`블록 ${index + 1}/${draft.blocks.length} 입력 중...`);

      if (block.type === "text") {
        const paragraph = frame.locator(naverSelectors.firstParagraph).last();
        await typeViaClipboard(page, paragraph, block.content);
        await page.keyboard.press("Enter");
      } else {
        const photo = photosByFile.get(block.file);
        if (!photo) {
          throw new NaverUploadError(`draft가 참조하는 사진 파일을 입력에서 찾을 수 없습니다: ${block.file}`);
        }
        await frame.locator(naverSelectors.photoToolbarButton).click();
        const fileInput = frame.locator(naverSelectors.photoFileInput);
        await fileInput.setInputFiles(photo.path);
        await humanDelay(page, 1500, 3000); // 업로드 대기
        if (block.caption) {
          await page.keyboard.type(block.caption);
        }
        await page.keyboard.press("Enter");
      }

      await humanDelay(page);
    }

    onProgress?.("임시저장 중...");
    await page.locator(naverSelectors.saveDraftButton).first().click();
    await page
      .locator(naverSelectors.saveDraftToast)
      .waitFor({ state: "visible", timeout: 15000 })
      .catch(() => undefined);

    onProgress?.("임시저장 완료");
  } catch (err) {
    const screenshotPath = await saveScreenshot(page, "upload-draft-error");
    if (err instanceof NaverUploadError) {
      throw new NaverUploadError(err.message, screenshotPath);
    }
    throw new NaverUploadError(
      `임시저장 중 오류가 발생했습니다: ${err instanceof Error ? err.message : String(err)}`,
      screenshotPath
    );
  } finally {
    await page.close().catch(() => undefined);
  }
}

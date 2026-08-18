import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const TEMP_DIR = path.join(process.cwd(), "temp");
const MAX_EDGE = 1000;

async function ensureTempDir() {
  await fs.mkdir(TEMP_DIR, { recursive: true });
}

/**
 * Claude vision 분석용 리사이즈 사본을 생성한다 (긴 변 1000px, 토큰 절약).
 * 원본 파일은 건드리지 않고 temp/ 아래 새 파일로 저장한다.
 */
export async function createAnalysisCopy(originalPath: string): Promise<string> {
  await ensureTempDir();
  const outPath = path.join(TEMP_DIR, `${randomUUID()}.jpg`);
  await sharp(originalPath)
    .rotate() // EXIF orientation 보정
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toFile(outPath);
  return outPath;
}

export async function createAnalysisCopies(originalPaths: string[]): Promise<string[]> {
  return Promise.all(originalPaths.map(createAnalysisCopy));
}

export async function cleanupTempFiles(paths: string[]): Promise<void> {
  await Promise.all(
    paths.map((p) => fs.unlink(p).catch(() => undefined))
  );
}

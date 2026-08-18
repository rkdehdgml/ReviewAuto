import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import {
  type Draft,
  type HistoryEntry,
  type JobStatus,
  type StyleProfile,
  styleProfileSchema,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const HISTORY_DIR = path.join(DATA_DIR, "history");
const STYLE_PROFILE_PATH = path.join(DATA_DIR, "style-profile.json");
const JOB_STATUS_PATH = path.join(DATA_DIR, "job-status.json");

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

/** 임시 파일에 쓴 뒤 원자적으로 교체한다 — 쓰기 도중 실패해도 기존 파일이 손상되지 않는다. */
async function writeJsonAtomic(filePath: string, data: unknown) {
  await ensureDir(path.dirname(filePath));
  const tmpPath = `${filePath}.${randomUUID()}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), "utf-8");
  await fs.rename(tmpPath, filePath);
}

async function readJsonIfExists<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

// ── 문체 프로필 ────────────────────────────────────────────────────────

export async function readStyleProfile(): Promise<StyleProfile | null> {
  const data = await readJsonIfExists<unknown>(STYLE_PROFILE_PATH);
  if (data === null) return null;
  return styleProfileSchema.parse(data);
}

export async function writeStyleProfile(profile: StyleProfile): Promise<void> {
  await writeJsonAtomic(STYLE_PROFILE_PATH, styleProfileSchema.parse(profile));
}

export async function styleProfileFileExists(): Promise<boolean> {
  return (await readJsonIfExists(STYLE_PROFILE_PATH)) !== null;
}

// ── 작성 이력 ─────────────────────────────────────────────────────────

export async function appendHistory(
  entry: Omit<HistoryEntry, "id" | "createdAt">
): Promise<HistoryEntry> {
  await ensureDir(HISTORY_DIR);
  const full: HistoryEntry = {
    ...entry,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const fileName = `${full.createdAt.replace(/[:.]/g, "-")}_${full.id}.json`;
  await writeJsonAtomic(path.join(HISTORY_DIR, fileName), full);
  return full;
}

export async function listHistory(): Promise<HistoryEntry[]> {
  await ensureDir(HISTORY_DIR);
  const files = await fs.readdir(HISTORY_DIR);
  const entries = await Promise.all(
    files
      .filter((f) => f.endsWith(".json"))
      .map((f) => readJsonIfExists<HistoryEntry>(path.join(HISTORY_DIR, f)))
  );
  return entries
    .filter((e): e is HistoryEntry => e !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ── 작업 상태 (진행 화면 폴링용) ─────────────────────────────────────────

export async function readJobStatus(): Promise<JobStatus | null> {
  return readJsonIfExists<JobStatus>(JOB_STATUS_PATH);
}

export async function writeJobStatus(status: JobStatus): Promise<void> {
  await writeJsonAtomic(JOB_STATUS_PATH, status);
}

export function draftFilePath(id: string): string {
  return path.join(DATA_DIR, "drafts", `${id}.json`);
}

export async function saveDraft(id: string, draft: Draft): Promise<void> {
  await writeJsonAtomic(draftFilePath(id), draft);
}

export async function loadDraft(id: string): Promise<Draft | null> {
  return readJsonIfExists<Draft>(draftFilePath(id));
}

export { DATA_DIR, HISTORY_DIR, STYLE_PROFILE_PATH };

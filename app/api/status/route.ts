import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { NextResponse } from "next/server";

import { isPlaceSearchConfigured } from "../../../lib/naver/local-search";
import { naverSessionExists } from "../../../lib/naver/uploader";
import { styleProfileFileExists } from "../../../lib/store";
import type { EnvStatus } from "../../../lib/types";

const execFileAsync = promisify(execFile);

async function checkClaudeCliInstalled(): Promise<boolean> {
  try {
    await execFileAsync("claude", ["--version"], { timeout: 10_000 });
    return true;
  } catch {
    return false;
  }
}

async function checkClaudeCliLoggedIn(): Promise<boolean> {
  try {
    await fs.access(path.join(os.homedir(), ".claude", ".credentials.json"));
    return true;
  } catch {
    return false;
  }
}

export async function GET() {
  const [claudeCliInstalled, claudeCliLoggedIn, naverSession, styleProfileExists] = await Promise.all([
    checkClaudeCliInstalled(),
    checkClaudeCliLoggedIn(),
    naverSessionExists(),
    styleProfileFileExists(),
  ]);

  const status: EnvStatus = {
    claudeCliInstalled,
    claudeCliLoggedIn,
    anthropicApiKeyWarning: Boolean(process.env.ANTHROPIC_API_KEY),
    naverSessionExists: naverSession,
    naverSearchApiConfigured: isPlaceSearchConfigured(),
    styleProfileExists,
  };

  return NextResponse.json(status);
}

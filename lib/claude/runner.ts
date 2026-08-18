import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { type Draft, type StyleProfileContent, draftSchema, styleProfileContentSchema } from "../types";

const execFileAsync = promisify(execFile);

const CLAUDE_TIMEOUT_MS = 5 * 60 * 1000; // vision 분석 포함 3분 내외 소요, 여유를 두고 5분

interface ClaudeResultEnvelope {
  is_error: boolean;
  result: string;
  subtype: string;
}

/**
 * `claude -p`를 헤드리스로 실행한다. Pro 구독 인증을 사용하며 API 키를 쓰지 않는다.
 * Read 툴만 허용해 로컬 이미지(vision 분석용 리사이즈 사본)를 읽되, 그 외 파일시스템/Bash 접근은 막는다.
 */
export async function runClaude(promptText: string, signal?: AbortSignal): Promise<string> {
  let stdout: string;
  try {
    const result = await execFileAsync(
      "claude",
      [
        "-p",
        promptText,
        "--output-format",
        "json",
        "--allowed-tools",
        "Read",
        "--permission-mode",
        "bypassPermissions",
      ],
      { timeout: CLAUDE_TIMEOUT_MS, maxBuffer: 1024 * 1024 * 64, signal }
    );
    stdout = result.stdout;
  } catch (err) {
    throw new Error(`claude -p 실행 실패: ${err instanceof Error ? err.message : String(err)}`);
  }

  let envelope: ClaudeResultEnvelope;
  try {
    envelope = JSON.parse(stdout);
  } catch {
    throw new Error("claude -p 응답을 JSON으로 파싱할 수 없습니다 (출력 형식 오류).");
  }

  if (envelope.is_error) {
    throw new Error(`claude -p가 오류를 반환했습니다: ${envelope.result}`);
  }

  return envelope.result;
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // 모델이 마크다운 펜스를 붙인 경우에 대한 방어적 폴백 (프롬프트로는 금지했지만 대비)
    const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      return JSON.parse(fenceMatch[1]);
    }
    throw new Error("응답에서 JSON을 찾을 수 없습니다.");
  }
}

/**
 * 프롬프트를 실행해 초안 JSON을 생성한다. 스키마 검증 실패 시 1회 자동 재시도한다 (plan §4).
 */
export async function generateDraft(promptText: string, signal?: AbortSignal): Promise<Draft> {
  const attempt = async (prompt: string): Promise<Draft> => {
    const raw = await runClaude(prompt, signal);
    const parsed = extractJson(raw);
    return draftSchema.parse(parsed);
  };

  try {
    return await attempt(promptText);
  } catch (firstError) {
    const retryPrompt = `${promptText}\n\n---\n이전 응답이 JSON 스키마 검증에 실패했습니다: ${
      firstError instanceof Error ? firstError.message : String(firstError)
    }\n반드시 스키마를 준수하는 순수 JSON만 다시 출력하세요 (마크다운 펜스 금지).`;
    return attempt(retryPrompt);
  }
}

/** 문체 분석 프롬프트를 실행해 프로필 콘텐츠를 생성한다. 실패 시 1회 재시도한다. */
export async function generateStyleProfileContent(promptText: string): Promise<StyleProfileContent> {
  const attempt = async (prompt: string): Promise<StyleProfileContent> => {
    const raw = await runClaude(prompt);
    const parsed = extractJson(raw);
    return styleProfileContentSchema.parse(parsed);
  };

  try {
    return await attempt(promptText);
  } catch (firstError) {
    const retryPrompt = `${promptText}\n\n---\n이전 응답이 JSON 스키마 검증에 실패했습니다: ${
      firstError instanceof Error ? firstError.message : String(firstError)
    }\n반드시 스키마를 준수하는 순수 JSON만 다시 출력하세요 (마크다운 펜스 금지).`;
    return attempt(retryPrompt);
  }
}

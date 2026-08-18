export interface StreamEvent {
  stage: "generating" | "uploading" | "done" | "error";
  message?: string;
  error?: string;
  [key: string]: unknown;
}

/**
 * NDJSON 스트리밍 응답을 읽어 라인 단위로 콜백을 호출한다.
 * /api/generate, /api/upload-draft 가 이 형식으로 진행 상태를 push한다.
 */
export async function streamNdjson(
  url: string,
  init: RequestInit,
  onEvent: (event: StreamEvent) => void
): Promise<void> {
  const response = await fetch(url, init);

  if (!response.ok || !response.body) {
    let message = `요청 실패 (${response.status})`;
    try {
      const body = await response.json();
      if (body?.error) message = body.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      onEvent(JSON.parse(line) as StreamEvent);
    }
  }

  if (buffer.trim()) {
    onEvent(JSON.parse(buffer) as StreamEvent);
  }
}

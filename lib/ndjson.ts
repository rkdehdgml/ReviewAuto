/**
 * 개행으로 구분된 JSON(NDJSON) 스트리밍 응답 헬퍼.
 * SSE 대신 이 방식을 쓰는 이유: 클라이언트가 POST + FormData로 요청을 보내야 하는데
 * 브라우저 기본 EventSource는 GET만 지원한다. fetch()의 스트리밍 응답 바디를 그대로 읽으면
 * POST에서도 동일하게 진행 상태를 push할 수 있다.
 */
export type NdjsonWriter = (event: Record<string, unknown>) => void;

export function createNdjsonStream(
  run: (write: NdjsonWriter, signal: AbortSignal) => Promise<void>,
  signal: AbortSignal
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write: NdjsonWriter = (event) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      try {
        await run(write, signal);
      } catch (err) {
        write({
          stage: "error",
          error: err instanceof Error ? err.message : String(err),
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

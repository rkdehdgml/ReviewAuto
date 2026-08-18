import fs from "node:fs/promises";
import path from "node:path";

const SCREENSHOT_DIR = path.join(process.cwd(), "data", "error-screenshots");

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const file = searchParams.get("file") ?? "";

  // 경로 순회 방지: 디렉터리 구분자가 없는 순수 파일명만 허용
  if (!file || file.includes("/") || file.includes("\\") || file.includes("..")) {
    return new Response("Invalid file", { status: 400 });
  }

  try {
    const buffer = await fs.readFile(path.join(SCREENSHOT_DIR, file));
    return new Response(new Uint8Array(buffer), {
      headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

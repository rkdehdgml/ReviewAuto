import { NextResponse } from "next/server";

import { searchPlace } from "../../../lib/naver/local-search";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const businessName = searchParams.get("businessName")?.trim() ?? "";
  const location = searchParams.get("location")?.trim() ?? "";

  if (!businessName) {
    return NextResponse.json({ results: [] });
  }

  // graceful degradation: 실패해도 500이 아니라 빈 결과를 반환한다 (searchPlace 내부에서 처리)
  const results = await searchPlace(businessName, location);
  return NextResponse.json({ results });
}

import { NextResponse } from "next/server";

import { listHistory } from "../../../lib/store";

export async function GET() {
  const entries = await listHistory();
  return NextResponse.json({ entries });
}

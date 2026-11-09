import { NextResponse } from "next/server";
import { FIXTURES } from "../../../../lib/tutor/fixtures";

/** Development only: the fixture set the harness scores a provider against. */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  return NextResponse.json({ fixtures: FIXTURES });
}

import { readerContentCss } from "../../../lib/reader-css";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const css = await readerContentCss();
    return new Response(css, {
      headers: {
        "content-type": "text/css; charset=utf-8",
        "cache-control": "public, max-age=300",
      },
    });
  } catch {
    // No stylesheet is better than a broken page: the player's own typography
    // still renders the section legibly.
    return new Response("/* reader stylesheet unavailable */", {
      headers: { "content-type": "text/css; charset=utf-8" },
      status: 200,
    });
  }
}

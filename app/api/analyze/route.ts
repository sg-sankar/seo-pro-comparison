import { NextRequest, NextResponse } from "next/server";
import { parseHtml } from "@/lib/parser";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Validate URL
    let target: URL;
    try {
      target = new URL(url);
    } catch {
      return NextResponse.json({ error: "Malformed URL" }, { status: 400 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    let resp: Response;
    try {
      resp = await fetch(target.toString(), {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; SEOProComparison/1.0; +https://seo-pro-comparison.vercel.app)",
          Accept: "text/html,application/xhtml+xml",
        },
        signal: controller.signal,
        redirect: "follow",
      });
    } catch (e: any) {
      clearTimeout(timeout);
      return NextResponse.json({
        url,
        status: null,
        error: e.name === "AbortError" ? "Request timed out" : `Fetch failed: ${e.message}`,
      });
    }
    clearTimeout(timeout);

    const status = resp.status;
    const lastModified = resp.headers.get("last-modified") || undefined;
    const html = await resp.text();

    if (!html || html.length < 50) {
      return NextResponse.json({
        url,
        status,
        error: "Empty or near-empty response",
      });
    }

    const parsed = await parseHtml(html, url, status, lastModified);
    return NextResponse.json(parsed);
  } catch (e: any) {
    return NextResponse.json(
      { error: `Server error: ${e.message}` },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { parseHtml } from "@/lib/parser";
import { fetchFirstPublished } from "@/lib/wayback";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const url: string = body?.url;
    const keywords: string[] = Array.isArray(body?.keywords) ? body.keywords : [];

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    let target: URL;
    try {
      target = new URL(url);
    } catch {
      return NextResponse.json({ error: "Malformed URL" }, { status: 400 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const start = Date.now();
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

    const ttfbMs = Date.now() - start;
    const status = resp.status;
    const finalUrl = resp.url || url;
    const redirected = resp.redirected || false;
    const lastModified = resp.headers.get("last-modified") || undefined;
    const html = await resp.text();

    if (!html || html.length < 50) {
      return NextResponse.json({ url, status, error: "Empty or near-empty response" });
    }

    const parsed = await parseHtml(html, url, status, lastModified, keywords);
    parsed.ttfbMs = ttfbMs;
    parsed.finalUrl = finalUrl;
    parsed.redirected = redirected;

    // First published: schema/meta date first, else Wayback (server-side, no CORS)
    if (parsed.datePublished) {
      parsed.firstPublished = parsed.datePublished.slice(0, 10);
      parsed.firstPublishedSource = "Schema/meta (datePublished)";
    } else {
      const wb = await fetchFirstPublished(url);
      parsed.firstPublished = wb.date;
      parsed.firstPublishedSource = wb.source;
    }

    return NextResponse.json(parsed);
  } catch (e: any) {
    return NextResponse.json({ error: `Server error: ${e.message}` }, { status: 500 });
  }
}

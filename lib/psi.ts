// Fetches Core Web Vitals from Google PageSpeed Insights.
// Called client-side (browser) — PSI supports CORS, no API key needed
// (rate-limited per IP; fine for personal use).

import type { SeoData } from "./types";

type Cwv = NonNullable<SeoData["cwv"]>;

export async function fetchCwv(
  url: string,
  strategy: "mobile" | "desktop" = "mobile"
): Promise<Cwv> {
  try {
    const api = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(
      url
    )}&strategy=${strategy}&category=performance`;

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 45000);
    const res = await fetch(api, { signal: ctrl.signal });
    clearTimeout(t);

    if (!res.ok) {
      return { source: `PSI error (${res.status})` };
    }
    const json = await res.json();

    const lr = json.lighthouseResult;
    const audits = lr?.audits || {};
    const perfScore = lr?.categories?.performance?.score;

    // Prefer field data (real users) from CrUX if present
    const field = json.loadingExperience?.metrics || {};
    const fieldLcp = field.LARGEST_CONTENTFUL_PAINT_MS?.percentile;
    const fieldCls = field.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile;
    const fieldInp = field.INTERACTION_TO_NEXT_PAINT?.percentile;

    const num = (id: string) =>
      typeof audits[id]?.numericValue === "number"
        ? Math.round(audits[id].numericValue)
        : undefined;

    const cls =
      fieldCls !== undefined
        ? fieldCls / 100
        : typeof audits["cumulative-layout-shift"]?.numericValue === "number"
        ? Math.round(audits["cumulative-layout-shift"].numericValue * 1000) / 1000
        : undefined;

    return {
      lcp: fieldLcp ?? num("largest-contentful-paint"),
      cls,
      inp: fieldInp ?? num("interaction-to-next-paint"),
      fcp: num("first-contentful-paint"),
      ttfb: num("server-response-time"),
      performanceScore:
        typeof perfScore === "number" ? Math.round(perfScore * 100) : undefined,
      source: fieldLcp !== undefined ? "PSI (field + lab)" : "PSI (lab)",
    };
  } catch (e: any) {
    return {
      source: e.name === "AbortError" ? "PSI (timeout)" : "PSI (failed)",
    };
  }
}

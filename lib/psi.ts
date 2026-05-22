import type { SeoData } from "./types";

type Cwv = NonNullable<SeoData["cwv"]>;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function fetchCwv(
  url: string,
  strategy: "mobile" | "desktop" = "mobile",
  attempt = 0
): Promise<Cwv> {
  try {
    const api = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(
      url
    )}&strategy=${strategy}&category=performance`;

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 45000);
    const res = await fetch(api, { signal: ctrl.signal });
    clearTimeout(t);

    // Rate limited (no API key) -> wait and retry up to 3 times
    if (res.status === 429 && attempt < 3) {
      await sleep(4000 * (attempt + 1));
      return fetchCwv(url, strategy, attempt + 1);
    }

    if (!res.ok) {
      return { source: `PSI error (${res.status})` };
    }
    const json = await res.json();

    const lr = json.lighthouseResult;
    const audits = lr?.audits || {};
    const perfScore = lr?.categories?.performance?.score;

    const fieldMetrics = json.loadingExperience?.metrics || {};
    const fieldLcp = fieldMetrics.LARGEST_CONTENTFUL_PAINT_MS?.percentile;
    const fieldCls = fieldMetrics.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile;
    const fieldInp = fieldMetrics.INTERACTION_TO_NEXT_PAINT?.percentile;

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
    if (e.name !== "AbortError" && attempt < 2) {
      await sleep(3000);
      return fetchCwv(url, strategy, attempt + 1);
    }
    return { source: e.name === "AbortError" ? "PSI (timeout)" : "PSI (failed)" };
  }
}

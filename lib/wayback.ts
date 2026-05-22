// Fetches the FIRST archived snapshot date from the Wayback Machine.
// Called client-side (browser) — Wayback CDX API supports CORS.

export async function fetchFirstPublished(
  url: string
): Promise<{ date?: string; source: string }> {
  try {
    const clean = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
    const api = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(
      clean
    )}&output=json&fl=timestamp&limit=1&from=1996`;

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch(api, { signal: ctrl.signal });
    clearTimeout(t);

    if (!res.ok) return { source: "Wayback (error)" };
    const json = await res.json();

    // json[0] is header row; json[1] is first data row
    if (Array.isArray(json) && json.length > 1 && json[1][0]) {
      const ts = String(json[1][0]); // YYYYMMDDhhmmss
      const y = ts.slice(0, 4);
      const m = ts.slice(4, 6);
      const d = ts.slice(6, 8);
      return { date: `${y}-${m}-${d}`, source: "Wayback (first snapshot)" };
    }
    return { source: "Wayback (no snapshot)" };
  } catch (e: any) {
    return { source: e.name === "AbortError" ? "Wayback (timeout)" : "Wayback (failed)" };
  }
}

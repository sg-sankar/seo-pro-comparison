"use client";

import { useState } from "react";
import UrlInput from "@/components/UrlInput";
import ComparisonTable from "@/components/ComparisonTable";
import { fetchCwv } from "@/lib/psi";
import type { SeoData } from "@/lib/types";

export default function Home() {
  const [urls, setUrls] = useState<string[]>(["", ""]);
  const [keywordsRaw, setKeywordsRaw] = useState("");
  const [results, setResults] = useState<(SeoData | null)[]>([]);
  const [loading, setLoading] = useState<boolean[]>([]);
  const [running, setRunning] = useState(false);
  const [strategy, setStrategy] = useState<"mobile" | "desktop">("mobile");

  const parsedKeywords = keywordsRaw
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean)
    .slice(0, 5);

  const updateResult = (i: number, patch: Partial<SeoData>) => {
    setResults((prev) => {
      const next = [...prev];
      if (next[i]) next[i] = { ...next[i]!, ...patch };
      return next;
    });
  };

  const handleAnalyze = async () => {
    const valid = urls.map((u) => u.trim()).filter((u) => u.length > 0);
    if (valid.length < 2) {
      alert("Please enter at least 2 URLs");
      return;
    }

    setRunning(true);
    setResults(valid.map(() => null));
    setLoading(valid.map(() => true));

    // Phase 1: main parse (parallel, hits our own API)
    await Promise.all(
      valid.map(async (url, i) => {
        try {
          const res = await fetch("/api/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url, keywords: parsedKeywords }),
          });
          const data: SeoData = await res.json();
          setResults((prev) => {
            const next = [...prev];
            next[i] = data;
            return next;
          });
        } catch (e: any) {
          setResults((prev) => {
            const next = [...prev];
            next[i] = { url, status: null, error: e.message };
            return next;
          });
        } finally {
          setLoading((prev) => {
            const next = [...prev];
            next[i] = false;
            return next;
          });
        }
      })
    );

    // Phase 2: Core Web Vitals (SEQUENTIAL + retry to avoid keyless 429s)
    for (let i = 0; i < valid.length; i++) {
      const cwv = await fetchCwv(valid[i], strategy);
      updateResult(i, { cwv });
    }

    setRunning(false);
  };

  const exportCsv = () => {
    if (results.length === 0) return;
    const rows: string[][] = [];
    rows.push(["Metric", ...results.map((r, i) => r?.url || `URL ${i + 1}`)]);

    const field = (r: SeoData | null, fn: (d: SeoData) => string) =>
      r && !r.error ? fn(r) : r?.error || "";

    const mk = (m?: { exact: boolean; partial: boolean }) =>
      !m ? "" : m.exact ? "exact" : m.partial ? "partial" : "no";

    const lines: { label: string; fn: (d: SeoData) => string }[] = [
      { label: "Final URL", fn: (d) => (d.redirected ? d.finalUrl || "" : "no redirect") },
      { label: "HTTP Status", fn: (d) => String(d.status ?? "") },
      { label: "TTFB (ms)", fn: (d) => String(d.ttfbMs ?? "") },
      { label: "Title", fn: (d) => d.title || "" },
      { label: "Title Length", fn: (d) => String(d.titleLength ?? "") },
      { label: "Meta Description", fn: (d) => d.metaDescription || "" },
      { label: "Meta Desc Length", fn: (d) => String(d.metaDescriptionLength ?? "") },
      { label: "Meta Keywords", fn: (d) => d.metaKeywords || "" },
      { label: "Canonical", fn: (d) => d.canonical || "" },
      { label: "URL = Canonical?", fn: (d) => d.urlMatchesCanonical || "" },
      { label: "Meta Robots", fn: (d) => d.metaRobots || "" },
      { label: "Viewport", fn: (d) => d.viewport || "" },
      { label: "Lang", fn: (d) => d.lang || "" },
      { label: "Schema Types", fn: (d) => (d.schemaTypes || []).join("; ") },
      { label: "First Published", fn: (d) => d.firstPublished ? `${d.firstPublished} (${d.firstPublishedSource || ""})` : (d.firstPublishedSource || "") },
      { label: "Date Modified", fn: (d) => d.dateModified || "" },
      { label: "Last-Modified Header", fn: (d) => d.lastModifiedHeader || "" },
      { label: "Word Count", fn: (d) => String(d.wordCount ?? "") },
      { label: "Rendering", fn: (d) => d.renderingType || "" },
      { label: "Performance Score", fn: (d) => d.cwv?.performanceScore !== undefined ? String(d.cwv.performanceScore) : "" },
      { label: "LCP (ms)", fn: (d) => String(d.cwv?.lcp ?? "") },
      { label: "CLS", fn: (d) => String(d.cwv?.cls ?? "") },
      { label: "INP (ms)", fn: (d) => String(d.cwv?.inp ?? "") },
      { label: "FCP (ms)", fn: (d) => String(d.cwv?.fcp ?? "") },
      { label: "HTML Size (KB)", fn: (d) => String(d.htmlSizeKb ?? "") },
      { label: "H1 Count", fn: (d) => String(d.headingCounts?.h1 ?? "") },
      { label: "H2 Count", fn: (d) => String(d.headingCounts?.h2 ?? "") },
      { label: "H3 Count", fn: (d) => String(d.headingCounts?.h3 ?? "") },
      { label: "H4 Count", fn: (d) => String(d.headingCounts?.h4 ?? "") },
      { label: "H5 Count", fn: (d) => String(d.headingCounts?.h5 ?? "") },
      { label: "H6 Count", fn: (d) => String(d.headingCounts?.h6 ?? "") },
      { label: "Headings with '?'", fn: (d) => String(d.questionHeadingsMark ?? "") },
      { label: "Question-word Headings", fn: (d) => String(d.questionHeadingsWord ?? "") },
      { label: "Current Year in Title", fn: (d) => d.yearChecks?.[0] ? (d.yearChecks[0].inTitle ? "yes" : "no") : "" },
      { label: "Current Year in H1", fn: (d) => d.yearChecks?.[0] ? (d.yearChecks[0].inH1 ? "yes" : "no") : "" },
      { label: "Current Year in Body (count)", fn: (d) => d.yearChecks?.[0] ? String(d.yearChecks[0].inBodyCount) : "" },
      { label: "Next Year in Title", fn: (d) => d.yearChecks?.[1] ? (d.yearChecks[1].inTitle ? "yes" : "no") : "" },
      { label: "Next Year in H1", fn: (d) => d.yearChecks?.[1] ? (d.yearChecks[1].inH1 ? "yes" : "no") : "" },
      { label: "Next Year in Body (count)", fn: (d) => d.yearChecks?.[1] ? String(d.yearChecks[1].inBodyCount) : "" },
      { label: "H1", fn: (d) => (d.h1 || []).join(" | ") },
      { label: "Heading Tree", fn: (d) => (d.headingTree || []).map((h) => `${"  ".repeat(h.level - 1)}H${h.level}: ${h.text}`).join(" || ") },
      { label: "Internal Links", fn: (d) => (d.internalLinks || []).map((l) => `${l.anchor} -> ${l.href}`).join(" || ") },
      { label: "External Links", fn: (d) => (d.externalLinks || []).map((l) => `${l.anchor} -> ${l.href}`).join(" || ") },
      { label: "Social Links", fn: (d) => (d.socialLinks || []).map((l) => `${l.platform}: ${l.href}`).join(" || ") },
      { label: "Images (name | alt)", fn: (d) => (d.images || []).map((img) => `${img.name} | ${img.alt || "MISSING"}`).join(" || ") },
    ];

    lines.forEach((line) => {
      rows.push([line.label, ...results.map((r) => field(r, line.fn))]);
    });

    // Keyword rows
    parsedKeywords.forEach((kw) => {
      const locs: { name: string; pick: (d: SeoData) => any }[] = [
        { name: "Title", pick: (d) => d.keywordChecks?.find((k) => k.keyword === kw)?.title },
        { name: "H1", pick: (d) => d.keywordChecks?.find((k) => k.keyword === kw)?.h1 },
        { name: "Meta Desc", pick: (d) => d.keywordChecks?.find((k) => k.keyword === kw)?.metaDescription },
        { name: "Meta KW", pick: (d) => d.keywordChecks?.find((k) => k.keyword === kw)?.metaKeywords },
        { name: "First 30w", pick: (d) => d.keywordChecks?.find((k) => k.keyword === kw)?.first30Words },
        { name: "Image Alt", pick: (d) => d.keywordChecks?.find((k) => k.keyword === kw)?.imageAlt },
      ];
      locs.forEach((loc) => {
        rows.push([
          `KW "${kw}" in ${loc.name}`,
          ...results.map((r) => field(r, (d) => mk(loc.pick(d)))),
        ]);
      });
    });

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `seo-comparison-${Date.now()}.csv`;
    link.click();
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      <div className="max-w-[1600px] w-full mx-auto px-4 py-8 flex-1">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">SEO Pro Comparison</h1>
          <p className="text-gray-600 mt-1">
            Compare SEO factors across 2 to 5 URLs side by side
          </p>
        </header>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Enter URLs to compare</h2>
          <UrlInput urls={urls} setUrls={setUrls} />

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target keywords (optional, up to 5, comma-separated)
            </label>
            <input
              type="text"
              value={keywordsRaw}
              onChange={(e) => setKeywordsRaw(e.target.value)}
              placeholder="selenium training, automation testing, software testing course"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            {parsedKeywords.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Checking {parsedKeywords.length} keyword(s) across title, H1, meta description, meta keywords, first 30 words, and image alt text.
              </p>
            )}
          </div>

          <div className="flex items-center gap-4 mt-4 flex-wrap">
            <button
              onClick={handleAnalyze}
              disabled={running}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition"
            >
              {running ? "Analyzing..." : "Compare"}
            </button>

            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">CWV:</span>
              <button
                onClick={() => setStrategy("mobile")}
                className={strategy === "mobile" ? "px-3 py-1 rounded bg-blue-100 text-blue-700 font-medium" : "px-3 py-1 rounded bg-gray-100 text-gray-600"}
              >
                Mobile
              </button>
              <button
                onClick={() => setStrategy("desktop")}
                className={strategy === "desktop" ? "px-3 py-1 rounded bg-blue-100 text-blue-700 font-medium" : "px-3 py-1 rounded bg-gray-100 text-gray-600"}
              >
                Desktop
              </button>
            </div>

            {results.length > 0 && (
              <button
                onClick={exportCsv}
                className="ml-auto px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 transition"
              >
                Export CSV
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Note: Core Web Vitals (PageSpeed) load one URL at a time after the rest of the data and can take 20 to 40s each. JS-rendered SPAs may return incomplete results.
          </p>
        </div>

        {results.length > 0 && (
          <ComparisonTable results={results} loading={loading} keywords={parsedKeywords} />
        )}
      </div>

      <footer className="border-t border-gray-200 bg-white mt-8">
        <div className="max-w-[1600px] mx-auto px-4 py-6 text-sm text-gray-600">
          <div className="font-semibold text-gray-800">Sankar Gurumurthy</div>
          <div className="text-gray-500">AI SEO / PPC / Digital Marketing - AI / ML / Data Science</div>
          <div className="text-gray-500 mt-1 max-w-2xl">
            Data-driven AI SEO / PPC specialist. Interested in Python, web analytics, data science, NLP, ML, LLMs, and AI agents to boost traffic and conversion.
          </div>
          <div className="flex gap-4 mt-3">
            <a href="https://www.linkedin.com/in/sankar-gurumurthy-a1044a136/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">LinkedIn</a>
            <a href="https://github.com/sg-sankar" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">GitHub</a>
          </div>
          <div className="text-xs text-gray-400 mt-3">SEO Pro Comparison v1 - built by Sankar Gurumurthy</div>
        </div>
      </footer>
    </main>
  );
}

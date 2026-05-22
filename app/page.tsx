"use client";

import { useState } from "react";
import UrlInput from "@/components/UrlInput";
import ComparisonTable from "@/components/ComparisonTable";
import { fetchFirstPublished } from "@/lib/wayback";
import { fetchCwv } from "@/lib/psi";
import type { SeoData } from "@/lib/types";

export default function Home() {
  const [urls, setUrls] = useState<string[]>(["", ""]);
  const [results, setResults] = useState<(SeoData | null)[]>([]);
  const [loading, setLoading] = useState<boolean[]>([]);
  const [running, setRunning] = useState(false);
  const [strategy, setStrategy] = useState<"mobile" | "desktop">("mobile");

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

    valid.forEach(async (url, i) => {
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
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

      let publishedDate: string | undefined;
      await new Promise<void>((resolve) => {
        setResults((prev) => {
          publishedDate = prev[i]?.datePublished;
          return prev;
        });
        resolve();
      });

      if (publishedDate) {
        updateResult(i, {
          firstPublished: publishedDate.slice(0, 10),
          firstPublishedSource: "Schema/meta (datePublished)",
        });
      } else {
        const wb = await fetchFirstPublished(url);
        updateResult(i, {
          firstPublished: wb.date,
          firstPublishedSource: wb.source,
        });
      }

      const cwv = await fetchCwv(url, strategy);
      updateResult(i, { cwv });
    });

    setRunning(false);
  };

  const exportCsv = () => {
    if (results.length === 0) return;
    const rows: string[][] = [];
    const header = ["Metric", ...results.map((r, i) => r?.url || `URL ${i + 1}`)];
    rows.push(header);

    const field = (r: SeoData | null, fn: (d: SeoData) => string) =>
      r && !r.error ? fn(r) : r?.error || "";

    const lines: { label: string; fn: (d: SeoData) => string }[] = [
      { label: "HTTP Status", fn: (d) => String(d.status ?? "") },
      { label: "Title", fn: (d) => d.title || "" },
      { label: "Meta Description", fn: (d) => d.metaDescription || "" },
      { label: "Meta Keywords", fn: (d) => d.metaKeywords || "" },
      { label: "Canonical", fn: (d) => d.canonical || "" },
      { label: "Meta Robots", fn: (d) => d.metaRobots || "" },
      { label: "Viewport", fn: (d) => d.viewport || "" },
      { label: "Lang", fn: (d) => d.lang || "" },
      { label: "Schema Types", fn: (d) => (d.schemaTypes || []).join("; ") },
      {
        label: "First Published",
        fn: (d) =>
          d.firstPublished
            ? `${d.firstPublished} (${d.firstPublishedSource || ""})`
            : d.datePublished || "",
      },
      { label: "Date Modified", fn: (d) => d.dateModified || "" },
      { label: "Last-Modified Header", fn: (d) => d.lastModifiedHeader || "" },
      { label: "Word Count", fn: (d) => String(d.wordCount ?? "") },
      { label: "Rendering", fn: (d) => d.renderingType || "" },
      {
        label: "Performance Score",
        fn: (d) =>
          d.cwv?.performanceScore !== undefined
            ? String(d.cwv.performanceScore)
            : "",
      },
      { label: "LCP (ms)", fn: (d) => String(d.cwv?.lcp ?? "") },
      { label: "CLS", fn: (d) => String(d.cwv?.cls ?? "") },
      { label: "INP (ms)", fn: (d) => String(d.cwv?.inp ?? "") },
      { label: "FCP (ms)", fn: (d) => String(d.cwv?.fcp ?? "") },
      { label: "TTFB (ms)", fn: (d) => String(d.cwv?.ttfb ?? "") },
      { label: "HTML Size (KB)", fn: (d) => String(d.htmlSizeKb ?? "") },
      { label: "H1", fn: (d) => (d.h1 || []).join(" | ") },
      {
        label: "Heading Tree",
        fn: (d) =>
          (d.headingTree || [])
            .map((h) => `${"  ".repeat(h.level - 1)}H${h.level}: ${h.text}`)
            .join(" || "),
      },
      {
        label: "Internal Links",
        fn: (d) =>
          (d.internalLinks || [])
            .map((l) => `${l.anchor} -> ${l.href}`)
            .join(" || "),
      },
      {
        label: "External Links",
        fn: (d) =>
          (d.externalLinks || [])
            .map((l) => `${l.anchor} -> ${l.href}`)
            .join(" || "),
      },
      {
        label: "Social Links",
        fn: (d) =>
          (d.socialLinks || [])
            .map((l) => `${l.platform}: ${l.href}`)
            .join(" || "),
      },
      {
        label: "Images (name | alt)",
        fn: (d) =>
          (d.images || [])
            .map((img) => `${img.name} | ${img.alt || "MISSING"}`)
            .join(" || "),
      },
    ];

    lines.forEach((line) => {
      rows.push([line.label, ...results.map((r) => field(r, line.fn))]);
    });

    const csv = rows
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
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
          <h1 className="text-3xl font-bold text-gray-900">
            SEO Pro Comparison
          </h1>
          <p className="text-gray-600 mt-1">
            Compare SEO factors across 2–5 URLs side by side
          </p>
        </header>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Enter URLs to compare</h2>
          <UrlInput urls={urls} setUrls={setUrls} />

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
                className={`px-3 py-1 rounded ${
                  strategy === "mobile"
                    ? "bg-blue-100 text-blue-700 font-medium"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                Mobile
              </button>
              <button
                onClick={() => setStrategy("desktop")}
                className={`px-3 py-1 rounded ${
                  strategy === "desktop"
                    ? "bg-blue-100 text-blue-700 font-medium"
                    : "bg-gray-100 text-gray-600"
                }`}
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
            Note: Core Web Vitals (PageSpeed) can take 20-40s per URL and load
            after the rest of the data. JS-rendered SPAs may return incomplete
            results.
          </p>
        </div>

        {results.length > 0 && (
          <ComparisonTable results={results} loading={loading} />
        )}
      </div>

      <footer className="border-t border-gray-200 bg-white mt-8">
        <div className="max-w-[1600px] mx-auto px-4 py-6 text-sm text-gray-600">
          <div className="font-semibold text-gray-800">Sankar Gurumurthy</div>
          <div className="text-gray-500">
            AI SEO / PPC / Digital Marketing - AI / ML / Data Science
          </div>
          <div className="text-gray-500 mt-1 max-w-2xl">
            Data-driven AI SEO / PPC specialist. Interested in Python, web
            analytics, data science, NLP, ML, LLMs, and AI agents to boost
            traffic and conversion.
          </div>
          <div className="flex gap-4 mt-3">
            
              href="https://www.linkedin.com/in/sankar-gurumurthy-a1044a136/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              LinkedIn
            </a>
            
              href="https://github.com/sg-sankar"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              GitHub
            </a>
          </div>
          <div className="text-xs text-gray-400 mt-3">
            SEO Pro Comparison v1 - built by Sankar Gurumurthy
          </div>
        </div>
      </footer>
    </main>
  );
}

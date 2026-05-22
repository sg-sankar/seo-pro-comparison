"use client";

import { useState } from "react";
import UrlInput from "@/components/UrlInput";
import ComparisonTable from "@/components/ComparisonTable";
import type { SeoData } from "@/lib/types";

export default function Home() {
  const [urls, setUrls] = useState<string[]>(["", ""]);
  const [results, setResults] = useState<(SeoData | null)[]>([]);
  const [loading, setLoading] = useState<boolean[]>([]);
  const [running, setRunning] = useState(false);

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
    });

    setRunning(false);
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-[1600px] mx-auto px-4 py-8">
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
          <button
            onClick={handleAnalyze}
            disabled={running}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition"
          >
            {running ? "Analyzing..." : "Compare"}
          </button>
        </div>

        {results.length > 0 && (
          <ComparisonTable results={results} loading={loading} />
        )}

        <p className="text-xs text-gray-500 mt-4">
          v1 — page-level SEO + body content extraction. CWV + first-published from Wayback coming next.
        </p>
      </div>
    </main>
  );
}

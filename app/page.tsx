"use client";

import { useState } from "react";
import UrlInput from "@/components/UrlInput";

export default function Home() {
  const [urls, setUrls] = useState<string[]>(["", ""]);
  const [analyzing, setAnalyzing] = useState(false);

  const handleAnalyze = () => {
    const valid = urls.filter((u) => u.trim().length > 0);
    if (valid.length < 2) {
      alert("Please enter at least 2 URLs");
      return;
    }
    setAnalyzing(true);
    // Analysis logic comes in next batch
    setTimeout(() => {
      alert("Scaffold working! Real analysis coming in next batch.");
      setAnalyzing(false);
    }, 500);
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
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
            disabled={analyzing}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition"
          >
            {analyzing ? "Analyzing..." : "Compare"}
          </button>
        </div>

        <p className="text-xs text-gray-500">v1 — scaffold</p>
      </div>
    </main>
  );
}

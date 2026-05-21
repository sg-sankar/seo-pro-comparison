"use client";

import { Plus, X } from "lucide-react";

interface Props {
  urls: string[];
  setUrls: (urls: string[]) => void;
  maxUrls?: number;
}

export default function UrlInput({ urls, setUrls, maxUrls = 5 }: Props) {
  const updateUrl = (i: number, val: string) => {
    const next = [...urls];
    next[i] = val;
    setUrls(next);
  };

  const addUrl = () => {
    if (urls.length < maxUrls) setUrls([...urls, ""]);
  };

  const removeUrl = (i: number) => {
    if (urls.length <= 2) return;
    setUrls(urls.filter((_, idx) => idx !== i));
  };

  return (
    <div className="space-y-2">
      {urls.map((url, i) => (
        <div key={i} className="flex gap-2 items-center">
          <span className="text-sm text-gray-500 w-6">{i + 1}.</span>
          <input
            type="url"
            value={url}
            onChange={(e) => updateUrl(i, e.target.value)}
            placeholder="https://example.com/page"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          {urls.length > 2 && (
            <button
              onClick={() => removeUrl(i)}
              className="p-2 text-gray-400 hover:text-red-500 transition"
              aria-label="Remove URL"
            >
              <X size={18} />
            </button>
          )}
        </div>
      ))}
      {urls.length < maxUrls && (
        <button
          onClick={addUrl}
          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mt-2"
        >
          <Plus size={16} /> Add URL ({urls.length}/{maxUrls})
        </button>
      )}
    </div>
  );
}

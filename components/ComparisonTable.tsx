"use client";

import type { SeoData, KeywordLocationMatch } from "@/lib/types";
import HeadingTree from "./HeadingTree";

interface Props {
  results: (SeoData | null)[];
  loading: boolean[];
  keywords: string[];
}

function CellList({ items }: { items?: string[] }) {
  if (!items || items.length === 0) return <span className="text-gray-400 italic">none</span>;
  return (
    <ul className="list-disc pl-4 space-y-0.5">
      {items.map((x, i) => (<li key={i} className="break-words">{x}</li>))}
    </ul>
  );
}

function CellText({ value }: { value?: string | number | null }) {
  if (value === undefined || value === null || value === "")
    return <span className="text-gray-400 italic">&mdash;</span>;
  return <span className="break-words">{String(value)}</span>;
}

function Badge({ ok, warn, label }: { ok?: boolean; warn?: boolean; label: string }) {
  const cls = ok
    ? "bg-green-100 text-green-700"
    : warn
    ? "bg-amber-100 text-amber-700"
    : "bg-red-100 text-red-700";
  return <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] ${cls}`}>{label}</span>;
}

function LenCell({ value, max }: { value?: number; max: number }) {
  if (value === undefined) return <span className="text-gray-400 italic">&mdash;</span>;
  const over = value > max;
  return (
    <span>
      {value} chars{" "}
      {over ? <Badge warn label={`over ${max}`} /> : <Badge ok label="ok" />}
    </span>
  );
}

function MatchMark({ m }: { m?: KeywordLocationMatch }) {
  if (!m) return <span className="text-gray-300">&mdash;</span>;
  if (m.exact) return <span className="text-green-600 font-semibold">exact</span>;
  if (m.partial) return <span className="text-amber-600">partial</span>;
  return <span className="text-gray-400">no</span>;
}

function CellLinks({ links }: { links?: { href: string; anchor: string }[] }) {
  if (!links || links.length === 0) return <span className="text-gray-400 italic">none</span>;
  return (
    <details>
      <summary className="cursor-pointer text-blue-600 text-xs">{links.length} links</summary>
      <ul className="mt-1 space-y-1 max-h-64 overflow-y-auto text-xs">
        {links.map((l, i) => (
          <li key={i} className="break-words border-b border-gray-100 pb-1">
            <div className="font-medium">{l.anchor || "[no text]"}</div>
            <div className="text-gray-500 text-[10px] break-all">{l.href}</div>
          </li>
        ))}
      </ul>
    </details>
  );
}

function CellImages({ images }: { images?: { name: string; alt: string }[] }) {
  if (!images || images.length === 0) return <span className="text-gray-400 italic">none</span>;
  const missing = images.filter((im) => !im.alt).length;
  return (
    <details>
      <summary className="cursor-pointer text-blue-600 text-xs">
        {images.length} images{missing ? ` (${missing} no alt)` : ""}
      </summary>
      <ul className="mt-1 space-y-1 max-h-64 overflow-y-auto text-xs">
        {images.map((img, i) => (
          <li key={i} className="border-b border-gray-100 pb-1">
            <div className="font-medium break-all">{img.name}</div>
            <div className="text-gray-500 text-[10px]">
              alt: {img.alt || <span className="italic text-red-500">missing</span>}
            </div>
          </li>
        ))}
      </ul>
    </details>
  );
}

function CellSocial({ links }: { links?: { platform: string; href: string }[] }) {
  if (!links || links.length === 0) return <span className="text-gray-400 italic">none</span>;
  return (
    <ul className="space-y-0.5 text-xs">
      {links.map((l, i) => (
        <li key={i}>
          <span className="font-medium">{l.platform}:</span>{" "}
          <span className="text-gray-500 break-all">{l.href}</span>
        </li>
      ))}
    </ul>
  );
}

function CellCwv({ d }: { d: SeoData }) {
  const c = d.cwv;
  if (!c) return <span className="text-gray-400 italic">loading...</span>;
  const fmt = (v?: number, unit = "ms") => (v === undefined ? "—" : `${v}${unit}`);
  return (
    <div className="text-xs space-y-0.5">
      <div><span className="font-medium">Perf:</span> {c.performanceScore !== undefined ? `${c.performanceScore}/100` : "—"}</div>
      <div><span className="font-medium">LCP:</span> {fmt(c.lcp)}</div>
      <div><span className="font-medium">CLS:</span> {c.cls ?? "—"}</div>
      <div><span className="font-medium">INP:</span> {fmt(c.inp)}</div>
      <div><span className="font-medium">FCP:</span> {fmt(c.fcp)}</div>
      <div><span className="font-medium">TTFB:</span> {fmt(c.ttfb)}</div>
      <div className="text-gray-400 text-[10px]">{c.source}</div>
    </div>
  );
}

function CellHeadingCounts({ d }: { d: SeoData }) {
  const c = d.headingCounts;
  if (!c) return <span className="text-gray-400 italic">&mdash;</span>;
  return (
    <div className="text-xs flex flex-wrap gap-x-3 gap-y-0.5">
      <span>H1: <b className={c.h1 === 1 ? "" : "text-amber-600"}>{c.h1}</b></span>
      <span>H2: <b>{c.h2}</b></span>
      <span>H3: <b>{c.h3}</b></span>
      <span>H4: <b>{c.h4}</b></span>
      <span>H5: <b>{c.h5}</b></span>
      <span>H6: <b>{c.h6}</b></span>
    </div>
  );
}

function CellYear({ d, index }: { d: SeoData; index: number }) {
  const y = d.yearChecks?.[index];
  if (!y) return <span className="text-gray-400 italic">&mdash;</span>;
  return (
    <div className="text-xs space-y-0.5">
      <div className="font-medium">{y.year}</div>
      <div>Title: {y.inTitle ? <Badge ok label="yes" /> : <Badge label="no" />}</div>
      <div>H1: {y.inH1 ? <Badge ok label="yes" /> : <Badge label="no" />}</div>
      <div>Body: {y.inBodyCount > 0 ? <Badge ok label={`${y.inBodyCount}x`} /> : <Badge label="0" />}</div>
    </div>
  );
}

const STATIC_ROWS: { label: string; render: (d: SeoData) => React.ReactNode }[] = [
  { label: "URL", render: (d) => <CellText value={d.url} /> },
  { label: "Final URL (after redirect)", render: (d) => (d.redirected ? <CellText value={d.finalUrl} /> : <span className="text-gray-400 text-xs">no redirect</span>) },
  { label: "HTTP Status", render: (d) => <CellText value={d.status ?? "—"} /> },
  { label: "Server Response (TTFB)", render: (d) => <CellText value={d.ttfbMs !== undefined ? `${d.ttfbMs} ms` : "—"} /> },
  { label: "Title", render: (d) => <CellText value={d.title} /> },
  { label: "Title Length", render: (d) => <LenCell value={d.titleLength} max={60} /> },
  { label: "Meta Description", render: (d) => <CellText value={d.metaDescription} /> },
  { label: "Meta Desc Length", render: (d) => <LenCell value={d.metaDescriptionLength} max={160} /> },
  { label: "Meta Keywords", render: (d) => <CellText value={d.metaKeywords} /> },
  { label: "Canonical", render: (d) => <CellText value={d.canonical} /> },
  {
    label: "URL = Canonical?",
    render: (d) =>
      d.urlMatchesCanonical === "yes" ? <Badge ok label="yes (self)" />
      : d.urlMatchesCanonical === "no" ? <Badge warn label="points elsewhere" />
      : <Badge label="no canonical" />,
  },
  { label: "Meta Robots", render: (d) => <CellText value={d.metaRobots} /> },
  { label: "Viewport", render: (d) => <CellText value={d.viewport} /> },
  { label: "Lang", render: (d) => <CellText value={d.lang} /> },
  { label: "Schema Types", render: (d) => <CellList items={d.schemaTypes} /> },
  {
    label: "First Published",
    render: (d) => d.firstPublished
      ? <span>{d.firstPublished}<span className="block text-gray-400 text-[10px]">{d.firstPublishedSource}</span></span>
      : <span className="text-gray-400 text-xs">{d.firstPublishedSource || "—"}</span>,
  },
  { label: "Date Modified (page)", render: (d) => <CellText value={d.dateModified} /> },
  { label: "Last-Modified Header", render: (d) => <CellText value={d.lastModifiedHeader} /> },
  { label: "Word Count", render: (d) => <CellText value={d.wordCount} /> },
  { label: "Rendering", render: (d) => <CellText value={d.renderingType} /> },
  { label: "Core Web Vitals", render: (d) => <CellCwv d={d} /> },
  { label: "HTML Size (KB)", render: (d) => <CellText value={d.htmlSizeKb} /> },
  { label: "Heading Counts", render: (d) => <CellHeadingCounts d={d} /> },
  {
    label: "Question Headings",
    render: (d) => (
      <div className="text-xs space-y-0.5">
        <div>With &quot;?&quot;: <b>{d.questionHeadingsMark ?? 0}</b></div>
        <div>Question-word: <b>{d.questionHeadingsWord ?? 0}</b></div>
      </div>
    ),
  },
  { label: "Freshness: Current Year", render: (d) => <CellYear d={d} index={0} /> },
  { label: "Freshness: Next Year", render: (d) => <CellYear d={d} index={1} /> },
  { label: "H1", render: (d) => <CellText value={d.h1?.join(", ")} /> },
  { label: "Heading Tree", render: (d) => <HeadingTree nodes={d.headingTree || []} /> },
  { label: "Internal Links", render: (d) => <CellLinks links={d.internalLinks} /> },
  { label: "External Links", render: (d) => <CellLinks links={d.externalLinks} /> },
  { label: "Social Links", render: (d) => <CellSocial links={d.socialLinks} /> },
  { label: "Images", render: (d) => <CellImages images={d.images} /> },
];

export default function ComparisonTable({ results, loading, keywords }: Props) {
  const cleanKw = keywords.map((k) => k.trim()).filter(Boolean).slice(0, 5);

  const renderKeywordRow = (kw: string, d: SeoData) => {
    const kc = d.keywordChecks?.find((k) => k.keyword === kw);
    if (!kc) return <span className="text-gray-400 italic">&mdash;</span>;
    return (
      <div className="text-xs grid grid-cols-[auto_auto] gap-x-2 gap-y-0.5">
        <span className="text-gray-500">Title:</span><MatchMark m={kc.title} />
        <span className="text-gray-500">H1:</span><MatchMark m={kc.h1} />
        <span className="text-gray-500">Meta Desc:</span><MatchMark m={kc.metaDescription} />
        <span className="text-gray-500">Meta KW:</span><MatchMark m={kc.metaKeywords} />
        <span className="text-gray-500">First 30w:</span><MatchMark m={kc.first30Words} />
        <span className="text-gray-500">Image Alt:</span><MatchMark m={kc.imageAlt} />
      </div>
    );
  };

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="text-left px-3 py-2 font-semibold text-gray-700 w-48 sticky left-0 bg-gray-100">Metric</th>
            {results.map((r, i) => (
              <th key={i} className="text-left px-3 py-2 font-semibold text-gray-700 min-w-[280px] max-w-[400px]">
                URL {i + 1}
                <div className="text-xs font-normal text-gray-500 break-all">
                  {r?.url || (loading[i] ? "loading..." : "—")}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {STATIC_ROWS.map((row, ri) => (
            <tr key={ri} className="border-t border-gray-100 align-top">
              <td className="px-3 py-2 font-medium text-gray-600 bg-gray-50 sticky left-0">{row.label}</td>
              {results.map((r, ci) => (
                <td key={ci} className="px-3 py-2 max-w-[400px]">
                  {loading[ci] ? <span className="text-gray-400 italic">loading...</span>
                  : r?.error ? <span className="text-red-600 text-xs">{r.error}</span>
                  : r ? row.render(r)
                  : <span className="text-gray-400 italic">&mdash;</span>}
                </td>
              ))}
            </tr>
          ))}
          {cleanKw.length > 0 && (
            <tr className="border-t-2 border-gray-300 bg-blue-50">
              <td className="px-3 py-2 font-semibold text-blue-800 sticky left-0 bg-blue-50" colSpan={results.length + 1}>
                Keyword Matching (exact / partial / no)
              </td>
            </tr>
          )}
          {cleanKw.map((kw, ki) => (
            <tr key={`kw-${ki}`} className="border-t border-gray-100 align-top">
              <td className="px-3 py-2 font-medium text-gray-700 bg-gray-50 sticky left-0">&ldquo;{kw}&rdquo;</td>
              {results.map((r, ci) => (
                <td key={ci} className="px-3 py-2 max-w-[400px]">
                  {loading[ci] ? <span className="text-gray-400 italic">loading...</span>
                  : r && !r.error ? renderKeywordRow(kw, r)
                  : <span className="text-gray-400 italic">&mdash;</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

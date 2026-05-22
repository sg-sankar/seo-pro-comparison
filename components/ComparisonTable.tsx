"use client";

import type { SeoData } from "@/lib/types";
import HeadingTree from "./HeadingTree";

interface Props {
  results: (SeoData | null)[];
  loading: boolean[];
}

function CellList({ items }: { items?: string[] }) {
  if (!items || items.length === 0)
    return <span className="text-gray-400 italic">none</span>;
  return (
    <ul className="list-disc pl-4 space-y-0.5">
      {items.map((x, i) => (
        <li key={i} className="break-words">
          {x}
        </li>
      ))}
    </ul>
  );
}

function CellText({ value }: { value?: string | number | null }) {
  if (value === undefined || value === null || value === "")
    return <span className="text-gray-400 italic">—</span>;
  return <span className="break-words">{String(value)}</span>;
}

function CellLinks({
  links,
}: {
  links?: { href: string; anchor: string }[];
}) {
  if (!links || links.length === 0)
    return <span className="text-gray-400 italic">none</span>;
  return (
    <details>
      <summary className="cursor-pointer text-blue-600 text-xs">
        {links.length} links
      </summary>
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

function CellImages({
  images,
}: {
  images?: { name: string; alt: string }[];
}) {
  if (!images || images.length === 0)
    return <span className="text-gray-400 italic">none</span>;
  return (
    <details>
      <summary className="cursor-pointer text-blue-600 text-xs">
        {images.length} images
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

function CellSocial({
  links,
}: {
  links?: { platform: string; href: string }[];
}) {
  if (!links || links.length === 0)
    return <span className="text-gray-400 italic">none</span>;
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

const ROWS: { label: string; render: (d: SeoData) => React.ReactNode }[] = [
  { label: "URL", render: (d) => <CellText value={d.url} /> },
  { label: "HTTP Status", render: (d) => <CellText value={d.status ?? "—"} /> },
  { label: "Title", render: (d) => <CellText value={d.title} /> },
  { label: "Meta Description", render: (d) => <CellText value={d.metaDescription} /> },
  { label: "Meta Keywords", render: (d) => <CellText value={d.metaKeywords} /> },
  { label: "Canonical", render: (d) => <CellText value={d.canonical} /> },
  { label: "Meta Robots", render: (d) => <CellText value={d.metaRobots} /> },
  { label: "Viewport", render: (d) => <CellText value={d.viewport} /> },
  { label: "Lang", render: (d) => <CellText value={d.lang} /> },
  { label: "Schema Types", render: (d) => <CellList items={d.schemaTypes} /> },
  { label: "Date Published (page)", render: (d) => <CellText value={d.datePublished} /> },
  { label: "Date Modified (page)", render: (d) => <CellText value={d.dateModified} /> },
  { label: "Last-Modified Header", render: (d) => <CellText value={d.lastModifiedHeader} /> },
  { label: "Word Count", render: (d) => <CellText value={d.wordCount} /> },
  { label: "Rendering", render: (d) => <CellText value={d.renderingType} /> },
  { label: "HTML Size (KB)", render: (d) => <CellText value={d.htmlSizeKb} /> },
  { label: "H1", render: (d) => <CellText value={d.h1?.join(", ")} /> },
  {
    label: "Heading Tree",
    render: (d) => <HeadingTree nodes={d.headingTree || []} />,
  },
  {
    label: "Internal Links",
    render: (d) => <CellLinks links={d.internalLinks} />,
  },
  {
    label: "External Links",
    render: (d) => <CellLinks links={d.externalLinks} />,
  },
  { label: "Social Links", render: (d) => <CellSocial links={d.socialLinks} /> },
  { label: "Images", render: (d) => <CellImages images={d.images} /> },
];

export default function ComparisonTable({ results, loading }: Props) {
  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="text-left px-3 py-2 font-semibold text-gray-700 w-48 sticky left-0 bg-gray-100">
              Metric
            </th>
            {results.map((r, i) => (
              <th
                key={i}
                className="text-left px-3 py-2 font-semibold text-gray-700 min-w-[280px] max-w-[400px]"
              >
                URL {i + 1}
                <div className="text-xs font-normal text-gray-500 break-all">
                  {r?.url || (loading[i] ? "loading..." : "—")}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row, ri) => (
            <tr key={ri} className="border-t border-gray-100 align-top">
              <td className="px-3 py-2 font-medium text-gray-600 bg-gray-50 sticky left-0">
                {row.label}
              </td>
              {results.map((r, ci) => (
                <td key={ci} className="px-3 py-2 max-w-[400px]">
                  {loading[ci] ? (
                    <span className="text-gray-400 italic">loading...</span>
                  ) : r?.error ? (
                    <span className="text-red-600 text-xs">{r.error}</span>
                  ) : r ? (
                    row.render(r)
                  ) : (
                    <span className="text-gray-400 italic">—</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

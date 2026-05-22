import * as cheerio from "cheerio";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import type { SeoData, HeadingNode } from "./types";

const SOCIAL_PATTERNS: Record<string, RegExp> = {
  Facebook: /facebook\.com/i,
  Twitter: /(twitter\.com|x\.com)/i,
  LinkedIn: /linkedin\.com/i,
  Instagram: /instagram\.com/i,
  YouTube: /youtube\.com|youtu\.be/i,
  Pinterest: /pinterest\./i,
  TikTok: /tiktok\.com/i,
  Reddit: /reddit\.com/i,
  GitHub: /github\.com/i,
  Threads: /threads\.net/i,
};

const NON_CONTENT_SELECTORS = [
  "nav",
  "header",
  "footer",
  "aside",
  ".nav",
  ".navbar",
  ".navigation",
  ".menu",
  ".header",
  ".footer",
  ".sidebar",
  ".widget",
  ".social",
  ".social-icons",
  ".social-links",
  "#nav",
  "#navbar",
  "#header",
  "#footer",
  "#sidebar",
  "[role='navigation']",
  "[role='banner']",
  "[role='contentinfo']",
];

function cleanImageName(src: string): string {
  if (!src) return "";
  try {
    const url = new URL(src, "https://placeholder.example");
    const pathname = url.pathname;
    const filename = pathname.split("/").pop() || "";
    return filename.split("?")[0].split("#")[0];
  } catch {
    const parts = src.split("/");
    return (parts.pop() || src).split("?")[0].split("#")[0];
  }
}

function absolutize(href: string, base: string): string | null {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

function detectRendering(html: string, $: cheerio.CheerioAPI): string {
  const bodyText = $("body").text().trim();
  const bodyLength = bodyText.length;
  const hasNextData = html.includes("__NEXT_DATA__");
  const hasNuxt = html.includes("__NUXT__");
  const hasReactRoot = html.includes('id="root"') || html.includes('id="__next"');
  const scriptCount = $("script").length;

  if (hasNextData) return "SSR (Next.js)";
  if (hasNuxt) return "SSR/SSG (Nuxt)";
  if (bodyLength < 500 && hasReactRoot && scriptCount > 3)
    return "Likely CSR (SPA)";
  if (bodyLength < 500 && scriptCount > 5) return "Likely CSR";
  return "Likely SSR/Static";
}

export async function parseHtml(
  html: string,
  url: string,
  status: number,
  lastModifiedHeader?: string
): Promise<Partial<SeoData>> {
  const $ = cheerio.load(html);
  const data: Partial<SeoData> = { url, status };

  data.htmlSizeKb = Math.round((html.length / 1024) * 10) / 10;
  data.lastModifiedHeader = lastModifiedHeader;
  data.title = $("title").first().text().trim() || undefined;
  data.metaDescription =
    $('meta[name="description"]').attr("content")?.trim() || undefined;
  data.metaKeywords =
    $('meta[name="keywords"]').attr("content")?.trim() || undefined;
  data.canonical = $('link[rel="canonical"]').attr("href")?.trim() || undefined;
  data.metaRobots =
    $('meta[name="robots"]').attr("content")?.trim() || undefined;
  data.viewport = $('meta[name="viewport"]').attr("content")?.trim() || undefined;
  data.lang = $("html").attr("lang")?.trim() || undefined;

  // Open Graph
  const og: Record<string, string> = {};
  $('meta[property^="og:"]').each((_, el) => {
    const prop = $(el).attr("property")?.replace("og:", "") || "";
    const content = $(el).attr("content") || "";
    if (prop && content) og[prop] = content;
  });
  data.ogTags = Object.keys(og).length ? og : undefined;

  // Twitter
  const tw: Record<string, string> = {};
  $('meta[name^="twitter:"]').each((_, el) => {
    const name = $(el).attr("name")?.replace("twitter:", "") || "";
    const content = $(el).attr("content") || "";
    if (name && content) tw[name] = content;
  });
  data.twitterTags = Object.keys(tw).length ? tw : undefined;

  // hreflang
  const hreflang: { lang: string; href: string }[] = [];
  $('link[rel="alternate"][hreflang]').each((_, el) => {
    const lang = $(el).attr("hreflang") || "";
    const href = $(el).attr("href") || "";
    if (lang && href) hreflang.push({ lang, href });
  });
  data.hreflang = hreflang.length ? hreflang : undefined;

  // Schema types
  const schemaTypes = new Set<string>();
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).contents().text());
      const collect = (obj: any) => {
        if (!obj) return;
        if (Array.isArray(obj)) {
          obj.forEach(collect);
          return;
        }
        if (typeof obj === "object") {
          if (obj["@type"]) {
            const t = obj["@type"];
            if (Array.isArray(t)) t.forEach((x) => schemaTypes.add(String(x)));
            else schemaTypes.add(String(t));
          }
          if (obj["@graph"]) collect(obj["@graph"]);
        }
      };
      collect(json);
    } catch {
      // Skip malformed JSON-LD
    }
  });
  // Microdata
  $("[itemtype]").each((_, el) => {
    const t = $(el).attr("itemtype") || "";
    const last = t.split("/").pop();
    if (last) schemaTypes.add(last);
  });
  data.schemaTypes = Array.from(schemaTypes);

  // Dates from meta / schema
  data.datePublished =
    $('meta[property="article:published_time"]').attr("content") ||
    $('meta[name="article:published_time"]').attr("content") ||
    $('meta[itemprop="datePublished"]').attr("content") ||
    undefined;
  data.dateModified =
    $('meta[property="article:modified_time"]').attr("content") ||
    $('meta[name="article:modified_time"]').attr("content") ||
    $('meta[itemprop="dateModified"]').attr("content") ||
    undefined;

  // Try to also pull from JSON-LD
  if (!data.datePublished || !data.dateModified) {
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).contents().text());
        const items = Array.isArray(json)
          ? json
          : json["@graph"] && Array.isArray(json["@graph"])
          ? json["@graph"]
          : [json];
        for (const it of items) {
          if (it.datePublished && !data.datePublished)
            data.datePublished = it.datePublished;
          if (it.dateModified && !data.dateModified)
            data.dateModified = it.dateModified;
        }
      } catch {
        // Skip
      }
    });
  }

  // Rendering type
  data.renderingType = detectRendering(html, $);

  // Heading tree (full document)
  const headings: HeadingNode[] = [];
  const h1List: string[] = [];
  $("h1, h2, h3, h4, h5, h6").each((_, el) => {
    const level = parseInt(el.tagName.substring(1));
    const text = $(el).text().trim().replace(/\s+/g, " ");
    if (!text) return;
    if (level === 1) h1List.push(text);
    headings.push({ level, text });
  });
  data.h1 = h1List;
  data.headingTree = headings;

  // Main content extraction for word count, links, images
  let $main: cheerio.Cheerio<any> = $("body");
  const $articleEl = $("article").first();
  const $mainEl = $("main").first();
  if ($mainEl.length) $main = $mainEl;
  else if ($articleEl.length) $main = $articleEl;

  // Clone and strip non-content
  const $clone = cheerio.load($main.html() || "");
  NON_CONTENT_SELECTORS.forEach((sel) => $clone(sel).remove());
  $clone("script, style, noscript").remove();

  // Try Readability for better word count
  let wordCount: number | undefined;
  try {
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    if (article?.textContent) {
      wordCount = article.textContent.trim().split(/\s+/).filter(Boolean).length;
    }
  } catch {
    // Fallback below
  }
  if (!wordCount) {
    const text = $clone.text().replace(/\s+/g, " ").trim();
    wordCount = text.split(" ").filter(Boolean).length;
  }
  data.wordCount = wordCount;

  // Links from main content only
  const baseHost = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return "";
    }
  })();
  const internal: { href: string; anchor: string }[] = [];
  const external: { href: string; anchor: string }[] = [];
  const social: { platform: string; href: string }[] = [];
  const seenInternal = new Set<string>();
  const seenExternal = new Set<string>();
  const seenSocial = new Set<string>();

  $clone("a[href]").each((_, el) => {
    const rawHref = $clone(el).attr("href") || "";
    if (!rawHref || rawHref.startsWith("#") || rawHref.startsWith("javascript:")) return;
    const anchor = $clone(el).text().trim().replace(/\s+/g, " ").slice(0, 200) || "[no text]";
    const abs = absolutize(rawHref, url);
    if (!abs) return;
    try {
      const host = new URL(abs).hostname;
      const isSocial = Object.entries(SOCIAL_PATTERNS).find(([, re]) =>
        re.test(abs)
      );
      if (isSocial) {
        const key = isSocial[0] + abs;
        if (!seenSocial.has(key)) {
          seenSocial.add(key);
          social.push({ platform: isSocial[0], href: abs });
        }
        return;
      }
      if (host === baseHost) {
        if (!seenInternal.has(abs)) {
          seenInternal.add(abs);
          internal.push({ href: abs, anchor });
        }
      } else {
        if (!seenExternal.has(abs)) {
          seenExternal.add(abs);
          external.push({ href: abs, anchor });
        }
      }
    } catch {
      // Skip
    }
  });

  // Also check footer/header for social links (since people put them there too)
  $('a[href]').each((_, el) => {
    const rawHref = $(el).attr("href") || "";
    const abs = absolutize(rawHref, url);
    if (!abs) return;
    const match = Object.entries(SOCIAL_PATTERNS).find(([, re]) => re.test(abs));
    if (match) {
      const key = match[0] + abs;
      if (!seenSocial.has(key)) {
        seenSocial.add(key);
        social.push({ platform: match[0], href: abs });
      }
    }
  });

  data.internalLinks = internal;
  data.externalLinks = external;
  data.socialLinks = social;

  // Images from main content
  const images: { name: string; alt: string }[] = [];
  const seenImg = new Set<string>();
  $clone("img").each((_, el) => {
    const src =
      $clone(el).attr("src") ||
      $clone(el).attr("data-src") ||
      $clone(el).attr("data-lazy-src") ||
      "";
    if (!src) return;
    const name = cleanImageName(src);
    if (!name) return;
    // Filter out tiny icons / logos / sprites by name hints
    if (/logo|icon|sprite|avatar|favicon/i.test(name)) return;
    if (seenImg.has(name)) return;
    seenImg.add(name);
    const alt = ($clone(el).attr("alt") || "").trim();
    images.push({ name, alt });
  });
  data.images = images;

  return data;
}

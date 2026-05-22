import * as cheerio from "cheerio";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import type {
  SeoData,
  HeadingNode,
  KeywordCheck,
  KeywordLocationMatch,
  YearCheck,
} from "./types";

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
  "nav", "header", "footer", "aside",
  ".nav", ".navbar", ".navigation", ".menu", ".header", ".footer",
  ".sidebar", ".widget", ".social", ".social-icons", ".social-links",
  "#nav", "#navbar", "#header", "#footer", "#sidebar",
  "[role='navigation']", "[role='banner']", "[role='contentinfo']",
];

const QUESTION_WORDS = new Set([
  "what", "why", "how", "when", "where", "who", "which", "whose", "whom",
  "can", "do", "does", "did", "is", "are", "was", "were", "will", "would",
  "should", "could", "has", "have", "may", "might", "shall",
]);

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalize(s: string | undefined | null): string {
  return (s || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function matchKeyword(keyword: string, text: string): KeywordLocationMatch {
  const kw = normalize(keyword);
  const t = normalize(text);
  if (!kw || !t) return { exact: false, partial: false };
  const phraseRe = new RegExp(
    "\\b" + escapeRegExp(kw).replace(/\\?\s+/g, "\\s+") + "\\b",
    "i"
  );
  const exact = phraseRe.test(t);
  const words = kw.split(" ").filter(Boolean);
  const partial = words.every((w) =>
    new RegExp("\\b" + escapeRegExp(w) + "\\b", "i").test(t)
  );
  return { exact, partial };
}

function cleanImageName(src: string): string {
  if (!src) return "";
  try {
    const url = new URL(src, "https://placeholder.example");
    const filename = url.pathname.split("/").pop() || "";
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

function normalizeUrlForCompare(u: string): string {
  try {
    const url = new URL(u);
    let path = url.pathname.replace(/\/+$/, "");
    if (path === "") path = "/";
    return (url.hostname + path).toLowerCase().replace(/^www\./, "");
  } catch {
    return u.toLowerCase().replace(/\/+$/, "");
  }
}

function detectRendering(html: string, $: cheerio.CheerioAPI): string {
  const bodyLength = $("body").text().trim().length;
  const hasNextData = html.includes("__NEXT_DATA__");
  const hasNuxt = html.includes("__NUXT__");
  const hasReactRoot = html.includes('id="root"') || html.includes('id="__next"');
  const scriptCount = $("script").length;
  if (hasNextData) return "SSR (Next.js)";
  if (hasNuxt) return "SSR/SSG (Nuxt)";
  if (bodyLength < 500 && hasReactRoot && scriptCount > 3) return "Likely CSR (SPA)";
  if (bodyLength < 500 && scriptCount > 5) return "Likely CSR";
  return "Likely SSR/Static";
}

export async function parseHtml(
  html: string,
  url: string,
  status: number,
  lastModifiedHeader?: string,
  keywords: string[] = []
): Promise<Partial<SeoData>> {
  const $ = cheerio.load(html);
  const data: Partial<SeoData> = { url, status };

  data.htmlSizeKb = Math.round((html.length / 1024) * 10) / 10;
  data.lastModifiedHeader = lastModifiedHeader;

  data.title = $("title").first().text().trim() || undefined;
  data.titleLength = data.title ? data.title.length : 0;

  data.metaDescription =
    $('meta[name="description"]').attr("content")?.trim() || undefined;
  data.metaDescriptionLength = data.metaDescription
    ? data.metaDescription.length
    : 0;

  data.metaKeywords =
    $('meta[name="keywords"]').attr("content")?.trim() || undefined;
  data.canonical = $('link[rel="canonical"]').attr("href")?.trim() || undefined;

  if (!data.canonical) {
    data.urlMatchesCanonical = "no-canonical";
  } else {
    const canonAbs = absolutize(data.canonical, url) || data.canonical;
    data.urlMatchesCanonical =
      normalizeUrlForCompare(url) === normalizeUrlForCompare(canonAbs)
        ? "yes"
        : "no";
  }

  data.metaRobots = $('meta[name="robots"]').attr("content")?.trim() || undefined;
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
        if (Array.isArray(obj)) { obj.forEach(collect); return; }
        if (typeof obj === "object") {
          if (obj["@type"]) {
            const ty = obj["@type"];
            if (Array.isArray(ty)) ty.forEach((x) => schemaTypes.add(String(x)));
            else schemaTypes.add(String(ty));
          }
          if (obj["@graph"]) collect(obj["@graph"]);
        }
      };
      collect(json);
    } catch {}
  });
  $("[itemtype]").each((_, el) => {
    const ty = $(el).attr("itemtype") || "";
    const last = ty.split("/").pop();
    if (last) schemaTypes.add(last);
  });
  data.schemaTypes = Array.from(schemaTypes);

  // Dates
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
          if (it.datePublished && !data.datePublished) data.datePublished = it.datePublished;
          if (it.dateModified && !data.dateModified) data.dateModified = it.dateModified;
        }
      } catch {}
    });
  }

  data.renderingType = detectRendering(html, $);

  // Headings
  const headings: HeadingNode[] = [];
  const h1List: string[] = [];
  const counts = { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0 };
  let qMark = 0;
  let qWord = 0;
  $("h1, h2, h3, h4, h5, h6").each((_, el) => {
    const level = parseInt(el.tagName.substring(1));
    const text = $(el).text().trim().replace(/\s+/g, " ");
    if (!text) return;
    if (level === 1) h1List.push(text);
    (counts as any)["h" + level]++;
    headings.push({ level, text });
    if (text.includes("?")) qMark++;
    const firstWord = text.toLowerCase().replace(/^[^a-z]+/, "").split(/\s+/)[0];
    if (QUESTION_WORDS.has(firstWord)) qWord++;
  });
  data.h1 = h1List;
  data.headingCounts = counts;
  data.headingTree = headings;
  data.questionHeadingsMark = qMark;
  data.questionHeadingsWord = qWord;

  // Main content for word count, links, images, first-30-words
  let $main: cheerio.Cheerio<any> = $("body");
  const $articleEl = $("article").first();
  const $mainEl = $("main").first();
  if ($mainEl.length) $main = $mainEl;
  else if ($articleEl.length) $main = $articleEl;

  const $clone = cheerio.load($main.html() || "");
  NON_CONTENT_SELECTORS.forEach((sel) => $clone(sel).remove());
  $clone("script, style, noscript").remove();

  let wordCount: number | undefined;
  let readableText = "";
  try {
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    if (article?.textContent) {
      readableText = article.textContent.trim();
      wordCount = readableText.split(/\s+/).filter(Boolean).length;
    }
  } catch {}
  const cloneText = $clone.text().replace(/\s+/g, " ").trim();
  if (!wordCount) {
    wordCount = cloneText.split(" ").filter(Boolean).length;
  }
  data.wordCount = wordCount;

  const bodyText = readableText || cloneText;
  const first30Words = bodyText.split(/\s+/).filter(Boolean).slice(0, 30).join(" ");

  // Links from main content
  const baseHost = (() => { try { return new URL(url).hostname; } catch { return ""; } })();
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
      const isSocial = Object.entries(SOCIAL_PATTERNS).find(([, re]) => re.test(abs));
      if (isSocial) {
        const key = isSocial[0] + abs;
        if (!seenSocial.has(key)) { seenSocial.add(key); social.push({ platform: isSocial[0], href: abs }); }
        return;
      }
      if (host === baseHost) {
        if (!seenInternal.has(abs)) { seenInternal.add(abs); internal.push({ href: abs, anchor }); }
      } else {
        if (!seenExternal.has(abs)) { seenExternal.add(abs); external.push({ href: abs, anchor }); }
      }
    } catch {}
  });

  $("a[href]").each((_, el) => {
    const abs = absolutize($(el).attr("href") || "", url);
    if (!abs) return;
    const match = Object.entries(SOCIAL_PATTERNS).find(([, re]) => re.test(abs));
    if (match) {
      const key = match[0] + abs;
      if (!seenSocial.has(key)) { seenSocial.add(key); social.push({ platform: match[0], href: abs }); }
    }
  });

  data.internalLinks = internal;
  data.externalLinks = external;
  data.socialLinks = social;

  // Images from main content
  const images: { name: string; alt: string }[] = [];
  const seenImg = new Set<string>();
  const altTextsAll: string[] = [];
  $clone("img").each((_, el) => {
    const src =
      $clone(el).attr("src") || $clone(el).attr("data-src") ||
      $clone(el).attr("data-lazy-src") || "";
    if (!src) return;
    const name = cleanImageName(src);
    if (!name) return;
    if (/logo|icon|sprite|avatar|favicon/i.test(name)) return;
    const alt = ($clone(el).attr("alt") || "").trim();
    if (alt) altTextsAll.push(alt);
    if (seenImg.has(name)) return;
    seenImg.add(name);
    images.push({ name, alt });
  });
  data.images = images;
  const altCombined = altTextsAll.join(" ");

  // Year freshness (current + next year)
  const currentYear = new Date().getFullYear();
  const yearsToCheck = [currentYear, currentYear + 1];
  const titleText = data.title || "";
  const h1Combined = h1List.join(" ");
  const yearChecks: YearCheck[] = yearsToCheck.map((yr) => {
    const yRe = new RegExp("\\b" + yr + "\\b", "g");
    const bodyMatches = bodyText.match(yRe);
    return {
      year: yr,
      inTitle: yRe.test(titleText),
      inH1: new RegExp("\\b" + yr + "\\b").test(h1Combined),
      inBodyCount: bodyMatches ? bodyMatches.length : 0,
    };
  });
  data.yearChecks = yearChecks;

  // Keyword matching
  const cleanKeywords = keywords.map((k) => k.trim()).filter(Boolean).slice(0, 5);
  if (cleanKeywords.length) {
    data.keywordChecks = cleanKeywords.map<KeywordCheck>((kw) => ({
      keyword: kw,
      title: matchKeyword(kw, titleText),
      h1: matchKeyword(kw, h1Combined),
      metaDescription: matchKeyword(kw, data.metaDescription || ""),
      metaKeywords: matchKeyword(kw, data.metaKeywords || ""),
      first30Words: matchKeyword(kw, first30Words),
      imageAlt: matchKeyword(kw, altCombined),
    }));
  }

  return data;
}

export interface KeywordLocationMatch {
  exact: boolean;
  partial: boolean;
}

export interface KeywordCheck {
  keyword: string;
  title: KeywordLocationMatch;
  h1: KeywordLocationMatch;
  metaDescription: KeywordLocationMatch;
  metaKeywords: KeywordLocationMatch;
  first30Words: KeywordLocationMatch;
  imageAlt: KeywordLocationMatch;
}

export interface YearCheck {
  year: number;
  inTitle: boolean;
  inH1: boolean;
  inBodyCount: number;
}

export interface SeoData {
  url: string;
  finalUrl?: string;
  redirected?: boolean;
  status: number | null;
  error?: string;
  ttfbMs?: number;
  title?: string;
  titleLength?: number;
  metaDescription?: string;
  metaDescriptionLength?: number;
  metaKeywords?: string;
  canonical?: string;
  urlMatchesCanonical?: "yes" | "no" | "no-canonical";
  metaRobots?: string;
  viewport?: string;
  lang?: string;
  ogTags?: Record<string, string>;
  twitterTags?: Record<string, string>;
  hreflang?: { lang: string; href: string }[];
  schemaTypes?: string[];
  h1?: string[];
  headingCounts?: { h1: number; h2: number; h3: number; h4: number; h5: number; h6: number };
  headingTree?: HeadingNode[];
  questionHeadingsMark?: number;
  questionHeadingsWord?: number;
  wordCount?: number;
  renderingType?: string;
  datePublished?: string;
  dateModified?: string;
  lastModifiedHeader?: string;
  htmlSizeKb?: number;
  internalLinks?: { href: string; anchor: string }[];
  externalLinks?: { href: string; anchor: string }[];
  socialLinks?: { platform: string; href: string }[];
  images?: { name: string; alt: string }[];
  yearChecks?: YearCheck[];
  keywordChecks?: KeywordCheck[];
  // Filled after main parse
  firstPublished?: string;
  firstPublishedSource?: string;
  cwv?: {
    lcp?: number;
    cls?: number;
    inp?: number;
    fcp?: number;
    ttfb?: number;
    performanceScore?: number;
    source?: string;
  };
}

export interface HeadingNode {
  level: number;
  text: string;
}

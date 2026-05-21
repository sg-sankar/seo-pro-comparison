export interface SeoData {
  url: string;
  status: number | null;
  error?: string;
  title?: string;
  metaDescription?: string;
  metaKeywords?: string;
  canonical?: string;
  metaRobots?: string;
  viewport?: string;
  lang?: string;
  ogTags?: Record<string, string>;
  twitterTags?: Record<string, string>;
  hreflang?: { lang: string; href: string }[];
  schemaTypes?: string[];
  h1?: string[];
  headingTree?: HeadingNode[];
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
  // Filled client-side
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

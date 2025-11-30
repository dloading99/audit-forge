import axios from 'axios';
import * as cheerio from 'cheerio';
import { AccessibilityData, ContentStructureData, DesignUxData, Issue, PerformanceData, SeoData, PageResult } from '../types.js';

interface AnalyzerOutput {
  issues: Issue[];
  seoData?: SeoData;
  performanceData?: PerformanceData | null;
  accessibilityData?: AccessibilityData;
  contentData?: ContentStructureData;
  designUxData?: DesignUxData;
}

const CTA_KEYWORDS = [
  'prenota',
  'ordina',
  'chiama',
  'contattaci',
  'acquista',
  'book now',
  'order now',
  'call us',
  'contact',
  'buy now'
];

const CTA_ABOVE_FOLD_THRESHOLD = 5000; // characters into HTML

function createIssue(
  category: Issue['category'],
  code: string,
  severity: Issue['severity'],
  message: string,
  pageUrl?: string
): Issue {
  return { id: '', category, code, severity, message, pageUrl };
}

// SEO Analyzer
export function analyzeSeo(html: string, url: string): { data: SeoData; issues: Issue[] } {
  const $ = cheerio.load(html);
  const title = $('title').first().text().trim();
  const metaDescription = $('meta[name="description"]').attr('content')?.trim();
  const h1Tags = $('h1');
  const h1Text = h1Tags.first().text().trim();
  const wordCount = $('body').text().replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).length;
  const imagesWithoutAlt = $('img').filter((_, el) => !$(el).attr('alt')).length;
  const canonical = $('link[rel="canonical"]').attr('href');
  const robots = $('meta[name="robots"]').attr('content');

  const issues: Issue[] = [];

  if (!title) {
    issues.push(createIssue('seo', 'MISSING_TITLE', 'critical', 'Missing <title> tag', url));
  } else if (title.length < 20) {
    issues.push(createIssue('seo', 'SHORT_TITLE', 'minor', 'Title is shorter than 20 characters', url));
  }

  if (!metaDescription) {
    issues.push(createIssue('seo', 'MISSING_META_DESCRIPTION', 'major', 'Missing meta description', url));
  } else if (metaDescription.length < 60) {
    issues.push(createIssue('seo', 'SHORT_META_DESCRIPTION', 'minor', 'Meta description is quite short', url));
  }

  if (h1Tags.length === 0) {
    issues.push(createIssue('seo', 'MISSING_H1', 'major', 'No H1 heading found', url));
  } else if (h1Tags.length > 1) {
    issues.push(createIssue('seo', 'MULTIPLE_H1', 'minor', 'Multiple H1 headings found', url));
  }

  if (wordCount < 200) {
    issues.push(createIssue('seo', 'LOW_WORD_COUNT', 'major', 'Low on-page word count (<200 words)', url));
  }

  if (imagesWithoutAlt > 0) {
    issues.push(createIssue('seo', 'IMAGES_WITHOUT_ALT', 'major', `${imagesWithoutAlt} images missing alt text`, url));
  }

  return {
    data: { title, metaDescription, h1Text, wordCount, imagesWithoutAlt, canonical, robots },
    issues
  };
}

// Performance Analyzer (PageSpeed Insights when available)
export async function analyzePerformance(url: string): Promise<{ data: PerformanceData | null; issues: Issue[] }> {
  const apiKey = process.env.PAGESPEED_API_KEY;
  const issues: Issue[] = [];

  if (!apiKey) {
    issues.push(createIssue('performance', 'PERFORMANCE_DATA_UNAVAILABLE', 'minor', 'PageSpeed API key not configured; using placeholder score', url));
    return { data: null, issues };
  }

  try {
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&key=${apiKey}`;
    const response = await axios.get(apiUrl, { timeout: 15000 });
    const lighthouse = response.data.lighthouseResult;
    const perfCategory = lighthouse?.categories?.performance;
    const audits = lighthouse?.audits || {};

    const performanceScore = Math.round((perfCategory?.score || 0) * 100);
    const firstContentfulPaintMs = audits['first-contentful-paint']?.numericValue;
    const largestContentfulPaintMs = audits['largest-contentful-paint']?.numericValue;
    const totalBlockingTimeMs = audits['total-blocking-time']?.numericValue;
    const cumulativeLayoutShift = audits['cumulative-layout-shift']?.numericValue;

    if (largestContentfulPaintMs && largestContentfulPaintMs > 4000) {
      issues.push(createIssue('performance', 'SLOW_LCP_MOBILE', 'critical', `LCP is ${(largestContentfulPaintMs / 1000).toFixed(1)}s on mobile`, url));
    }
    if (totalBlockingTimeMs && totalBlockingTimeMs > 600) {
      issues.push(createIssue('performance', 'HIGH_TBT', 'major', `Total blocking time is ${(totalBlockingTimeMs).toFixed(0)}ms`, url));
    }
    if (performanceScore < 50) {
      issues.push(createIssue('performance', 'POOR_PERFORMANCE_SCORE', 'critical', `Performance score is ${performanceScore}/100`, url));
    }

    const data: PerformanceData = {
      performanceScore,
      firstContentfulPaintMs,
      largestContentfulPaintMs,
      totalBlockingTimeMs,
      cumulativeLayoutShift,
      strategy: 'mobile'
    };

    return { data, issues };
  } catch (error: any) {
    issues.push(createIssue('performance', 'PERFORMANCE_DATA_UNAVAILABLE', 'minor', 'Failed to retrieve PageSpeed data', url));
    return { data: { error: error?.message }, issues };
  }
}

// Accessibility Analyzer (heuristic)
export function analyzeAccessibility(html: string, url: string): { data: AccessibilityData; issues: Issue[] } {
  const $ = cheerio.load(html);
  const lang = $('html').attr('lang');
  const landmarks = {
    main: $('main').length > 0,
    nav: $('nav').length > 0,
    header: $('header').length > 0,
    footer: $('footer').length > 0
  };

  const inputs = $('input, select, textarea');
  const labeledInputs = inputs.filter((_, el) => {
    const id = $(el).attr('id');
    const hasLabel = id ? $(`label[for="${id}"]`).length > 0 : false;
    const hasAria = $(el).attr('aria-label') || $(el).attr('aria-labelledby');
    return !!(hasLabel || hasAria);
  }).length;
  const unlabeledInputs = inputs.length - labeledInputs;

  const issues: Issue[] = [];

  if (!lang) {
    issues.push(createIssue('accessibility', 'MISSING_LANG', 'major', 'html element is missing lang attribute', url));
  }
  if (!landmarks.main) {
    issues.push(createIssue('accessibility', 'MISSING_MAIN', 'minor', 'Main landmark not found', url));
  }
  if (unlabeledInputs > 0) {
    issues.push(createIssue('accessibility', 'UNLABELED_INPUTS', 'major', `${unlabeledInputs} form fields missing labels`, url));
  }
  const emptyButtons = $('button').filter((_, el) => $(el).text().trim().length === 0 && !$(el).attr('aria-label')).length;
  if (emptyButtons > 0) {
    issues.push(createIssue('accessibility', 'EMPTY_BUTTONS', 'minor', `${emptyButtons} buttons have no accessible name`, url));
  }

  const data: AccessibilityData = { hasLangAttribute: !!lang, landmarks, labeledInputs, unlabeledInputs };
  return { data, issues };
}

// Content & Structure Analyzer
export async function analyzeContentStructure(page: PageResult): Promise<{ data: ContentStructureData; issues: Issue[] }> {
  const { html, url, internalLinks, externalLinks, depth } = page;
  const $ = cheerio.load(html);
  const title = $('title').first().text().toLowerCase();
  const h1 = $('h1').first().text().toLowerCase();
  const combined = `${url} ${title} ${h1}`;

  let pageType = 'generic';
  if (combined.includes('contact')) pageType = 'contact';
  else if (combined.includes('about')) pageType = 'about';
  else if (combined.includes('menu') || combined.includes('services')) pageType = 'menu';
  else if (combined.includes('home')) pageType = 'home';

  const issues: Issue[] = [];

  // Basic broken link detection for a handful of internal links to reduce network noise
  const brokenLinks: string[] = [];
  if (depth <= 1) {
    const linksToCheck = internalLinks.slice(0, 5);
    for (const link of linksToCheck) {
      try {
        const head = await axios.head(link, { maxRedirects: 2, timeout: 5000, validateStatus: () => true });
        if (head.status >= 400) {
          brokenLinks.push(link);
        }
      } catch (err) {
        brokenLinks.push(link);
      }
    }

    if (brokenLinks.length > 0) {
      issues.push(createIssue('content', 'BROKEN_INTERNAL_LINK', 'major', `${brokenLinks.length} internal links appear broken`, url));
    }
  }

  const data: ContentStructureData = {
    pageType,
    internalLinkCount: internalLinks.length,
    externalLinkCount: externalLinks.length,
    brokenLinks,
    inboundLinks: 0,
    outboundLinks: internalLinks.length
  };

  return { data, issues };
}

// Design & UX Analyzer
export function analyzeDesignUx(html: string, url: string): { data: DesignUxData; issues: Issue[] } {
  const $ = cheerio.load(html);
  const hasNavigation = $('nav, .nav, .menu').length > 0;

  const lowerHtml = html.toLowerCase();
  const primaryCtaMatch = CTA_KEYWORDS.find(keyword => lowerHtml.includes(keyword));
  const primaryCtaFound = Boolean(primaryCtaMatch);
  let primaryCtaAboveFold = false;
  if (primaryCtaMatch) {
    primaryCtaAboveFold = lowerHtml.indexOf(primaryCtaMatch) < CTA_ABOVE_FOLD_THRESHOLD;
  }

  const fontMatches = lowerHtml.match(/font-family:\s*[^;'\"]+/g) || [];
  const fontLinks = $('link[href*="fonts.googleapis"], link[href*="typekit"], link[href*="font"]');
  const fontCount = new Set<string>([
    ...fontMatches.map(f => f.replace('font-family:', '').trim()),
    ...fontLinks.map((_, el) => $(el).attr('href') || '')
  ].filter(Boolean)).size;

  const colorMatches = lowerHtml.match(/color:\s*(#[0-9a-f]{3,6}|rgb\([^)]+\))/g) || [];
  const colorCount = new Set(colorMatches.map(c => c.replace('color:', '').trim())).size;

  const hasViewportMeta = $('meta[name="viewport"]').length > 0;

  const issues: Issue[] = [];
  if (!hasNavigation) {
    issues.push(createIssue('uxDesign', 'MISSING_NAV', 'major', 'Navigation landmark not detected', url));
  }
  if (!primaryCtaFound) {
    issues.push(createIssue('uxDesign', 'NO_PRIMARY_CTA', 'major', 'No clear call-to-action found', url));
  } else if (!primaryCtaAboveFold) {
    issues.push(createIssue('uxDesign', 'NO_CTA_ABOVE_FOLD', 'minor', 'Primary call-to-action not found near top of page', url));
  }
  if (!hasViewportMeta) {
    issues.push(createIssue('uxDesign', 'MISSING_VIEWPORT_META', 'critical', 'Missing responsive viewport meta tag', url));
  }
  if (fontCount > 4) {
    issues.push(createIssue('uxDesign', 'EXCESSIVE_FONTS', 'minor', 'Too many different fonts detected', url));
  }
  if (colorCount > 8) {
    issues.push(createIssue('uxDesign', 'EXCESSIVE_COLORS', 'minor', 'High number of inline text colors may hurt consistency', url));
  }

  const data: DesignUxData = {
    hasNavigation,
    primaryCtaFound,
    primaryCtaAboveFold,
    fontCount,
    colorCount,
    hasViewportMeta
  };

  return { data, issues };
}

export async function analyzePage(page: PageResult): Promise<AnalyzerOutput> {
  const { html, url } = page;

  if (!html) {
    return { issues: [createIssue('content', 'PAGE_UNREACHABLE', 'critical', 'Page could not be retrieved', url)] };
  }

  const seo = analyzeSeo(html, url);
  const accessibility = analyzeAccessibility(html, url);
  const ux = analyzeDesignUx(html, url);
  const content = await analyzeContentStructure(page);
  const { data: performanceData, issues: performanceIssues } = page.depth === 0
    ? await analyzePerformance(url)
    : { data: null as PerformanceData | null, issues: [] as Issue[] };

  const issues = [
    ...seo.issues,
    ...performanceIssues,
    ...accessibility.issues,
    ...content.issues,
    ...ux.issues
  ];

  return {
    issues,
    seoData: seo.data,
    performanceData,
    accessibilityData: accessibility.data,
    contentData: content.data,
    designUxData: ux.data
  };
}

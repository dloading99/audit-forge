import * as cheerio from 'cheerio';
import { Issue, ScoreCategory } from '../types.js';
import axios from 'axios';

// --- Types & Helpers ---

export interface AnalyzerResult {
  scores: {
    seo: number;
    performance: number;
    accessibility: number;
    content: number;
    uxDesign: number;
  };
  issues: Issue[];
  seoData: any;
  designUxData: any;
}

const createIssue = (
  category: ScoreCategory, 
  code: string, 
  severity: 'critical' | 'major' | 'minor', 
  message: string
): Omit<Issue, 'id' | 'pageUrl'> => ({
  category, code, severity, message
});

// --- SEO Analyzer ---

function analyzeSeo($: cheerio.CheerioAPI, html: string): { score: number, issues: any[], data: any } {
  const issues: any[] = [];
  const title = $('title').text().trim();
  const description = $('meta[name="description"]').attr('content')?.trim();
  const h1Count = $('h1').length;
  const wordCount = $('body').text().split(/\s+/).length;
  const imgsWithoutAlt = $('img:not([alt])').length;

  // Rules
  if (!title) issues.push(createIssue('seo', 'MISSING_TITLE', 'critical', 'Page is missing a title tag'));
  else if (title.length < 10) issues.push(createIssue('seo', 'SHORT_TITLE', 'minor', 'Title tag is too short'));
  
  if (!description) issues.push(createIssue('seo', 'MISSING_META_DESC', 'major', 'Meta description is missing'));
  
  if (h1Count === 0) issues.push(createIssue('seo', 'MISSING_H1', 'major', 'No H1 heading found'));
  else if (h1Count > 1) issues.push(createIssue('seo', 'MULTIPLE_H1', 'minor', 'Multiple H1 headings found'));

  if (imgsWithoutAlt > 0) issues.push(createIssue('seo', 'IMG_NO_ALT', 'major', `${imgsWithoutAlt} images missing alt text`));

  if (wordCount < 200) issues.push(createIssue('seo', 'THIN_CONTENT', 'major', 'Page has very little text content (<200 words)'));

  // Simple scoring
  let score = 100;
  if (issues.find(i => i.severity === 'critical')) score -= 30;
  if (issues.find(i => i.severity === 'major')) score -= 15;
  score -= (issues.length * 5);

  return { 
    score: Math.max(0, score), 
    issues, 
    data: { title, description, h1Count, wordCount } 
  };
}

// --- Accessibility Analyzer (Heuristic) ---

function analyzeAccessibility($: cheerio.CheerioAPI): { score: number, issues: any[] } {
  const issues: any[] = [];

  // 1. Form Labels
  const inputsWithoutLabel = $('input:not([type="hidden"]):not([type="submit"])').filter((_, el) => {
    const id = $(el).attr('id');
    const hasLabelTag = id ? $(`label[for="${id}"]`).length > 0 : false;
    const hasAriaLabel = $(el).attr('aria-label') || $(el).attr('aria-labelledby');
    return !hasLabelTag && !hasAriaLabel;
  }).length;

  if (inputsWithoutLabel > 0) {
    issues.push(createIssue('accessibility', 'MISSING_FORM_LABEL', 'critical', `${inputsWithoutLabel} form inputs missing labels`));
  }

  // 2. Button Names
  const emptyButtons = $('button').filter((_, el) => $(el).text().trim().length === 0 && !$(el).attr('aria-label')).length;
  if (emptyButtons > 0) {
    issues.push(createIssue('accessibility', 'EMPTY_BUTTON', 'major', `${emptyButtons} buttons have no text or accessible label`));
  }

  // 3. Heading Hierarchy (simplified)
  const h2 = $('h2').length;
  const h3 = $('h3').length;
  if (h3 > 0 && h2 === 0) {
    issues.push(createIssue('accessibility', 'SKIPPED_HEADING', 'minor', 'Heading levels skipped (H3 found without H2)'));
  }

  // 4. HTML Lang
  const lang = $('html').attr('lang');
  if (!lang) {
    issues.push(createIssue('accessibility', 'MISSING_LANG', 'major', 'HTML tag missing lang attribute'));
  }

  let score = 100;
  score -= (issues.length * 10);
  
  return { score: Math.max(0, score), issues };
}

// --- UX/Design Analyzer ---

function analyzeUx($: cheerio.CheerioAPI, html: string): { score: number, issues: any[], data: any } {
  const issues: any[] = [];
  
  // 1. Viewport
  const viewport = $('meta[name="viewport"]').attr('content');
  if (!viewport) {
    issues.push(createIssue('uxDesign', 'NO_VIEWPORT', 'critical', 'Missing viewport meta tag (not mobile friendly)'));
  }

  // 2. Navigation
  const hasNav = $('nav').length > 0 || $('.nav').length > 0 || $('.menu').length > 0;
  if (!hasNav) {
    issues.push(createIssue('uxDesign', 'NO_NAV', 'major', 'No clear navigation section detected'));
  }

  // 3. CTA Detection
  const ctaKeywords = ['book', 'buy', 'order', 'contact', 'sign up', 'register', 'prenota', 'chiama', 'contattaci'];
  const primaryCtas = $('a, button').filter((_, el) => {
    const text = $(el).text().toLowerCase();
    return ctaKeywords.some(kw => text.includes(kw));
  });
  
  const hasPrimaryCta = primaryCtas.length > 0;
  if (!hasPrimaryCta) {
    issues.push(createIssue('uxDesign', 'NO_CTA', 'major', 'No primary Call-to-Action detected (e.g. "Contact", "Book")'));
  }

  // 4. Font Count (rough heuristic via inline styles or link tags)
  const fontLinks = $('link[href*="fonts.google"], link[href*="typekit"]').length;
  // This is weak without a headless browser, but we can guess.
  const inlineFonts = (html.match(/font-family:/g) || []).length;
  
  const approximateFontCount = Math.max(fontLinks, 1); // Baseline
  
  if (fontLinks > 3) {
    issues.push(createIssue('uxDesign', 'TOO_MANY_FONTS', 'minor', 'High number of font files loaded'));
  }

  let score = 100;
  if (!viewport) score -= 40;
  if (!hasNav) score -= 20;
  if (!hasPrimaryCta) score -= 20;

  return { 
    score: Math.max(0, score), 
    issues, 
    data: { hasPrimaryCta, fontFamilies: approximateFontCount, hasViewportMeta: !!viewport } 
  };
}

// --- Performance Analyzer ---
async function analyzePerformance(url: string): Promise<{ score: number, issues: any[] }> {
    const issues: any[] = [];
    const apiKey = process.env.PAGESPEED_API_KEY;
    
    // If no key, return a placeholder "neutral" result or basic check
    if (!apiKey) {
        // Fallback: Just return a default or skip
        return { score: 70, issues: [createIssue('performance', 'NO_API_KEY', 'minor', 'Performance check skipped (No API Key)')] };
    }

    try {
        const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&key=${apiKey}`;
        const response = await axios.get(apiUrl);
        const lighthouse = response.data.lighthouseResult;
        const score = Math.round(lighthouse.categories.performance.score * 100);
        
        const lcp = lighthouse.audits['largest-contentful-paint'].numericValue;
        if (lcp > 4000) issues.push(createIssue('performance', 'SLOW_LCP', 'critical', `Largest Contentful Paint is very slow (${(lcp/1000).toFixed(1)}s)`));
        else if (lcp > 2500) issues.push(createIssue('performance', 'SLOW_LCP', 'major', `Largest Contentful Paint needs improvement (${(lcp/1000).toFixed(1)}s)`));

        const cls = lighthouse.audits['cumulative-layout-shift'].numericValue;
        if (cls > 0.25) issues.push(createIssue('performance', 'HIGH_CLS', 'major', 'Layout shifts are distracting users'));

        return { score, issues };

    } catch (e) {
        // API failed
        return { score: 50, issues: [createIssue('performance', 'API_FAIL', 'minor', 'Failed to retrieve performance data')] };
    }
}

// --- Main Analyzer Function ---

export async function analyzePage(url: string, html: string, statusCode: number): Promise<AnalyzerResult> {
  const $ = cheerio.load(html);

  const seo = analyzeSeo($, html);
  const accessibility = analyzeAccessibility($);
  const ux = analyzeUx($, html);
  
  // Performance is usually per-page but expensive. 
  // We'll do a mock calculation based on HTML size if API missing, 
  // or only run real PSI on homepage in the runner, not here for every page to save quota/time.
  // For subpages, we'll estimate based on HTML size.
  const htmlSize = html.length;
  let perfScore = 100;
  const perfIssues: any[] = [];
  
  if (htmlSize > 200000) { // 200KB HTML is large
      perfScore -= 20;
      perfIssues.push(createIssue('performance', 'LARGE_HTML', 'major', 'HTML document is very large (>200KB)'));
  }
  
  const contentScore = 80; // Placeholder for content analysis (orphan pages need graph context)

  return {
    scores: {
      seo: seo.score,
      performance: perfScore,
      accessibility: accessibility.score,
      content: contentScore,
      uxDesign: ux.score
    },
    issues: [...seo.issues, ...accessibility.issues, ...ux.issues, ...perfIssues],
    seoData: seo.data,
    designUxData: ux.data
  };
}

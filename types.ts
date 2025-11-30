export enum AuditStatus {
  QUEUED = 'queued',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export type ScoreCategory = 'seo' | 'performance' | 'accessibility' | 'content' | 'uxDesign';

export interface Scores {
  overall: number;
  seo: number;
  performance: number;
  accessibility: number;
  content: number;
  uxDesign: number;
}

export interface Issue {
  id: string;
  category: ScoreCategory;
  code: string;
  severity: 'critical' | 'major' | 'minor';
  message: string;
  pageUrl?: string;
}

export interface CrawlOptions {
  maxPages?: number;
  maxDepth?: number;
  timeoutMs?: number;
}

export interface PageResult {
  url: string;
  statusCode: number;
  html: string;
  depth: number;
  internalLinks: string[];
  externalLinks: string[];
  error?: string;
}

export interface SeoData {
  title?: string;
  metaDescription?: string;
  h1Text?: string;
  wordCount: number;
  imagesWithoutAlt: number;
  canonical?: string;
  robots?: string;
}

export interface PerformanceData {
  performanceScore?: number;
  firstContentfulPaintMs?: number;
  largestContentfulPaintMs?: number;
  totalBlockingTimeMs?: number;
  cumulativeLayoutShift?: number;
  strategy?: 'mobile' | 'desktop';
  error?: string;
}

export interface AccessibilityData {
  hasLangAttribute: boolean;
  landmarks: {
    main: boolean;
    nav: boolean;
    header: boolean;
    footer: boolean;
  };
  labeledInputs: number;
  unlabeledInputs: number;
}

export interface ContentStructureData {
  pageType: string;
  internalLinkCount: number;
  externalLinkCount: number;
  brokenLinks: string[];
  inboundLinks: number;
  outboundLinks: number;
}

export interface DesignUxData {
  hasNavigation: boolean;
  primaryCtaFound: boolean;
  primaryCtaAboveFold: boolean;
  fontCount: number;
  colorCount: number;
  hasViewportMeta: boolean;
}

export interface PageData {
  id: string;
  url: string;
  statusCode: number;
  depth: number;
  scores: Scores;
  issues: Issue[];
  // Specific Analyzer Data
  seoData?: SeoData;
  performanceData?: PerformanceData | null;
  accessibilityData?: AccessibilityData;
  contentData?: ContentStructureData;
  designUxData?: DesignUxData;
}

export interface Audit {
  id: string;
  url: string;
  status: AuditStatus;
  createdAt: string;
  completedAt?: string;
  
  // High level results
  scores: Scores;
  issuesSummary: {
    critical: number;
    major: number;
    minor: number;
    byCategory: Record<ScoreCategory, number>;
  };

  // Detailed results
  pages: PageData[];
  reportMarkdown?: string;
}

export interface CreateAuditRequest {
  url: string;
  maxPages?: number;
}

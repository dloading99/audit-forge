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

export interface PageData {
  id: string;
  url: string;
  statusCode: number;
  scores: Scores;
  issues: Issue[];
  // Specific Analyzer Data
  seoData?: {
    title: string;
    description: string;
    h1Count: number;
    wordCount: number;
  };
  designUxData?: {
    fontFamilies: number;
    hasPrimaryCtaAboveFold: boolean;
    mobileUsabilityScore?: number;
    hasViewportMeta?: boolean;
    hasPrimaryCta?: boolean;
  };
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

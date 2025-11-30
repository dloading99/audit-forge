import { randomUUID } from 'crypto';
import { PageResult, AuditStatus, PageData, Scores } from '../types.js';
import { crawlSite } from './crawler.js';
import { analyzePage } from './analyzers.js';
import { calculateAuditScores, calculatePageScores } from './scoring.js';
import { storage } from './storage.js';

function buildInboundLinkMap(pages: PageResult[]): Map<string, number> {
  const inbound = new Map<string, number>();
  pages.forEach(p => inbound.set(p.url, 0));

  for (const page of pages) {
    for (const link of page.internalLinks) {
      if (inbound.has(link)) {
        inbound.set(link, (inbound.get(link) || 0) + 1);
      }
    }
  }
  return inbound;
}

function applyContentGraphIssues(page: PageData, inboundLinks: number): PageData {
  const issues = [...page.issues];
  if (page.contentData) {
    page.contentData.inboundLinks = inboundLinks;
    page.contentData.outboundLinks = page.contentData.internalLinkCount;
  }

  if (inboundLinks === 0 && page.depth > 0) {
    issues.push({
      id: '',
      category: 'content',
      code: 'ORPHAN_PAGE',
      severity: 'major',
      message: 'Page has no inbound internal links',
      pageUrl: page.url
    });
  }

  return { ...page, issues };
}

function generateReport(url: string, scores: Scores, issuesSummary: any): string {
  return `# Audit Report for ${url}

## Overview
- **Overall score:** ${scores.overall}/100
- **SEO:** ${scores.seo}
- **Performance:** ${scores.performance}
- **Accessibility:** ${scores.accessibility}
- **Content:** ${scores.content}
- **UX & Design:** ${scores.uxDesign}

## Issues summary
- Critical: ${issuesSummary.critical}
- Major: ${issuesSummary.major}
- Minor: ${issuesSummary.minor}
- By category: ${JSON.stringify(issuesSummary.byCategory, null, 2)}

## Next steps
1. Address critical and major issues starting from the homepage and top-level navigation pages.
2. Improve metadata (titles, descriptions, headings) on thin-content pages.
3. Add responsive viewport meta tags and clear CTAs above the fold where missing.
4. Re-run the audit after fixes to validate improvements.
`;
}

export async function startAudit(auditId: string, maxPages: number) {
  const audit = storage.get(auditId);
  if (!audit) return;

  try {
    storage.update(auditId, { status: AuditStatus.RUNNING });

    const crawledPages = await crawlSite(audit.url, { maxPages, maxDepth: 2 });
    if (crawledPages.length === 0) {
      storage.update(auditId, {
        status: AuditStatus.FAILED,
        completedAt: new Date().toISOString()
      });
      return;
    }

    const inboundMap = buildInboundLinkMap(crawledPages);
    const analyzedPages: PageData[] = [];

    for (const raw of crawledPages) {
      if (raw.error) {
        analyzedPages.push({
          id: randomUUID(),
          url: raw.url,
          statusCode: raw.statusCode,
          depth: raw.depth,
          scores: { overall: 0, seo: 0, performance: 0, accessibility: 0, content: 0, uxDesign: 0 },
          issues: [{
            id: '',
            category: 'content',
            code: 'PAGE_UNREACHABLE',
            severity: 'critical',
            message: raw.error,
            pageUrl: raw.url
          }]
        });
        continue;
      }

      const analysis = await analyzePage(raw);
      const pageBase: PageData = {
        id: randomUUID(),
        url: raw.url,
        statusCode: raw.statusCode,
        depth: raw.depth,
        scores: { overall: 0, seo: 0, performance: 0, accessibility: 0, content: 0, uxDesign: 0 },
        issues: analysis.issues,
        seoData: analysis.seoData,
        performanceData: analysis.performanceData,
        accessibilityData: analysis.accessibilityData,
        contentData: analysis.contentData,
        designUxData: analysis.designUxData
      };

      const withGraph = applyContentGraphIssues(pageBase, inboundMap.get(raw.url) || 0);
      const issuesWithIds = withGraph.issues.map((issue, idx) => ({
        ...issue,
        id: `${withGraph.id}-${idx}`,
        pageUrl: withGraph.url
      }));
      const scoredPage: PageData = {
        ...withGraph,
        issues: issuesWithIds
      };
      scoredPage.scores = calculatePageScores(scoredPage);

      analyzedPages.push(scoredPage);
    }

    const { scores, issuesSummary } = calculateAuditScores(analyzedPages);
    const reportMarkdown = generateReport(audit.url, scores, issuesSummary);

    storage.update(auditId, {
      status: AuditStatus.COMPLETED,
      completedAt: new Date().toISOString(),
      scores,
      issuesSummary,
      pages: analyzedPages,
      reportMarkdown
    });
  } catch (err: any) {
    console.error(`Audit failed: ${err.message}`);
    storage.update(auditId, {
      status: AuditStatus.FAILED,
      completedAt: new Date().toISOString()
    });
  }
}

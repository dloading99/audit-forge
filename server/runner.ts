import { storage } from './storage.js';
import { crawlSite } from './crawler.js';
import { analyzePage } from './analyzers.js';
import { calculateAuditScores } from './scoring.js';
import { AuditStatus, PageData } from '../types.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { randomUUID } from 'crypto';

export async function startAudit(auditId: string, maxPages: number) {
  const audit = storage.get(auditId);
  if (!audit) return;

  try {
    // 1. Update Status
    storage.update(auditId, { status: AuditStatus.RUNNING });

    // 2. Crawl
    const rawPages = await crawlSite(audit.url, maxPages);

    // 3. Analyze Each Page
    const analyzedPages: PageData[] = [];
    
    for (const raw of rawPages) {
      if (raw.error) {
        // Handle failed page fetch if needed, for now skip or add error entry
        continue;
      }
      
      const analysis = await analyzePage(raw.url, raw.html, raw.statusCode);
      
      const pageId = randomUUID();
      analyzedPages.push({
        id: pageId,
        url: raw.url,
        statusCode: raw.statusCode,
        scores: { overall: 0, ...analysis.scores }, // overall calc handled later
        issues: analysis.issues.map((i, idx) => ({ ...i, id: `${pageId}-${idx}`, pageUrl: raw.url })),
        seoData: analysis.seoData,
        designUxData: analysis.designUxData
      });
    }

    // 4. Calculate Global Scores
    const result = calculateAuditScores(analyzedPages);

    // 5. Generate Report
    let reportMarkdown = '';
    
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (geminiApiKey) {
      try {
        const genAI = new GoogleGenerativeAI(geminiApiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const prompt = `You are an expert web audit consultant. Generate a comprehensive Markdown audit report for ${audit.url} based on the following analysis data.

        **Overall Score**: ${result.scores.overall}/100
        **Scores Breakdown**:
        - SEO: ${result.scores.seo}
        - Performance: ${result.scores.performance}
        - Accessibility: ${result.scores.accessibility}
        - Content: ${result.scores.content}
        - UX/Design: ${result.scores.uxDesign}

        **Issues Summary**:
        - Critical: ${result.issuesSummary.critical}
        - Major: ${result.issuesSummary.major}
        - Minor: ${result.issuesSummary.minor}

        **Issues Summary by Category**: ${JSON.stringify(result.issuesSummary.byCategory)}

        The report should include:
        1. **Executive Summary**: Interpret the overall health and critical issues.
        2. **Detailed Analysis**: Breakdown of strengths and weaknesses in SEO, Performance, Accessibility, and UX.
        3. **Action Plan**: Prioritized list of fixes (focusing on Critical issues first).

        Keep the report professional, actionable, and formatted in Markdown.`;

        const response = await model.generateContent(prompt);
        reportMarkdown = response.response?.text() || '';
      } catch (err) {
        console.error('Gemini generation failed:', err);
      }
    }

    // Fallback if no API key or generation failed
    if (!reportMarkdown) {
      reportMarkdown = generateSimpleReport(audit.url, result.scores, result.issuesSummary.critical);
    }

    // 6. Save Completion
    storage.update(auditId, {
      status: AuditStatus.COMPLETED,
      completedAt: new Date().toISOString(),
      scores: result.scores,
      issuesSummary: result.issuesSummary,
      pages: analyzedPages,
      reportMarkdown: reportMarkdown
    });

  } catch (err: any) {
    console.error(`Audit failed: ${err.message}`);
    storage.update(auditId, { 
      status: AuditStatus.FAILED,
      completedAt: new Date().toISOString()
    });
  }
}

function generateSimpleReport(url: string, scores: any, criticalCount: number): string {
  return `
# Audit Report for ${url}

## Executive Summary
**Overall Score: ${scores.overall}/100**

We found **${criticalCount} critical issues** that require immediate attention.

## Score Breakdown
- **SEO**: ${scores.seo}
- **Performance**: ${scores.performance}
- **Accessibility**: ${scores.accessibility}
- **Content**: ${scores.content}
- **UX/Design**: ${scores.uxDesign}

## Recommendations
Based on automated analysis:
1. Review the **${criticalCount} critical errors** listed in the Issues tab.
2. If SEO score is low, check for missing titles and meta descriptions.
3. If UX score is low, ensure mobile viewports and navigation are configured correctly.

*Full AI consultation features would generate a more detailed strategy here.*
`;
}
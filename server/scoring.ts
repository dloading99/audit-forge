import { Audit, PageData, Scores, Issue } from '../types.js';

export function calculateAuditScores(pages: PageData[]): { scores: Scores, issuesSummary: any } {
  if (pages.length === 0) {
    return {
      scores: { overall: 0, seo: 0, performance: 0, accessibility: 0, content: 0, uxDesign: 0 },
      issuesSummary: { critical: 0, major: 0, minor: 0, byCategory: { seo: 0, performance: 0, accessibility: 0, content: 0, uxDesign: 0 } }
    };
  }

  // Average scores across pages
  const sumScores = (key: keyof Scores) => pages.reduce((acc, p) => acc + p.scores[key], 0);
  
  const seo = Math.round(sumScores('seo') / pages.length);
  const performance = Math.round(sumScores('performance') / pages.length);
  const accessibility = Math.round(sumScores('accessibility') / pages.length);
  const content = Math.round(sumScores('content') / pages.length);
  const uxDesign = Math.round(sumScores('uxDesign') / pages.length);
  
  const overall = Math.round((seo + performance + accessibility + content + uxDesign) / 5);

  // Issues summary
  const allIssues = pages.flatMap(p => p.issues);
  const summary = {
    critical: allIssues.filter(i => i.severity === 'critical').length,
    major: allIssues.filter(i => i.severity === 'major').length,
    minor: allIssues.filter(i => i.severity === 'minor').length,
    byCategory: {
      seo: allIssues.filter(i => i.category === 'seo').length,
      performance: allIssues.filter(i => i.category === 'performance').length,
      accessibility: allIssues.filter(i => i.category === 'accessibility').length,
      content: allIssues.filter(i => i.category === 'content').length,
      uxDesign: allIssues.filter(i => i.category === 'uxDesign').length
    }
  };

  return {
    scores: { overall, seo, performance, accessibility, content, uxDesign },
    issuesSummary: summary
  };
}

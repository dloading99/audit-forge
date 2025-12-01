import { Issue, PageData, Scores } from '../types';

const severityPenalty: Record<Issue['severity'], number> = {
  critical: 25,
  major: 15,
  minor: 7
};

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function scoreCategory(base: number, issues: Issue[], category: Issue['category'], extraPenalty = 0): number {
  const totalPenalty = issues
    .filter(issue => issue.category === category)
    .reduce((acc, issue) => acc + severityPenalty[issue.severity], 0);
  return clampScore(base - totalPenalty - extraPenalty);
}

function scorePerformance(performanceData: PageData['performanceData'], issues: Issue[]): number {
  if (performanceData?.performanceScore !== undefined) {
    // Blend PSI score with issue penalties
    const penalty = issues
      .filter(i => i.category === 'performance')
      .reduce((acc, i) => acc + severityPenalty[i.severity] / 2, 0);
    return clampScore(performanceData.performanceScore - penalty);
  }

  return scoreCategory(80, issues, 'performance');
}

export function calculatePageScores(page: PageData): Scores {
  const { issues, seoData, contentData, designUxData, performanceData, accessibilityData } = page;

  const seoPenalty = (seoData?.wordCount && seoData.wordCount < 120 ? 5 : 0);
  const seo = scoreCategory(100, issues, 'seo', seoPenalty);

  const accessibility = scoreCategory(100, issues, 'accessibility', accessibilityData?.unlabeledInputs ? 5 : 0);

  const contentPenalty = (contentData && contentData.internalLinkCount === 0 ? 10 : 0) +
    (contentData && contentData.brokenLinks.length > 0 ? 5 : 0) +
    (contentData && contentData.inboundLinks === 0 && page.depth > 0 ? 10 : 0);
  const content = scoreCategory(95, issues, 'content', contentPenalty);

  const uxPenalty = (designUxData && !designUxData.hasNavigation ? 10 : 0);
  const uxDesign = scoreCategory(100, issues, 'uxDesign', uxPenalty);

  const performance = scorePerformance(performanceData, issues);

  const overall = clampScore((seo + accessibility + content + uxDesign + performance) / 5);

  return { overall, seo, performance, accessibility, content, uxDesign };
}

export function calculateAuditScores(pages: PageData[]): { scores: Scores, issuesSummary: any } {
  if (pages.length === 0) {
    return {
      scores: { overall: 0, seo: 0, performance: 0, accessibility: 0, content: 0, uxDesign: 0 },
      issuesSummary: { critical: 0, major: 0, minor: 0, byCategory: { seo: 0, performance: 0, accessibility: 0, content: 0, uxDesign: 0 } }
    };
  }

  const weightedTotals: Scores = { overall: 0, seo: 0, performance: 0, accessibility: 0, content: 0, uxDesign: 0 };
  let totalWeight = 0;

  for (const page of pages) {
    const weight = 1 / (1 + (page.depth ?? 0));
    totalWeight += weight;
    weightedTotals.overall += page.scores.overall * weight;
    weightedTotals.seo += page.scores.seo * weight;
    weightedTotals.performance += page.scores.performance * weight;
    weightedTotals.accessibility += page.scores.accessibility * weight;
    weightedTotals.content += page.scores.content * weight;
    weightedTotals.uxDesign += page.scores.uxDesign * weight;
  }

  const scores: Scores = {
    overall: clampScore(weightedTotals.overall / totalWeight),
    seo: clampScore(weightedTotals.seo / totalWeight),
    performance: clampScore(weightedTotals.performance / totalWeight),
    accessibility: clampScore(weightedTotals.accessibility / totalWeight),
    content: clampScore(weightedTotals.content / totalWeight),
    uxDesign: clampScore(weightedTotals.uxDesign / totalWeight)
  };

  const allIssues = pages.flatMap(p => p.issues);
  const issuesSummary = {
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

  return { scores, issuesSummary };
}

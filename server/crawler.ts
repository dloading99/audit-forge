import axios from 'axios';
import * as cheerio from 'cheerio';
import { URL } from 'url';
import { CrawlOptions, PageResult } from '../types.js';

interface QueueItem {
  url: string;
  depth: number;
}

const DEFAULT_OPTIONS: Required<CrawlOptions> = {
  maxPages: 20,
  maxDepth: 2,
  timeoutMs: 12000
};

function isValidLink(href: string): boolean {
  const trimmed = href.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  return !lower.startsWith('mailto:') &&
    !lower.startsWith('tel:') &&
    !lower.startsWith('javascript:') &&
    !lower.startsWith('#') &&
    !lower.startsWith('data:');
}

export async function crawlSite(startUrl: string, options: CrawlOptions = {}): Promise<PageResult[]> {
  const { maxPages, maxDepth, timeoutMs } = { ...DEFAULT_OPTIONS, ...options };
  const visited = new Set<string>();
  const queue: QueueItem[] = [{ url: startUrl, depth: 0 }];
  const results: PageResult[] = [];

  let domain: string;
  try {
    domain = new URL(startUrl).hostname;
  } catch (e) {
    return [];
  }

  while (queue.length > 0 && results.length < maxPages) {
    const next = queue.shift();
    if (!next) continue;
    const { url: currentUrl, depth } = next;
    if (visited.has(currentUrl)) continue;

    visited.add(currentUrl);
    console.log(`Crawling: ${currentUrl}`);

    try {
      const response = await axios.get(currentUrl, {
        headers: {
          'User-Agent': 'AuditForgeBot/1.0',
          'Accept': 'text/html'
        },
        timeout: timeoutMs,
        validateStatus: () => true
      });

      const contentType = response.headers['content-type'] || '';
      const isHtml = contentType.includes('text/html');
      const html = typeof response.data === 'string' && isHtml ? response.data : '';

      const internalLinks: string[] = [];
      const externalLinks: string[] = [];

      if (html && response.status >= 200 && response.status < 400) {
        const $ = cheerio.load(html);
        $('a').each((_, element) => {
          const href = $(element).attr('href');
          if (!href || !isValidLink(href)) return;
          try {
            const absoluteUrl = new URL(href, currentUrl).href;
            const linkDomain = new URL(absoluteUrl).hostname;
            const isInternal = linkDomain === domain;

            if (isInternal) {
              internalLinks.push(absoluteUrl);
              const shouldQueue = depth < maxDepth &&
                !visited.has(absoluteUrl) &&
                !queue.some(item => item.url === absoluteUrl);
              if (shouldQueue) {
                queue.push({ url: absoluteUrl, depth: depth + 1 });
              }
            } else {
              externalLinks.push(absoluteUrl);
            }
          } catch (err) {
            // Ignore invalid URLs
          }
        });
      }

      results.push({
        url: currentUrl,
        html,
        statusCode: response.status,
        depth,
        internalLinks,
        externalLinks
      });
    } catch (error: any) {
      results.push({
        url: currentUrl,
        html: '',
        statusCode: 0,
        depth,
        internalLinks: [],
        externalLinks: [],
        error: error.message
      });
    }
  }

  return results;
}

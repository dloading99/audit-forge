import axios from 'axios';
import * as cheerio from 'cheerio';
import { URL } from 'url';

export interface CrawlResult {
  url: string;
  html: string;
  statusCode: number;
  error?: string;
}

export async function crawlSite(startUrl: string, maxPages: number = 30): Promise<CrawlResult[]> {
  const visited = new Set<string>();
  const queue: string[] = [startUrl];
  const results: CrawlResult[] = [];
  
  let domain: string;
  try {
    domain = new URL(startUrl).hostname;
  } catch (e) {
    return [];
  }

  while (queue.length > 0 && results.length < maxPages) {
    const currentUrl = queue.shift();
    if (!currentUrl || visited.has(currentUrl)) continue;

    visited.add(currentUrl);
    console.log(`Crawling: ${currentUrl}`);

    try {
      const response = await axios.get(currentUrl, {
        headers: {
          'User-Agent': 'AuditForgeBot/1.0',
          'Accept': 'text/html'
        },
        timeout: 10000,
        validateStatus: () => true // Don't throw on 4xx/5xx
      });

      const contentType = response.headers['content-type'] || '';
      if (!contentType.includes('text/html')) {
        continue;
      }

      const html = typeof response.data === 'string' ? response.data : '';
      
      results.push({
        url: currentUrl,
        html,
        statusCode: response.status
      });

      // Extract links if status is good
      if (response.status >= 200 && response.status < 300) {
        const $ = cheerio.load(html);
        $('a').each((_, element) => {
          const href = $(element).attr('href');
          if (href) {
            try {
              const absoluteUrl = new URL(href, currentUrl).href;
              const linkDomain = new URL(absoluteUrl).hostname;
              
              // Only internal links, http/https, not visited, not already in queue
              if (linkDomain === domain && 
                  (absoluteUrl.startsWith('http:') || absoluteUrl.startsWith('https:')) &&
                  !visited.has(absoluteUrl) && 
                  !queue.includes(absoluteUrl) &&
                  !absoluteUrl.match(/\.(pdf|jpg|png|gif|css|js|zip)$/i)) {
                queue.push(absoluteUrl);
              }
            } catch (e) {
              // Ignore invalid URLs
            }
          }
        });
      }

    } catch (error: any) {
      results.push({
        url: currentUrl,
        html: '',
        statusCode: 0,
        error: error.message
      });
    }
  }

  return results;
}

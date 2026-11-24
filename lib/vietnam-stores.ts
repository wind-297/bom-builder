import { isSpecificProductPath } from './link-validator';
import { BomSearchResult } from './types';

interface StoreAdapter {
  sourceId: string;
  name: string;
  domain: string;
  search: (query: string) => Promise<BomSearchResult[]>;
}

export const TIER1_STORE_ADAPTERS: StoreAdapter[] = [
  // 1. Hshop.vn — Haravan search endpoint
  {
    sourceId: 'hshop',
    name: 'Hshop.vn',
    domain: 'hshop.vn',
    search: async (query: string): Promise<BomSearchResult[]> => {
      try {
        const url = `https://hshop.vn/search?q=${encodeURIComponent(query)}`;
        const res = await fetch(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'vi,en;q=0.9',
          },
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) return [];
        const html = await res.text();
        const results: BomSearchResult[] = [];

        // Match product titles & links in Haravan/Bizweb product card
        const cardRegex =
          /class=["'][^"']*product-name[^"']*["'][^>]*>[\s\S]{0,250}?href=["']([^"']+)["'][^>]*>([\s\S]{0,200}?)<\/a>/gi;
        let m;
        while ((m = cardRegex.exec(html)) !== null) {
          const href = m[1];
          const rawTitle = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          if (href && rawTitle.length >= 4) {
            const fullUrl = href.startsWith('http') ? href : `https://hshop.vn${href.startsWith('/') ? '' : '/'}${href}`;
            if (isSpecificProductPath(fullUrl) && !results.some((r) => r.url === fullUrl)) {
              results.push({
                title: rawTitle,
                url: fullUrl,
                content: `${rawTitle} - Hshop Robotics & Electronics`,
                engine: 'Hshop.vn',
              });
            }
          }
        }

        // Also match <h3><a href="...">Title</a></h3> in Hshop search results
        const h3Regex = /<h3[^>]*>\s*<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
        while ((m = h3Regex.exec(html)) !== null) {
          const href = m[1];
          const rawTitle = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          if (href && rawTitle.length >= 4) {
            const fullUrl = href.startsWith('http') ? href : `https://hshop.vn${href.startsWith('/') ? '' : '/'}${href}`;
            if (isSpecificProductPath(fullUrl) && !results.some((r) => r.url === fullUrl)) {
              results.push({
                title: rawTitle,
                url: fullUrl,
                content: `${rawTitle} - Hshop Robotics & Electronics`,
                engine: 'Hshop.vn',
              });
            }
          }
        }
        return results;
      } catch {
        return [];
      }
    },
  },

  // 2. NShop (nshopvn.com) — Official WooCommerce Store REST API
  {
    sourceId: 'nshopvn',
    name: 'NShop',
    domain: 'nshopvn.com',
    search: async (query: string): Promise<BomSearchResult[]> => {
      try {
        const url = `https://nshopvn.com/wp-json/wc/store/products?search=${encodeURIComponent(query)}`;
        const res = await fetch(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'application/json',
          },
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) return [];
        const data = await res.json();
        if (!Array.isArray(data)) return [];

        const results: BomSearchResult[] = [];
        for (const item of data) {
          if (item?.permalink && item?.name && isSpecificProductPath(item.permalink)) {
            const cleanDesc = (item.short_description || '')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
            results.push({
              title: item.name,
              url: item.permalink,
              content: cleanDesc || `${item.name} - NShop linh kiện điện tử`,
              engine: 'Nshopvn.com',
            });
          }
        }
        return results;
      } catch {
        return [];
      }
    },
  },

  // 3. Linh kiện Cầu Giấy (lkcg.vn) — Bizweb search endpoint
  {
    sourceId: 'lkcg',
    name: 'Linh kiện Cầu Giấy',
    domain: 'lkcg.vn',
    search: async (query: string): Promise<BomSearchResult[]> => {
      try {
        const url = `https://lkcg.vn/search?q=${encodeURIComponent(query)}`;
        const res = await fetch(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'vi,en;q=0.9',
          },
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) return [];
        const html = await res.text();
        const results: BomSearchResult[] = [];

        const cardRegex =
          /class=["'][^"']*product-name[^"']*["'][^>]*>[\s\S]{0,250}?href=["']([^"']+)["'][^>]*>([\s\S]{0,200}?)<\/a>/gi;
        let m;
        while ((m = cardRegex.exec(html)) !== null) {
          const href = m[1];
          const rawTitle = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          if (href && rawTitle.length >= 4) {
            const fullUrl = href.startsWith('http') ? href : `https://lkcg.vn${href.startsWith('/') ? '' : '/'}${href}`;
            if (isSpecificProductPath(fullUrl)) {
              results.push({
                title: rawTitle,
                url: fullUrl,
                content: `${rawTitle} - Linh kiện Cầu Giấy`,
                engine: 'Linh kiện Cầu Giấy',
              });
            }
          }
        }
        return results;
      } catch {
        return [];
      }
    },
  },

  // 4. Banlinhkien.com
  {
    sourceId: 'banlinhkien',
    name: 'Banlinhkien',
    domain: 'banlinhkien.com',
    search: async (query: string): Promise<BomSearchResult[]> => {
      try {
        const url = `https://banlinhkien.com/search?q=${encodeURIComponent(query)}`;
        const res = await fetch(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) return [];
        const html = await res.text();
        const results: BomSearchResult[] = [];

        const anchorRegex = /<a[^>]+href=["']([^"']*(?:-p\d+|-pc\d+)\.html)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi;
        let m;
        while ((m = anchorRegex.exec(html)) !== null) {
          const href = m[1];
          const inner = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          const titleAttr = (m[0].match(/title=["']([^"']+)["']/i) || [])[1] || '';
          const title = (inner || titleAttr).trim();
          if (href && title && title.length >= 3) {
            const fullUrl = href.startsWith('http') ? href : `https://banlinhkien.com${href.startsWith('/') ? '' : '/'}${href}`;
            if (isSpecificProductPath(fullUrl)) {
              results.push({
                title,
                url: fullUrl,
                content: `${title} - Banlinhkien`,
                engine: 'Banlinhkien',
              });
            }
          }
        }
        return results;
      } catch {
        return [];
      }
    },
  },
];

export async function searchVietnamTier1Stores(query: string, maxItems: number = 8): Promise<BomSearchResult[]> {
  const cleanQuery = (query || '').trim();
  if (!cleanQuery) return [];

  const promises = TIER1_STORE_ADAPTERS.map((adapter) => adapter.search(cleanQuery));
  const settled = await Promise.allSettled(promises);
  const allResults: BomSearchResult[] = [];
  const seenUrls = new Set<string>();

  const STOP_WORDS = new Set(['cho', 'cac', 'các', 'va', 'và', 'co', 'có', 'phu', 'phù', 'hop', 'hợp', 'cua', 'của', 'loai', 'loại', 'trong', 'de', 'để', 'lam', 'làm', 'voi', 'với', 'nhung', 'nhưng']);
  const queryKeywords = cleanQuery
    .toLowerCase()
    .split(/[\s,./\\_-]+/)
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));

  for (const s of settled) {
    if (s.status === 'fulfilled' && Array.isArray(s.value)) {
      for (const item of s.value) {
        if (!seenUrls.has(item.url)) {
          seenUrls.add(item.url);
          // Check keyword relevance
          const lowerTitle = item.title.toLowerCase();
          const matches =
            queryKeywords.length === 0 ||
            lowerTitle.includes(cleanQuery.toLowerCase()) ||
            queryKeywords.some((kw) => lowerTitle.includes(kw));
          if (matches) {
            allResults.push(item);
          }
        }
      }
    }
  }

  return allResults.slice(0, maxItems);
}

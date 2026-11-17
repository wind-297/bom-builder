import { getAppSettings } from './config';
import { BomSearchResult } from './types';
import { filterAndRankSearchResults } from './optimizer';

const SEARCH_TIMEOUT_MS = 6000;

interface RawSearxResult {
  title?: string;
  url?: string;
  content?: string;
  snippet?: string;
  engine?: string;
  price?: number;
}

interface RawSearxResponse {
  results?: RawSearxResult[];
}

export function buildProductSearchQuery(name: string, specification?: string): string {
  const parts = [name?.trim(), specification?.trim()].filter(Boolean);
  const combined = parts.join(' ').trim();
  if (!combined) return '';

  const lower = combined.toLowerCase();
  const keywords = ['linh kiện', 'mua', 'bán', 'giá', 'shop', 'cửa hàng'];
  const hasKeyword = keywords.some((kw) => lower.includes(kw));

  if (!hasKeyword) {
    return `${combined} linh kiện`;
  }

  return combined;
}

export async function searchSearxng(
  query: string,
  customUrl?: string
): Promise<BomSearchResult[]> {
  const trimmed = query?.trim();
  if (!trimmed) {
    return [];
  }

  const baseUrl = (customUrl || getAppSettings().searxngUrl || 'http://localhost:8080').replace(/\/+$/, '');
  const searchUrl = `${baseUrl}/search?q=${encodeURIComponent(trimmed)}&format=json&language=vi`;

  try {
    const res = await fetch(searchUrl, {
      signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
    });

    if (!res.ok) {
      console.warn(`SearXNG returned HTTP ${res.status}: ${res.statusText}`);
      return [];
    }

    const data: RawSearxResponse = await res.json();
    if (!data || !Array.isArray(data.results)) {
      return [];
    }

    const mapped = data.results.map((item): BomSearchResult => ({
      title: item.title || '',
      url: item.url || '',
      content: item.content || item.snippet || '',
      ...(item.engine ? { engine: item.engine } : {}),
      ...(typeof item.price === 'number' ? { price: item.price } : {}),
    }));

    return filterAndRankSearchResults(mapped, trimmed);
  } catch (err) {
    console.warn('SearXNG search error:', err);
    return [];
  }
}

import { getAppSettings } from './config';
import { BomSearchResult } from './types';

const SEARCH_TIMEOUT_MS = 10000;

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

    return data.results.map((item): BomSearchResult => ({
      title: item.title || '',
      url: item.url || '',
      content: item.content || item.snippet || '',
      ...(item.engine ? { engine: item.engine } : {}),
      ...(typeof item.price === 'number' ? { price: item.price } : {}),
    }));
  } catch (err) {
    console.warn('SearXNG search error:', err);
    return [];
  }
}

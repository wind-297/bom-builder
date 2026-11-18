import { getAppSettings } from './config';
import { findSourceByUrl, isAllowedSourceUrl } from './sources';
import { isSpecificProductPath } from './link-validator';
import { searchVietnamTier1Stores } from './vietnam-stores';
import { BomSearchResult } from './types';

const SEARCH_TIMEOUT_MS = 6000;

interface RawSearxResult {
  title?: string;
  url?: string;
  content?: string;
  snippet?: string;
  engine?: string;
}

interface RawSearxResponse {
  results?: RawSearxResult[];
}

const KNOWN_MODEL_PATTERNS = [
  /\b(ESP32(?:-[A-Z0-9]+)?|ESP8266|STM32[A-Z0-9]*|ATmega328P)\b/i,
  /\b(Arduino\s+(?:Uno|Nano|Mega)(?:\s+R3|\s+V3)?)\b/i,
  /\b(Raspberry\s+Pi\s*\d?)\b/i,
  /\b(HC-SR04|HC-SR05|TCRT5000|MPU-?6050|OV2640|DHT11|DHT22|VL53L0X)\b/i,
  /\b(L298N|L298|TB6612FNG|TB6612|BTS7960|A4988|DRV8825|ULN2003)\b/i,
  /\b(MG996R|MG995|SG90|DS3218|GA25|GA12|N20|JGB37|28BYJ-48|NEMA\s*17)\b/i,
  /\b(LM2596|XL4015|TP4056|MT3608|AMS1117|18650)\b/i,
  /\b(Mecanum|Breadboard|Dupont)\b/i,
];

/**
 * Extracts concise, store-friendly search terms from verbose BOM item names.
 * E.g. "Mạch điều khiển động cơ Driver L298N (hoặc TB6612FNG)" -> ["L298N", "TB6612FNG"]
 */
export function extractCoreSearchTerms(query: string): string[] {
  const clean = (query || '').trim();
  if (!clean) return [];

  const terms: string[] = [];

  // 1. Extract exact technical model codes first (highest precision on store search)
  for (const pattern of KNOWN_MODEL_PATTERNS) {
    const m = clean.match(pattern);
    if (m && m[1]) {
      terms.push(m[1].trim());
    }
  }

  // 2. Also add stripped Vietnamese core phrase (remove parentheticals & filler prefixes)
  const stripped = clean
    .replace(/\([^)]*\)/g, ' ')
    .replace(/^(?:tìm|mua|bộ|mạch|module|linh\s*kiện|cái|\d+\s+)/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (stripped && stripped.length >= 2) {
    // Keep at most 4 words so store search doesn't over-constrain
    const shortPhrase = stripped.split(/\s+/).slice(0, 4).join(' ');
    if (shortPhrase && !terms.some((t) => t.toLowerCase() === shortPhrase.toLowerCase())) {
      terms.push(shortPhrase);
    }
  }

  if (terms.length === 0) {
    terms.push(clean);
  }

  return Array.from(new Set(terms)).slice(0, 2);
}

/**
 * Multi-query planner for Vietnam-first robotics component discovery
 */
export function buildMultiQueryPlan(name: string, specification?: string): {
  tier1Queries: string[];
  tier2Queries: string[];
  tier3Queries: string[];
} {
  const cleanName = (name || '').trim();
  const cleanSpec = (specification || '').trim();
  const coreTerms = extractCoreSearchTerms(cleanName);
  const primary = coreTerms[0] || cleanName;

  const tier1Queries = [
    primary,
    `site:hshop.vn ${primary}`,
    `site:nshopvn.com ${primary}`,
    `site:lkcg.vn ${primary}`,
    `site:banlinhkien.com ${primary}`,
    `site:cungcaplinhkien.vn ${primary}`,
  ];

  const tier2Queries = [
    `site:shopee.vn ${primary}`,
    `site:lazada.vn ${primary}`,
    `site:tiki.vn ${primary}`,
  ];

  const combined = [primary, cleanSpec].filter(Boolean).join(' ');
  const tier3Queries = [
    `site:digikey.com ${primary}`,
    `site:mouser.com ${primary}`,
    `site:pololu.com ${primary}`,
    `site:dfrobot.com ${primary}`,
    `site:lcsc.com ${combined}`,
  ];

  return { tier1Queries, tier2Queries, tier3Queries };
}

export function buildProductSearchQuery(name: string, specification?: string): string {
  const parts = [name?.trim(), specification?.trim()].filter(Boolean);
  const combined = parts.join(' ').trim();
  if (!combined) return '';

  const lower = combined.toLowerCase();
  const keywords = ['linh kiện', 'mua', 'bán', 'giá', 'shop', 'cửa hàng', 'hshop', 'nshop', 'lkcg'];
  const hasKeyword = keywords.some((kw) => lower.includes(kw));

  if (!hasKeyword) {
    return `${combined} linh kiện`;
  }

  return combined;
}

/**
 * Strictly filters results to allowlisted domains and specific product paths,
 * then orders Vietnam Tier 1 -> Vietnam Tier 2 -> International Tier 3.
 */
export function filterAllowedProductResults(results: BomSearchResult[]): BomSearchResult[] {
  if (!Array.isArray(results)) return [];

  const seenUrls = new Set<string>();
  const clean: BomSearchResult[] = [];

  for (const item of results) {
    if (!item?.url || typeof item.url !== 'string') continue;

    // Must belong to centralized Search Source Allowlist
    if (!isAllowedSourceUrl(item.url)) continue;

    // Must be a specific product page (never root homepage, search, or category)
    if (!isSpecificProductPath(item.url)) continue;

    const normalizedUrl = item.url.split('?')[0].replace(/\/+$/, '').toLowerCase();
    if (seenUrls.has(normalizedUrl)) continue;
    seenUrls.add(normalizedUrl);

    clean.push(item);
  }

  // Sort Vietnam-first: Tier 1 -> Tier 2 -> Tier 3, then by defaultTrustScore
  return clean.sort((a, b) => {
    const srcA = findSourceByUrl(a.url);
    const srcB = findSourceByUrl(b.url);
    const tierA = srcA?.tier ?? 99;
    const tierB = srcB?.tier ?? 99;
    if (tierA !== tierB) return tierA - tierB;
    return (srcB?.defaultTrustScore ?? 0) - (srcA?.defaultTrustScore ?? 0);
  });
}

async function querySearxngEndpoint(baseUrl: string, query: string): Promise<BomSearchResult[]> {
  const searchUrl = `${baseUrl}/search?q=${encodeURIComponent(query)}&format=json&language=vi`;
  try {
    const res = await fetch(searchUrl, {
      signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
    });
    if (!res.ok) return [];
    const data: RawSearxResponse = await res.json();
    if (!data || !Array.isArray(data.results)) return [];

    return data.results.map((item): BomSearchResult => ({
      title: item.title || '',
      url: item.url || '',
      content: item.content || item.snippet || '',
      ...(item.engine ? { engine: item.engine } : {}),
    }));
  } catch {
    return [];
  }
}

/**
 * Vietnam-first multi-tier product search:
 * 1. Direct Tier 1 Vietnamese specialized stores (Hshop, NShop, LKCG, Banlinhkien)
 * 2. Configured SearXNG instance (filtered strictly to allowlist: Tier 1 & Tier 2 VN)
 * 3. Tier 3 International fallback ONLY when Vietnam sources yield 0 verified results
 */
export async function searchSearxng(
  query: string,
  customUrl?: string
): Promise<BomSearchResult[]> {
  const trimmed = query?.trim();
  if (!trimmed) {
    return [];
  }

  const allFound: BomSearchResult[] = [];
  const baseUrl = (customUrl || getAppSettings().searxngUrl || 'http://localhost:8080').replace(/\/+$/, '');
  const coreTerms = extractCoreSearchTerms(trimmed);

  // Run Tier 1 live store search and primary SearXNG query concurrently
  const [tier1Result, searxPrimaryResult] = await Promise.allSettled([
    (async () => {
      const collected: BomSearchResult[] = [];
      for (const term of coreTerms) {
        const found = await searchVietnamTier1Stores(term, 6);
        collected.push(...found);
        if (collected.length >= 5) break;
      }
      return collected;
    })(),
    querySearxngEndpoint(baseUrl, trimmed),
  ]);

  if (tier1Result.status === 'fulfilled') {
    allFound.push(...tier1Result.value);
  }
  if (searxPrimaryResult.status === 'fulfilled') {
    allFound.push(...searxPrimaryResult.value);
  }

  let filtered = filterAllowedProductResults(allFound);

  // Check if we have any Vietnam results (Tier 1 or Tier 2)
  const hasVietnamResults = filtered.some((item) => {
    const src = findSourceByUrl(item.url);
    return src && src.country === 'VN';
  });

  // If no Vietnam results yet, attempt targeted Tier 2 Marketplace search via SearXNG
  if (!hasVietnamResults && coreTerms[0]) {
    const vnMarketQuery = `${coreTerms[0]} (site:shopee.vn OR site:lazada.vn OR site:tiki.vn)`;
    const marketResults = await querySearxngEndpoint(baseUrl, vnMarketQuery);
    if (marketResults.length > 0) {
      allFound.push(...marketResults);
      filtered = filterAllowedProductResults(allFound);
    }
  }

  // Tier 3 International fallback ONLY when Vietnam sources returned 0 results
  if (filtered.length === 0 && coreTerms[0]) {
    const intlQuery = `${coreTerms[0]} (site:digikey.com OR site:mouser.com OR site:pololu.com OR site:dfrobot.com)`;
    const intlResults = await querySearxngEndpoint(baseUrl, intlQuery);
    if (intlResults.length > 0) {
      allFound.push(...intlResults);
      filtered = filterAllowedProductResults(allFound);
    }
  }

  return filtered;
}

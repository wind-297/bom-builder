import { getAppSettings } from './config';
import { findSourceByUrl, isAllowedSourceUrl } from './sources';
import { isSpecificProductPath } from './link-validator';
import { searchVietnamTier1Stores } from './vietnam-stores';
import { BomSearchResult, SearchLog } from './types';
import { understandComponent, buildExpandedShopeeQueries } from './component-understanding';

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
  /\b(3V-?670|3V670)\b/i,
  /\b(ESP32\s+DevKit\s+V1|ESP32(?:-[A-Z0-9]+)?|ESP8266|STM32[A-Z0-9]*|ATmega328P)\b/i,
  /\b(Arduino\s+(?:Uno|Nano|Mega)(?:\s+R3|\s+V3)?)\b/i,
  /\b(Raspberry\s+Pi\s*\d?)\b/i,
  /\b(HC-?SR04|HC-?SR05|TCRT5000|MPU-?6050|OV2640|DHT11|DHT22|VL53L0X)\b/i,
  /\b(L298N|L298|TB6612FNG|TB6612|BTS7960|A4988|DRV8825|ULN2003)\b/i,
  /\b(MG996R|MG995|SG90|DS3218|GA25|GA12|N20(?:\s*12V)?|JGB37|28BYJ-48|NEMA\s*17)\b/i,
  /\b(LM2596|XL4015|TP4056|MT3608|AMS1117|18650)\b/i,
  /\b(Mecanum|Breadboard|Dupont)\b/i,
];

// Technical English equivalents for Vietnamese robotics terms to improve Shopee search coverage
const VI_TO_EN_SYNONYMS: Array<[RegExp, string]> = [
  [/động cơ giảm tốc\s*n20/i, 'N20 DC geared motor'],
  [/động cơ giảm tốc/i, 'DC geared motor'],
  [/động cơ bước/i, 'stepper motor'],
  [/cảm biến dò line/i, 'line tracking sensor'],
  [/cảm biến siêu âm/i, 'ultrasonic sensor'],
  [/khung xe robot/i, 'robot car chassis'],
  [/bánh xe mecanum/i, 'mecanum wheel'],
  [/mạch hạ áp/i, 'buck converter'],
  [/mạch điều khiển động cơ/i, 'motor driver'],
];

/**
 * Extracts concise, store-friendly search terms from verbose BOM item names.
 * E.g. "Mạch điều khiển động cơ Driver L298N (hoặc TB6612FNG)" -> ["L298N", "TB6612FNG"]
 */
export function extractCoreSearchTerms(query: string): string[] {
  const clean = (query || '').trim();
  if (!clean) return [];

  const terms: string[] = [];
  const knowledge = understandComponent(clean);

  // 1. Highest priority: exact identified model code
  if (knowledge.modelCode) {
    terms.push(knowledge.modelCode);
  }

  // 2. Extract exact technical model codes from patterns
  for (const pattern of KNOWN_MODEL_PATTERNS) {
    const m = clean.match(pattern);
    if (m && m[1]) {
      const val = m[1].trim();
      if (!terms.some((t) => t.toLowerCase() === val.toLowerCase())) {
        terms.push(val);
      }
    }
  }

  // 3. Also add stripped Vietnamese core phrase (remove parentheticals & filler prefixes)
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
 * Mandatory Shopee Query Planner:
 * Generates targeted, non-redundant `site:shopee.vn` queries covering:
 * - Exact model / core term
 * - Vietnamese product phrase or important specification
 * - English technical synonym (when applicable)
 */
export function buildShopeeQueries(name: string, specification?: string): string[] {
  return buildExpandedShopeeQueries(name, specification);
}

/**
 * Multi-query planner for Vietnam-first robotics component discovery
 * Tier 1: Shopee Vietnam (Mandatory Priority #1)
 * Tier 2: Vietnamese Electronics & Robotics Stores
 * Tier 3: Other Vietnamese Marketplaces (Lazada, Tiki)
 * Tier 4: International Suppliers (Fallback only)
 */
export function buildMultiQueryPlan(name: string, specification?: string): {
  shopeeQueries: string[];
  tier1Queries: string[];
  tier2Queries: string[];
  tier3Queries: string[];
  tier4Queries: string[];
} {
  const cleanName = (name || '').trim();
  const cleanSpec = (specification || '').trim();
  const coreTerms = extractCoreSearchTerms(cleanName);
  const primary = coreTerms[0] || cleanName;

  // Tier 1: Shopee Việt Nam (Ưu tiên số 1)
  const shopeeQueries = buildShopeeQueries(cleanName, cleanSpec);
  const tier1Queries = [...shopeeQueries];

  // Tier 2: Cửa hàng linh kiện chuyên ngành Việt Nam
  const tier2Queries = [
    primary,
    `site:lkcg.vn ${primary}`,
    `site:hshop.vn ${primary}`,
    `site:nshopvn.com ${primary}`,
    `site:banlinhkien.com ${primary}`,
    `site:cungcaplinhkien.vn ${primary}`,
  ];

  // Tier 3: Sàn thương mại điện tử khác tại Việt Nam
  const tier3Queries = [
    `site:lazada.vn ${primary}`,
    `site:tiki.vn ${primary}`,
  ];

  // Tier 4: Nhà cung cấp quốc tế (Chỉ dùng fallback)
  const combined = [primary, cleanSpec].filter(Boolean).join(' ');
  const tier4Queries = [
    `site:digikey.com ${primary}`,
    `site:mouser.com ${primary}`,
    `site:pololu.com ${primary}`,
    `site:dfrobot.com ${primary}`,
    `site:lcsc.com ${combined}`,
  ];

  return { shopeeQueries, tier1Queries, tier2Queries, tier3Queries, tier4Queries };
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
 * then orders Vietnam Tier 1 -> Vietnam Tier 2 (Shopee, Lazada, Tiki) -> International Tier 3.
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

    if (!item.evidence) {
      const src = findSourceByUrl(item.url);
      item.evidence = {
        originalUrl: item.url,
        searchQuery: '',
        sourceDomain: src?.domain || 'unknown',
        provider: item.engine || 'searxng',
        retrievedAt: new Date().toISOString(),
      };
    }

    clean.push(item);
  }

  // Sort Vietnam-first: Shopee (Tier 1) -> Specialized Stores (Tier 2) -> Other Marketplaces (Tier 3) -> International (Tier 4)
  return clean.sort((a, b) => {
    const srcA = findSourceByUrl(a.url);
    const srcB = findSourceByUrl(b.url);
    const tierA = srcA?.tier ?? 99;
    const tierB = srcB?.tier ?? 99;
    if (tierA !== tierB) return tierA - tierB;
    return (srcB?.defaultTrustScore ?? 0) - (srcA?.defaultTrustScore ?? 0);
  });
}

async function querySearxngEndpoint(
  baseUrl: string,
  query: string
): Promise<{ results: BomSearchResult[]; ok: boolean; error?: string }> {
  const searchUrl = `${baseUrl}/search?q=${encodeURIComponent(query)}&format=json&language=vi`;
  try {
    const res = await fetch(searchUrl, {
      signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      return { results: [], ok: false, error: `HTTP ${res.status}` };
    }
    const data: RawSearxResponse = await res.json();
    if (!data || !Array.isArray(data.results)) {
      return { results: [], ok: true };
    }

    const mapped = data.results.map((item): BomSearchResult => ({
      title: item.title || '',
      url: item.url || '',
      content: item.content || item.snippet || '',
      ...(item.engine ? { engine: item.engine } : {}),
    }));

    return { results: mapped, ok: true };
  } catch (err) {
    return {
      results: [],
      ok: false,
      error: err instanceof Error ? err.message : 'Network error',
    };
  }
}

export interface SearchWithLogResponse {
  results: BomSearchResult[];
  searchLog: SearchLog;
}

/**
 * Mandatory Shopee-First Multi-Tier Search Orchestrator:
 * 1. ALWAYS executes Mandatory Shopee Vietnam search (`site:shopee.vn ...`) via SearXNG first.
 * 2. Extracts and validates Shopee product candidates (strict path format, no fake URLs).
 * 3. Evaluates if Shopee results are sufficient:
 *    - YES: Presents Shopee results first, then queries specialized stores (Tier 2) to populate supplementary alternatives.
 *    - NO: Sets `shopee_search_status = no_reliable_result`, then searches specialized stores (Tier 2).
 * 4. Expands to Additional Marketplaces (Lazada, Tiki) if coverage is low (< 3).
 * 5. Expands to International Suppliers ONLY when Vietnam sources yield 0 valid results.
 * 6. Attaches verifiable provenance (evidence) to every product result.
 * 7. Produces a transparent SearchLog auditing queries and retention counts.
 */
export async function searchWithMandatoryShopee(
  query: string,
  customUrl?: string,
  specification?: string
): Promise<SearchWithLogResponse> {
  const trimmed = query?.trim();
  const timestamp = new Date().toISOString();

  if (!trimmed) {
    return {
      results: [],
      searchLog: {
        componentName: '',
        timestamp,
        shopeeQueries: [],
        specializedQueries: [],
        rawShopeeCount: 0,
        rawSpecializedCount: 0,
        totalFilteredCount: 0,
        shopeeFound: false,
        shopeeProductsRetained: 0,
        specializedProductsRetained: 0,
        statusNotes: 'Truy vấn trống',
        shopee_search_status: 'not_searched',
      },
    };
  }

  const baseUrl = (customUrl || getAppSettings().searxngUrl || 'http://localhost:8080').replace(/\/+$/, '');
  const coreTerms = extractCoreSearchTerms(trimmed);
  const shopeeQueries = buildShopeeQueries(trimmed, specification);
  const specializedQueries = [...coreTerms];
  const additionalQueries: string[] = [];

  let rawShopeeCount = 0;
  let rawSpecializedCount = 0;
  const shopeeRequestErrors: string[] = [];
  const rawShopeeResults: BomSearchResult[] = [];

  // STAGE 1: Mandatory Shopee Vietnam Search (site:shopee.vn queries via SearXNG)
  const shopeeResponses = await Promise.all(
    shopeeQueries.map(async (sq) => {
      const resp = await querySearxngEndpoint(baseUrl, sq);
      if (!resp.ok && resp.error) {
        shopeeRequestErrors.push(resp.error);
      }
      return { query: sq, resp };
    })
  );

  for (const item of shopeeResponses) {
    if (item.resp.results && item.resp.results.length > 0) {
      for (const r of item.resp.results) {
        rawShopeeResults.push({
          ...r,
          evidence: {
            originalUrl: r.url,
            searchQuery: item.query,
            sourceDomain: 'shopee.vn',
            provider: r.engine || 'shopee',
            retrievedAt: timestamp,
          },
        });
      }
    }
  }

  rawShopeeCount = rawShopeeResults.filter((r) => {
    const src = findSourceByUrl(r.url);
    return src?.id === 'shopee';
  }).length;

  // Filter raw Shopee results to allowed specific product pages
  const filteredShopee = filterAllowedProductResults(rawShopeeResults).filter((r) => {
    const src = findSourceByUrl(r.url);
    return src?.id === 'shopee' || src?.tier === 1;
  });

  const shopeeFound = filteredShopee.length > 0;
  let shopeeStatus: 'found' | 'no_reliable_result' | 'searxng_unreachable' = 'no_reliable_result';

  if (shopeeFound) {
    shopeeStatus = 'found';
  } else if (shopeeRequestErrors.length === shopeeQueries.length && shopeeQueries.length > 0) {
    shopeeStatus = 'searxng_unreachable';
  } else {
    shopeeStatus = 'no_reliable_result';
  }

  // STAGE 2: Query Specialized Electronics Stores (Tier 2) & General Search
  // If Shopee succeeded, specialized stores serve as supplementary alternatives.
  // If Shopee had no results, specialized stores serve as primary alternatives.
  const specializedRaw: BomSearchResult[] = [];

  const [storesSettled, searxPrimarySettled] = await Promise.allSettled([
    (async () => {
      const collected: BomSearchResult[] = [];
      for (const term of coreTerms) {
        const found = await searchVietnamTier1Stores(term, 6);
        for (const f of found) {
          collected.push({
            ...f,
            evidence: f.evidence || {
              originalUrl: f.url,
              searchQuery: term,
              sourceDomain: findSourceByUrl(f.url)?.domain || 'specialized_store',
              provider: f.engine || 'store_adapter',
              retrievedAt: timestamp,
            },
          });
        }
        if (collected.length >= 6) break;
      }
      return collected;
    })(),
    (async () => {
      const resp = await querySearxngEndpoint(baseUrl, trimmed);
      return resp.results.map((r) => ({
        ...r,
        evidence: r.evidence || {
          originalUrl: r.url,
          searchQuery: trimmed,
          sourceDomain: findSourceByUrl(r.url)?.domain || 'searxng',
          provider: r.engine || 'searxng',
          retrievedAt: timestamp,
        },
      }));
    })(),
  ]);

  if (storesSettled.status === 'fulfilled') {
    rawSpecializedCount += storesSettled.value.length;
    specializedRaw.push(...storesSettled.value);
  }

  if (searxPrimarySettled.status === 'fulfilled') {
    rawSpecializedCount += searxPrimarySettled.value.length;
    specializedRaw.push(...searxPrimarySettled.value);
  }

  const filteredSpecialized = filterAllowedProductResults(specializedRaw).filter((r) => {
    const src = findSourceByUrl(r.url);
    return src?.id !== 'shopee' && src?.tier !== 1;
  });

  // Combine results: Shopee candidates ALWAYS come first!
  let combinedResults = [...filteredShopee, ...filteredSpecialized];

  // STAGE 3: Additional Vietnamese Marketplaces (Lazada, Tiki) if coverage is low (< 3 results)
  if (combinedResults.length < 3 && coreTerms[0]) {
    const additionalMarketQuery = `${coreTerms[0]} (site:lazada.vn OR site:tiki.vn)`;
    additionalQueries.push(additionalMarketQuery);
    const marketResp = await querySearxngEndpoint(baseUrl, additionalMarketQuery);
    if (marketResp.results.length > 0) {
      const marketResults = marketResp.results.map((r) => ({
        ...r,
        evidence: {
          originalUrl: r.url,
          searchQuery: additionalMarketQuery,
          sourceDomain: findSourceByUrl(r.url)?.domain || 'marketplace',
          provider: r.engine || 'searxng',
          retrievedAt: timestamp,
        },
      }));
      const extraFiltered = filterAllowedProductResults(marketResults);
      for (const ef of extraFiltered) {
        if (!combinedResults.some((c) => c.url === ef.url)) {
          combinedResults.push(ef);
        }
      }
    }
  }

  // STAGE 4: International Fallback ONLY when Vietnam sources returned 0 valid products
  const hasVietnamResults = combinedResults.some((item) => {
    const src = findSourceByUrl(item.url);
    return src && src.country === 'VN';
  });

  if (!hasVietnamResults && coreTerms[0]) {
    const intlQuery = `${coreTerms[0]} (site:digikey.com OR site:mouser.com OR site:pololu.com OR site:dfrobot.com)`;
    additionalQueries.push(intlQuery);
    const intlResp = await querySearxngEndpoint(baseUrl, intlQuery);
    if (intlResp.results.length > 0) {
      const intlResults = intlResp.results.map((r) => ({
        ...r,
        evidence: {
          originalUrl: r.url,
          searchQuery: intlQuery,
          sourceDomain: findSourceByUrl(r.url)?.domain || 'international',
          provider: r.engine || 'searxng',
          retrievedAt: timestamp,
        },
      }));
      const extraFiltered = filterAllowedProductResults(intlResults);
      for (const ef of extraFiltered) {
        if (!combinedResults.some((c) => c.url === ef.url)) {
          combinedResults.push(ef);
        }
      }
    }
  }

  const shopeeProductsRetained = combinedResults.filter((r) => {
    const s = findSourceByUrl(r.url);
    return s?.id === 'shopee' || s?.tier === 1;
  }).length;
  const specializedProductsRetained = combinedResults.filter((r) => findSourceByUrl(r.url)?.tier === 2).length;

  let statusNotes: string;
  if (shopeeProductsRetained > 0) {
    statusNotes = `Đã tìm thấy ${shopeeProductsRetained} sản phẩm Shopee VN và ${specializedProductsRetained} sản phẩm từ cửa hàng chuyên ngành.`;
  } else if (shopeeRequestErrors.length === shopeeQueries.length && shopeeQueries.length > 0) {
    statusNotes = `Đã gửi truy vấn Shopee qua SearXNG nhưng gặp lỗi kết nối (${shopeeRequestErrors[0]}).`;
  } else if (rawShopeeCount > 0 && shopeeProductsRetained === 0) {
    statusNotes = `Shopee trả về ${rawShopeeCount} kết quả nhưng đều là trang danh mục/tìm kiếm không phải link sản phẩm cụ thể.`;
  } else {
    statusNotes = `Đã thực thi truy vấn Shopee (${shopeeQueries.join(', ')}) nhưng SearXNG không trả về trang sản phẩm phù hợp.`;
  }

  const searchLog: SearchLog = {
    componentName: trimmed,
    timestamp,
    shopeeQueries,
    specializedQueries,
    ...(additionalQueries.length > 0 ? { additionalQueries } : {}),
    rawShopeeCount,
    rawSpecializedCount,
    totalFilteredCount: combinedResults.length,
    shopeeFound: shopeeProductsRetained > 0,
    shopeeProductsRetained,
    specializedProductsRetained,
    statusNotes,
    shopee_search_status: shopeeStatus,
  };

  return { results: combinedResults, searchLog };
}

/**
 * Backward-compatible entry point returning BomSearchResult[].
 * Queries SearXNG directly and filters to allowed product pages.
 */
export async function searchSearxng(
  query: string,
  customUrl?: string,
  specification?: string
): Promise<BomSearchResult[]> {
  const trimmed = query?.trim();
  if (!trimmed) return [];

  const baseUrl = (customUrl || getAppSettings().searxngUrl || 'http://localhost:8080').replace(/\/+$/, '');
  const productQuery = buildProductSearchQuery(trimmed, specification);
  const resp = await querySearxngEndpoint(baseUrl, productQuery);
  return filterAllowedProductResults(resp.results);
}

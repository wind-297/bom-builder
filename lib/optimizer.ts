import { getAppSettings } from './config';
import { cleanJsonFromLlmOutput } from './llm';
import {
  BomItem,
  BomItemAlternative,
  BomSearchResult,
  ManualPrice,
} from './types';
import {
  findSourceByUrl,
  isAllowedSourceUrl,
} from './sources';
import {
  validateProductLink,
  isSpecificProductPath,
} from './link-validator';

const OPTIMIZER_TIMEOUT_MS = 30000;

export function isBlacklistedDomain(urlStr: string): boolean {
  // Now enforce strict allowlist: if not in allowlist, it is treated as disallowed/blacklisted
  return !isAllowedSourceUrl(urlStr);
}

export function isSpecificProductUrl(urlStr: string): boolean {
  return isSpecificProductPath(urlStr);
}

/**
 * Filter search results strictly against the Vietnam-first allowlist and valid product paths,
 * then rank technically without price.
 */
export function filterAndRankSearchResults(
  results: BomSearchResult[],
  itemName: string = ''
): BomSearchResult[] {
  if (!Array.isArray(results)) return [];

  const valid = results.filter((r) => {
    if (!r?.url) return false;
    if (!isAllowedSourceUrl(r.url)) return false;
    if (!isSpecificProductPath(r.url)) return false;
    return true;
  });

  const keywords = itemName
    .toLowerCase()
    .split(/[\s,./\\_-]+/)
    .filter((w) => w.length > 1);

  return valid.sort((a, b) => {
    const scoreA = calculateTechnicalRankScore(a, keywords);
    const scoreB = calculateTechnicalRankScore(b, keywords);
    return scoreB - scoreA;
  });
}

/**
 * Calculate technical-only ranking score (No price factor):
 * - Technical match: 40%
 * - Supplier reliability tier: 25% (Tier 1: 50, Tier 2: 30, Tier 3: 15)
 * - Information completeness: 20%
 * - Specific product path format: 15%
 */
function calculateTechnicalRankScore(item: BomSearchResult, keywords: string[]): number {
  let score = 0;
  try {
    const source = findSourceByUrl(item.url);
    const parsed = new URL(item.url);
    const path = parsed.pathname.toLowerCase();

    // 1. Supplier Tier (25%)
    if (source) {
      if (source.tier === 1) score += 50;
      else if (source.tier === 2) score += 30;
      else if (source.tier === 3) score += 15;
    }

    // 2. Specific product structure (15%)
    if (
      path.includes('/products/') ||
      path.includes('/product/') ||
      path.includes('/san-pham/') ||
      path.includes('-i.') ||
      path.includes('.html')
    ) {
      score += 30;
    }

    // 3. Technical keywords match (40%)
    const text = `${item.title} ${item.content}`.toLowerCase();
    let matchCount = 0;
    for (const kw of keywords) {
      if (text.includes(kw)) {
        matchCount++;
      }
    }
    const matchRatio = keywords.length > 0 ? matchCount / keywords.length : 0;
    score += Math.round(matchRatio * 80);

    // 4. Information completeness (20%)
    if (item.title && item.title.length > 15) score += 20;
    if (item.content && item.content.length > 50) score += 20;
  } catch {
    // ignore
  }
  return score;
}

export const OPTIMIZER_SYSTEM_PROMPT = `Bạn là một chuyên gia kỹ thuật phần cứng và robotics tại Việt Nam.
Nhiệm vụ của bạn là phân tích các kết quả tìm kiếm web cho một linh kiện và chọn liên kết sản phẩm phù hợp nhất về mặt KỸ THUẬT VÀ ĐỘ TIN CẬY CỦA NHÀ CUNG CẤP.

QUY TẮC BẮT BUỘC:
1. TUYỆT ĐỐI KHÔNG DỰA VÀO GIÁ CẢ. Người dùng sẽ tự nhập đơn giá thủ công. KHÔNG trích xuất hoặc ước tính giá.
2. "selectedUrl" BẮT BUỘC PHẢI nằm trong danh sách URL từ kết quả tìm kiếm được cung cấp. TUYỆT ĐỐI KHÔNG TỰ BỊA URL.
3. TUYỆT ĐỐI KHÔNG chọn URL trang chủ website chung chung (ví dụ: "https://shopee.vn", "https://hshop.vn").
4. Đảm bảo cân nhắc cả sản phẩm từ Shopee Việt Nam (shopee.vn) và các nhà cung cấp linh kiện chuyên ngành tại Việt Nam (Tier 1: lkcg.vn, hshop.vn, nshopvn.com, banlinhkien.com...). Luôn giữ các lựa chọn từ Shopee trong danh sách "alternatives" nếu có trong kết quả tìm kiếm.
5. Đánh giá mức độ phù hợp:
   - "best_match": Sản phẩm khớp chính xác thông số kỹ thuật nhất.
   - "most_reliable": Sản phẩm từ nhà cung cấp chuyên ngành uy tín nhất.
   - "alternative": Sản phẩm thay thế tương đương.
6. Nếu trong kết quả tìm kiếm KHÔNG CÓ sản phẩm nào phù hợp, hãy trả về "selectedUrl": "".

Chỉ trả về JSON thuần túy (không kèm markdown thừa):
{
  "selectedUrl": "URL liên kết sản phẩm cụ thể từ danh sách",
  "matchType": "best_match | most_reliable | alternative",
  "reason": "Lý do lựa chọn kỹ thuật",
  "alternatives": [
    {
      "title": "Tiêu đề",
      "url": "URL sản phẩm cụ thể khác từ danh sách",
      "matchType": "most_reliable | alternative",
      "reason": "Lý do đề xuất thay thế"
    }
  ]
}`;

export function extractPriceFromText(_text: string): number {
  // Legacy stub: Automatic price extraction is decommissioned per system policy
  return 0;
}

export function buildDiverseAlternatives(
  selectedUrl: string,
  ranked: BomSearchResult[]
): BomItemAlternative[] {
  const remaining = ranked.filter((r) => r.url !== selectedUrl);
  if (remaining.length === 0) return [];

  // Group by category/source
  const shopeeList: BomSearchResult[] = [];
  const tier1List: BomSearchResult[] = [];
  const otherMarketplaces: BomSearchResult[] = [];
  const intlList: BomSearchResult[] = [];

  for (const r of remaining) {
    const src = findSourceByUrl(r.url);
    if (src?.id === 'shopee') {
      shopeeList.push(r);
    } else if (src?.tier === 1) {
      tier1List.push(r);
    } else if (src?.tier === 2) {
      otherMarketplaces.push(r);
    } else {
      intlList.push(r);
    }
  }

  // Interleave to guarantee both Shopee and Tier 1 specialized store representation
  const selectedList: BomSearchResult[] = [];
  const maxEach = 3;

  // Add top Shopee results
  selectedList.push(...shopeeList.slice(0, maxEach));
  // Add top Tier 1 specialized results
  selectedList.push(...tier1List.slice(0, maxEach));
  // Add other marketplaces (Lazada, Tiki)
  selectedList.push(...otherMarketplaces.slice(0, 2));
  // Add international if any
  selectedList.push(...intlList.slice(0, 2));

  // If still fewer than 5, fill from remaining
  if (selectedList.length < 5) {
    for (const r of remaining) {
      if (!selectedList.some((s) => s.url === r.url)) {
        selectedList.push(r);
        if (selectedList.length >= 6) break;
      }
    }
  }

  return selectedList.slice(0, 8).map((r, idx) => {
    const altSource = findSourceByUrl(r.url);
    const isShopee = altSource?.id === 'shopee';
    return {
      title: r.title,
      url: r.url,
      supplierName: altSource?.name,
      supplierDomain: altSource?.domain,
      supplierTier: altSource?.tier,
      supplierCountry: altSource?.country,
      linkStatus: 'verified',
      matchType: idx === 0 ? 'most_reliable' : 'alternative',
      reason: isShopee ? 'Sản phẩm từ Shopee Việt Nam' : `Sản phẩm từ ${altSource?.name || 'nhà cung cấp uy tín'}`,
    };
  });
}

function fallbackHeuristic(item: BomItem, ranked: BomSearchResult[]): BomItem {
  if (ranked.length === 0) {
    return {
      ...item,
      unitPrice: item.manualPrice?.amount || 0,
      totalPrice: (item.manualPrice?.amount || 0) * (item.quantity > 0 ? item.quantity : 1),
      status: 'not_found',
      selectedLink: '',
      linkStatus: 'unverified',
      alternatives: [],
    };
  }

  const first = ranked[0];
  const source = findSourceByUrl(first.url);
  const quantity = item.quantity > 0 ? item.quantity : 1;
  const currentManual = item.manualPrice?.amount || 0;

  const alternatives: BomItemAlternative[] = buildDiverseAlternatives(first.url, ranked);

  return {
    ...item,
    unitPrice: currentManual,
    totalPrice: currentManual * quantity,
    status: 'found',
    selectedLink: first.url,
    supplierName: source?.name,
    supplierDomain: source?.domain,
    supplierTier: source?.tier,
    supplierCountry: source?.country,
    linkStatus: 'verified',
    matchType: 'best_match',
    note: item.note || `Chọn từ ${source?.name || 'nhà cung cấp chuyên ngành'}`,
    alternatives,
  };
}

export async function optimizeBomItemWithSearchResults(
  item: BomItem,
  searchResults: BomSearchResult[],
  apiKey?: string,
  baseUrl?: string,
  model?: string
): Promise<BomItem> {
  const rankedResults = filterAndRankSearchResults(searchResults, item.name);
  if (!rankedResults || rankedResults.length === 0) {
    return {
      ...item,
      status: 'not_found',
      selectedLink: '',
      linkStatus: 'unverified',
      unitPrice: item.manualPrice?.amount || 0,
      totalPrice: (item.manualPrice?.amount || 0) * (item.quantity > 0 ? item.quantity : 1),
      alternatives: item.alternatives || [],
    };
  }

  const settings = getAppSettings();
  const effectiveKey = apiKey ?? settings.llmApiKey;
  const effectiveBaseUrl = (baseUrl ?? settings.llmBaseUrl ?? 'https://api.openai.com/v1').replace(/\/+$/, '');
  const effectiveModel = model ?? settings.llmModel ?? 'gpt-4o-mini';

  const userPrompt = `Linh kiện cần tìm:
- Tên: ${item.name}
- Thông số: ${item.specification || 'Không có'}
- Phân hệ: ${item.subsystem || 'Chưa phân loại'}

Danh sách sản phẩm tìm được:
${rankedResults
  .slice(0, 10)
  .map(
    (r, i) =>
      `[${i + 1}] Tiêu đề: ${r.title}\nURL: ${r.url}\nNguồn: ${findSourceByUrl(r.url)?.name || r.url}\nMô tả: ${r.content}`
  )
  .join('\n\n')}`;

  const isTestEnv = typeof process !== 'undefined' && process.env.VITEST === 'true';
  if (!effectiveKey && !isTestEnv && effectiveBaseUrl.includes('api.openai.com')) {
    return fallbackHeuristic(item, rankedResults);
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (effectiveKey) {
    headers['Authorization'] = `Bearer ${effectiveKey}`;
  }

  try {
    const res = await fetch(`${effectiveBaseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: effectiveModel,
        messages: [
          { role: 'system', content: OPTIMIZER_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
      }),
      signal: AbortSignal.timeout(OPTIMIZER_TIMEOUT_MS),
    });

    if (!res.ok) {
      return fallbackHeuristic(item, rankedResults);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      return fallbackHeuristic(item, rankedResults);
    }

    const cleaned = cleanJsonFromLlmOutput(content);
    const parsed = JSON.parse(cleaned);

    let selectedUrl = '';
    const proposed = typeof parsed?.selectedUrl === 'string' ? parsed.selectedUrl.trim() : '';

    if (
      proposed &&
      isSpecificProductPath(proposed) &&
      isAllowedSourceUrl(proposed) &&
      rankedResults.some((r) => r.url === proposed)
    ) {
      selectedUrl = proposed;
    } else {
      selectedUrl = rankedResults[0].url;
    }

    const source = findSourceByUrl(selectedUrl);
    const quantity = item.quantity > 0 ? item.quantity : 1;
    const manualAmt = item.manualPrice?.amount || 0;

    let alternatives: BomItemAlternative[] = [];
    if (Array.isArray(parsed?.alternatives)) {
      alternatives = parsed.alternatives
        .filter(
          (alt: any) =>
            alt &&
            typeof alt.url === 'string' &&
            isSpecificProductPath(alt.url) &&
            isAllowedSourceUrl(alt.url) &&
            rankedResults.some((r) => r.url === alt.url)
        )
        .map((alt: any) => {
          const altSource = findSourceByUrl(alt.url);
          return {
            title: typeof alt.title === 'string' ? alt.title : '',
            url: alt.url,
            supplierName: altSource?.name,
            supplierDomain: altSource?.domain,
            supplierTier: altSource?.tier,
            supplierCountry: altSource?.country,
            linkStatus: 'verified',
            matchType: alt.matchType || 'alternative',
            reason: typeof alt.reason === 'string' ? alt.reason : undefined,
          };
        });
    }

    if (alternatives.length === 0) {
      alternatives = buildDiverseAlternatives(selectedUrl, rankedResults);
    }

    return {
      ...item,
      unitPrice: manualAmt,
      totalPrice: manualAmt * quantity,
      status: 'found',
      selectedLink: selectedUrl,
      supplierName: source?.name,
      supplierDomain: source?.domain,
      supplierTier: source?.tier,
      supplierCountry: source?.country,
      linkStatus: 'verified',
      matchType: parsed?.matchType || 'best_match',
      note: parsed?.reason ? parsed.reason : (item.note || 'Đã tìm thấy sản phẩm phù hợp'),
      alternatives,
    };
  } catch (err) {
    console.warn('optimizeBomItemWithSearchResults error, using fallback heuristic:', err);
    return fallbackHeuristic(item, rankedResults);
  }
}

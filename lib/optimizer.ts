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
import {
  understandComponent,
  classifyProductMatch,
  ComponentKnowledge,
} from './component-understanding';

export function cleanTierText(text?: string): string {
  if (!text) return '';
  return text
    .replace(/\s*\([^)]*(?:Tier\s*[1-4]|Ưu tiên)[^)]*\)/gi, '')
    .replace(/\bTier\s*[1-4]\s*(?:Source|Supplier|VN)?\b/gi, '')
    .replace(/\b(?:Priority|Source)\s*Tier\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

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

  const knowledge = understandComponent(itemName);
  const keywords = itemName
    .toLowerCase()
    .split(/[\s,./\\_-]+/)
    .filter((w) => w.length > 1);

  return valid
    .map((item) => ({
      item,
      score: calculateTechnicalRankScore(item, keywords, knowledge),
    }))
    .filter((entry) => entry.score > -50)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.item);
}

/**
 * Calculate technical-only ranking score (No price factor):
 * - Technical match & classification: 40%
 * - Supplier reliability tier: 25% (Tier 1: 65, Tier 2: 35, Tier 3: 20, Tier 4: 10)
 * - Information completeness: 20%
 * - Specific product path format: 15%
 */
function calculateTechnicalRankScore(
  item: BomSearchResult,
  keywords: string[],
  knowledge?: ComponentKnowledge
): number {
  let score = 0;
  try {
    const source = findSourceByUrl(item.url);
    const parsed = new URL(item.url);
    const path = parsed.pathname.toLowerCase();

    // 1. Supplier Tier (25%) - Tier 1 (Shopee VN) is prioritized #1
    if (source) {
      if (source.tier === 1) score += 65; // Shopee Việt Nam: Ưu tiên số 1 cao nhất
      else if (source.tier === 2) score += 35; // Cửa hàng linh kiện chuyên ngành (Tier 2)
      else if (source.tier === 3) score += 20; // Sàn TMĐT khác
      else if (source.tier === 4) score += 10; // Quốc tế
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

    // 3. Component understanding & Classification Match
    if (knowledge) {
      const match = classifyProductMatch(knowledge, item);
      if (match.grade === 'exact_match') {
        score += 150;
      } else if (match.grade === 'strong_match' || match.grade === 'equivalent') {
        score += 100;
      } else if (match.grade === 'possible_alternative') {
        score += 60;
      } else if (match.grade === 'related') {
        score += 20;
      } else if (match.grade === 'no_match') {
        // Unrelated products are strictly discarded from technical rankings
        return -100;
      }
    }

    // 4. Technical keywords match
    const text = `${item.title} ${item.content}`.toLowerCase();
    let matchCount = 0;
    for (const kw of keywords) {
      if (text.includes(kw)) {
        matchCount++;
      }
    }
    const matchRatio = keywords.length > 0 ? matchCount / keywords.length : 0;
    score += Math.round(matchRatio * 50);

    // 5. Information completeness (20%)
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
4. ƯU TIÊN SỐ 1 CHO SHOPEE VIỆT NAM (shopee.vn): Nếu trong kết quả tìm kiếm có sản phẩm từ Shopee Việt Nam đáp ứng yêu cầu kỹ thuật, BẮT BUỘC PHẢI ƯU TIÊN CHỌN LINK SHOPEE làm "selectedUrl". Các cửa hàng linh kiện chuyên ngành (hshop.vn, nshopvn.com, lkcg.vn, banlinhkien.com...) đưa vào "alternatives".
5. Đánh giá mức độ phù hợp:
   - "best_match": Sản phẩm khớp chính xác thông số kỹ thuật nhất.
   - "most_reliable": Sản phẩm từ nhà cung cấp chuyên ngành uy tín nhất.
   - "alternative": Sản phẩm thay thế tương đương.
6. Nếu trong kết quả tìm kiếm KHÔNG CÓ sản phẩm nào phù hợp, hãy trả về "selectedUrl": "".
7. TUYỆT ĐỐI KHÔNG sử dụng các nhãn phân cấp nội bộ như "Tier 1", "Tier 2", "Tier 3", "Tier 4", "Tier 1 Source", "Tier 2 Supplier" trong phần lý do (reason). Chỉ dùng tên cửa hàng hoặc tên sàn tự nhiên (ví dụ: Shopee, Hshop, NShop...).

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
  ranked: BomSearchResult[],
  knowledge?: ComponentKnowledge
): BomItemAlternative[] {
  const remaining = ranked.filter((r) => r.url !== selectedUrl);
  if (remaining.length === 0) return [];

  // Group by category/source
  const shopeeList: BomSearchResult[] = [];
  const tier2StoresList: BomSearchResult[] = [];
  const otherMarketplaces: BomSearchResult[] = [];
  const intlList: BomSearchResult[] = [];

  for (const r of remaining) {
    const src = findSourceByUrl(r.url);
    if (src?.tier === 1 || src?.id === 'shopee') {
      shopeeList.push(r);
    } else if (src?.tier === 2) {
      tier2StoresList.push(r);
    } else if (src?.tier === 3) {
      otherMarketplaces.push(r);
    } else {
      intlList.push(r);
    }
  }

  // Interleave: Shopee (Tier 1) first, then Tier 2 specialized stores, then other marketplaces, then international
  const selectedList: BomSearchResult[] = [];
  const maxEach = 3;

  // Add top Shopee results (Tier 1)
  selectedList.push(...shopeeList.slice(0, maxEach));
  // Add top Tier 2 specialized store results
  selectedList.push(...tier2StoresList.slice(0, maxEach));
  // Add other marketplaces (Tier 3: Lazada, Tiki)
  selectedList.push(...otherMarketplaces.slice(0, 2));
  // Add international if any (Tier 4)
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
    let matchType: 'best_match' | 'strong_match' | 'most_reliable' | 'alternative' | 'possible_alternative' | 'related' = idx === 0 ? 'most_reliable' : 'alternative';
    let matchReason = isShopee ? 'Sản phẩm từ Shopee Việt Nam' : `Sản phẩm từ ${altSource?.name || 'nhà cung cấp uy tín'}`;

    if (knowledge) {
      const cls = classifyProductMatch(knowledge, r);
      if (cls.grade === 'exact_match') matchType = 'best_match';
      else if (cls.grade === 'strong_match' || cls.grade === 'equivalent') matchType = 'strong_match';
      else if (cls.grade === 'possible_alternative') matchType = 'possible_alternative';
      else if (cls.grade === 'related') matchType = 'related';

      if (cls.reason) matchReason = cls.reason;
    }

    return {
      title: r.title,
      url: r.url,
      supplierName: altSource?.name,
      supplierDomain: altSource?.domain,
      supplierTier: altSource?.tier,
      supplierCountry: altSource?.country,
      linkStatus: 'verified',
      matchType,
      reason: cleanTierText(matchReason),
      evidence: r.evidence,
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
      note: 'Không tìm thấy sản phẩm phù hợp tại các nhà cung cấp được hỗ trợ.',
      alternatives: [],
    };
  }

  const knowledge = understandComponent(item.name);
  const evaluated = ranked.map((r) => ({
    result: r,
    classification: classifyProductMatch(knowledge, r),
  }));

  // Match filtering: Accept exact_match, strong_match, equivalent, and possible_alternative
  const acceptable = evaluated.filter(
    (e) =>
      e.classification.grade === 'exact_match' ||
      e.classification.grade === 'strong_match' ||
      e.classification.grade === 'equivalent' ||
      e.classification.grade === 'possible_alternative'
  );

  if (acceptable.length === 0) {
    return {
      ...item,
      unitPrice: item.manualPrice?.amount || 0,
      totalPrice: (item.manualPrice?.amount || 0) * (item.quantity > 0 ? item.quantity : 1),
      status: 'not_found',
      selectedLink: '',
      linkStatus: 'unverified',
      note: knowledge.modelCode
        ? `Không tìm thấy sản phẩm khớp với mã '${knowledge.modelCode}'.`
        : 'Không tìm thấy sản phẩm phù hợp với thông số yêu cầu.',
      alternatives: [],
    };
  }

  // Priority 1: Shopee with exact_match
  const topShopeeExact = acceptable.find(
    (e) =>
      (findSourceByUrl(e.result.url)?.tier === 1 || findSourceByUrl(e.result.url)?.id === 'shopee') &&
      e.classification.grade === 'exact_match'
  );
  // Priority 2: Any exact_match
  const topExact = acceptable.find((e) => e.classification.grade === 'exact_match');
  // Priority 3: Shopee strong_match / equivalent
  const topShopeeStrong = acceptable.find(
    (e) =>
      (findSourceByUrl(e.result.url)?.tier === 1 || findSourceByUrl(e.result.url)?.id === 'shopee') &&
      (e.classification.grade === 'strong_match' || e.classification.grade === 'equivalent')
  );
  // Priority 4: Any strong_match / equivalent
  const topStrong = acceptable.find(
    (e) => e.classification.grade === 'strong_match' || e.classification.grade === 'equivalent'
  );
  // Priority 5: Shopee possible_alternative
  const topShopeeAlt = acceptable.find(
    (e) =>
      (findSourceByUrl(e.result.url)?.tier === 1 || findSourceByUrl(e.result.url)?.id === 'shopee') &&
      e.classification.grade === 'possible_alternative'
  );

  // Best candidate selection
  const chosen =
    topShopeeExact || topShopeeStrong || topShopeeAlt || topExact || topStrong || acceptable[0];
  const best = chosen.result;
  const bestGrade = chosen.classification;

  const source = findSourceByUrl(best.url);
  const quantity = item.quantity > 0 ? item.quantity : 1;
  const currentManual = item.manualPrice?.amount || 0;

  const acceptableResults = acceptable.map((a) => a.result);
  const alternatives: BomItemAlternative[] = buildDiverseAlternatives(best.url, acceptableResults, knowledge);

  let matchType: 'best_match' | 'strong_match' | 'possible_alternative' | 'alternative' = 'alternative';
  if (bestGrade.grade === 'exact_match') matchType = 'best_match';
  else if (bestGrade.grade === 'strong_match' || bestGrade.grade === 'equivalent') matchType = 'strong_match';
  else if (bestGrade.grade === 'possible_alternative') matchType = 'possible_alternative';

  const noteText = item.note || `Chọn từ ${source?.name || 'nhà cung cấp'}: ${bestGrade.reason}`;

  return {
    ...item,
    unitPrice: currentManual,
    totalPrice: currentManual * quantity,
    status: 'found',
    selectedLink: best.url,
    supplierName: source?.name,
    supplierDomain: source?.domain,
    supplierTier: source?.tier,
    supplierCountry: source?.country,
    linkStatus: 'verified',
    matchType,
    note: cleanTierText(noteText),
    alternatives,
    evidence: best.evidence,
  };
}

export async function optimizeBomItemWithSearchResults(
  item: BomItem,
  searchResults: BomSearchResult[],
  apiKey?: string,
  baseUrl?: string,
  model?: string
): Promise<BomItem> {
  const knowledge = understandComponent(item.name);
  const rankedResults = filterAndRankSearchResults(searchResults, item.name);
  if (!rankedResults || rankedResults.length === 0) {
    return {
      ...item,
      status: 'not_found',
      selectedLink: '',
      linkStatus: 'unverified',
      unitPrice: item.manualPrice?.amount || 0,
      totalPrice: (item.manualPrice?.amount || 0) * (item.quantity > 0 ? item.quantity : 1),
      note: item.note || (knowledge.modelCode
        ? `Không tìm thấy sản phẩm khớp với mã '${knowledge.modelCode}'.`
        : 'Không tìm thấy sản phẩm phù hợp.'),
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

    const knowledge = understandComponent(item.name);
    let selectedUrl = '';
    const proposed = typeof parsed?.selectedUrl === 'string' ? parsed.selectedUrl.trim() : '';

    if (
      proposed &&
      isSpecificProductPath(proposed) &&
      isAllowedSourceUrl(proposed) &&
      rankedResults.some((r) => r.url === proposed)
    ) {
      const targetResult = rankedResults.find((r) => r.url === proposed)!;
      const match = classifyProductMatch(knowledge, targetResult);
      if (match.grade !== 'no_match') {
        selectedUrl = proposed;
      }
    }

    if (!selectedUrl) {
      return fallbackHeuristic(item, rankedResults);
    }

    // Strict Shopee priority guarantee: If any valid Shopee product exists in top 3 match grades, prioritize it
    const shopeeCandidate = rankedResults.find((r) => {
      const s = findSourceByUrl(r.url);
      if (s?.id !== 'shopee' && s?.tier !== 1) return false;
      const m = classifyProductMatch(knowledge, r);
      return (
        m.grade === 'exact_match' ||
        m.grade === 'strong_match' ||
        m.grade === 'equivalent' ||
        m.grade === 'possible_alternative'
      );
    });
    if (shopeeCandidate) {
      const chosenSource = findSourceByUrl(selectedUrl);
      if (chosenSource?.id !== 'shopee') {
        selectedUrl = shopeeCandidate.url;
      }
    }

    const source = findSourceByUrl(selectedUrl);
    const selectedResult = rankedResults.find((r) => r.url === selectedUrl);
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
          const altResult = rankedResults.find((r) => r.url === alt.url);
          return {
            title: typeof alt.title === 'string' ? alt.title : '',
            url: alt.url,
            supplierName: altSource?.name,
            supplierDomain: altSource?.domain,
            supplierTier: altSource?.tier,
            supplierCountry: altSource?.country,
            linkStatus: 'verified',
            matchType: alt.matchType || 'alternative',
            reason: cleanTierText(typeof alt.reason === 'string' ? alt.reason : undefined),
            evidence: altResult?.evidence,
          };
        });
    }

    if (alternatives.length === 0) {
      alternatives = buildDiverseAlternatives(selectedUrl, rankedResults);
    }

    const finalNote = parsed?.reason ? parsed.reason : (item.note || 'Đã tìm thấy sản phẩm phù hợp');

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
      note: cleanTierText(finalNote),
      alternatives,
      evidence: selectedResult?.evidence,
    };
  } catch (err) {
    console.warn('optimizeBomItemWithSearchResults error, using fallback heuristic:', err);
    return fallbackHeuristic(item, rankedResults);
  }
}

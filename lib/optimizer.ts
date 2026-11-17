import { getAppSettings } from './config';
import { cleanJsonFromLlmOutput } from './llm';
import { BomItem, BomItemAlternative, BomSearchResult } from './types';

const OPTIMIZER_TIMEOUT_MS = 30000;

export const BLACKLISTED_DOMAINS = [
  // News & media
  'vnexpress.net',
  'tuoitre.vn',
  'thanhnien.vn',
  'dantri.com.vn',
  'vietnamnet.vn',
  'baomoi.com',
  'baonongnghiep.vn',
  'nongnghiep.vn',
  'vov.vn',
  'vtv.vn',
  'laodong.vn',
  'tienphong.vn',
  'zingnews.vn',
  'znews.vn',
  'kenh14.vn',
  'soha.vn',
  '24h.com.vn',
  'congthuong.vn',
  'khoahocdoisong.vn',
  'tinmoi.vn',
  'suckhoedoisong.vn',
  'baophapluat.vn',
  // Social & content platforms & wikis
  'wikipedia.org',
  'wikihow.com',
  'youtube.com',
  'youtu.be',
  'facebook.com',
  'fb.com',
  'tiktok.com',
  'instagram.com',
  'twitter.com',
  'x.com',
  'pinterest.com',
  'reddit.com',
  'medium.com',
  'tinhte.vn',
];

export const TRUSTED_COMPONENT_DOMAINS = [
  'hshop.vn',
  'thegioiic.com',
  'nshopvn.com',
  'dientutuhu.vn',
  'mualinhkien.vn',
  'banlinhkien.vn',
  'linhkienviet.vn',
  'robocon.vn',
  'icdayroi.com',
  'chotroi.vn',
  'shopee.vn',
  'lazada.vn',
  'tiki.vn',
  'cybershop.vn',
  'dientu360.com',
  'dientudat.com',
  'epuyen.vn',
  'linhkienthuduc.com',
];

export function isBlacklistedDomain(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase();
    if (host.endsWith('.gov.vn') || host.endsWith('.edu.vn')) return true;
    if (host.includes('nongnghiep') || host.includes('baochi') || host.includes('tintuc')) return true;
    return BLACKLISTED_DOMAINS.some((d) => host === d || host.endsWith('.' + d));
  } catch {
    return true;
  }
}

export function isSpecificProductUrl(urlStr: string): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.replace(/\/+$/, '');

    // Reject root domains or index files (e.g. https://shopee.vn or https://hshop.vn/index.html)
    if (!path || path === '' || path === '/' || path === '/index.html' || path === '/index.php') {
      return false;
    }

    // Reject search or category filter pages
    if (
      path.includes('/search') ||
      path.includes('/tim-kiem') ||
      parsed.searchParams.has('keyword') ||
      parsed.searchParams.has('q')
    ) {
      return false;
    }

    // Reject generic site paths
    const genericPaths = [
      '/about',
      '/about-us',
      '/contact',
      '/contact-us',
      '/lien-he',
      '/gioi-thieu',
      '/cart',
      '/gio-hang',
      '/account',
      '/login',
      '/dang-nhap',
      '/checkout',
      '/tin-tuc',
      '/blogs',
      '/blog',
    ];
    if (genericPaths.includes(path.toLowerCase())) {
      return false;
    }

    // Marketplace specific checks
    if (host.includes('shopee.vn')) {
      if (!path.includes('-i.') && !path.includes('/product/')) {
        return false;
      }
    }

    const segments = path.split('/').filter(Boolean);
    if (segments.length === 0) return false;

    return true;
  } catch {
    return false;
  }
}

export function filterAndRankSearchResults(
  results: BomSearchResult[],
  itemName: string = ''
): BomSearchResult[] {
  if (!Array.isArray(results)) return [];

  const valid = results.filter((r) => {
    if (!r?.url) return false;
    if (isBlacklistedDomain(r.url)) return false;
    if (!isSpecificProductUrl(r.url)) return false;
    return true;
  });

  const keywords = itemName
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 1);

  return valid.sort((a, b) => {
    const scoreA = calculateResultScore(a, keywords);
    const scoreB = calculateResultScore(b, keywords);
    return scoreB - scoreA;
  });
}

function calculateResultScore(item: BomSearchResult, keywords: string[]): number {
  let score = 10;
  try {
    const parsed = new URL(item.url);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();

    // Trusted component shop boost
    if (TRUSTED_COMPONENT_DOMAINS.some((d) => host.includes(d))) {
      score += 50;
    }

    // Explicit product path indicator
    if (
      path.includes('/products/') ||
      path.includes('/product/') ||
      path.includes('/san-pham/') ||
      path.includes('-i.') ||
      path.includes('.html')
    ) {
      score += 20;
    }

    // Price present in content/title
    const text = `${item.content} ${item.title}`;
    if (extractPriceFromText(text) > 0) {
      score += 20;
    }

    // Keywords match
    const lowerText = text.toLowerCase();
    for (const kw of keywords) {
      if (lowerText.includes(kw)) {
        score += 10;
      }
    }
  } catch {
    // ignore
  }
  return score;
}

export const OPTIMIZER_SYSTEM_PROMPT = `Bạn là một chuyên gia mua sắm linh kiện điện tử và robotics tại Việt Nam.
Nhiệm vụ của bạn là phân tích các kết quả tìm kiếm web cho một linh kiện trong BOM và chọn liên kết mua hàng cụ thể, tối ưu nhất.

QUY TẮC BẮT BUỘC:
1. "selectedUrl" BẮT BUỘC phải là một URL chi tiết đến trang sản phẩm cụ thể (có đường dẫn sản phẩm, mã sản phẩm hoặc slug).
2. TUYỆT ĐỐI KHÔNG chọn hoặc tạo URL trang chủ website chung chung (ví dụ: KHÔNG được dùng "https://shopee.vn", "https://thegioiic.com", "https://hshop.vn").
3. TUYỆT ĐỐI BỎ QUA các liên kết là báo chí (vnexpress, dantri, tuoitre, nongnghiep...), bài viết blog kỹ thuật, mạng xã hội (youtube, facebook...) không phải trang bán linh kiện.
4. "selectedUrl" BẮT BUỘC PHẢI nằm trong danh sách URL từ kết quả tìm kiếm được cung cấp. KHÔNG ĐƯỢC tự bịa URL.
5. Nếu trong kết quả tìm kiếm KHÔNG CÓ sản phẩm nào phù hợp hoặc chỉ toàn link báo chí/trang chủ, hãy trả về "selectedUrl": "" và "estimatedPrice": 0.
6. Bóc tách đơn giá thực tế từ nội dung/tiêu đề (quy đổi về số nguyên VND).

Chỉ trả về JSON thuần túy (không kèm giải thích) theo định dạng:
{
  "selectedUrl": "URL liên kết sản phẩm cụ thể",
  "estimatedPrice": 85000,
  "currency": "VND",
  "reason": "Lý do lựa chọn",
  "alternatives": [
    {
      "title": "Tiêu đề",
      "url": "URL sản phẩm cụ thể",
      "price": 85000,
      "reason": "Lý do thay thế"
    }
  ]
}`;

export function extractPriceFromText(text: string): number {
  if (!text) return 0;

  // Match shorthand like 50k, 120k
  const kMatch = text.match(/\b([0-9]{1,4})\s*k\b/i);
  if (kMatch) {
    return parseInt(kMatch[1], 10) * 1000;
  }

  // Match formatted currency like 85.000đ, 120,000 VND, 1.500.000 vnđ, 25.000₫
  const currencyMatch = text.match(/([0-9]{1,3}(?:[.,][0-9]{3})+)\s*(?:đ|vnd|vnđ|₫)/i);
  if (currencyMatch) {
    const clean = currencyMatch[1].replace(/[.,]/g, '');
    const num = parseInt(clean, 10);
    return isNaN(num) ? 0 : num;
  }

  // Match "giá: 85.000" or "price: 85000"
  const pricePrefixMatch = text.match(/(?:giá|price)[:\s]*([0-9]{1,3}(?:[.,][0-9]{3})+|[0-9]{4,9})/i);
  if (pricePrefixMatch) {
    const clean = pricePrefixMatch[1].replace(/[.,]/g, '');
    const num = parseInt(clean, 10);
    return isNaN(num) ? 0 : num;
  }

  // Match standalone number with đ/vnd/₫ e.g. 85000đ
  const plainCurrencyMatch = text.match(/([0-9]{4,9})\s*(?:đ|vnd|vnđ|₫)/i);
  if (plainCurrencyMatch) {
    const num = parseInt(plainCurrencyMatch[1], 10);
    return isNaN(num) ? 0 : num;
  }

  return 0;
}

function fallbackHeuristic(item: BomItem, searchResults: BomSearchResult[]): BomItem {
  const ranked = filterAndRankSearchResults(searchResults, item.name);
  if (ranked.length === 0) {
    return {
      ...item,
      unitPrice: 0,
      totalPrice: 0,
      status: 'not_found',
      selectedLink: '',
      alternatives: [],
    };
  }

  const first = ranked[0];
  const unitPrice = extractPriceFromText(`${first.content} ${first.title}`);
  const quantity = item.quantity > 0 ? item.quantity : 1;

  const alternatives: BomItemAlternative[] = ranked.slice(1).map((r) => ({
    title: r.title,
    url: r.url,
    price: extractPriceFromText(`${r.content} ${r.title}`),
    reason: 'Kết quả tìm kiếm thay thế',
  }));

  return {
    ...item,
    unitPrice,
    totalPrice: unitPrice * quantity,
    status: 'found',
    selectedLink: first.url,
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
      unitPrice: 0,
      totalPrice: 0,
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
- Số lượng: ${item.quantity}

Danh sách kết quả tìm kiếm sản phẩm:
${rankedResults
  .map(
    (r, i) =>
      `[${i + 1}] Tiêu đề: ${r.title}\nURL: ${r.url}\nNội dung: ${r.content}`
  )
  .join('\n\n')}`;

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
      console.warn(`LLM API returned HTTP ${res.status}: ${res.statusText}`);
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
      isSpecificProductUrl(proposed) &&
      !isBlacklistedDomain(proposed) &&
      rankedResults.some((r) => r.url === proposed)
    ) {
      selectedUrl = proposed;
    } else {
      // Pick top-ranked valid product URL
      selectedUrl = rankedResults[0].url;
    }

    let unitPrice = 0;
    if (typeof parsed?.estimatedPrice === 'number' && !isNaN(parsed.estimatedPrice) && parsed.estimatedPrice > 0) {
      unitPrice = parsed.estimatedPrice;
    } else {
      const selectedItem = rankedResults.find((r) => r.url === selectedUrl) || rankedResults[0];
      unitPrice = extractPriceFromText(`${selectedItem.content} ${selectedItem.title}`);
    }

    const quantity = item.quantity > 0 ? item.quantity : 1;
    const totalPrice = unitPrice * quantity;

    let alternatives: BomItemAlternative[] = [];
    if (Array.isArray(parsed?.alternatives)) {
      alternatives = parsed.alternatives
        .filter(
          (alt: any) =>
            alt &&
            typeof alt.url === 'string' &&
            isSpecificProductUrl(alt.url) &&
            !isBlacklistedDomain(alt.url)
        )
        .map((alt: any) => ({
          title: typeof alt.title === 'string' ? alt.title : '',
          url: alt.url,
          price: typeof alt.price === 'number' ? alt.price : undefined,
          reason: typeof alt.reason === 'string' ? alt.reason : undefined,
        }));
    }

    if (alternatives.length === 0) {
      alternatives = rankedResults
        .filter((r) => r.url !== selectedUrl)
        .map((r) => ({
          title: r.title,
          url: r.url,
          price: extractPriceFromText(`${r.content} ${r.title}`),
        }));
    }

    const reason = typeof parsed?.reason === 'string' ? parsed.reason.trim() : '';
    const note = reason
      ? item.note
        ? `${item.note} | ${reason}`
        : reason
      : item.note;

    return {
      ...item,
      unitPrice,
      totalPrice,
      currency: typeof parsed?.currency === 'string' ? parsed.currency : item.currency || 'VND',
      status: 'found',
      selectedLink: selectedUrl,
      alternatives,
      note,
    };
  } catch (err) {
    console.warn('optimizeBomItemWithSearchResults LLM error:', err);
    return fallbackHeuristic(item, rankedResults);
  }
}

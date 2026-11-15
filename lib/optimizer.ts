import { getAppSettings } from './config';
import { cleanJsonFromLlmOutput } from './llm';
import { BomItem, BomItemAlternative, BomSearchResult } from './types';

const OPTIMIZER_TIMEOUT_MS = 30000;

export const OPTIMIZER_SYSTEM_PROMPT = `Bạn là một chuyên gia mua sắm linh kiện điện tử và robotics tại Việt Nam.
Nhiệm vụ của bạn là phân tích các kết quả tìm kiếm web cho một linh kiện trong BOM và chọn liên kết mua hàng tối ưu nhất.

Tiêu chí:
1. Khớp chính xác sản phẩm và quy cách (không chọn phụ kiện ngoài, đồ chơi, hoặc sản phẩm khác).
2. Ưu tiên các shop uy tín tại Việt Nam (Hshop, Thế Giới IC, Điện Tử Tuhu, Shopee Mall, LCSC...) có thông tin giá rõ ràng.
3. Bóc tách đơn giá thực tế từ nội dung/tiêu đề (quy đổi về số nguyên VND).
4. Liệt kê các kết quả hợp lệ còn lại vào danh sách alternatives.

Chỉ trả về JSON thuần túy (không kèm giải thích) theo định dạng:
{
  "selectedUrl": "URL liên kết tối ưu nhất",
  "estimatedPrice": 85000,
  "currency": "VND",
  "reason": "Lý do lựa chọn",
  "alternatives": [
    {
      "title": "Tiêu đề",
      "url": "URL",
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
  const first = searchResults[0];
  const unitPrice = extractPriceFromText(`${first.content} ${first.title}`);
  const quantity = item.quantity > 0 ? item.quantity : 1;

  const alternatives: BomItemAlternative[] = searchResults.slice(1).map((r) => ({
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
  if (!searchResults || searchResults.length === 0) {
    return {
      ...item,
      status: 'not_found',
      selectedLink: '',
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

Danh sách kết quả tìm kiếm:
${searchResults
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
      return fallbackHeuristic(item, searchResults);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      return fallbackHeuristic(item, searchResults);
    }

    const cleaned = cleanJsonFromLlmOutput(content);
    const parsed = JSON.parse(cleaned);

    const selectedUrl =
      typeof parsed?.selectedUrl === 'string' && parsed.selectedUrl.trim()
        ? parsed.selectedUrl.trim()
        : searchResults[0].url;

    let unitPrice = 0;
    if (typeof parsed?.estimatedPrice === 'number' && !isNaN(parsed.estimatedPrice)) {
      unitPrice = parsed.estimatedPrice;
    } else {
      unitPrice = extractPriceFromText(`${searchResults[0].content} ${searchResults[0].title}`);
    }

    const quantity = item.quantity > 0 ? item.quantity : 1;
    const totalPrice = unitPrice * quantity;

    let alternatives: BomItemAlternative[] = [];
    if (Array.isArray(parsed?.alternatives)) {
      alternatives = parsed.alternatives
        .filter((alt: any) => alt && typeof alt.url === 'string')
        .map((alt: any) => ({
          title: typeof alt.title === 'string' ? alt.title : '',
          url: alt.url,
          price: typeof alt.price === 'number' ? alt.price : undefined,
          reason: typeof alt.reason === 'string' ? alt.reason : undefined,
        }));
    } else {
      alternatives = searchResults
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
    return fallbackHeuristic(item, searchResults);
  }
}

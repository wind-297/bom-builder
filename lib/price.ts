export type PriceStatus =
  | 'verified'
  | 'estimated'
  | 'range'
  | 'unavailable'
  | 'conflicting';

export interface ProductPrice {
  amount: number | null;
  minAmount?: number | null;
  maxAmount?: number | null;
  currency: string | null;
  status: PriceStatus;
  originalText?: string;
  priceType?: 'unit' | 'bundle' | 'sale' | 'unknown';
  quantityPerPackage?: number | null;
  sourceUrl?: string;
  sourceName?: string;
  confidence?: number;
}

// Technical spec regex to prevent false positive numbers (e.g. 12V, 100W, 2A, 65mm)
const SPEC_SUFFIX_REGEX = /^\s*(v|volt|volts|w|watt|watts|a|amp|ampe|ma|milliamp|mah|mm|cm|m|rpm|mhz|ghz|khz|ohm|kohm|uf|nf|pf|pin|pins|bit|bits|g|kg)\b/i;

function cleanNumberStr(str: string): number {
  if (!str) return 0;
  // Handle formats like 150.000 or 150,000 or 1.500.000
  const clean = str.replace(/[.,\s]/g, '');
  const num = parseInt(clean, 10);
  return isNaN(num) ? 0 : num;
}

export function extractPriceFromSnippet(text: string): ProductPrice | null {
  if (!text || typeof text !== 'string') return null;

  const trimmed = text.trim();
  if (!trimmed) return null;

  // Check bundle/package indicators: "Gói 10 cái", "Hộp 50 chiếc", "Set 5 món", "Combo 2"
  let priceType: 'unit' | 'bundle' | 'unknown' = 'unit';
  let quantityPerPackage: number | null = null;
  const bundleMatch = trimmed.match(/\b(gói|hộp|set|combo|bộ|túi)\s*([0-9]{1,4})\s*(cái|chiếc|món|sp|con|bộ)?\b/i);
  if (bundleMatch) {
    priceType = 'bundle';
    quantityPerPackage = parseInt(bundleMatch[2], 10);
  }

  // 1. Range format with 'k' (e.g. "150k - 200k", "150k ~ 180k")
  const kRangeMatch = trimmed.match(/\b([0-9]{1,4})\s*k\s*(?:-|–|~|đến|to)\s*([0-9]{1,4})\s*k\b/i);
  if (kRangeMatch) {
    const min = parseInt(kRangeMatch[1], 10) * 1000;
    const max = parseInt(kRangeMatch[2], 10) * 1000;
    return {
      amount: min,
      minAmount: min,
      maxAmount: max,
      currency: 'VND',
      status: 'range',
      priceType,
      quantityPerPackage,
      originalText: kRangeMatch[0],
      confidence: 0.85,
    };
  }

  // 2. Standard Range: "150.000 – 180.000 đồng" or "150,000 - 200,000 VND"
  const standardRangeMatch = trimmed.match(
    /([0-9]{1,3}(?:[.,][0-9]{3})+)\s*(?:-|–|~|đến)\s*([0-9]{1,3}(?:[.,][0-9]{3})+)\s*(?:đ|vnd|vnđ|₫|đồng)/i
  );
  if (standardRangeMatch) {
    const min = cleanNumberStr(standardRangeMatch[1]);
    const max = cleanNumberStr(standardRangeMatch[2]);
    return {
      amount: min,
      minAmount: min,
      maxAmount: max,
      currency: 'VND',
      status: 'range',
      priceType,
      quantityPerPackage,
      originalText: standardRangeMatch[0],
      confidence: 0.9,
    };
  }

  // 3. Shorthand "150k" (ensure not followed by "ohm", "hz", etc.)
  const kMatch = trimmed.match(/\b([0-9]{1,4})\s*k(?:\s*(?:đ|vnd|vnđ|₫|đồng))?\b/i);
  if (kMatch) {
    const afterK = trimmed.slice((kMatch.index ?? 0) + kMatch[0].length);
    if (!SPEC_SUFFIX_REGEX.test(afterK)) {
      const amount = parseInt(kMatch[1], 10) * 1000;
      return {
        amount,
        currency: 'VND',
        status: 'estimated',
        priceType,
        quantityPerPackage,
        originalText: kMatch[0],
        confidence: 0.8,
      };
    }
  }

  // 4. Formatted currency with symbols: "150.000đ", "150,000 VND", "₫150.000", "150.000 đồng"
  const currencyMatch = trimmed.match(
    /(?:₫\s*([0-9]{1,3}(?:[.,][0-9]{3})+)|([0-9]{1,3}(?:[.,][0-9]{3})+)\s*(?:đ|vnd|vnđ|₫|đồng))/i
  );
  if (currencyMatch) {
    const rawVal = currencyMatch[1] || currencyMatch[2];
    const amount = cleanNumberStr(rawVal);
    if (amount > 0) {
      return {
        amount,
        currency: 'VND',
        status: 'estimated',
        priceType,
        quantityPerPackage,
        originalText: currencyMatch[0],
        confidence: 0.9,
      };
    }
  }

  // 5. Explicit price prefix: "giá: 150.000", "giá bán: 85000", "price: 85.000"
  const prefixMatch = trimmed.match(
    /(?:giá\s*bán|giá|đơn\s*giá|price)[:\s]*([0-9]{1,3}(?:[.,][0-9]{3})+|[0-9]{4,9})\s*(?:đ|vnd|vnđ|₫|đồng)?/i
  );
  if (prefixMatch) {
    const rawVal = prefixMatch[1];
    const amount = cleanNumberStr(rawVal);
    if (amount > 0) {
      return {
        amount,
        currency: 'VND',
        status: 'estimated',
        priceType,
        quantityPerPackage,
        originalText: prefixMatch[0],
        confidence: 0.85,
      };
    }
  }

  // 6. Standalone 4-9 digit number with currency sign (e.g. 85000đ, 120000 vnđ)
  const plainMatch = trimmed.match(/([0-9]{4,9})\s*(?:đ|vnd|vnđ|₫|đồng)\b/i);
  if (plainMatch) {
    const amount = parseInt(plainMatch[1], 10);
    if (!isNaN(amount) && amount > 0) {
      return {
        amount,
        currency: 'VND',
        status: 'estimated',
        priceType,
        quantityPerPackage,
        originalText: plainMatch[0],
        confidence: 0.8,
      };
    }
  }

  return null;
}

export function extractPriceFromHtml(
  html: string,
  sourceUrl?: string,
  targetName?: string
): ProductPrice | null {
  if (!html || typeof html !== 'string') return null;

  // Method B1: JSON-LD Structured Data
  const jsonLdRegex = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const jsonContent = match[1].trim();
      const parsed = JSON.parse(jsonContent);

      const items = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.['@graph'])
        ? parsed['@graph']
        : [parsed];

      for (const item of items) {
        if (!item || typeof item !== 'object') continue;
        const type = item['@type'];
        const isProduct = type === 'Product' || (Array.isArray(type) && type.includes('Product'));

        if (isProduct || item.offers) {
          // Check name relevance if targetName provided
          if (targetName && item.name && typeof item.name === 'string') {
            const lowerTarget = targetName.toLowerCase();
            const lowerItem = item.name.toLowerCase();
            const targetWords = lowerTarget.split(/\s+/).filter((w) => w.length > 2);
            const matchesAny = targetWords.some((w) => lowerItem.includes(w));
            if (!matchesAny && targetWords.length > 0) {
              // Unrelated product in same page schema
              continue;
            }
          }

          const offers = Array.isArray(item.offers) ? item.offers[0] : item.offers;
          if (offers) {
            let priceNum: number | null = null;
            if (typeof offers.price === 'number') {
              priceNum = offers.price;
            } else if (typeof offers.price === 'string') {
              priceNum = cleanNumberStr(offers.price);
            } else if (offers.lowPrice) {
              priceNum = cleanNumberStr(String(offers.lowPrice));
            }

            if (priceNum && priceNum > 0) {
              const currency = offers.priceCurrency || 'VND';
              const minAmount = offers.lowPrice ? cleanNumberStr(String(offers.lowPrice)) : priceNum;
              const maxAmount = offers.highPrice ? cleanNumberStr(String(offers.highPrice)) : null;

              return {
                amount: priceNum,
                minAmount: minAmount !== priceNum ? minAmount : undefined,
                maxAmount: maxAmount || undefined,
                currency,
                status: 'verified',
                sourceUrl,
                confidence: 0.95,
              };
            }
          }
        }
      }
    } catch {
      // ignore invalid json-ld
    }
  }

  // Method B2: OpenGraph & Product Meta Tags
  const ogPriceMatch = html.match(
    /<meta\b[^>]*property=["'](?:product:price:amount|og:price:amount)["'][^>]*content=["']([0-9.,]+)["']/i
  );
  if (ogPriceMatch) {
    const amount = cleanNumberStr(ogPriceMatch[1]);
    if (amount > 0) {
      const curMatch = html.match(
        /<meta\b[^>]*property=["'](?:product:price:currency|og:price:currency)["'][^>]*content=["']([A-Z]{3})["']/i
      );
      return {
        amount,
        currency: curMatch ? curMatch[1] : 'VND',
        status: 'verified',
        sourceUrl,
        confidence: 0.9,
      };
    }
  }

  // Method B3: Microdata itemprop="price"
  const microdataMatch = html.match(
    /<[^>]*itemprop=["']price["'][^>]*content=["']([0-9.,]+)["']|<[^>]*itemprop=["']price["'][^>]*>([^<]+)<\//i
  );
  if (microdataMatch) {
    const rawVal = microdataMatch[1] || microdataMatch[2];
    const amount = cleanNumberStr(rawVal);
    if (amount > 0) {
      return {
        amount,
        currency: 'VND',
        status: 'verified',
        sourceUrl,
        confidence: 0.9,
      };
    }
  }

  // Method C: Common HTML price CSS patterns
  const classPriceMatch = html.match(
    /<(?:span|div|p|b|strong)\b[^>]*class=["'][^"']*\b(?:price|product-price|current-price|pro-price)\b[^"']*["'][^>]*>([\s\S]*?)<\/(?:span|div|p|b|strong)>/i
  );
  if (classPriceMatch) {
    const snippetResult = extractPriceFromSnippet(classPriceMatch[1].replace(/<[^>]+>/g, ''));
    if (snippetResult) {
      return {
        ...snippetResult,
        status: 'verified',
        sourceUrl,
        confidence: 0.85,
      };
    }
  }

  return null;
}

export async function fetchPriceFromProductUrl(
  url: string,
  targetName?: string,
  timeoutMs: number = 4000
): Promise<ProductPrice | null> {
  if (!url || typeof url !== 'string' || !url.startsWith('http')) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) return null;

    // Read first 64KB for header and initial markup
    const reader = res.body?.getReader();
    if (!reader) return null;

    let receivedText = '';
    const decoder = new TextDecoder('utf-8');
    const MAX_BYTES = 65536;
    let bytesRead = 0;

    while (bytesRead < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      bytesRead += value.length;
      receivedText += decoder.decode(value, { stream: true });
      if (receivedText.includes('</head>') && receivedText.includes('itemprop="price"')) {
        break;
      }
    }

    return extractPriceFromHtml(receivedText, url, targetName);
  } catch {
    return null;
  }
}

export function normalizePrice(price: Partial<ProductPrice> | null | undefined): ProductPrice {
  if (!price || (price.amount === null && !price.minAmount)) {
    return {
      amount: null,
      currency: 'VND',
      status: 'unavailable',
    };
  }

  const status = price.status || (price.amount ? 'estimated' : 'unavailable');
  return {
    amount: typeof price.amount === 'number' && price.amount > 0 ? Math.round(price.amount) : null,
    minAmount: typeof price.minAmount === 'number' ? Math.round(price.minAmount) : undefined,
    maxAmount: typeof price.maxAmount === 'number' ? Math.round(price.maxAmount) : undefined,
    currency: price.currency || 'VND',
    status,
    priceType: price.priceType || 'unit',
    quantityPerPackage: price.quantityPerPackage || null,
    originalText: price.originalText,
    sourceUrl: price.sourceUrl,
    confidence: price.confidence,
  };
}

export function formatPriceDisplay(
  price?: ProductPrice | null,
  fallbackAmount?: number
): string {
  if (!price && (fallbackAmount === undefined || fallbackAmount <= 0)) {
    return 'Chưa lấy được giá — Xem tại nhà cung cấp';
  }

  if (price?.status === 'unavailable' || (!price?.amount && !price?.minAmount && (!fallbackAmount || fallbackAmount <= 0))) {
    return 'Chưa lấy được giá — Xem tại nhà cung cấp';
  }

  if (price?.status === 'range' && price.minAmount && price.maxAmount) {
    const minStr = Math.round(price.minAmount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const maxStr = Math.round(price.maxAmount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${minStr} - ${maxStr} ₫`;
  }

  const amt = price?.amount ?? fallbackAmount ?? 0;
  if (amt <= 0) {
    return 'Chưa lấy được giá — Xem tại nhà cung cấp';
  }

  const formatted = Math.round(amt).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formatted} ₫`;
}

import { findSourceByUrl, isAllowedSourceUrl, normalizeHostname, SearchSource } from './sources';

export type LinkStatus = 'verified' | 'unverified' | 'dead' | 'invalid' | 'blocked';

export interface ProductLinkVerification {
  originalUrl: string;
  finalUrl?: string;
  sourceDomain: string;
  sourceName?: string;
  sourceCountry?: 'VN' | 'INT';
  productTitle?: string;
  linkStatus: LinkStatus;
  httpStatus?: number;
  lastCheckedAt?: string;
  verificationReason?: string;
  isSpecificProduct: boolean;
}

const MAX_REDIRECTS = 3;
const VALIDATION_TIMEOUT_MS = 4000;
const MAX_CONTENT_BYTES = 512 * 1024; // 512 KB

// SSRF prevention: IP addresses and hostnames that must be blocked
const SSRF_BLOCKED_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  'metadata.google.internal',
  '169.254.169.254',
]);

export const SOFT_404_PATTERNS = [
  /sản\s*phẩm\s*(?:này\s*)?(?:không\s*tồn\s*tại|đã\s*(?:bị\s*)?xóa|ngừng\s*kinh\s*doanh|hết\s*hàng)/i,
  /không\s*tìm\s*thấy\s*sản\s*phẩm/i,
  /không\s*tìm\s*thấy\s*trang/i,
  /trang\s*(?:bạn\s*tìm\s*kiếm\s*)?không\s*tồn\s*tại/i,
  /page\s*not\s*found/i,
  /item\s*(?:does\s*not\s*exist|not\s*found)/i,
  /product\s*(?:not\s*found|does\s*not\s*exist)/i,
  /error_item_not_found/i,
  /error_product_not_exist/i,
  /404\s*not\s*found/i,
  /oops!\s*trang/i,
  /rất\s*tiếc.*không\s*tìm\s*thấy/i,
];

export function unwrapRedirectUrl(urlStr: string): string {
  if (!urlStr || typeof urlStr !== 'string') return '';
  try {
    const parsed = new URL(urlStr);
    const redirectKeys = ['q', 'url', 'u', 'target', 'redir', 'dest', 'uddg'];
    for (const key of redirectKeys) {
      const val = parsed.searchParams.get(key);
      if (val) {
        let decoded = val;
        try {
          decoded = decodeURIComponent(val);
        } catch {
          // ignore malformed uri
        }
        if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
          return unwrapRedirectUrl(decoded);
        }
      }
    }
    return urlStr;
  } catch {
    return urlStr;
  }
}

export function normalizeProductUrl(urlStr: string): string {
  if (!urlStr || typeof urlStr !== 'string') return '';
  try {
    const unwrapped = unwrapRedirectUrl(urlStr);
    const parsed = new URL(unwrapped);
    const trackingParams = [
      'sp_atk',
      'xptdk',
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'fbclid',
      'gclid',
    ];
    for (const p of trackingParams) {
      parsed.searchParams.delete(p);
    }
    let clean = parsed.toString();
    if (parsed.pathname.length > 1 && clean.endsWith('/')) {
      clean = clean.slice(0, -1);
    }
    return clean;
  } catch {
    return urlStr;
  }
}

export function isPrivateOrBlockedIp(host: string): boolean {
  const clean = host.toLowerCase().trim();
  if (SSRF_BLOCKED_HOSTNAMES.has(clean)) return true;

  // IPv4 regex checks
  if (/^127\.\d+\.\d+\.\d+$/.test(clean)) return true;
  if (/^10\.\d+\.\d+\.\d+$/.test(clean)) return true;
  if (/^192\.168\.\d+\.\d+$/.test(clean)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(clean)) return true;
  if (/^169\.254\.\d+\.\d+$/.test(clean)) return true; // Link-local / metadata

  // IPv6 link local or loopback
  if (clean.startsWith('fe80:') || clean.startsWith('fc00:') || clean.startsWith('fd00:')) return true;

  return false;
}

export function isSpecificProductPath(urlStr: string): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  try {
    const unwrapped = unwrapRedirectUrl(urlStr);
    const parsed = new URL(unwrapped);
    const path = parsed.pathname.replace(/\/+$/, '');
    const host = parsed.hostname.toLowerCase();

    // Reject root domains or index files
    if (!path || path === '' || path === '/' || path === '/index.html' || path === '/index.php') {
      return false;
    }

    const lowerPath = path.toLowerCase();
    const segments = path.split('/').filter(Boolean);
    if (segments.length === 0) return false;

    // Reject search or category filter pages (both trailing slash and exact segment)
    const categoryOrSearchPatterns = [
      /^\/search(?:\/|$)/i,
      /^\/tim-kiem(?:\/|$)/i,
      /^\/category(?:\/|$)/i,
      /^\/categories(?:\/|$)/i,
      /^\/danh-muc(?:\/|$)/i,
      /^\/danh-muc-san-pham(?:\/|$)/i,
      /^\/collections(?:\/|$)/i,
      /^\/collection(?:\/|$)/i,
      /^\/danh-sach(?:\/|$)/i,
      /^\/tag(?:\/|$)/i,
      /^\/tags(?:\/|$)/i,
      /^\/product-category(?:\/|$)/i,
      /^\/find_similar(?:\/|$)/i,
      /^\/flash_sale(?:\/|$)/i,
      /^\/daily_discover(?:\/|$)/i,
      /^\/filter(?:\/|$)/i,
    ];

    if (categoryOrSearchPatterns.some((pattern) => pattern.test(lowerPath))) {
      return false;
    }

    if (
      lowerPath.includes('/search') ||
      lowerPath.includes('/tim-kiem') ||
      lowerPath.includes('/collections/') ||
      lowerPath.includes('/danh-muc/') ||
      lowerPath.includes('/product-category/') ||
      lowerPath.includes('/category/') ||
      parsed.searchParams.has('keyword') ||
      parsed.searchParams.has('q') ||
      parsed.searchParams.has('s')
    ) {
      return false;
    }

    // Reject generic informative, cart, or auth paths
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
      '/pages',
      '/page',
      '/huong-dan',
      '/chinh-sach',
      '/tra-cuu-don-hang',
    ];
    if (genericPaths.some((gp) => lowerPath === gp || lowerPath.startsWith(gp + '/'))) {
      return false;
    }

    // Shopee specific product pattern: MUST have product id and shop id
    if (host.includes('shopee.vn')) {
      const isShopeeProduct = /-i\.\d+\.\d+/i.test(path) || /\/product\/(?:\d+\/\d+|[a-zA-Z0-9_-]+\/\d+\/\d+)/i.test(path);
      const isNotSearchOrCategory = !lowerPath.includes('/search') && !lowerPath.includes('/list/') && !lowerPath.includes('/find_similar') && !lowerPath.includes('/m/');
      return isShopeeProduct && isNotSearchOrCategory;
    }

    // Banlinhkien specific pattern:
    // Category pages end in -c\d+\.html (e.g. cam-bien-c123.html) -> MUST REJECT!
    // Product pages: end in -p\d+\.html, -pc\d+\.html, or product slug -> ACCEPT
    if (host.includes('banlinhkien.com')) {
      if (/-c\d+\.html$/i.test(path) || lowerPath.startsWith('/danh-muc')) {
        return false;
      }
      return segments.length >= 1;
    }

    // Hshop specific pattern: Products always live under /products/ or have slug
    if (host.includes('hshop.vn')) {
      if (lowerPath.startsWith('/products/')) return true;
      if (lowerPath.startsWith('/collections') || lowerPath.startsWith('/pages') || lowerPath.startsWith('/blogs')) {
        return false;
      }
    }

    // NShop specific pattern: Products live under /product/ or /san-pham/
    if (host.includes('nshopvn.com')) {
      if (lowerPath.startsWith('/product/') || lowerPath.startsWith('/san-pham/')) return true;
      if (lowerPath.startsWith('/danh-muc') || lowerPath.startsWith('/product-category')) {
        return false;
      }
    }

    // Lazada specific product pattern: has -i\d+ and ends in .html
    if (host.includes('lazada.vn')) {
      return /-i\d+.*\.html$/i.test(path);
    }

    // Tiki specific product pattern: has -p\d+ or /p\d+ and ends in .html
    if (host.includes('tiki.vn')) {
      return /(?:-p|\/p)\d+.*\.html$/i.test(path);
    }

    // International suppliers specific product paths
    if (host.includes('digikey.com') || host.includes('digikey.vn')) {
      return lowerPath.includes('/products/detail/') || lowerPath.includes('/product-detail/');
    }
    if (host.includes('mouser.com')) {
      return lowerPath.includes('/productdetail/') || lowerPath.includes('/product/');
    }
    if (host.includes('lcsc.com')) {
      return lowerPath.includes('/product-detail/');
    }
    if (host.includes('pololu.com')) {
      return /^\/product\/\d+/i.test(path);
    }
    if (host.includes('dfrobot.com')) {
      return /\/product-\d+\.html$/i.test(path);
    }

    // General store: must have at least one significant slug
    return segments.length >= 1;
  } catch {
    return false;
  }
}

export function verifyProductIdentity(
  pageTitleOrContent: string,
  targetProductName: string,
  model?: string
): { isMatch: boolean; score: number } {
  if (!pageTitleOrContent || !targetProductName) {
    return { isMatch: false, score: 0 };
  }

  const text = pageTitleOrContent.toLowerCase();
  const targetLower = targetProductName.toLowerCase();

  // If specific model provided (e.g. ESP32, MG996R, HC-SR04, L298N, TB6612, N20)
  if (model) {
    const modelClean = model.toLowerCase().replace(/[^a-z0-9]/g, '');
    const textClean = text.replace(/[^a-z0-9]/g, '');
    if (textClean.includes(modelClean)) {
      return { isMatch: true, score: 95 };
    }
  }

  // Extract core keywords (words with len >= 2, skip common stop words)
  const stopWords = new Set(['con', 'cai', 'bo', 'mach', 'kit', 'module', 'linh', 'kien', 'cho', 'va', 'la', 'gia']);
  const words = targetLower
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z0-9_-]/g, ''))
    .filter((w) => w.length >= 2 && !stopWords.has(w));

  if (words.length === 0) {
    return { isMatch: true, score: 50 };
  }

  let matched = 0;
  for (const w of words) {
    if (text.includes(w)) {
      matched++;
    }
  }

  const ratio = matched / words.length;
  return {
    isMatch: ratio >= 0.5,
    score: Math.round(ratio * 100),
  };
}

export async function validateProductLink(
  urlStr: string,
  expectedProductName: string = '',
  expectedModel?: string
): Promise<ProductLinkVerification> {
  const result: ProductLinkVerification = {
    originalUrl: urlStr,
    sourceDomain: '',
    linkStatus: 'invalid',
    isSpecificProduct: false,
    lastCheckedAt: new Date().toISOString(),
  };

  if (!urlStr || typeof urlStr !== 'string') {
    result.verificationReason = 'Đường dẫn rỗng hoặc không hợp lệ';
    return result;
  }

  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    result.verificationReason = 'Cấu trúc URL sai định dạng';
    return result;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    result.verificationReason = 'Chỉ hỗ trợ giao thức HTTP/HTTPS';
    return result;
  }

  result.sourceDomain = normalizeHostname(parsed.hostname);

  // SSRF protection
  if (isPrivateOrBlockedIp(parsed.hostname)) {
    result.verificationReason = 'Bị chặn bởi cơ chế bảo mật SSRF (Private/Local IP)';
    result.linkStatus = 'invalid';
    return result;
  }

  // Allowlist verification
  const source = findSourceByUrl(urlStr);
  if (!source) {
    result.verificationReason = `Domain ${parsed.hostname} không thuộc danh sách nhà cung cấp được phê duyệt`;
    result.linkStatus = 'invalid';
    return result;
  }

  result.sourceName = source.name;
  result.sourceCountry = source.country;

  // Specific product path check
  const isSpecific = isSpecificProductPath(urlStr);
  result.isSpecificProduct = isSpecific;
  if (!isSpecific) {
    result.verificationReason = 'Đường dẫn là trang chủ hoặc trang danh mục/tìm kiếm, không phải sản phẩm cụ thể';
    result.linkStatus = 'invalid';
    return result;
  }

  // HTTP Validation with Redirect Loop protection
  let currentUrl = urlStr;
  let redirectsCount = 0;
  let res: Response | null = null;

  try {
    while (redirectsCount <= MAX_REDIRECTS) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), VALIDATION_TIMEOUT_MS);

      try {
        res = await fetch(currentUrl, {
          method: 'GET',
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'vi,en-US;q=0.9,en;q=0.8',
          },
          redirect: 'manual',
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      result.httpStatus = res.status;

      // Check Redirects (301, 302, 303, 307, 308)
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location');
        if (!location) {
          result.linkStatus = 'unverified';
          result.verificationReason = 'Chuyển hướng không có địa chỉ Location';
          return result;
        }

        const nextUrl = new URL(location, currentUrl).toString();
        const nextSource = findSourceByUrl(nextUrl);
        if (!nextSource) {
          result.linkStatus = 'invalid';
          result.verificationReason = `Chuyển hướng đến domain không được phép: ${nextUrl}`;
          return result;
        }

        const nextParsed = new URL(nextUrl);
        if (isPrivateOrBlockedIp(nextParsed.hostname)) {
          result.linkStatus = 'invalid';
          result.verificationReason = 'Chuyển hướng đến địa chỉ IP nội bộ';
          return result;
        }

        // If redirect target is no longer a specific product page (e.g. redirected to homepage, search or 404 page)
        if (!isSpecificProductPath(nextUrl)) {
          result.linkStatus = 'dead';
          result.verificationReason = `Trang sản phẩm đã chuyển hướng về trang không phải sản phẩm cụ thể: ${nextUrl}`;
          return result;
        }

        currentUrl = nextUrl;
        redirectsCount++;
        continue;
      }

      break;
    }

    result.finalUrl = currentUrl;

    if (!res) {
      result.linkStatus = 'unverified';
      result.verificationReason = 'Không nhận được phản hồi từ máy chủ';
      return result;
    }

    // 404 / 410 -> Dead
    if (res.status === 404 || res.status === 410) {
      result.linkStatus = 'dead';
      result.verificationReason = `Trang sản phẩm không tồn tại (HTTP ${res.status})`;
      return result;
    }

    // 403 / 429 -> Blocked (Anti-bot / Cloudflare / Rate limit)
    if (res.status === 403 || res.status === 429) {
      result.linkStatus = 'blocked';
      result.verificationReason = `Website kích hoạt tường lửa chống bot (HTTP ${res.status})`;
      return result;
    }

    // Server errors (500, 502, 503, 504) -> Unverified
    if (res.status >= 500) {
      result.linkStatus = 'unverified';
      result.verificationReason = `Máy chủ nhà cung cấp trả về lỗi ${res.status}`;
      return result;
    }

    // HTTP 200 OK
    if (res.status === 200) {
      // Read bounded chunk of HTML
      const reader = res.body?.getReader();
      let html = '';
      if (reader) {
        const chunks: Uint8Array[] = [];
        let totalLen = 0;
        while (totalLen < MAX_CONTENT_BYTES) {
          const { done, value } = await reader.read();
          if (done || !value) break;
          chunks.push(value);
          totalLen += value.length;
        }
        const decoder = new TextDecoder('utf-8');
        html = decoder.decode(Buffer.concat(chunks));
      } else {
        html = await res.text();
      }

      // Extract Title & Meta
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : '';
      const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
      const metaTitle = ogTitleMatch ? ogTitleMatch[1].replace(/\s+/g, ' ').trim() : '';
      result.productTitle = metaTitle || title || '';

      // Soft-404 Detection (Page returns HTTP 200 but content states item does not exist or was deleted)
      const isSoft404 = SOFT_404_PATTERNS.some(
        (pattern) => pattern.test(title) || pattern.test(metaTitle) || pattern.test(html)
      );
      if (isSoft404) {
        result.linkStatus = 'dead';
        result.verificationReason = 'Trang thông báo sản phẩm không tồn tại hoặc đã bị xóa (Soft 404)';
        return result;
      }

      // Detect unhydrated/empty Shopee SPA shell (returns 200 for any random URL with generic portal title)
      if (
        parsed.hostname.includes('shopee.vn') &&
        (title.toLowerCase().includes('mua và bán trên ứng dụng di động') ||
          title.toLowerCase() === 'shopee việt nam' ||
          title === '')
      ) {
        result.linkStatus = 'unverified';
        result.verificationReason = 'Trang Shopee SPA tải giao diện động, chưa thể xác minh chi tiết sản phẩm qua HTML tĩnh';
        return result;
      }

      // Identity Verification if expected product provided
      // Note: Include urlStr because SPAs like Shopee put product slug and model directly in the URL!
      if (expectedProductName) {
        const textToCheck = `${result.productTitle} ${urlStr} ${html.slice(0, 5000)}`;
        const check = verifyProductIdentity(textToCheck, expectedProductName, expectedModel);
        if (!check.isMatch) {
          result.linkStatus = 'unverified';
          result.verificationReason = `Tiêu đề trang hoặc URL không khớp với linh kiện đang tìm`;
          return result;
        }
      }

      result.linkStatus = 'verified';
      result.verificationReason = 'Đường dẫn hợp lệ, truy cập thành công và đúng linh kiện';
      return result;
    }

    result.linkStatus = 'unverified';
    result.verificationReason = `Trạng thái HTTP không xác định: ${res.status}`;
    return result;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    // Timeout or network drop
    result.linkStatus = 'unverified';
    result.verificationReason = `Không thể truy cập trực tiếp website (${errorMsg})`;
    return result;
  }
}

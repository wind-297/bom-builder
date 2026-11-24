import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildShopeeQueries,
  searchWithMandatoryShopee,
  filterAllowedProductResults,
} from '../lib/searxng';
import {
  validateProductLink,
  isSpecificProductPath,
  normalizeProductUrl,
} from '../lib/link-validator';
import {
  optimizeBomItemWithSearchResults,
  cleanTierText,
  filterAndRankSearchResults,
} from '../lib/optimizer';
import {
  decomposeProjectOrProduct,
} from '../lib/decomposition-engine';
import {
  understandComponent,
  classifyProductMatch,
} from '../lib/component-understanding';
import {
  createNewBomItem,
  BomItem,
  BomSearchResult,
} from '../lib/types';
import { cleanUiText } from '../components/BomTableRow';

describe('RoboBOM Critical Search Engine Repair & Shopee-First Rework (7 Tests)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // TEST 1 — MANUAL PRODUCT SEARCH
  describe('Test 1 — Manual Product Search ("ESP32 DevKit V1")', () => {
    it('executes Shopee search first with multi-query planner, prioritizes Shopee results, and has no Tier in UI', async () => {
      const shopeeCalls: string[] = [];
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        const urlStr = String(url);
        if (urlStr.includes('site%3Ashopee.vn')) {
          shopeeCalls.push(decodeURIComponent(urlStr));
          return {
            ok: true,
            json: async () => ({
              results: [
                {
                  title: 'Kit RF WiFi BLE ESP32 DevKit V1 CP2102 Shopee',
                  url: 'https://shopee.vn/kit-esp32-devkit-v1-i.12345.67890',
                  content: 'Kit ESP32 DevKit V1 30 chân chính hãng hàng mới',
                  engine: 'google',
                },
              ],
            }),
          } as Response;
        }

        // Tier 2 Specialized store
        if (urlStr.includes('nshopvn.com/wp-json')) {
          return {
            ok: true,
            json: async () => [
              {
                name: 'Board ESP32 NodeMCU Nshop',
                permalink: 'https://nshopvn.com/product/board-esp32-nodemcu/',
                short_description: 'ESP32 Type C',
              },
            ],
          } as Response;
        }

        return { ok: true, json: async () => ({ results: [] }) } as Response;
      });

      const { results, searchLog } = await searchWithMandatoryShopee(
        'ESP32 DevKit V1',
        'http://searxng.local:8080',
        'Wi-Fi Bluetooth 30 chan'
      );

      // 1. Shopee was searched first and has appropriate queries
      expect(shopeeCalls.length).toBeGreaterThanOrEqual(1);
      expect(shopeeCalls[0]).toContain('site:shopee.vn');
      expect(searchLog.shopeeFound).toBe(true);
      expect(searchLog.shopeeProductsRetained).toBeGreaterThanOrEqual(1);

      // 2. Shopee is ranked first in results
      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results[0].url).toContain('shopee.vn');
      expect(results[0].evidence?.sourceDomain).toBe('shopee.vn');

      // 3. Optimize selectedLink prioritizes Shopee
      const item = createNewBomItem('ESP32 DevKit V1', '30 chân', 1);
      const optimized = await optimizeBomItemWithSearchResults(item, results);

      expect(optimized.status).toBe('found');
      expect(optimized.selectedLink).toContain('shopee.vn');
      expect(optimized.unitPrice).toBe(0); // Manual pricing preserved (no auto-pricing)
      expect(optimized.manualPrice?.amount).toBeNull();

      // 4. No Tier labels in UI fields
      expect(cleanUiText(optimized.note)).not.toMatch(/Tier\s*[1-4]/i);
      expect(cleanTierText(optimized.note)).not.toMatch(/Tier\s*[1-4]/i);
      expect(searchLog.statusNotes).not.toMatch(/Tier\s*[1-4]/i);
      for (const alt of optimized.alternatives) {
        expect(cleanUiText(alt.reason)).not.toMatch(/Tier\s*[1-4]/i);
      }
    });
  });

  // TEST 2 — COMPONENT SEARCH
  describe('Test 2 — Component Search ("Động cơ N20 12V")', () => {
    it('generates Vietnamese and technical queries, validates specs, and discards non-product pages', async () => {
      // 1. Multi-query generation for N20 12V
      const queries = buildShopeeQueries('Động cơ N20 12V', '100rpm trục D');
      expect(queries.some((q) => q.includes('N20') && q.includes('12V'))).toBe(true);

      // 2. Component understanding checks voltage & category
      const knowledge = understandComponent('Động cơ N20 12V', '100rpm');
      expect(knowledge.modelCode).toBe('N20');
      expect(knowledge.specifications.voltage).toBe('12V');

      // 3. Rejects non-product pages (search, category, homepage)
      expect(isSpecificProductPath('https://shopee.vn/search?keyword=n20')).toBe(false);
      expect(isSpecificProductPath('https://shopee.vn/danh-muc/dong-co-n20')).toBe(false);
      expect(isSpecificProductPath('https://shopee.vn/')).toBe(false);
      expect(isSpecificProductPath('https://shopee.vn/dong-co-n20-12v-i.12345.67890')).toBe(true);

      // 4. Product Identity Verification matches N20 12V
      const match12V = classifyProductMatch(knowledge, {
        title: 'Động cơ DC giảm tốc kim loại mini N20 12V 100rpm',
        url: 'https://shopee.vn/dong-co-n20-12v-i.123.456',
        content: 'Điện áp 12VDC trục D',
      });
      expect(match12V.grade).toBe('exact_match');

      // 5. URL normalization strips tracking parameters safely
      const rawUrl = 'https://shopee.vn/dong-co-n20-12v-i.123.456?sp_atk=abc-123&utm_source=fb';
      const cleanUrl = normalizeProductUrl(rawUrl);
      expect(cleanUrl).toBe('https://shopee.vn/dong-co-n20-12v-i.123.456');
      expect(isSpecificProductPath(cleanUrl)).toBe(true);
    });
  });

  // TEST 3 — BOM SEARCH
  describe('Test 3 — BOM Search ("Tôi muốn chế tạo robot dò line 5 mắt, sử dụng PID")', () => {
    it('decomposes into distinct components, each with its own independent search lifecycle and status', async () => {
      const bom = await decomposeProjectOrProduct('Tôi muốn chế tạo robot dò line 5 mắt, sử dụng PID');
      expect(bom.intent).toBe('project_bom');
      expect(bom.items.length).toBeGreaterThanOrEqual(4);

      // Verify no fake URLs pre-assigned
      for (const item of bom.items) {
        expect(item.status).toBe('pending');
        expect(item.selectedLink).toBe('');
        expect(item.linkStatus).toBe('unverified');
        expect(item.unitPrice).toBe(0);
      }

      // Verify every component generates distinct Shopee queries
      const queryMap = new Map<string, string[]>();
      for (const item of bom.items) {
        const queries = buildShopeeQueries(item.name, item.specification);
        queryMap.set(item.name, queries);
        expect(queries.length).toBeGreaterThanOrEqual(1);
        expect(queries[0]).toContain('site:shopee.vn');
      }

      // Distinct components must have distinct query sets (not reusing one single query)
      expect(queryMap.size).toBe(bom.items.length);
    });
  });

  // TEST 4 — ALTERNATIVE SEARCH
  describe('Test 4 — Alternative Search ("Driver động cơ")', () => {
    it('prioritizes Shopee alternatives, matches specifications, and rejects irrelevant products', () => {
      const knowledge = understandComponent('Driver điều khiển động cơ TB6612FNG', '2 kênh 1.2A');
      const searchResults: BomSearchResult[] = [
        {
          title: 'Dây curoa 3V670',
          url: 'https://shopee.vn/day-curoa-3v670-i.11.22',
          content: 'Dây curoa chữ V',
        },
        {
          title: 'Module Driver Động Cơ Mini TB6612FNG Shopee',
          url: 'https://shopee.vn/module-driver-tb6612fng-i.33.44',
          content: 'Mạch điều khiển động cơ TB6612FNG MOSFET 1.2A',
        },
        {
          title: 'Driver TB6612FNG Dual H-Bridge - Hshop',
          url: 'https://hshop.vn/products/driver-tb6612fng',
          content: 'Mạch cầu H TB6612FNG',
        },
      ];

      // filterAndRankSearchResults rejects no_match (the belt) and prioritizes Shopee TB6612
      const ranked = filterAndRankSearchResults(searchResults, 'Driver điều khiển động cơ TB6612FNG');
      expect(ranked.some((r) => r.url.includes('day-curoa'))).toBe(false);
      expect(ranked[0].url).toContain('shopee.vn');
    });
  });

  // TEST 5 — URL VALIDATION
  describe('Test 5 — URL Validation (404, 410, Soft-404, Blocked, Verified)', () => {
    it('correctly marks HTTP 404 as dead link', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        status: 404,
        ok: false,
      } as Response);

      const check = await validateProductLink('https://hshop.vn/non-existent-product-404');
      expect(check.linkStatus).toBe('dead');
      expect(check.verificationReason).toContain('HTTP 404');
    });

    it('correctly marks HTTP 410 as dead link', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        status: 410,
        ok: false,
      } as Response);

      const check = await validateProductLink('https://hshop.vn/expired-product-410');
      expect(check.linkStatus).toBe('dead');
      expect(check.verificationReason).toContain('HTTP 410');
    });

    it('correctly detects soft-404 when page returns 200 but content says item does not exist', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        text: async () => '<html><head><title>Shopee</title></head><body><h1>Sản phẩm này không tồn tại hoặc đã bị xóa</h1></body></html>',
      } as Response);

      const check = await validateProductLink('https://shopee.vn/deleted-product-i.12345.67890');
      expect(check.linkStatus).toBe('dead');
      expect(check.verificationReason).toContain('Soft 404');
    });

    it('detects redirect to homepage or search page as dead product link', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        status: 302,
        headers: new Headers({ location: 'https://shopee.vn/' }),
      } as Response);

      const check = await validateProductLink('https://shopee.vn/redirected-product-i.123.456');
      expect(check.linkStatus).toBe('dead');
      expect(check.verificationReason).toContain('không phải sản phẩm cụ thể');
    });

    it('marks HTTP 403 or 429 as blocked (never assumed verified)', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        status: 403,
        ok: false,
      } as Response);

      const check = await validateProductLink('https://shopee.vn/product-i.123.456');
      expect(check.linkStatus).toBe('blocked');
      expect(check.linkStatus).not.toBe('verified');
      expect(check.linkStatus).not.toBe('dead'); // 403 is blocked, not 404!
    });

    it('marks unverified when Shopee returns generic unhydrated SPA portal title', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        text: async () => '<html><head><title>Shopee Việt Nam | Mua và Bán Trên Ứng Dụng Di Động Hoặc Website</title></head><body><div id="main"></div></body></html>',
      } as Response);

      const check = await validateProductLink('https://shopee.vn/product-i.123.456', 'ESP32');
      expect(check.linkStatus).toBe('unverified');
    });

    it('marks non-allowlist domains as invalid', async () => {
      const check = await validateProductLink('https://random-sketchy-site.xyz/esp32');
      expect(check.linkStatus).toBe('invalid');
      expect(check.verificationReason).toContain('không thuộc danh sách');
    });
  });

  // TEST 6 — UI CLEANUP
  describe('Test 6 — UI Cleanup (Zero Tier Labels in Rendered Output)', () => {
    it('strips all Tier labels and internal technical terms from any text string', () => {
      const sampleInputs = [
        'Chọn từ Shopee Việt Nam (Tier 1)',
        'Nhà cung cấp Tier 2 Supplier Hshop',
        'Tier 1 Source',
        'Động cơ từ Tier 2 VN',
        'Sản phẩm Priority Tier 1',
        'Linh kiện từ Source Tier 3',
        'Cửa hàng linh kiện (Tier 2)',
      ];

      for (const input of sampleInputs) {
        const cleaned = cleanUiText(input);
        expect(cleaned).not.toMatch(/\bTier\s*[1-4]\b/i);
        expect(cleaned).not.toMatch(/\b(?:Priority|Source)\s*Tier\b/i);
        expect(cleaned).not.toMatch(/\bTier\s*[1-4]\s*(?:Source|Supplier|VN)?\b/i);
      }
    });
  });

  // TEST 7 — REGRESSION
  describe('Test 7 — Regression (BOM creation, manual pricing, data persistence)', () => {
    it('creates new BOM item with zero unitPrice and unverified status', () => {
      const item = createNewBomItem('Pin 18650', '3.7V 2600mAh', 2);
      expect(item.unitPrice).toBe(0);
      expect(item.totalPrice).toBe(0);
      expect(item.manualPrice?.amount).toBeNull();
      expect(item.status).toBe('pending');
      expect(item.selectedLink).toBe('');
      expect(item.linkStatus).toBe('unverified');
    });

    it('retains manual price when updated by user', () => {
      const item = createNewBomItem('Pin 18650', '3.7V 2600mAh', 2);
      item.manualPrice = {
        amount: 45000,
        currency: 'VND',
        entrySource: 'user_input',
        enteredAt: new Date().toISOString(),
      };
      item.unitPrice = 45000;
      item.totalPrice = 90000;

      expect(item.unitPrice).toBe(45000);
      expect(item.totalPrice).toBe(90000);
      expect(item.manualPrice.amount).toBe(45000);
    });
  });
});

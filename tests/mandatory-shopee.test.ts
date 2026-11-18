import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildShopeeQueries,
  buildMultiQueryPlan,
  searchWithMandatoryShopee,
} from '../lib/searxng';
import {
  buildDiverseAlternatives,
  optimizeBomItemWithSearchResults,
} from '../lib/optimizer';
import { decomposeProjectOrProduct } from '../lib/decomposition-engine';
import { createNewBomItem, BomSearchResult } from '../lib/types';
import { POST as searchPost } from '../app/api/search/route';

describe('Mandatory Shopee Vietnam Search Policy', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Shopee Query Planner (buildShopeeQueries & buildMultiQueryPlan)', () => {
    it('generates mandatory site:shopee.vn queries for ESP32', () => {
      const queries = buildShopeeQueries('ESP32 DevKit V1', 'Wi-Fi Bluetooth 30 chân');
      expect(queries.length).toBeGreaterThanOrEqual(1);
      expect(queries.every((q) => q.startsWith('site:shopee.vn '))).toBe(true);
      expect(queries.some((q) => /ESP32/i.test(q))).toBe(true);
    });

    it('generates Vietnamese, specs, and English technical queries for N20 DC motor', () => {
      const queries = buildShopeeQueries('Động cơ giảm tốc N20 12V', '100rpm trục D');
      expect(queries.length).toBeGreaterThanOrEqual(2);
      expect(queries.every((q) => q.startsWith('site:shopee.vn '))).toBe(true);
      expect(queries.some((q) => /N20/i.test(q))).toBe(true);
      expect(queries.some((q) => /12V/i.test(q))).toBe(true);
    });

    it('includes mandatory shopeeQueries as Tier 1 alongside Tier 2 specialized stores in buildMultiQueryPlan', () => {
      const plan = buildMultiQueryPlan('Driver TB6612FNG', '1.2A dual channel');
      expect(plan.shopeeQueries.length).toBeGreaterThanOrEqual(1);
      expect(plan.shopeeQueries[0]).toContain('site:shopee.vn');
      expect(plan.tier1Queries[0]).toContain('site:shopee.vn');
      expect(plan.tier2Queries.some((q) => q.includes('site:hshop.vn'))).toBe(true);
      expect(plan.tier2Queries.some((q) => q.includes('site:lkcg.vn'))).toBe(true);
    });
  });

  describe('2. Mandatory Parallel Execution (NEVER skips Shopee even when Tier 1 succeeds)', () => {
    const componentsToVerify = [
      { name: 'ESP32 DevKit V1', spec: 'Wi-Fi Bluetooth' },
      { name: 'Động cơ giảm tốc N20 12V', spec: '100rpm' },
      { name: 'Cảm biến siêu âm HC-SR04', spec: '5V 2-400cm' },
      { name: 'Driver TB6612FNG', spec: '2 kênh động cơ' },
      { name: 'Khung xe robot 2 bánh mica', spec: 'kèm bánh xe' },
      { name: 'Cảm biến LiDAR YDLIDAR X4 Pro', spec: '360 độ 10m' },
    ];

    for (const comp of componentsToVerify) {
      it(`always executes Shopee SearXNG query for: ${comp.name}`, async () => {
        const calledUrls: string[] = [];

        global.fetch = vi.fn().mockImplementation(async (url: string) => {
          calledUrls.push(String(url));

          // Simulate Tier 1 store ALWAYS succeeding with rich product results
          if (String(url).includes('nshopvn.com/wp-json')) {
            return {
              ok: true,
              json: async () => [
                {
                  name: `${comp.name} chính hãng`,
                  permalink: `https://nshopvn.com/product/${comp.name.toLowerCase().replace(/\s+/g, '-')}/`,
                  short_description: 'Sản phẩm từ NShop Tier 1',
                },
              ],
            } as Response;
          }

          // Simulate SearXNG returning a genuine Shopee product listing for site:shopee.vn
          if (String(url).includes('site%3Ashopee.vn')) {
            return {
              ok: true,
              json: async () => ({
                results: [
                  {
                    title: `${comp.name} - Linh Kiện Điện Tử Official`,
                    url: `https://shopee.vn/${comp.name.toLowerCase().replace(/\s+/g, '-')}-i.123456.7890123`,
                    content: `${comp.spec} hàng mới 100%`,
                    engine: 'google',
                  },
                ],
              }),
            } as Response;
          }

          return {
            ok: true,
            json: async () => ({ results: [] }),
          } as Response;
        });

        const { results, searchLog } = await searchWithMandatoryShopee(
          comp.name,
          'http://searxng.local:8080',
          comp.spec
        );

        // Proof 1: Fetch was ACTUALLY called with site:shopee.vn on SearXNG
        const shopeeCalls = calledUrls.filter(
          (u) => u.includes('searxng.local:8080/search') && u.includes('site%3Ashopee.vn')
        );
        expect(shopeeCalls.length).toBeGreaterThanOrEqual(1);

        // Proof 2: Both Shopee AND Specialized Tier 1 results are returned together
        const hasShopeeResult = results.some((r) => r.url.includes('shopee.vn'));
        const hasTier1Result = results.some((r) => r.url.includes('nshopvn.com'));
        expect(hasShopeeResult).toBe(true);
        expect(hasTier1Result).toBe(true);

        // Proof 3: Search log accurately audits Shopee execution
        expect(searchLog.componentName).toBe(comp.name);
        expect(searchLog.shopeeQueries.length).toBeGreaterThanOrEqual(1);
        expect(searchLog.shopeeFound).toBe(true);
        expect(searchLog.shopeeProductsRetained).toBeGreaterThanOrEqual(1);
        expect(searchLog.timestamp).toBeTruthy();
      });
    }
  });

  describe('3. Failure Transparency & No Fake Shopee Results', () => {
    it('records exact failure reason in searchLog when SearXNG returns error for Shopee', async () => {
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (String(url).includes('site%3Ashopee.vn')) {
          return { ok: false, status: 503 } as Response;
        }
        return { ok: true, json: async () => ({ results: [] }) } as Response;
      });

      const { results, searchLog } = await searchWithMandatoryShopee(
        'ESP32',
        'http://searxng.local:8080'
      );

      expect(results.some((r) => r.url.includes('shopee.vn'))).toBe(false);
      expect(searchLog.shopeeFound).toBe(false);
      expect(searchLog.shopeeProductsRetained).toBe(0);
      expect(searchLog.statusNotes).toMatch(/503|lỗi kết nối/i);
    });

    it('rejects Shopee homepage/search/category URLs and logs why they were dropped', async () => {
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (String(url).includes('site%3Ashopee.vn')) {
          return {
            ok: true,
            json: async () => ({
              results: [
                {
                  title: 'Shopee tìm kiếm ESP32',
                  url: 'https://shopee.vn/search?keyword=esp32',
                  content: 'Trang tìm kiếm chung',
                },
                {
                  title: 'Shopee Việt Nam trang chủ',
                  url: 'https://shopee.vn/',
                  content: 'Trang chủ sàn',
                },
              ],
            }),
          } as Response;
        }
        return { ok: true, json: async () => ({ results: [] }) } as Response;
      });

      const { results, searchLog } = await searchWithMandatoryShopee(
        'ESP32',
        'http://searxng.local:8080'
      );

      expect(results.length).toBe(0);
      expect(searchLog.rawShopeeCount).toBe(2);
      expect(searchLog.shopeeProductsRetained).toBe(0);
      expect(searchLog.shopeeFound).toBe(false);
      expect(searchLog.statusNotes).toContain('không phải link sản phẩm cụ thể');
    });

    it('triggers Tier 3 international fallback ONLY when both Shopee and VN stores return 0 valid products', async () => {
      const calledUrls: string[] = [];
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        calledUrls.push(String(url));
        if (String(url).includes('digikey.com')) {
          return {
            ok: true,
            json: async () => ({
              results: [
                {
                  title: 'Rare Sensor ICM-42688-P - DigiKey',
                  url: 'https://www.digikey.com/en/products/detail/tdk/ICM-42688-P/123456',
                  content: 'High precision 6-axis IMU',
                },
              ],
            }),
          } as Response;
        }
        return { ok: true, json: async () => ({ results: [] }) } as Response;
      });

      const { results, searchLog } = await searchWithMandatoryShopee(
        'ICM-42688-P',
        'http://searxng.local:8080'
      );

      // Must have tried Shopee FIRST before falling back to DigiKey
      expect(calledUrls.some((u) => u.includes('site%3Ashopee.vn'))).toBe(true);
      expect(results.length).toBe(1);
      expect(results[0].url).toContain('digikey.com');
      expect(searchLog.shopeeFound).toBe(false);
    });
  });

  describe('4. BOM Decomposition — Individual Shopee Search Per Component', () => {
    it('executes separate Shopee queries for every component in Robot dò line BOM', async () => {
      const bom = await decomposeProjectOrProduct('Tôi muốn làm robot dò line 5 mắt');
      expect(bom.items.length).toBeGreaterThanOrEqual(4);

      const queriedComponents: string[] = [];
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (String(url).includes('site%3Ashopee.vn')) {
          queriedComponents.push(decodeURIComponent(String(url)));
        }
        return { ok: true, json: async () => ({ results: [] }) } as Response;
      });

      for (const item of bom.items) {
        const { searchLog } = await searchWithMandatoryShopee(
          item.name,
          'http://searxng.local:8080',
          item.specification
        );
        expect(searchLog.shopeeQueries.length).toBeGreaterThanOrEqual(1);
      }

      // Every single component in the BOM triggered at least 1 Shopee query
      expect(queriedComponents.length).toBeGreaterThanOrEqual(bom.items.length);
    });

    it('executes separate Shopee queries for every component in Robot tránh vật cản BOM', async () => {
      const bom = await decomposeProjectOrProduct('Robot tránh vật cản sử dụng Arduino');
      expect(bom.items.length).toBeGreaterThanOrEqual(4);

      const shopeeQuerySet = new Set<string>();
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (String(url).includes('site%3Ashopee.vn')) {
          shopeeQuerySet.add(decodeURIComponent(String(url)));
        }
        return { ok: true, json: async () => ({ results: [] }) } as Response;
      });

      for (const item of bom.items) {
        await searchWithMandatoryShopee(item.name, 'http://searxng.local:8080', item.specification);
      }

      // Distinct Shopee queries generated for distinct components (never reusing one robot query)
      expect(shopeeQuerySet.size).toBeGreaterThanOrEqual(bom.items.length);
    });
  });

  describe('5. Diverse Alternatives & No Auto-Pricing Guarantee', () => {
    it('guarantees Shopee products are retained in alternatives even when Tier 1 has 5+ items', () => {
      const ranked: BomSearchResult[] = [
        { title: 'Hshop ESP32 #1', url: 'https://hshop.vn/products/esp32-1', content: 'ESP32 WiFi' },
        { title: 'Hshop ESP32 #2', url: 'https://hshop.vn/products/esp32-2', content: 'ESP32 WiFi' },
        { title: 'NShop ESP32 #3', url: 'https://nshopvn.com/product/esp32-3/', content: 'ESP32 WiFi' },
        { title: 'LKCG ESP32 #4', url: 'https://lkcg.vn/esp32-4', content: 'ESP32 WiFi' },
        { title: 'Banlinhkien ESP32 #5', url: 'https://banlinhkien.com/esp32-5-p123.html', content: 'ESP32 WiFi' },
        { title: 'Shopee ESP32 DevKit Official', url: 'https://shopee.vn/esp32-devkit-v1-i.111.222', content: 'ESP32 30 chan' },
      ];

      const alts = buildDiverseAlternatives(ranked[0].url, ranked);
      expect(alts.some((a) => a.url.includes('shopee.vn'))).toBe(true);
      expect(alts.some((a) => a.supplierDomain === 'shopee.vn')).toBe(true);
      expect(alts.some((a) => a.supplierTier === 1)).toBe(true);
      expect(alts.some((a) => a.supplierTier === 2)).toBe(true);
    });

    it('prioritizes Shopee (Tier 1) as selectedLink and preserves Manual Pricing (unitPrice = 0)', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Fallback to heuristic'));
      const item = createNewBomItem('Driver TB6612FNG', '2 kênh', 2);
      const searchResults: BomSearchResult[] = [
        {
          title: 'Mạch điều khiển động cơ TB6612FNG - Giá 45.000đ',
          url: 'https://shopee.vn/mach-tb6612fng-i.555.666',
          content: 'Driver TB6612FNG 1.2A giá siêu rẻ 45.000đ',
        },
        {
          title: 'Driver TB6612FNG chính hãng - Hshop',
          url: 'https://hshop.vn/products/driver-tb6612fng',
          content: 'Mạch điều khiển động cơ TB6612FNG 15V 1.2A',
        },
      ];

      const optimized = await optimizeBomItemWithSearchResults(item, searchResults);
      expect(optimized.status).toBe('found');
      expect(optimized.unitPrice).toBe(0);
      expect(optimized.totalPrice).toBe(0);
      // Shopee is Tier 1 -> selected as primary link, Hshop (Tier 2) in alternatives
      expect(optimized.selectedLink).toContain('shopee.vn');
      expect(optimized.supplierTier).toBe(1);
      expect(optimized.alternatives.some((a) => a.url.includes('hshop.vn'))).toBe(true);
    });
  });

  describe('6. /api/search Route returns results + transparent searchLog', () => {
    it('returns both results and searchLog from POST /api/search', async () => {
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (String(url).includes('site%3Ashopee.vn')) {
          return {
            ok: true,
            json: async () => ({
              results: [
                {
                  title: 'Cảm biến siêu âm HC-SR04 Shopee',
                  url: 'https://shopee.vn/cam-bien-hc-sr04-i.11.22',
                  content: 'HC-SR04 5V',
                },
              ],
            }),
          } as Response;
        }
        return { ok: true, json: async () => ({ results: [] }) } as Response;
      });

      const req = new Request('http://localhost:3000/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'HC-SR04',
          specification: '5V',
          customUrl: 'http://searxng.local:8080',
        }),
      });

      const res = await searchPost(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.results)).toBe(true);
      expect(data.searchLog).toBeDefined();
      expect(data.searchLog.shopeeQueries[0]).toContain('site:shopee.vn');
      expect(data.searchLog.shopeeFound).toBe(true);
    });
  });
});

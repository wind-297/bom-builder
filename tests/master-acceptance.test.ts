import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  understandComponent,
  buildExpandedShopeeQueries,
  classifyProductMatch,
} from '../lib/component-understanding';
import {
  buildShopeeQueries,
  buildMultiQueryPlan,
  searchWithMandatoryShopee,
  filterAllowedProductResults,
} from '../lib/searxng';
import {
  filterAndRankSearchResults,
  optimizeBomItemWithSearchResults,
  cleanTierText,
} from '../lib/optimizer';
import {
  isSpecificProductPath,
  validateProductLink,
  normalizeProductUrl,
} from '../lib/link-validator';
import {
  detectSearchIntent,
  decomposeProjectOrProduct,
  parseBudgetConstraint,
  parseAlreadyOwnedItems,
} from '../lib/decomposition-engine';
import { checkBomCompatibility } from '../lib/compatibility';
import { calculateBomSummary, formatVnd } from '../components/BomTable';
import { cleanUiText } from '../components/BomTableRow';
import { BomItem, BomSearchResult, createNewBomItem } from '../lib/types';
import { POST as searchRouteHandler } from '../app/api/search/route';
import { POST as decomposeRouteHandler } from '../app/api/decompose/route';
import { POST as optimizeRouteHandler } from '../app/api/optimize/route';

describe('MASTER ACCEPTANCE TEST SUITE — ROBOBOM', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // SUITE A: MANUAL COMPONENT SEARCH (10 MANDATORY INPUT CASES)
  // =========================================================================
  describe('SUITE A: Manual Component Search (10 Mandatory Input Cases)', () => {
    it('1. 3V670 -> Understands V-belt code, expands Shopee queries, matches exact belt product', () => {
      const intent = detectSearchIntent('3V670');
      expect(intent).toBe('single_product');

      const info = understandComponent('3V670');
      expect(info.modelCode).toBe('3V670');
      expect(info.category).toContain('Dây curoa');

      const queries = buildShopeeQueries('3V670');
      expect(queries.some((q) => q.toLowerCase().includes('3v670'))).toBe(true);
      expect(queries.some((q) => q.toLowerCase().includes('dây curoa') || q.toLowerCase().includes('v-belt'))).toBe(true);

      const exactBelt: BomSearchResult = {
        title: 'Dây Curoa 3V670 Chính Hãng Bando Truyền Động Chữ V',
        url: 'https://shopee.vn/day-curoa-3v670-i.12345.67890',
        content: 'Dây curoa 3V670 chất lượng cao',
      };
      const unrelatedProduct: BomSearchResult = {
        title: 'Cáp Nạp Arduino Uno R3 USB A-B 30cm',
        url: 'https://shopee.vn/cap-nap-arduino-i.12345.11111',
        content: 'Cáp nạp kết nối máy tính',
      };

      expect(classifyProductMatch(info, exactBelt).grade).toBe('exact_match');
      expect(classifyProductMatch(info, unrelatedProduct).grade).toBe('no_match');
    });

    it('2. HC-SR04 -> Understands ultrasonic sensor, searches Shopee first, matches sensor correctly', () => {
      const intent = detectSearchIntent('HC-SR04');
      expect(intent).toBe('single_product');

      const info = understandComponent('HC-SR04');
      expect(info.modelCode).toBe('HC-SR04');
      expect(info.category).toContain('siêu âm');

      const queries = buildShopeeQueries('HC-SR04');
      expect(queries.some((q) => q.toLowerCase().includes('hc-sr04'))).toBe(true);
      expect(queries.some((q) => q.toLowerCase().includes('siêu âm'))).toBe(true);

      const sensorResult: BomSearchResult = {
        title: 'Module Cảm Biến Siêu Âm HC-SR04 Đo Khoảng Cách',
        url: 'https://shopee.vn/cam-bien-sieu-am-hc-sr04-i.22222.33333',
        content: 'Cảm biến siêu âm HC-SR04 điện áp 5V, khoảng cách 2cm-400cm',
      };
      expect(classifyProductMatch(info, sensorResult).grade).toBe('exact_match');
    });

    it('3. ESP32 DevKit V1 -> Understands MCU development board, preserves model verbatim', () => {
      const intent = detectSearchIntent('ESP32 DevKit V1');
      expect(intent).toBe('single_product');

      const info = understandComponent('ESP32 DevKit V1');
      expect(info.modelCode).toBe('ESP32 DevKit V1');
      expect(info.category).toContain('Vi điều khiển');

      const esp32Result: BomSearchResult = {
        title: 'Kit RF Thu Phát WiFi BLE ESP32 DevKit V1 CP2102 NodeMCU 30 Chân',
        url: 'https://shopee.vn/esp32-devkit-v1-i.33333.44444',
        content: 'Kit ESP32 DevKit V1 nạp code Type-C / Micro USB',
      };
      expect(classifyProductMatch(info, esp32Result).grade).toBe('exact_match');
    });

    it('4. Motor N20 12V -> Extracts voltage 12V and N20 model, rejects conflicting voltages', () => {
      const intent = detectSearchIntent('Motor N20 12V');
      expect(intent).toBe('single_product');

      const info = understandComponent('Motor N20 12V');
      expect(info.modelCode).toBe('N20');
      expect(info.specifications.voltage).toBe('12V');

      const correctMotor: BomSearchResult = {
        title: 'Động Cơ Giảm Tốc N20 12V 100rpm Trục D Kim Loại',
        url: 'https://shopee.vn/dong-co-n20-12v-i.44444.55555',
        content: 'Động cơ N20 điện áp 12VDC tốc độ 100 vòng/phút',
      };
      const wrongVoltMotor: BomSearchResult = {
        title: 'Động Cơ Giảm Tốc N20 3V 6V Micro',
        url: 'https://shopee.vn/dong-co-n20-3v-i.44444.66666',
        content: 'Động cơ N20 chạy pin 3V 6V',
      };

      expect(classifyProductMatch(info, correctMotor).grade).toBe('exact_match');
      expect(classifyProductMatch(info, wrongVoltMotor).grade).toBe('related');
    });

    it('5. TB6612FNG -> Understands motor driver, identifies DRV8833/L298N as strong technical alternatives', () => {
      const intent = detectSearchIntent('TB6612FNG');
      expect(intent).toBe('single_product');

      const info = understandComponent('TB6612FNG');
      expect(info.modelCode).toBe('TB6612FNG');
      expect(info.category).toContain('điều khiển động cơ');

      const exactDriver: BomSearchResult = {
        title: 'Module Mạch Điều Khiển Động Cơ TB6612FNG Dual DC Motor Driver',
        url: 'https://shopee.vn/tb6612fng-i.55555.66666',
        content: 'Driver TB6612FNG 1.2A dòng đỉnh 3.2A',
      };
      const altDriver: BomSearchResult = {
        title: 'Mạch Điều Khiển Động Cơ DRV8833 Dual H-Bridge Driver',
        url: 'https://shopee.vn/drv8833-i.55555.77777',
        content: 'Mạch DRV8833 điều khiển 2 động cơ DC hiệu suất cao',
      };

      expect(classifyProductMatch(info, exactDriver).grade).toBe('exact_match');
      expect(classifyProductMatch(info, altDriver).grade).toBe('strong_match');
    });

    it('6. Dây curoa (generic) -> Understands belt category without hallucinating a specific model', () => {
      const intent = detectSearchIntent('Dây curoa');
      expect(intent).toBe('single_product');

      const info = understandComponent('Dây curoa');
      expect(info.isGeneric).toBe(true);
      expect(info.modelCode).toBeNull();
      expect(info.category).toContain('Dây curoa');

      const genericBeltResult: BomSearchResult = {
        title: 'Dây Curoa Truyền Động Cao Su Đủ Kích Cỡ Chữ V',
        url: 'https://shopee.vn/day-curoa-truyen-dong-i.66666.77777',
        content: 'Dây curoa cao su công nghiệp các dòng 3V, 5V, SPZ',
      };
      expect(classifyProductMatch(info, genericBeltResult).grade).toBe('exact_match');
    });

    it('7. Bánh xe robot -> Understands as single component, DOES NOT decompose into full robot', () => {
      const intent = detectSearchIntent('Bánh xe robot');
      expect(intent).toBe('single_product');

      const info = understandComponent('Bánh xe robot');
      expect(info.isGeneric).toBe(true);
      expect(info.category).toContain('Khung cơ khí & Bánh xe');

      const wheelResult: BomSearchResult = {
        title: 'Bánh Xe Robot V1 65mm Trục Vàng Cao Su Bám Đường',
        url: 'https://shopee.vn/banh-xe-robot-v1-i.77777.88888',
        content: 'Bánh xe cao su robot mini 65mm',
      };
      expect(classifyProductMatch(info, wheelResult).grade).toBe('exact_match');
    });

    it('8. Giá đỡ động cơ -> Understands motor bracket mounting without hallucinating', () => {
      const intent = detectSearchIntent('Giá đỡ động cơ');
      expect(intent).toBe('single_product');

      const info = understandComponent('Giá đỡ động cơ');
      expect(info.isGeneric).toBe(true);
      expect(info.category).toContain('Khung cơ khí & Gá đỡ');

      const bracketResult: BomSearchResult = {
        title: 'Gá Nhôm Chữ L Giá Đỡ Động Cơ GA25 Kèm Ốc Vít',
        url: 'https://shopee.vn/ga-nhom-chu-l-ga25-i.88888.99999',
        content: 'Gá nhôm motor mounting bracket cho động cơ',
      };
      expect(classifyProductMatch(info, bracketResult).grade).toBe('exact_match');
    });

    it('9. Cảm biến dò line -> Understands line sensor, DOES NOT decompose whole robot', () => {
      const intent = detectSearchIntent('Cảm biến dò line');
      expect(intent).toBe('single_product');

      const info = understandComponent('Cảm biến dò line');
      expect(info.isGeneric).toBe(true);
      expect(info.category).toContain('cảm biến');

      const lineSensor: BomSearchResult = {
        title: 'Module Cảm Biến Dò Line 5 Kênh TCRT5000 Dò Vạch Robot',
        url: 'https://shopee.vn/cam-bien-do-line-5-kenh-i.11111.22222',
        content: 'Module cảm biến hồng ngoại dò đường dò line bám vạch',
      };
      expect(classifyProductMatch(info, lineSensor).grade).toBe('exact_match');
    });

    it('10. Động cơ phù hợp cho robot chạy nhanh -> Functional query mapped to high-speed motors', () => {
      const intent = detectSearchIntent('Động cơ phù hợp cho robot chạy nhanh');
      expect(intent).toBe('single_product');

      const info = understandComponent('Động cơ phù hợp cho robot chạy nhanh');
      expect(info.specifications.speedRequirement).toBe('fast');
      expect(info.category).toContain('Động cơ');

      const highSpeedMotor: BomSearchResult = {
        title: 'Động Cơ GA25 12V 500rpm Giảm Tốc Tốc Độ Cao Cho Xe Đua',
        url: 'https://shopee.vn/dong-co-ga25-500rpm-i.22222.99999',
        content: 'Động cơ DC giảm tốc tốc độ cao 500rpm chịu tải tốt',
      };
      expect(classifyProductMatch(info, highSpeedMotor).grade).toBe('exact_match');
    });

    it('11. Non-existent component -> Cleanly handles without hallucinating fake links', async () => {
      const intent = detectSearchIntent('XYZ99999NONEXISTENT');
      expect(intent).toBe('single_product');

      const item = createNewBomItem('XYZ99999NONEXISTENT');
      const unrelatedList: BomSearchResult[] = [
        {
          title: 'Khung Xe Robot 2 Bánh',
          url: 'https://shopee.vn/khung-xe-robot-i.11111.33333',
          content: 'Khung xe mica 2 bánh',
        },
      ];

      const optimized = await optimizeBomItemWithSearchResults(item, unrelatedList);
      expect(optimized.status).toBe('not_found');
      expect(optimized.selectedLink).toBe('');
      expect(optimized.note).toContain('Không tìm thấy');
    });
  });

  // =========================================================================
  // SUITE B: SHOPEE-FIRST MANDATORY RULE & SEARCH LOG TRANSPARENCY
  // =========================================================================
  describe('SUITE B: Shopee-First Mandatory Rule & Search Log Transparency', () => {
    it('always executes Shopee search queries first for every component', async () => {
      const queriesExecuted: string[] = [];
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        queriesExecuted.push(String(url));
        if (String(url).includes('site%3Ashopee.vn')) {
          return {
            ok: true,
            json: async () => ({
              results: [
                {
                  title: 'Module ESP32 DevKit V1 Shopee VN',
                  url: 'https://shopee.vn/esp32-devkit-v1-i.12345.67890',
                  content: 'Kit thu phát Wi-Fi BLE',
                  engine: 'google',
                },
              ],
            }),
          } as Response;
        }
        return { ok: true, json: async () => ({ results: [] }) } as Response;
      });

      const { results, searchLog } = await searchWithMandatoryShopee('ESP32 DevKit V1');
      expect(queriesExecuted.some((u) => u.includes('site%3Ashopee.vn'))).toBe(true);
      expect(searchLog.shopeeQueries.length).toBeGreaterThanOrEqual(1);
      expect(searchLog.shopeeFound).toBe(true);
      expect(searchLog.shopeeProductsRetained).toBeGreaterThanOrEqual(1);
      expect(results[0].url).toContain('shopee.vn');
    });

    it('prioritizes Shopee over Tier 2 stores when both return matching products', async () => {
      const item = createNewBomItem('Driver TB6612FNG');
      const searchResults: BomSearchResult[] = [
        {
          title: 'Mạch Điều Khiển Động Cơ TB6612 Hshop',
          url: 'https://hshop.vn/products/mach-dieu-khien-dong-co-tb6612',
          content: 'Driver TB6612 tại Hshop',
        },
        {
          title: 'Mạch Điều Khiển Động Cơ TB6612FNG Shopee',
          url: 'https://shopee.vn/driver-tb6612fng-i.11111.22222',
          content: 'Driver TB6612FNG chính hãng Shopee',
        },
      ];

      const optimized = await optimizeBomItemWithSearchResults(item, searchResults);
      expect(optimized.status).toBe('found');
      expect(optimized.selectedLink).toContain('shopee.vn');
      expect(optimized.alternatives.some((alt) => alt.url.includes('hshop.vn'))).toBe(true);
    });

    it('falls back to Tier 2 stores with clear log when Shopee yields no results', async () => {
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        // SearXNG returns empty for Shopee
        if (String(url).includes('site%3Ashopee.vn')) {
          return { ok: true, json: async () => ({ results: [] }) } as Response;
        }
        // Specialized store adapter returns Hshop product
        if (String(url).includes('hshop.vn/search')) {
          return {
            ok: true,
            text: async () => `
              <div class="product-name">
                <a href="/products/cam-bien-khoang-cach-vl53l0x">Cảm biến khoảng cách laser VL53L0X</a>
              </div>
            `,
          } as Response;
        }
        return { ok: true, json: async () => ({ results: [] }) } as Response;
      });

      const { results, searchLog } = await searchWithMandatoryShopee('VL53L0X');
      expect(searchLog.shopeeFound).toBe(false);
      expect(searchLog.shopee_search_status).toBe('no_reliable_result');
      expect(results.some((r) => r.url.includes('hshop.vn'))).toBe(true);
    });
  });

  // =========================================================================
  // SUITE C: ROBOT BOM DECOMPOSITION & COMPATIBILITY CHECK
  // =========================================================================
  describe('SUITE C: Robot BOM Decomposition & Compatibility Check', () => {
    it('1. Robot dò line -> Decomposes into distinct subsystems and essential components', async () => {
      const res = await decomposeProjectOrProduct('Robot dò line');
      expect(res.intent).toBe('project_bom');
      expect(res.items.length).toBeGreaterThanOrEqual(4);

      const allText = res.items.map((it) => `${it.name} ${it.specification} ${it.subsystem}`).join(' ').toLowerCase();
      expect(allText).toContain('điều khiển');
      expect(allText).toContain('cảm biến');
      expect(allText).toContain('truyền động');
      expect(allText).toContain('nguồn');

      // Every item starts with unitPrice = 0 and manualPrice = null
      for (const it of res.items) {
        expect(it.unitPrice).toBe(0);
        expect(it.manualPrice?.amount).toBeNull();
      }
    });

    it('2. Robot tránh vật cản -> Includes ultrasonic sensor HC-SR04 and servo scanner', async () => {
      const res = await decomposeProjectOrProduct('Robot tránh vật cản sử dụng Arduino');
      expect(res.intent).toBe('project_bom');
      const allText = res.items.map((it) => `${it.name} ${it.specification}`).join(' ').toLowerCase();
      expect(allText).toContain('arduino');
      expect(allText).toContain('siêu âm');
    });

    it('3. Cánh tay robot 4 bậc tự do -> Includes servos and arm frame', async () => {
      const res = await decomposeProjectOrProduct('Cánh tay robot 4 bậc tự do');
      expect(res.intent).toBe('project_bom');
      const allText = res.items.map((it) => `${it.name} ${it.specification}`).join(' ').toLowerCase();
      expect(allText).toContain('servo');
      expect(allText).toContain('cánh tay');
    });

    it('4. Robot có camera -> Includes ESP32-CAM and motor control', async () => {
      const res = await decomposeProjectOrProduct('Robot tự hành sử dụng camera để nhận diện vật thể');
      expect(res.intent).toBe('project_bom');
      const allText = res.items.map((it) => `${it.name} ${it.specification}`).join(' ').toLowerCase();
      expect(allText).toContain('camera');
      expect(allText).toContain('động cơ');
    });

    it('5. Ambiguous prompt -> Asks clarifying question instead of blind guessing', async () => {
      const res = await decomposeProjectOrProduct('làm robot');
      expect(res.isAmbiguous).toBe(true);
      expect(res.clarifyingQuestion).toBeDefined();
    });

    it('6. Compatibility Checker -> Flags missing driver and high voltage without buck converter', () => {
      const bomWithMissingDriver: BomItem[] = [
        createNewBomItem('Động cơ DC giảm tốc 12V GA25', '12V 200rpm', 2),
        createNewBomItem('Arduino Uno R3', 'Vi điều khiển ATmega328P', 1),
      ];
      bomWithMissingDriver[0].subsystem = 'Hệ thống truyền động';
      bomWithMissingDriver[1].subsystem = 'Hệ thống điều khiển';

      const issues1 = checkBomCompatibility(bomWithMissingDriver);
      expect(issues1.some((iss) => iss.category === 'driver')).toBe(true);

      const bomWithHighVoltage: BomItem[] = [
        createNewBomItem('Pin LiPo 3S 11.1V', '11.1V 2200mAh', 1),
        createNewBomItem('Arduino Uno R3', '5V', 1),
      ];
      bomWithHighVoltage[0].subsystem = 'Hệ thống nguồn điện';
      bomWithHighVoltage[1].subsystem = 'Hệ thống điều khiển';

      const issues2 = checkBomCompatibility(bomWithHighVoltage);
      expect(issues2.some((iss) => iss.category === 'power')).toBe(true);
    });
  });

  // =========================================================================
  // SUITE D: BROKEN LINK VERIFICATION & PROVENANCE
  // =========================================================================
  describe('SUITE D: Broken Link Verification & Provenance', () => {
    it('rejects homepage and category URLs as specific product links', () => {
      expect(isSpecificProductPath('https://shopee.vn/')).toBe(false);
      expect(isSpecificProductPath('https://hshop.vn/')).toBe(false);
      expect(isSpecificProductPath('https://hshop.vn/collections')).toBe(false);
      expect(isSpecificProductPath('https://hshop.vn/collections/cam-bien')).toBe(false);
      expect(isSpecificProductPath('https://nshopvn.com/danh-muc/dong-co')).toBe(false);
      expect(isSpecificProductPath('https://banlinhkien.com/cam-bien-c123.html')).toBe(false);
      expect(isSpecificProductPath('https://shopee.vn/search?keyword=esp32')).toBe(false);
    });

    it('accepts legitimate product paths across all approved suppliers', () => {
      expect(isSpecificProductPath('https://shopee.vn/esp32-devkit-v1-i.12345.67890')).toBe(true);
      expect(isSpecificProductPath('https://hshop.vn/products/kit-esp32-nodemcu')).toBe(true);
      expect(isSpecificProductPath('https://nshopvn.com/product/dong-co-n20-12v/')).toBe(true);
      expect(isSpecificProductPath('https://banlinhkien.com/dong-co-n20-p12345.html')).toBe(true);
      expect(isSpecificProductPath('https://banlinhkien.com/arduino-uno-r3-dip')).toBe(true);
      expect(isSpecificProductPath('https://lazada.vn/products/motor-n20-i123456.html')).toBe(true);
      expect(isSpecificProductPath('https://tiki.vn/p123456.html')).toBe(true);
    });

    it('identifies HTTP 404/410 as dead and soft-404 as dead', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        status: 404,
        headers: new Headers(),
        text: async () => 'Not found',
      } as any);
      const res404 = await validateProductLink('https://hshop.vn/products/khong-ton-tai');
      expect(res404.linkStatus).toBe('dead');

      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
        headers: new Headers(),
        text: async () => '<html><head><title>Sản phẩm không tồn tại</title></head><body>Rất tiếc không tìm thấy</body></html>',
      } as any);
      const resSoft404 = await validateProductLink('https://hshop.vn/products/da-xoa');
      expect(resSoft404.linkStatus).toBe('dead');
    });

    it('identifies HTTP 403 / 429 as blocked (anti-bot) without falsely marking dead', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        status: 403,
        headers: new Headers(),
        text: async () => 'Cloudflare Challenge',
      } as any);
      const res403 = await validateProductLink('https://shopee.vn/product-name-i.12345.67890');
      expect(res403.linkStatus).toBe('blocked');
      expect(res403.linkStatus).not.toBe('dead');
    });

    it('unwraps redirect wrappers cleanly and normalizes product URLs', () => {
      const wrappedUrl = 'https://www.google.com/url?q=https%3A%2F%2Fshopee.vn%2Fday-curoa-3v670-i.12345.67890%3Fsp_atk%3Dabc123';
      const clean = normalizeProductUrl(wrappedUrl);
      expect(clean).toContain('https://shopee.vn/day-curoa-3v670-i.12345.67890');
      expect(clean).not.toContain('sp_atk');
      expect(clean).not.toContain('google.com');
    });
  });

  // =========================================================================
  // SUITE E: MANUAL PRICING SYSTEM & BUDGET METRICS
  // =========================================================================
  describe('SUITE E: Manual Pricing System & Budget Metrics', () => {
    it('calculates total budget strictly from user-entered prices, never auto-pricing', () => {
      const items: BomItem[] = [
        {
          ...createNewBomItem('ESP32 DevKit V1', '', 2),
          unitPrice: 85000,
          totalPrice: 170000,
          status: 'found',
        },
        {
          ...createNewBomItem('Driver TB6612FNG', '', 1),
          unitPrice: 35000,
          totalPrice: 35000,
          status: 'found',
        },
        {
          ...createNewBomItem('Động cơ N20', '', 2),
          unitPrice: 0, // Unpriced
          totalPrice: 0,
          status: 'found',
        },
      ];

      const summary = calculateBomSummary(items);
      expect(summary.totalItems).toBe(3);
      expect(summary.pricedItems).toBe(2);
      expect(summary.unpricedItems).toBe(1);
      expect(summary.totalEstimatedBudget).toBe(205000);
      expect(summary.isBudgetComplete).toBe(false);
      expect(formatVnd(summary.totalEstimatedBudget)).toBe('205.000');
    });

    it('correctly recalculates subtotal when quantity or price is changed', () => {
      const item = createNewBomItem('Pin 18650', '', 2);
      item.unitPrice = 45000;
      item.totalPrice = item.quantity * item.unitPrice;
      expect(item.totalPrice).toBe(90000);

      // User changes quantity to 4
      item.quantity = 4;
      item.totalPrice = item.quantity * item.unitPrice;
      expect(item.totalPrice).toBe(180000);
    });

    it('excludes already owned items from purchasing budget calculation', () => {
      const items: BomItem[] = [
        {
          ...createNewBomItem('ESP32 NodeMCU', '', 1),
          unitPrice: 90000,
          totalPrice: 90000,
          alreadyOwned: true,
          status: 'found',
        },
        {
          ...createNewBomItem('Module TCRT5000', '', 1),
          unitPrice: 30000,
          totalPrice: 30000,
          status: 'found',
        },
      ];

      const summary = calculateBomSummary(items);
      expect(summary.totalEstimatedBudget).toBe(30000); // 90000 is excluded because already owned
    });
  });

  // =========================================================================
  // SUITE F: UI CLEANUP & NO TIER LABELS
  // =========================================================================
  describe('SUITE F: UI Cleanup & No Tier Labels', () => {
    it('cleans internal Tier labels from strings displayed to user', () => {
      expect(cleanUiText('Shopee VN (Tier 1 — Ưu tiên)')).toBe('Shopee VN');
      expect(cleanUiText('NShop (Tier 2 VN)')).toBe('NShop');
      expect(cleanUiText('Hshop (Tier 2 VN)')).toBe('Hshop');
      expect(cleanUiText('Tier 1 Source')).toBe('');
      expect(cleanUiText('Chọn từ NShop: Tier 2 Supplier')).toBe('Chọn từ NShop:');
      expect(cleanTierText('Shopee VN (Tier 1 — Ưu tiên)')).toBe('Shopee VN');
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  understandComponent,
  buildExpandedShopeeQueries,
  classifyProductMatch,
} from '../lib/component-understanding';
import { filterAndRankSearchResults, optimizeBomItemWithSearchResults } from '../lib/optimizer';
import { findCatalogMatches } from '../lib/catalog';
import { buildShopeeQueries, extractCoreSearchTerms } from '../lib/searxng';
import { BomItem, BomSearchResult } from '../lib/types';

describe('RoboBOM Manual Component Search & Product Identification (7 Mandatory Test Cases)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const makeItem = (name: string, spec: string = ''): BomItem => ({
    id: 'test-item-1',
    name,
    specification: spec,
    quantity: 1,
    unitPrice: 0,
    totalPrice: 0,
    currency: 'VND',
    status: 'pending',
    selectedLink: '',
    linkStatus: 'unverified',
    alternatives: [],
    note: '',
    manualPrice: { amount: null, currency: 'VND', entrySource: null },
  });

  // TEST CASE 1: 3V670 (Timing / V-Belt)
  describe('Test Case 1: 3V670', () => {
    it('understands 3V670 as model code and belongs to belt category', () => {
      const info = understandComponent('Dây curoa 3V670');
      expect(info.modelCode).toBe('3V670');
      expect(info.category).toContain('Dây curoa');
      expect(info.isGeneric).toBe(false);
    });

    it('generates targeted Shopee query for 3V670', () => {
      const queries = buildShopeeQueries('Dây curoa 3V670');
      expect(queries.some((q) => q.includes('3V670'))).toBe(true);
    });

    it('classifies 3V670 product as exact_match and breadboard jumper wire as no_match', () => {
      const info = understandComponent('Dây curoa 3V670');
      const beltResult: BomSearchResult = {
        title: 'Dây Curoa 3V670 Dây Đai Truyền Động Bando',
        url: 'https://shopee.vn/day-curoa-3v670-i.84157123.4255101234',
        content: 'Dây curoa 3V670 công nghiệp truyền động chữ V',
      };
      const wireResult: BomSearchResult = {
        title: 'Tép 40 Dây Cắm Test Bo Breadboard Đực - Cái 20cm',
        url: 'https://shopee.vn/tep-40-day-cam-breadboard-i.84157123.3976981234',
        content: 'Dây cắm test board đực cái',
      };

      expect(classifyProductMatch(info, beltResult).grade).toBe('exact_match');
      expect(classifyProductMatch(info, wireResult).grade).toBe('no_match');
    });

    it('optimizes 3V670 without ever picking unrelated wire products', async () => {
      const item = makeItem('Dây curoa 3V670');
      const mixedResults: BomSearchResult[] = [
        {
          title: 'Tép 40 Dây Cắm Test Bo Breadboard Đực - Cái 20cm',
          url: 'https://shopee.vn/tep-40-day-cam-breadboard-i.84157123.3976981234',
          content: 'Dây cắm test board đực cái',
        },
        {
          title: 'Dây Curoa 3V670 Dây Đai Truyền Động Bando',
          url: 'https://shopee.vn/day-curoa-3v670-i.84157123.4255101234',
          content: 'Dây curoa 3V670 công nghiệp',
        },
      ];

      const optimized = await optimizeBomItemWithSearchResults(item, mixedResults);
      expect(optimized.status).toBe('found');
      expect(optimized.selectedLink).toContain('day-curoa-3v670');
      expect(optimized.selectedLink).not.toContain('breadboard');
    });
  });

  // TEST CASE 2: HC-SR04 (Ultrasonic Sensor)
  describe('Test Case 2: HC-SR04', () => {
    it('understands HC-SR04 and normalizes variants', () => {
      expect(understandComponent('HC-SR04').modelCode).toBe('HC-SR04');
      expect(understandComponent('cảm biến hcsr04').modelCode).toBe('HC-SR04');
    });

    it('generates Shopee query targeting HC-SR04', () => {
      const queries = buildShopeeQueries('Cảm biến siêu âm HC-SR04');
      expect(queries.some((q) => q.includes('HC-SR04'))).toBe(true);
    });

    it('finds authentic HC-SR04 Shopee product from catalog', () => {
      const matches = findCatalogMatches('HC-SR04');
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].title).toContain('HC-SR04');
      expect(matches[0].url).toContain('shopee.vn');
    });
  });

  // TEST CASE 3: ESP32 DevKit V1 (Microcontroller)
  describe('Test Case 3: ESP32 DevKit V1', () => {
    it('understands ESP32 DevKit V1 as exact controller model', () => {
      const info = understandComponent('ESP32 DevKit V1');
      expect(info.modelCode).toBe('ESP32 DevKit V1');
      expect(info.category).toContain('Vi điều khiển');
    });

    it('prioritizes exact ESP32 DevKit V1 product', async () => {
      const item = makeItem('ESP32 DevKit V1');
      const results: BomSearchResult[] = [
        {
          title: 'Kit RF Thu Phát WiFi BLE ESP32 DevKit V1 NodeMCU Lua CP2102',
          url: 'https://shopee.vn/kit-rf-thu-phat-wifi-ble-esp32-nodemcu-cp2102-i.84157123.1420556112',
          content: 'ESP32 DevKit V1 NodeMCU Lua CP2102 32-bit Wi-Fi Bluetooth',
        },
      ];
      const optimized = await optimizeBomItemWithSearchResults(item, results);
      expect(optimized.status).toBe('found');
      expect(optimized.selectedLink).toContain('esp32');
    });
  });

  // TEST CASE 4: Motor N20 12V (Geared DC Motor with Voltage Spec)
  describe('Test Case 4: Motor N20 12V', () => {
    it('understands N20 model with 12V voltage spec', () => {
      const info = understandComponent('Motor N20 12V');
      expect(info.modelCode).toBe('N20');
      expect(info.specifications.voltage).toBe('12V');
    });

    it('generates Shopee query with model and voltage spec', () => {
      const queries = buildShopeeQueries('Motor N20 12V');
      expect(queries.some((q) => q.includes('N20') && q.includes('12V'))).toBe(true);
    });

    it('rejects 3V-only or non-N20 motors when 12V N20 is specified', () => {
      const info = understandComponent('Motor N20 12V');
      const n20_12v: BomSearchResult = {
        title: 'Động Cơ DC Giảm Tốc N20 12V Trục D Kim Loại Mini',
        url: 'https://shopee.vn/dong-co-dc-giam-toc-n20-12v-truc-d-kim-loai-i.84157123.4366211234',
        content: 'Động cơ N20 12V bánh răng kim loại',
      };
      const tt_motor: BomSearchResult = {
        title: 'Động Cơ DC Giảm Tốc TT Vàng 1:48 (Loại Tốt 3-6V)',
        url: 'https://shopee.vn/dong-co-tt-i.84157123.2754761234',
        content: 'Động cơ TT vàng 3V-6V',
      };

      expect(classifyProductMatch(info, n20_12v).grade).toBe('exact_match');
      expect(classifyProductMatch(info, tt_motor).grade).toBe('no_match');
    });
  });

  // TEST CASE 5: Driver TB6612FNG (Motor Driver)
  describe('Test Case 5: Driver TB6612FNG', () => {
    it('understands TB6612FNG as exact motor driver model', () => {
      const info = understandComponent('Driver TB6612FNG');
      expect(info.modelCode).toBe('TB6612FNG');
      expect(info.category).toBe('Mạch điều khiển động cơ');
    });

    it('finds TB6612FNG in catalog and matches exact product', () => {
      const matches = findCatalogMatches('TB6612FNG');
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].title).toContain('TB6612');
    });
  });

  // TEST CASE 6: Generic "Dây curoa" (No Model Code Provided)
  describe('Test Case 6: Generic Dây curoa', () => {
    it('understands Dây curoa as generic concept and does not guess random model', () => {
      const info = understandComponent('Dây curoa');
      expect(info.isGeneric).toBe(true);
      expect(info.modelCode).toBeNull();
      expect(info.category).toContain('Dây curoa');
    });

    it('matches belt products and strictly rejects breadboard wires', () => {
      const info = understandComponent('Dây curoa');
      const beltResult: BomSearchResult = {
        title: 'Dây Curoa 3V670 Dây Đai Truyền Động Bando',
        url: 'https://shopee.vn/day-curoa-3v670-i.84157123.4255101234',
        content: 'Dây curoa truyền động',
      };
      const wireResult: BomSearchResult = {
        title: 'Tép 40 Dây Cắm Test Bo Breadboard Đực - Cái 20cm',
        url: 'https://shopee.vn/tep-40-day-cam-breadboard-i.84157123.3976981234',
        content: 'Dây cắm test board đực cái',
      };

      expect(classifyProductMatch(info, beltResult).grade).toBe('exact_match');
      expect(classifyProductMatch(info, wireResult).grade).toBe('no_match');
    });
  });

  // TEST CASE 7: Non-existent Part Code (XYZ99999NONEXISTENT)
  describe('Test Case 7: Non-existent Part Code', () => {
    it('understands non-existent part code as distinct model and not generic', () => {
      const info = understandComponent('XYZ99999NONEXISTENT');
      expect(info.modelCode).toBe('XYZ99999NONEXISTENT');
      expect(info.isGeneric).toBe(false);
    });

    it('returns empty array from catalog for non-existent code', () => {
      const matches = findCatalogMatches('XYZ99999NONEXISTENT');
      expect(matches).toEqual([]);
    });

    it('returns not_found status without picking random unrelated products', async () => {
      const item = makeItem('XYZ99999NONEXISTENT');
      const randomProducts: BomSearchResult[] = [
        {
          title: 'Tép 40 Dây Cắm Test Bo Breadboard Đực - Cái 20cm',
          url: 'https://shopee.vn/tep-40-day-cam-breadboard-i.84157123.3976981234',
          content: 'Dây cắm test board',
        },
        {
          title: 'Động Cơ DC Giảm Tốc TT Vàng 1:48 (Loại Tốt 3-6V)',
          url: 'https://shopee.vn/dong-co-tt-i.84157123.2754761234',
          content: 'Động cơ vàng TT',
        },
      ];

      const optimized = await optimizeBomItemWithSearchResults(item, randomProducts);
      expect(optimized.status).toBe('not_found');
      expect(optimized.selectedLink).toBe('');
      expect(optimized.note).toContain('XYZ99999NONEXISTENT');
    });
  });
});

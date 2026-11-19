import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  understandComponent,
  buildExpandedShopeeQueries,
  classifyProductMatch,
} from '../lib/component-understanding';
import { findCatalogMatches } from '../lib/catalog';
import { filterAndRankSearchResults, optimizeBomItemWithSearchResults } from '../lib/optimizer';
import { BomItem, BomSearchResult } from '../lib/types';

describe('RoboBOM Intelligent Human-Like Component Search Engine', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const createItem = (name: string, spec: string = ''): BomItem => ({
    id: `item-${Date.now()}`,
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

  describe('1. Semantic Understanding & Multi-Direction Search (Table IX Cases)', () => {
    it('Input "Dây curoa 3V670" -> understands V-belt, generates V-belt and 3V670 queries', () => {
      const info = understandComponent('Dây curoa 3V670');
      expect(info.modelCode).toBe('3V670');
      expect(info.category).toContain('Dây curoa');
      expect(info.expandedShopeeQueries.some((q) => q.toLowerCase().includes('3v670'))).toBe(true);
      expect(info.expandedShopeeQueries.some((q) => q.toLowerCase().includes('v-belt') || q.toLowerCase().includes('dây đai'))).toBe(true);
    });

    it('Input "HC-SR04" -> understands ultrasonic sensor, generates ultrasonic queries', () => {
      const info = understandComponent('HC-SR04');
      expect(info.modelCode).toBe('HC-SR04');
      expect(info.category).toContain('siêu âm');
      expect(info.expandedShopeeQueries.some((q) => q.toLowerCase().includes('siêu âm'))).toBe(true);
      expect(info.expandedShopeeQueries.some((q) => q.toLowerCase().includes('ultrasonic'))).toBe(true);
    });

    it('Input "Động cơ robot chạy nhanh" -> understands high-speed motor without inventing fake model', () => {
      const info = understandComponent('Động cơ robot chạy nhanh');
      expect(info.modelCode).toBeNull();
      expect(info.isGeneric).toBe(true);
      expect(info.category).toContain('Động cơ');
      expect(info.specifications.speedRequirement).toBe('fast');
      expect(info.expandedShopeeQueries.some((q) => q.toLowerCase().includes('động cơ') || q.toLowerCase().includes('motor'))).toBe(true);
    });

    it('Input "Bánh xe robot" -> understands mobile robot wheels', () => {
      const info = understandComponent('Bánh xe robot');
      expect(info.modelCode).toBeNull();
      expect(info.isGeneric).toBe(true);
      expect(info.category).toContain('Khung cơ khí & Bánh xe');
      expect(info.expandedShopeeQueries.some((q) => q.toLowerCase().includes('bánh xe') || q.toLowerCase().includes('wheel'))).toBe(true);
    });

    it('Input "Giá đỡ động cơ" -> understands motor mounting bracket', () => {
      const info = understandComponent('Giá đỡ động cơ');
      expect(info.modelCode).toBeNull();
      expect(info.isGeneric).toBe(true);
      expect(info.category).toContain('Khung cơ khí');
      expect(info.expandedShopeeQueries.some((q) => q.toLowerCase().includes('gá') || q.toLowerCase().includes('giá đỡ') || q.toLowerCase().includes('bracket'))).toBe(true);
    });

    it('Input "Cảm biến dò line" -> understands line tracking sensor and TCRT5000 variant', () => {
      const info = understandComponent('Cảm biến dò line');
      expect(info.category).toContain('cảm biến');
      expect(info.expandedShopeeQueries.some((q) => q.toLowerCase().includes('dò line') || q.toLowerCase().includes('tracking') || q.toLowerCase().includes('dò vạch'))).toBe(true);
    });

    it('Input "Module chuyển nguồn" -> understands DC-DC buck converter and voltage step-down', () => {
      const info = understandComponent('Module chuyển nguồn');
      expect(info.category).toContain('nguồn');
      expect(info.expandedShopeeQueries.some((q) => q.toLowerCase().includes('hạ áp') || q.toLowerCase().includes('chuyển nguồn') || q.toLowerCase().includes('buck') || q.toLowerCase().includes('dc-dc'))).toBe(true);
    });
  });

  describe('2. Human-Like Product Matching (Exact Match, Strong Match, Possible Alternative)', () => {
    it('matches "Giá đỡ động cơ" to Gá nhôm chữ L động cơ GA25 as exact_match', () => {
      const info = understandComponent('Giá đỡ động cơ');
      const bracketProduct: BomSearchResult = {
        title: 'Gá Nhôm Chữ L Giá Đỡ Động Cơ GA25 Kèm Ốc Vít M3',
        url: 'https://shopee.vn/ga-nhom-chu-l-gia-do-dong-co-ga25-i.84157123.3647181234',
        content: 'Gá nhôm chữ L motor mounting bracket cho động cơ GA25 robot',
      };
      const classification = classifyProductMatch(info, bracketProduct);
      expect(classification.grade).toBe('exact_match');
      expect(classification.modelMatched).toBe(true);
    });

    it('matches "Module chuyển nguồn" to Mạch giảm áp LM2596 as exact_match', () => {
      const info = understandComponent('Module chuyển nguồn');
      const buckProduct: BomSearchResult = {
        title: 'Mạch Giảm Áp DC-DC Buck LM2596 3A Có Hiển Thị Led Vôn Kế',
        url: 'https://shopee.vn/mach-giam-ap-dc-dc-buck-lm2596-3a-i.84157123.3310321234',
        content: 'Mạch hạ áp chuyển nguồn DC-DC LM2596',
      };
      const classification = classifyProductMatch(info, buckProduct);
      expect(classification.grade).toBe('exact_match');
    });

    it('matches "Cảm biến dò line" to Mạch cảm biến dò line 5 kênh TCRT5000 as exact_match', () => {
      const info = understandComponent('Cảm biến dò line');
      const lineProduct: BomSearchResult = {
        title: 'Mạch Cảm Biến Dò Line 5 Kênh TCRT5000 Line Tracker',
        url: 'https://shopee.vn/mach-cam-bien-do-line-5-kenh-tcrt5000-i.84157123.1966881234',
        content: 'Cảm biến dò line 5 kênh TCRT5000 bám vạch',
      };
      const classification = classifyProductMatch(info, lineProduct);
      expect(classification.grade).toBe('exact_match');
    });

    it('matches "Động cơ robot chạy nhanh" to GA25 12V 300rpm as exact_match and TT vàng as strong_match', () => {
      const info = understandComponent('Động cơ robot chạy nhanh');
      const ga25_300rpm: BomSearchResult = {
        title: 'Động Cơ DC Giảm Tốc GA25 12VDC 300rpm Tốc Độ Cao Kèm Gá Nhôm',
        url: 'https://shopee.vn/dong-co-dc-giam-toc-ga25-12vdc-300rpm-i.84157123.2643651234',
        content: 'Động cơ GA25 12V tốc độ cao 300rpm lực kéo khỏe',
      };
      const ttMotor: BomSearchResult = {
        title: 'Động Cơ DC Giảm Tốc TT Vàng 1:48 (Loại Tốt 3-6V)',
        url: 'https://shopee.vn/dong-co-dc-giam-toc-tt-vang-i.84157123.2754761234',
        content: 'Động cơ DC giảm tốc TT vàng',
      };

      expect(classifyProductMatch(info, ga25_300rpm).grade).toBe('exact_match');
      expect(classifyProductMatch(info, ttMotor).grade).toBe('strong_match');
    });

    it('identifies L298N as strong_match technical alternative when searching TB6612FNG', () => {
      const info = understandComponent('Driver TB6612FNG');
      const l298nProduct: BomSearchResult = {
        title: 'Mạch Điều Khiển Động Cơ DC / Bước L298N Red Module',
        url: 'https://shopee.vn/mach-dieu-khien-dong-co-dc-buoc-l298n-i.84157123.2421431234',
        content: 'Mạch cầu H L298N điều khiển 2 động cơ DC',
      };
      expect(classifyProductMatch(info, l298nProduct).grade).toBe('strong_match');
    });
  });

  describe('3. Optimization Pipeline & Fallback without Strict Rejection', () => {
    it('successfully optimizes "Động cơ robot chạy nhanh" to real GA25 motor', async () => {
      const item = createItem('Động cơ robot chạy nhanh');
      const results: BomSearchResult[] = [
        {
          title: 'Động Cơ DC Giảm Tốc GA25 12VDC 300rpm Kèm Gá Nhôm',
          url: 'https://shopee.vn/dong-co-dc-giam-toc-ga25-12vdc-i.84157123.2643651234',
          content: 'Động cơ GA25 12V tốc độ 300rpm',
        },
      ];

      const optimized = await optimizeBomItemWithSearchResults(item, results);
      expect(optimized.status).toBe('found');
      expect(optimized.selectedLink).toContain('dong-co-dc-giam-toc-ga25');
      expect(optimized.matchType).toBe('best_match');
    });

    it('successfully optimizes "Giá đỡ động cơ" and marks found', async () => {
      const item = createItem('Giá đỡ động cơ');
      const results: BomSearchResult[] = [
        {
          title: 'Gá Nhôm Chữ L Giá Đỡ Động Cơ GA25 Kèm Ốc Vít M3',
          url: 'https://shopee.vn/ga-nhom-chu-l-gia-do-dong-co-ga25-i.84157123.3647181234',
          content: 'Gá nhôm chữ L cố định động cơ',
        },
      ];

      const optimized = await optimizeBomItemWithSearchResults(item, results);
      expect(optimized.status).toBe('found');
      expect(optimized.selectedLink).toContain('ga-nhom-chu-l');
    });

    it('successfully optimizes "Module chuyển nguồn" to LM2596 buck converter', async () => {
      const item = createItem('Module chuyển nguồn');
      const results: BomSearchResult[] = [
        {
          title: 'Mạch Giảm Áp DC-DC Buck LM2596 3A Có Hiển Thị Led Vôn Kế',
          url: 'https://shopee.vn/mach-giam-ap-dc-dc-buck-lm2596-3a-i.84157123.3310321234',
          content: 'Module hạ áp chuyển nguồn DC-DC',
        },
      ];

      const optimized = await optimizeBomItemWithSearchResults(item, results);
      expect(optimized.status).toBe('found');
      expect(optimized.selectedLink).toContain('lm2596');
    });

    it('reports not_found for true non-existent part code XYZ99999NONEXISTENT without picking random parts', async () => {
      const item = createItem('XYZ99999NONEXISTENT');
      const results: BomSearchResult[] = [
        {
          title: 'Tép 40 Dây Cắm Test Bo Breadboard Đực - Cái 20cm',
          url: 'https://shopee.vn/tep-40-day-cam-breadboard-i.84157123.3976981234',
          content: 'Dây cắm test bo breadboard',
        },
      ];

      const optimized = await optimizeBomItemWithSearchResults(item, results);
      expect(optimized.status).toBe('not_found');
      expect(optimized.selectedLink).toBe('');
      expect(optimized.note).toContain('XYZ99999NONEXISTENT');
    });
  });

  describe('4. Catalog Human-Like Matches', () => {
    it('finds motor bracket in catalog when searching "giá đỡ động cơ"', () => {
      const matches = findCatalogMatches('giá đỡ động cơ', 3);
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].title.toLowerCase()).toContain('gá');
      expect(matches[0].url).toContain('shopee.vn');
    });

    it('finds LM2596 in catalog when searching "module chuyển nguồn"', () => {
      const matches = findCatalogMatches('module chuyển nguồn', 3);
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].title.toLowerCase()).toContain('lm2596');
    });

    it('finds wheels in catalog when searching "bánh xe robot"', () => {
      const matches = findCatalogMatches('bánh xe robot', 3);
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].title.toLowerCase()).toContain('bánh xe');
    });

    it('finds TCRT5000 in catalog when searching "cảm biến dò line"', () => {
      const matches = findCatalogMatches('cảm biến dò line', 3);
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].title.toLowerCase()).toContain('dò line');
    });
  });
});

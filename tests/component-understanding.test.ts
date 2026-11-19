import { describe, it, expect } from 'vitest';
import {
  understandComponent,
  classifyProductMatch,
  buildExpandedShopeeQueries,
} from '../lib/component-understanding';
import { BomSearchResult } from '../lib/types';

describe('Component Understanding & Product Identification', () => {
  describe('understandComponent', () => {
    it('understands "3V670" as V-belt and expands belt queries with model preserved', () => {
      const info = understandComponent('3V670');
      expect(info.modelCode).toBe('3V670');
      expect(info.isGeneric).toBe(false);
      expect(info.category.toLowerCase()).toContain('dây');
      expect(info.expandedShopeeQueries.some((q) => q.includes('site:shopee.vn 3V670'))).toBe(true);
      expect(info.expandedShopeeQueries.some((q) => q.toLowerCase().includes('dây curoa 3v670'))).toBe(true);
      expect(info.expandedShopeeQueries.some((q) => q.toLowerCase().includes('dây đai 3v670'))).toBe(true);
      expect(info.expandedShopeeQueries.some((q) => q.toLowerCase().includes('3v670 belt'))).toBe(true);
      expect(info.expandedShopeeQueries.some((q) => q.toLowerCase().includes('3v670 v-belt'))).toBe(true);
    });

    it('understands "hcsr04" as HC-SR04 ultrasonic sensor and normalizes notation', () => {
      const info = understandComponent('hcsr04');
      expect(info.modelCode).toBe('HC-SR04');
      expect(info.isGeneric).toBe(false);
      expect(info.category.toLowerCase()).toContain('siêu âm');
      expect(info.expandedShopeeQueries.some((q) => q.includes('site:shopee.vn HC-SR04'))).toBe(true);
      expect(info.expandedShopeeQueries.some((q) => q.toLowerCase().includes('cảm biến siêu âm hc-sr04'))).toBe(true);
      expect(info.expandedShopeeQueries.some((q) => q.toLowerCase().includes('module hc-sr04'))).toBe(true);
      expect(info.expandedShopeeQueries.some((q) => q.toLowerCase().includes('hc-sr04 ultrasonic sensor'))).toBe(true);
    });

    it('understands "ESP32 DevKit V1" and preserves board & version details', () => {
      const info = understandComponent('ESP32 DevKit V1');
      expect(info.modelCode).toContain('ESP32');
      expect(info.modelCode).toContain('DevKit V1');
      expect(info.isGeneric).toBe(false);
      expect(info.category.toLowerCase()).toContain('điều khiển');
      expect(info.expandedShopeeQueries.some((q) => q.includes('site:shopee.vn ESP32 DevKit V1'))).toBe(true);
    });

    it('understands "Motor N20 12V" with motor line and exact 12V voltage spec', () => {
      const info = understandComponent('Motor N20 12V');
      expect(info.modelCode).toBe('N20');
      expect(info.specifications.voltage).toBe('12V');
      expect(info.isGeneric).toBe(false);
      expect(info.category.toLowerCase()).toContain('động cơ');
      expect(info.expandedShopeeQueries.some((q) => q.includes('N20 12V'))).toBe(true);
    });

    it('understands "TB6612FNG" and identifies motor driver module', () => {
      const info = understandComponent('Driver TB6612FNG');
      expect(info.modelCode).toBe('TB6612FNG');
      expect(info.isGeneric).toBe(false);
      expect(info.category.toLowerCase()).toContain('điều khiển động cơ');
      expect(info.expandedShopeeQueries.some((q) => q.includes('TB6612FNG'))).toBe(true);
    });

    it('understands generic "Dây curoa" without inventing any model code', () => {
      const info = understandComponent('Dây curoa');
      expect(info.modelCode).toBeNull();
      expect(info.isGeneric).toBe(true);
      expect(info.category.toLowerCase()).toContain('dây');
      // Must NOT guess model code like 3V670 or 5V
      expect(info.expandedShopeeQueries.some((q) => q.includes('3V670'))).toBe(false);
      expect(info.expandedShopeeQueries.some((q) => q.toLowerCase().includes('dây curoa'))).toBe(true);
    });

    it('preserves unknown/non-existent model codes verbatim', () => {
      const info = understandComponent('XYZ99999NONEXISTENT');
      expect(info.modelCode).toBe('XYZ99999NONEXISTENT');
      expect(info.isGeneric).toBe(false);
      expect(info.expandedShopeeQueries.some((q) => q.includes('XYZ99999NONEXISTENT'))).toBe(true);
    });
  });

  describe('classifyProductMatch', () => {
    it('classifies exact model match as exact_match', () => {
      const knowledge = understandComponent('3V670');
      const validShopeeResult: BomSearchResult = {
        title: 'Dây Curoa 3V670 Dây Đai Truyền Động Chữ V Bando',
        url: 'https://shopee.vn/day-curoa-3v670-chinh-hang-i.12345.67890',
        content: 'Dây curoa 3V670 truyền động công nghiệp chất lượng cao',
      };
      const match = classifyProductMatch(knowledge, validShopeeResult);
      expect(match.grade).toBe('exact_match');
      expect(match.modelMatched).toBe(true);
    });

    it('rejects homepage or non-specific product links as no_match', () => {
      const knowledge = understandComponent('3V670');
      const homepageResult: BomSearchResult = {
        title: 'Shopee Việt Nam - Mua sắm online',
        url: 'https://shopee.vn/',
        content: 'Trang chủ mua sắm Shopee',
      };
      const match = classifyProductMatch(knowledge, homepageResult);
      expect(match.grade).toBe('no_match');
    });

    it('rejects completely unrelated products (e.g. Dây cắm breadboard for Dây curoa 3V670)', () => {
      const knowledge = understandComponent('3V670');
      const breadboardResult: BomSearchResult = {
        title: 'Tép 40 Dây Cắm Test Bo Breadboard Đực - Cái 20cm',
        url: 'https://shopee.vn/tep-40-day-cam-breadboard-i.12345.67890',
        content: 'Dây cắm test bo breadboard đực cái',
      };
      const match = classifyProductMatch(knowledge, breadboardResult);
      expect(match.grade).toBe('no_match');
    });

    it('classifies different model in same category as related, not exact_match', () => {
      const knowledge = understandComponent('3V670');
      const differentBeltResult: BomSearchResult = {
        title: 'Dây Curoa 5V1000 Dây Đai Bando Bản Lớn',
        url: 'https://shopee.vn/day-curoa-5v1000-bando-i.12345.67890',
        content: 'Dây curoa truyền động 5V1000 chất lượng cao',
      };
      const match = classifyProductMatch(knowledge, differentBeltResult);
      expect(match.grade).toBe('related');
      expect(match.modelMatched).toBe(false);
    });

    it('distinguishes voltage mismatch for Motor N20 12V', () => {
      const knowledge = understandComponent('Motor N20 12V');
      const match12V: BomSearchResult = {
        title: 'Động cơ giảm tốc N20 12V 100RPM kim loại',
        url: 'https://shopee.vn/dong-co-giam-toc-n20-12v-100rpm-i.12345.67890',
        content: 'Động cơ N20 DC 12V điện áp 12VDC trục D',
      };
      const mismatch3V: BomSearchResult = {
        title: 'Động cơ giảm tốc N20 3V 50RPM mini',
        url: 'https://shopee.vn/dong-co-giam-toc-n20-3v-50rpm-i.12345.67890',
        content: 'Động cơ N20 DC 3V điện áp 3VDC trục D',
      };
      expect(classifyProductMatch(knowledge, match12V).grade).toBe('exact_match');
      expect(classifyProductMatch(knowledge, mismatch3V).grade).toBe('related');
    });

    it('returns no_match for non-existent model codes', () => {
      const knowledge = understandComponent('XYZ99999NONEXISTENT');
      const someResult: BomSearchResult = {
        title: 'Mạch điều khiển động cơ L298N',
        url: 'https://shopee.vn/mach-dieu-khien-dong-co-l298n-i.12345.67890',
        content: 'Driver L298N motor',
      };
      const match = classifyProductMatch(knowledge, someResult);
      expect(match.grade).toBe('no_match');
    });
  });
});

import { describe, it, expect } from 'vitest';
import {
  createNewBomItem,
  BomItem,
} from '../lib/types';
import { calculateBomSummary } from '../components/BomTable';
import {
  isAllowedSourceUrl,
  findSourceByUrl,
  getEnabledSources,
} from '../lib/sources';
import {
  validateProductLink,
  isSpecificProductPath,
  isPrivateOrBlockedIp,
} from '../lib/link-validator';
import {
  filterAndRankSearchResults,
} from '../lib/optimizer';

describe('Manual Pricing & Link Verification Engine (RoboBOM Rework)', () => {
  describe('1. Manual Pricing & Budget Calculation', () => {
    it('should initialize BOM items with null manualPrice and 0 unitPrice', () => {
      const item = createNewBomItem('ESP32 NodeMCU', '32-bit Wi-Fi/BLE', 2);
      expect(item.manualPrice).toEqual({
        amount: null,
        currency: 'VND',
        entrySource: null,
      });
      expect(item.unitPrice).toBe(0);
      expect(item.totalPrice).toBe(0);
    });

    it('should calculate item total and BOM summary correctly when user enters prices', () => {
      const item1 = createNewBomItem('ESP32 NodeMCU', '', 1);
      item1.manualPrice = { amount: 95000, currency: 'VND', entrySource: 'user_input' };
      item1.unitPrice = 95000;
      item1.totalPrice = 95000;

      const item2 = createNewBomItem('Động cơ GA25', '', 2);
      item2.manualPrice = { amount: 85000, currency: 'VND', entrySource: 'user_input' };
      item2.unitPrice = 85000;
      item2.totalPrice = 170000;

      const item3 = createNewBomItem('Dây cắm breadboard', '', 1);
      // Item 3 is unpriced

      const summary = calculateBomSummary([item1, item2, item3]);
      expect(summary.totalEstimatedBudget).toBe(265000); // 95k + 170k
      expect(summary.pricedItems).toBe(2);
      expect(summary.unpricedItems).toBe(1);
      expect(summary.isBudgetComplete).toBe(false);
    });

    it('should mark isBudgetComplete true only when all items have valid prices', () => {
      const item1 = createNewBomItem('ESP32', '', 1);
      item1.unitPrice = 100000;
      item1.totalPrice = 100000;
      item1.manualPrice = { amount: 100000, currency: 'VND', entrySource: 'user_input' };

      const summary = calculateBomSummary([item1]);
      expect(summary.isBudgetComplete).toBe(true);
      expect(summary.unpricedItems).toBe(0);
    });

    it('should exclude already owned items from total purchasing budget', () => {
      const item1 = createNewBomItem('ESP32 (Đã có sẵn)', '', 1);
      item1.alreadyOwned = true;
      item1.manualPrice = { amount: 95000, currency: 'VND', entrySource: 'user_input' };
      item1.unitPrice = 95000;
      item1.totalPrice = 95000;

      const item2 = createNewBomItem('Driver L298N', '', 1);
      item2.manualPrice = { amount: 45000, currency: 'VND', entrySource: 'user_input' };
      item2.unitPrice = 45000;
      item2.totalPrice = 45000;

      const summary = calculateBomSummary([item1, item2]);
      expect(summary.totalEstimatedBudget).toBe(45000); // Only item 2 is counted
      expect(summary.totalItems).toBe(2);
    });
  });

  describe('2. Source Restriction & Vietnam-First Policy', () => {
    it('should allow Tier 1 Vietnamese specialized robotics stores', () => {
      expect(isAllowedSourceUrl('https://hshop.vn/products/kit-esp32')).toBe(true);
      expect(isAllowedSourceUrl('https://lkcg.vn/module-esp32-nodemcu')).toBe(true);
      expect(isAllowedSourceUrl('https://nshopvn.com/product/kit-esp32/')).toBe(true);
      expect(isAllowedSourceUrl('https://banlinhkien.com/arduino-uno-r3')).toBe(true);
      expect(isAllowedSourceUrl('https://cungcaplinhkien.vn/driver-l298n')).toBe(true);
    });

    it('should allow Tier 2 Vietnamese marketplaces', () => {
      expect(isAllowedSourceUrl('https://shopee.vn/product-i.123456.789')).toBe(true);
      expect(isAllowedSourceUrl('https://lazada.vn/products/motor-ga25-i12345.html')).toBe(true);
      expect(isAllowedSourceUrl('https://tiki.vn/cam-bien-hc-sr04-p12345.html')).toBe(true);
    });

    it('should allow Tier 3 International suppliers', () => {
      expect(isAllowedSourceUrl('https://www.digikey.com/en/products/detail/123')).toBe(true);
      expect(isAllowedSourceUrl('https://www.mouser.com/ProductDetail/123')).toBe(true);
      expect(isAllowedSourceUrl('https://www.pololu.com/product/1234')).toBe(true);
      expect(isAllowedSourceUrl('https://www.dfrobot.com/product-1234.html')).toBe(true);
    });

    it('should strictly reject non-allowlisted domains, blogs, and news sites', () => {
      expect(isAllowedSourceUrl('https://dantri.com.vn/kinh-doanh/linh-kien-123.htm')).toBe(false);
      expect(isAllowedSourceUrl('https://baonongnghiep.vn/tuoi-tieu-123.htm')).toBe(false);
      expect(isAllowedSourceUrl('https://techblog.com/review-esp32')).toBe(false);
      expect(isAllowedSourceUrl('https://diendan.robotics.vn/topic/123')).toBe(false);
      expect(isAllowedSourceUrl('https://untrusted-store.xyz/product/123')).toBe(false);
    });
  });

  describe('3. Link Structure & SSRF Protection', () => {
    it('should reject root domains, search pages, and category pages', () => {
      expect(isSpecificProductPath('https://hshop.vn')).toBe(false);
      expect(isSpecificProductPath('https://hshop.vn/')).toBe(false);
      expect(isSpecificProductPath('https://hshop.vn/search?q=esp32')).toBe(false);
      expect(isSpecificProductPath('https://nshopvn.com/collections/vi-dieu-khien')).toBe(false);
      expect(isSpecificProductPath('https://shopee.vn/search?keyword=esp32')).toBe(false);
    });

    it('should accept specific product detail pages', () => {
      expect(isSpecificProductPath('https://hshop.vn/products/kit-rf-thu-phat-esp32')).toBe(true);
      expect(isSpecificProductPath('https://nshopvn.com/product/kit-esp32-nodemcu/')).toBe(true);
      expect(isSpecificProductPath('https://lkcg.vn/module-l298n')).toBe(true);
      expect(isSpecificProductPath('https://banlinhkien.com/arduino-uno-r3-dip')).toBe(true);
      expect(isSpecificProductPath('https://shopee.vn/product-name-i.12345.67890')).toBe(true);
      expect(isSpecificProductPath('https://lazada.vn/products/dong-co-ga25-i1234.html')).toBe(true);
    });

    it('should detect private and metadata IP addresses for SSRF prevention', () => {
      expect(isPrivateOrBlockedIp('127.0.0.1')).toBe(true);
      expect(isPrivateOrBlockedIp('localhost')).toBe(true);
      expect(isPrivateOrBlockedIp('192.168.1.1')).toBe(true);
      expect(isPrivateOrBlockedIp('10.0.0.1')).toBe(true);
      expect(isPrivateOrBlockedIp('172.16.0.1')).toBe(true);
      expect(isPrivateOrBlockedIp('169.254.169.254')).toBe(true);
      expect(isPrivateOrBlockedIp('hshop.vn')).toBe(false);
      expect(isPrivateOrBlockedIp('nshopvn.com')).toBe(false);
    });
  });

  describe('4. Technical-Only Ranking (No Price Bias)', () => {
    it('should rank Shopee Vietnam (Tier 1) higher than Tier 2 specialized stores when technical specs match', () => {
      const candidates = [
        {
          title: 'Động cơ GA25 12V 100rpm Shopee chất lượng cao',
          url: 'https://shopee.vn/dong-co-ga25-i.123.456',
          content: 'Động cơ DC giảm tốc GA25 12V chính hãng bánh răng thép siêu bền',
        },
        {
          title: 'Động Cơ DC Giảm Tốc GA25 12VDC Hshop',
          url: 'https://hshop.vn/products/dong-co-dc-giam-toc-ga25-12vdc',
          content: 'Động cơ DC giảm tốc GA25 12VDC chính hãng bánh răng thép siêu bền',
        },
      ];

      const ranked = filterAndRankSearchResults(candidates, 'Động cơ GA25 12V');
      expect(ranked.length).toBe(2);
      // Shopee (Tier 1) should rank before Hshop (Tier 2) per user priority policy
      expect(ranked[0].url).toContain('shopee.vn');
      expect(ranked[1].url).toContain('hshop.vn');
    });
  });
});

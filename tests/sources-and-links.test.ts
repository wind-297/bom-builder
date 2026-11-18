import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  SEARCH_SOURCES,
  findSourceByDomain,
  findSourceByUrl,
  isAllowedSourceUrl,
  getEnabledSources,
} from '../lib/sources';
import {
  isPrivateOrBlockedIp,
  isSpecificProductPath,
  verifyProductIdentity,
  validateProductLink,
} from '../lib/link-validator';

describe('Search Sources & Domain Allowlist', () => {
  it('should include all required Tier 1 Vietnamese electronics stores', () => {
    const tier1 = getEnabledSources(1);
    const domains = tier1.map((s) => s.domain);
    expect(domains).toContain('lkcg.vn');
    expect(domains).toContain('hshop.vn');
    expect(domains).toContain('nshopvn.com');
    expect(domains).toContain('banlinhkien.com');
    expect(domains).toContain('cungcaplinhkien.vn');
  });

  it('should include Tier 2 Vietnamese marketplaces', () => {
    const tier2 = getEnabledSources(2);
    const domains = tier2.map((s) => s.domain);
    expect(domains).toContain('shopee.vn');
    expect(domains).toContain('lazada.vn');
    expect(domains).toContain('tiki.vn');
  });

  it('should include Tier 3 International suppliers', () => {
    const tier3 = getEnabledSources(3);
    const domains = tier3.map((s) => s.domain);
    expect(domains).toContain('digikey.com');
    expect(domains).toContain('mouser.com');
    expect(domains).toContain('pololu.com');
  });

  it('should find source by url and hostname accurately', () => {
    const src1 = findSourceByUrl('https://hshop.vn/products/kit-esp32');
    expect(src1).not.toBeNull();
    expect(src1?.id).toBe('hshop');
    expect(src1?.tier).toBe(1);

    const src2 = findSourceByDomain('shopee.vn');
    expect(src2?.tier).toBe(2);

    expect(isAllowedSourceUrl('https://shopee.vn/product-i.123')).toBe(true);
    expect(isAllowedSourceUrl('https://vnexpress.net/tin-tuc')).toBe(false);
    expect(isAllowedSourceUrl('https://baonongnghiep.vn/linh-kien')).toBe(false);
    expect(isAllowedSourceUrl('https://myblog.wordpress.com/esp32')).toBe(false);
  });
});

describe('Product Link Validation Engine', () => {
  describe('SSRF Protection', () => {
    it('should identify blocked private and metadata IPs', () => {
      expect(isPrivateOrBlockedIp('localhost')).toBe(true);
      expect(isPrivateOrBlockedIp('127.0.0.1')).toBe(true);
      expect(isPrivateOrBlockedIp('10.0.0.1')).toBe(true);
      expect(isPrivateOrBlockedIp('192.168.1.1')).toBe(true);
      expect(isPrivateOrBlockedIp('169.254.169.254')).toBe(true);
      expect(isPrivateOrBlockedIp('hshop.vn')).toBe(false);
      expect(isPrivateOrBlockedIp('shopee.vn')).toBe(false);
    });

    it('should reject SSRF attempts in validateProductLink', async () => {
      const res = await validateProductLink('http://localhost:8080/esp32');
      expect(res.linkStatus).toBe('invalid');
      expect(res.verificationReason).toContain('bảo mật SSRF');
    });
  });

  describe('Specific Product Path Enforcement', () => {
    it('should reject root URLs and homepages', () => {
      expect(isSpecificProductPath('https://hshop.vn/')).toBe(false);
      expect(isSpecificProductPath('https://hshop.vn/index.html')).toBe(false);
      expect(isSpecificProductPath('https://shopee.vn/')).toBe(false);
      expect(isSpecificProductPath('https://banlinhkien.com')).toBe(false);
    });

    it('should reject search and category query URLs', () => {
      expect(isSpecificProductPath('https://hshop.vn/search?q=esp32')).toBe(false);
      expect(isSpecificProductPath('https://banlinhkien.com/tim-kiem?keyword=servo')).toBe(false);
      expect(isSpecificProductPath('https://shopee.vn/search?keyword=esp32')).toBe(false);
    });

    it('should accept valid product paths', () => {
      expect(isSpecificProductPath('https://hshop.vn/products/kit-esp32-nodemcu')).toBe(true);
      expect(isSpecificProductPath('https://shopee.vn/product-name-i.12345.67890')).toBe(true);
      expect(isSpecificProductPath('https://nshopvn.com/product/dong-co-dc-giam-toc/')).toBe(true);
      expect(isSpecificProductPath('https://banlinhkien.com/dong-co-n20-p12345.html')).toBe(true);
    });
  });

  describe('Product Identity Verification', () => {
    it('should verify title matching the component name and model', () => {
      const title = 'Kit Thu Phát WiFi BLE ESP32 NodeMCU Lua CP2102 Chính Hãng';
      const check = verifyProductIdentity(title, 'ESP32 NodeMCU', 'ESP32');
      expect(check.isMatch).toBe(true);
      expect(check.score).toBeGreaterThanOrEqual(70);
    });

    it('should flag mismatched products', () => {
      const title = 'Động Cơ Không Chổi Than Brushless 2212 1400KV';
      const check = verifyProductIdentity(title, 'Cảm biến siêu âm HC-SR04', 'HC-SR04');
      expect(check.isMatch).toBe(false);
    });
  });

  describe('HTTP Validation Statuses', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('should mark dead when HTTP 404 is returned', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        status: 404,
        headers: new Headers(),
        text: async () => 'Not Found',
      } as any);

      const res = await validateProductLink('https://hshop.vn/products/san-pham-khong-ton-tai');
      expect(res.linkStatus).toBe('dead');
      expect(res.httpStatus).toBe(404);
    });

    it('should mark blocked when anti-bot 403 or 429 is returned', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        status: 403,
        headers: new Headers(),
        text: async () => 'Cloudflare challenge',
      } as any);

      const res = await validateProductLink('https://shopee.vn/product-i.123.456');
      expect(res.linkStatus).toBe('blocked');
      expect(res.httpStatus).toBe(403);
    });

    it('should mark verified when HTTP 200 with matching title is returned', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
        headers: new Headers(),
        text: async () => '<html><head><title>Kit ESP32 NodeMCU Lua WiFi BLE</title></head><body>Product detail</body></html>',
      } as any);

      const res = await validateProductLink('https://hshop.vn/products/kit-esp32-nodemcu', 'ESP32 NodeMCU');
      expect(res.linkStatus).toBe('verified');
      expect(res.httpStatus).toBe(200);
      expect(res.productTitle).toBe('Kit ESP32 NodeMCU Lua WiFi BLE');
    });

    it('should reject redirect to unapproved external domain', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        status: 301,
        headers: new Headers({ location: 'https://evil-hacker.com/malware' }),
      } as any);

      const res = await validateProductLink('https://hshop.vn/products/malicious-redirect');
      expect(res.linkStatus).toBe('invalid');
      expect(res.verificationReason).toContain('không được phép');
    });
  });
});

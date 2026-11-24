import { describe, it, expect } from 'vitest';
import { buildComparisonMatrix } from '@/lib/comparison';
import { BomItem, BomItemAlternative } from '@/lib/types';

describe('Product Comparison Engine (Section 14.5)', () => {
  const primaryItem: BomItem = {
    id: 'item-1',
    name: 'ESP32 DevKit V1',
    specification: 'Điện áp: 3.3V-5V, Dual Core 240MHz, WiFi + Bluetooth, Micro USB',
    quantity: 1,
    unitPrice: 0,
    totalPrice: 0,
    currency: 'VND',
    status: 'found',
    selectedLink: 'https://shopee.vn/product/123/456',
    supplierName: 'Shopee',
    supplierDomain: 'shopee.vn',
    linkStatus: 'verified',
    matchGrade: 'exact_match',
    alternatives: [],
    note: '',
  };

  const alt1: BomItemAlternative = {
    title: 'ESP32 NodeMCU Type-C ESP-WROOM-32',
    url: 'https://hshop.vn/products/esp32-nodemcu-type-c',
    supplierName: 'Hshop',
    supplierDomain: 'hshop.vn',
    linkStatus: 'verified',
    matchGrade: 'strong_match',
    reason: 'Cổng Type-C tiện dụng hơn, tương thích hoàn toàn chân cắm',
  };

  const alt2: BomItemAlternative = {
    title: 'ESP8266 NodeMCU V3',
    url: 'https://shopee.vn/product/789/101',
    supplierName: 'Shopee',
    supplierDomain: 'shopee.vn',
    linkStatus: 'unverified',
    matchGrade: 'possible_alternative',
    reason: 'Giá rẻ hơn, đơn nhân 80MHz, ít chân GPIO hơn',
  };

  it('builds comparison matrix with primary and alternatives', () => {
    const matrix = buildComparisonMatrix(primaryItem, [alt1, alt2]);

    expect(matrix.candidates).toHaveLength(3);
    expect(matrix.candidates[0].isPrimary).toBe(true);
    expect(matrix.candidates[0].title).toBe('ESP32 DevKit V1');
    expect(matrix.candidates[1].title).toBe('ESP32 NodeMCU Type-C ESP-WROOM-32');
    expect(matrix.candidates[2].title).toBe('ESP8266 NodeMCU V3');

    // Supplier names must be clean, never contain "Tier"
    matrix.candidates.forEach((c) => {
      expect(c.supplier).not.toMatch(/tier/i);
    });

    // specKeys contains relevant extracted specs
    expect(matrix.specKeys.length).toBeGreaterThan(0);
  });

  it('handles empty alternatives gracefully without crashing', () => {
    const matrix = buildComparisonMatrix(primaryItem, []);
    expect(matrix.candidates).toHaveLength(1);
    expect(matrix.candidates[0].isPrimary).toBe(true);
  });

  it('extracts electrical and interface specifications from strings or reason', () => {
    const matrix = buildComparisonMatrix(primaryItem, [alt1]);
    const primarySpecs = matrix.candidates[0].specs;
    expect(primarySpecs).toBeDefined();
    // Check that voltage or frequency or interface key exists
    const hasSpecKey = Object.keys(primarySpecs).length > 0;
    expect(hasSpecKey).toBe(true);
  });

  it('extracts pros and cons based on matchGrade and reasons', () => {
    const matrix = buildComparisonMatrix(primaryItem, [alt1, alt2]);
    expect(matrix.candidates[1].pros.length).toBeGreaterThan(0);
    expect(matrix.candidates[2].cons.length).toBeGreaterThan(0);
  });
});

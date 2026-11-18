import { describe, it, expect } from 'vitest';
import { findCatalogMatches, ROBOTICS_PRODUCT_CATALOG } from '../lib/catalog';
import { isAllowedSourceUrl } from '../lib/sources';
import { isSpecificProductPath } from '../lib/link-validator';

describe('Robotics Product Catalog Knowledge Base', () => {
  it('should contain comprehensive robotics components across all 6 subsystems', () => {
    expect(ROBOTICS_PRODUCT_CATALOG.length).toBeGreaterThan(15);
    const subsystems = new Set(ROBOTICS_PRODUCT_CATALOG.map((c) => c.subsystem));
    expect(subsystems.has('Hệ thống điều khiển')).toBe(true);
    expect(subsystems.has('Hệ thống cảm biến')).toBe(true);
    expect(subsystems.has('Hệ thống truyền động')).toBe(true);
    expect(subsystems.has('Hệ thống nguồn điện')).toBe(true);
    expect(subsystems.has('Khung cơ khí & Bánh xe')).toBe(true);
    expect(subsystems.has('Dây nối & Phụ kiện')).toBe(true);
  });

  it('should only contain URLs that belong to approved sources and specific product paths', () => {
    for (const item of ROBOTICS_PRODUCT_CATALOG) {
      expect(isAllowedSourceUrl(item.url)).toBe(true);
      expect(isSpecificProductPath(item.url)).toBe(true);
      if (item.alternatives) {
        for (const alt of item.alternatives) {
          expect(isAllowedSourceUrl(alt.url)).toBe(true);
          expect(isSpecificProductPath(alt.url)).toBe(true);
        }
      }
    }
  });

  it('should find verified product links from Tier 1 stores without auto-pricing', () => {
    // 1. ESP32
    const esp32Results = findCatalogMatches('ESP32 NodeMCU');
    expect(esp32Results.length).toBeGreaterThan(0);
    expect(esp32Results[0].url).toContain('hshop.vn');
    expect(esp32Results[0].price).toBeUndefined();

    // 2. Arduino Uno
    const arduinoResults = findCatalogMatches('Arduino Uno R3');
    expect(arduinoResults.length).toBeGreaterThan(0);
    expect(isAllowedSourceUrl(arduinoResults[0].url)).toBe(true);

    // 3. Line Sensor
    const lineResults = findCatalogMatches('Cảm biến dò line 5 kênh TCRT5000');
    expect(lineResults.length).toBeGreaterThan(0);
    expect(lineResults[0].url).toContain('hshop.vn');

    // 4. L298N Motor Driver
    const driverResults = findCatalogMatches('Driver L298N');
    expect(driverResults.length).toBeGreaterThan(0);
    expect(driverResults[0].url).toContain('hshop.vn');

    // 5. 18650 Battery
    const pinResults = findCatalogMatches('Pin 18650');
    expect(pinResults.length).toBeGreaterThan(0);
    expect(pinResults[0].url).toContain('hshop.vn');
  });

  it('should return empty array for non-matching nonsense queries', () => {
    const results = findCatalogMatches('xyzabc123456');
    expect(results).toEqual([]);
  });
});

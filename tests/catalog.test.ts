import { describe, it, expect } from 'vitest';
import { findCatalogMatches, ROBOTICS_PRODUCT_CATALOG } from '../lib/catalog';

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

  it('should find exact verified product links and VND prices for popular robotics parts', () => {
    // 1. ESP32
    const esp32Results = findCatalogMatches('ESP32 NodeMCU');
    expect(esp32Results.length).toBeGreaterThan(0);
    expect(esp32Results[0].price).toBeGreaterThan(0);
    expect(esp32Results[0].url).toContain('hshop.vn');

    // 2. Arduino Uno
    const arduinoResults = findCatalogMatches('Arduino Uno R3');
    expect(arduinoResults.length).toBeGreaterThan(0);
    expect(arduinoResults[0].price).toBeGreaterThan(50000);

    // 3. Line Sensor
    const lineResults = findCatalogMatches('Cảm biến dò line 5 kênh TCRT5000');
    expect(lineResults.length).toBeGreaterThan(0);
    expect(lineResults[0].price).toBe(45000);

    // 4. L298N Motor Driver
    const driverResults = findCatalogMatches('Driver L298N');
    expect(driverResults.length).toBeGreaterThan(0);
    expect(driverResults[0].price).toBe(45000);

    // 5. 18650 Battery
    const pinResults = findCatalogMatches('Pin 18650');
    expect(pinResults.length).toBeGreaterThan(0);
    expect(pinResults[0].price).toBe(45000);
  });

  it('should return empty array for non-matching nonsense queries', () => {
    const results = findCatalogMatches('xyzabc123456');
    expect(results).toEqual([]);
  });
});

import { describe, it, expect } from 'vitest';
import { createNewBomItem, BomItem } from '../lib/types';
import { calculateBomSummary } from '../components/BomTable';
import { exportBomToCsv, parseBomFile } from '../lib/excel';

describe('BOM Creation Helpers', () => {
  it('should initialize a fresh BomItem with default values and pending status', () => {
    const item = createNewBomItem('Bánh xe Mecanum 80mm', 'Trục lục giác', 4);
    expect(item.name).toBe('Bánh xe Mecanum 80mm');
    expect(item.specification).toBe('Trục lục giác');
    expect(item.quantity).toBe(4);
    expect(item.status).toBe('pending');
    expect(item.unitPrice).toBe(0);
    expect(item.totalPrice).toBe(0);
    expect(item.currency).toBe('VND');
    expect(item.id).toBeDefined();
    expect(item.selectedLink).toBe('');
    expect(item.alternatives).toEqual([]);
  });

  it('should use default values for specification and quantity if omitted or invalid', () => {
    const item = createNewBomItem('Arduino Uno R3');
    expect(item.name).toBe('Arduino Uno R3');
    expect(item.specification).toBe('');
    expect(item.quantity).toBe(1);
    expect(item.status).toBe('pending');

    const itemZero = createNewBomItem('Test', '', 0);
    expect(itemZero.quantity).toBe(1);

    const itemNeg = createNewBomItem('Test', '', -5);
    expect(itemNeg.quantity).toBe(1);
  });
});

describe('BOM Workflow Integration', () => {
  it('should simulate full item lifecycle: create -> searching -> found -> summary calculation', () => {
    // 1. User adds items via manual add or AI decompose
    const item1 = createNewBomItem('Servo MG996R', '180 deg', 2);
    const item2 = createNewBomItem('ESP32 WROOM-32', '30 pin', 1);

    let items: BomItem[] = [item1, item2];
    expect(items.length).toBe(2);

    let summary = calculateBomSummary(items);
    expect(summary.totalItems).toBe(2);
    expect(summary.foundItems).toBe(0);
    expect(summary.pendingItems).toBe(2);
    expect(summary.totalEstimatedBudget).toBe(0);

    // 2. Search starts: item1 becomes searching
    items = items.map((it) => (it.id === item1.id ? { ...it, status: 'searching' as const } : it));
    expect(items[0].status).toBe('searching');

    // 3. Search and optimize finishes for item1: found with price and link
    const item1Optimized: BomItem = {
      ...items[0],
      status: 'found',
      unitPrice: 85000,
      totalPrice: 170000,
      selectedLink: 'https://shopee.vn/servo-mg996r',
      alternatives: [{ title: 'Shopee Shop B', url: 'https://shopee.vn/alt', price: 90000 }],
    };
    items = items.map((it) => (it.id === item1.id ? item1Optimized : it));

    // 4. Item2 is searched and not found
    const item2NotFound: BomItem = {
      ...items[1],
      status: 'not_found',
      unitPrice: 0,
      totalPrice: 0,
    };
    items = items.map((it) => (it.id === item2.id ? item2NotFound : it));

    // 5. Final summary verification
    summary = calculateBomSummary(items);
    expect(summary.totalItems).toBe(2);
    expect(summary.foundItems).toBe(1);
    expect(summary.pendingItems).toBe(1);
    expect(summary.totalEstimatedBudget).toBe(170000);
  });

  it('should integrate CSV export and import seamlessly', async () => {
    const item = createNewBomItem('Động cơ bước Nema 17', '1.5A 42BYGH', 3);
    item.unitPrice = 120000;
    item.totalPrice = 360000;
    item.selectedLink = 'https://example.com/nema17';
    item.note = 'Trục D';

    const csvData = exportBomToCsv([item]);
    expect(csvData).toContain('Động cơ bước Nema 17');
    expect(csvData).toContain('1.5A 42BYGH');

    const encoder = new TextEncoder();
    const arrayBuffer = encoder.encode(csvData).buffer;
    const parsedItems = await parseBomFile(arrayBuffer, 'test.csv');

    expect(parsedItems.length).toBe(1);
    expect(parsedItems[0].name).toBe('Động cơ bước Nema 17');
    expect(parsedItems[0].specification).toBe('1.5A 42BYGH');
    expect(parsedItems[0].quantity).toBe(3);
    expect(parsedItems[0].unitPrice).toBe(120000);
    expect(parsedItems[0].totalPrice).toBe(360000);
  });
});

import { describe, it, expect, vi } from 'vitest';
import { BomItem, BomItemAlternative } from '@/lib/types';
import { buildSystemGraph } from '@/lib/graph-engine';
import { simulateComponentSwap } from '@/lib/what-if';
import { buildComparisonMatrix } from '@/lib/comparison';

describe('Workspace Advanced Features Integration (Task 4)', () => {
  const sampleBom: BomItem[] = [
    {
      id: 'item-1',
      name: 'ESP32 DevKit V1',
      specification: '3.3V logic, dual core 240MHz',
      subsystem: 'Hệ thống điều khiển',
      quantity: 1,
      unitPrice: 80000,
      totalPrice: 80000,
      currency: 'VND',
      status: 'found',
      selectedLink: 'https://shopee.vn/esp32',
      manualPrice: {
        amount: 80000,
        currency: 'VND',
        entrySource: 'user_input',
      },
      alternatives: [
        {
          title: 'ESP32 Type-C CP2102',
          url: 'https://hshop.vn/esp32-type-c',
          supplierName: 'Hshop',
          linkStatus: 'verified',
          price: 90000,
          reason: 'Cổng Type-C tiện lợi',
        },
      ],
      note: '',
    },
    {
      id: 'item-2',
      name: 'Pin LiPo 2S 7.4V',
      specification: '7.4V 1500mAh',
      subsystem: 'Hệ thống nguồn',
      quantity: 1,
      unitPrice: 120000,
      totalPrice: 120000,
      currency: 'VND',
      status: 'found',
      selectedLink: 'https://shopee.vn/lipo-2s',
      manualPrice: {
        amount: 120000,
        currency: 'VND',
        entrySource: 'user_input',
      },
      alternatives: [],
      note: '',
    },
  ];

  it('coordinates Comparison, Graph, and Simulation on the same BOM state seamlessly', () => {
    // 1. Build comparison for item-1
    const comparison = buildComparisonMatrix(sampleBom[0], sampleBom[0].alternatives);
    expect(comparison.candidates).toHaveLength(2);
    expect(comparison.candidates[0].isPrimary).toBe(true);

    // 2. Build system graph
    const graph = buildSystemGraph(sampleBom);
    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges.length).toBeGreaterThan(0);

    // 3. Simulate swapping item-1 with candidate
    const sim = simulateComponentSwap(sampleBom, 'item-1', sampleBom[0].alternatives[0]);
    expect(sim.originalItem.id).toBe('item-1');
    expect(sim.budgetImpact.difference).toBe(10000); // 90000 - 80000

    // 4. Verify immutable state update when user accepts swap
    const updatedBom = sampleBom.map((it) => {
      if (it.id !== 'item-1') return it;
      const alt = sampleBom[0].alternatives[0];
      return {
        ...it,
        name: alt.title,
        selectedLink: alt.url,
        supplierName: alt.supplierName,
      };
    });

    expect(updatedBom[0].name).toBe('ESP32 Type-C CP2102');
    // Ensure item-2 manual price was preserved untouched
    expect(updatedBom[1].manualPrice?.amount).toBe(120000);
    expect(updatedBom[1].totalPrice).toBe(120000);
  });
});

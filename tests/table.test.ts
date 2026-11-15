import { describe, it, expect } from 'vitest';
import { calculateBomSummary, formatVnd } from '../components/BomTable';
import { BomItem } from '../lib/types';

describe('BOM Table Calculation Logic', () => {
  it('should calculate total estimated budget and item counts correctly', () => {
    const items: BomItem[] = [
      {
        id: '1',
        name: 'Item 1',
        specification: '',
        quantity: 2,
        unitPrice: 50000,
        totalPrice: 100000,
        currency: 'VND',
        status: 'found',
        selectedLink: 'https://example.com/1',
        alternatives: [],
        note: ''
      },
      {
        id: '2',
        name: 'Item 2',
        specification: '',
        quantity: 1,
        unitPrice: 200000,
        totalPrice: 200000,
        currency: 'VND',
        status: 'pending',
        selectedLink: '',
        alternatives: [],
        note: ''
      }
    ];

    const summary = calculateBomSummary(items);
    expect(summary.totalItems).toBe(2);
    expect(summary.foundItems).toBe(1);
    expect(summary.pendingItems).toBe(1);
    expect(summary.totalEstimatedBudget).toBe(300000);
  });

  it('should return zeroes for empty items list', () => {
    const summary = calculateBomSummary([]);
    expect(summary.totalItems).toBe(0);
    expect(summary.foundItems).toBe(0);
    expect(summary.pendingItems).toBe(0);
    expect(summary.totalEstimatedBudget).toBe(0);
  });

  it('should fallback to quantity * unitPrice if totalPrice is zero or invalid', () => {
    const items: BomItem[] = [
      {
        id: '1',
        name: 'Item 1',
        specification: '',
        quantity: 3,
        unitPrice: 25000,
        totalPrice: 0,
        currency: 'VND',
        status: 'found',
        selectedLink: '',
        alternatives: [],
        note: ''
      }
    ];

    const summary = calculateBomSummary(items);
    expect(summary.totalEstimatedBudget).toBe(75000);
  });

  it('should handle items with searching and not_found status correctly', () => {
    const items: BomItem[] = [
      {
        id: '1',
        name: 'Item 1',
        specification: '',
        quantity: 1,
        unitPrice: 10000,
        totalPrice: 10000,
        currency: 'VND',
        status: 'found',
        selectedLink: '',
        alternatives: [],
        note: ''
      },
      {
        id: '2',
        name: 'Item 2',
        specification: '',
        quantity: 1,
        unitPrice: 20000,
        totalPrice: 20000,
        currency: 'VND',
        status: 'searching',
        selectedLink: '',
        alternatives: [],
        note: ''
      },
      {
        id: '3',
        name: 'Item 3',
        specification: '',
        quantity: 1,
        unitPrice: 30000,
        totalPrice: 30000,
        currency: 'VND',
        status: 'not_found',
        selectedLink: '',
        alternatives: [],
        note: ''
      },
      {
        id: '4',
        name: 'Item 4',
        specification: '',
        quantity: 1,
        unitPrice: 40000,
        totalPrice: 40000,
        currency: 'VND',
        status: 'pending',
        selectedLink: '',
        alternatives: [],
        note: ''
      }
    ];

    const summary = calculateBomSummary(items);
    expect(summary.totalItems).toBe(4);
    expect(summary.foundItems).toBe(1);
    expect(summary.pendingItems).toBe(3); // non-found items pending resolution
    expect(summary.totalEstimatedBudget).toBe(100000);
  });

  describe('formatVnd helper', () => {
    it('should format numbers with dot separators correctly', () => {
      expect(formatVnd(0)).toBe('0');
      expect(formatVnd(1000)).toBe('1.000');
      expect(formatVnd(300000)).toBe('300.000');
      expect(formatVnd(1250000)).toBe('1.250.000');
    });

    it('should handle invalid or NaN values gracefully', () => {
      expect(formatVnd(NaN)).toBe('0');
      // @ts-expect-error test invalid input
      expect(formatVnd(undefined)).toBe('0');
    });
  });
});

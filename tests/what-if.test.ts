import { describe, it, expect } from 'vitest';
import { simulateComponentSwap } from '@/lib/what-if';
import { BomItem, BomItemAlternative } from '@/lib/types';

describe('What-If Component Simulator (Section 14.7)', () => {
  const baseBom: BomItem[] = [
    {
      id: 'item-mcu',
      name: 'ESP32 DevKit V1',
      specification: '3.3V logic, dual core',
      subsystem: 'Hệ thống điều khiển',
      quantity: 1,
      unitPrice: 75000,
      totalPrice: 75000,
      currency: 'VND',
      status: 'found',
      selectedLink: 'https://shopee.vn/esp32',
      manualPrice: {
        amount: 75000,
        currency: 'VND',
        entrySource: 'user_input',
      },
      alternatives: [],
      note: '',
    },
    {
      id: 'item-sensor',
      name: 'Cảm biến siêu âm HC-SR04',
      specification: '5V DC, phát xung Echo 5V',
      subsystem: 'Hệ thống cảm biến',
      quantity: 1,
      unitPrice: 25000,
      totalPrice: 25000,
      currency: 'VND',
      status: 'found',
      selectedLink: 'https://shopee.vn/hc-sr04',
      manualPrice: {
        amount: 25000,
        currency: 'VND',
        entrySource: 'user_input',
      },
      alternatives: [],
      note: '',
    },
  ];

  it('simulates replacing HC-SR04 (5V) with RCWL-1601 (3.3V compatible sensor)', () => {
    const replacement: BomItemAlternative = {
      title: 'Cảm biến siêu âm RCWL-1601 tương thích 3.3V',
      url: 'https://hshop.vn/rcwl-1601',
      supplierName: 'Hshop',
      matchGrade: 'strong_match',
      reason: 'Hoạt động dải 3.3V - 5V, không cần mạch chuyển mức logic cho ESP32',
      price: 32000,
    };

    const sim = simulateComponentSwap(baseBom, 'item-sensor', replacement);

    expect(sim.originalItem.id).toBe('item-sensor');
    expect(sim.candidateItem.title).toContain('RCWL-1601');

    // Logic level incompatibility should be resolved!
    expect(sim.compatibilityDiff.resolvedIssues.length).toBeGreaterThan(0);
    expect(sim.compatibilityDiff.newIssues).toHaveLength(0);
    expect(sim.compatibilityDiff.statusChangedTo).toBe('compatible');

    // Budget impact
    expect(sim.budgetImpact.originalSubtotal).toBe(25000);
    expect(sim.budgetImpact.newEstimatedSubtotal).toBe(32000);
    expect(sim.budgetImpact.difference).toBe(7000);

    // Tradeoffs
    expect(sim.tradeoffs.length).toBeGreaterThan(0);
  });

  it('simulates introducing incompatibility: removing driver for motor', () => {
    const bomWithMotorAndDriver: BomItem[] = [
      {
        id: 'item-driver',
        name: 'Mạch điều khiển động cơ TB6612FNG',
        specification: 'Driver motor 1.2A',
        subsystem: 'Hệ thống truyền động',
        quantity: 1,
        unitPrice: 40000,
        totalPrice: 40000,
        currency: 'VND',
        status: 'found',
        selectedLink: 'https://shopee.vn/tb6612',
        alternatives: [],
        note: '',
      },
      {
        id: 'item-motor',
        name: 'Động cơ DC giảm tốc TT 6V',
        specification: 'Động cơ DC 6V',
        subsystem: 'Hệ thống truyền động',
        quantity: 2,
        unitPrice: 20000,
        totalPrice: 40000,
        currency: 'VND',
        status: 'found',
        selectedLink: 'https://shopee.vn/motor-tt',
        alternatives: [],
        note: '',
      },
    ];

    // Swap driver with a relay module (which cannot do PWM speed control for 2 DC motors)
    const replacementRelay: BomItemAlternative = {
      title: 'Module Relay 1 kênh 5V',
      url: 'https://shopee.vn/relay-1k',
      supplierName: 'Shopee',
      reason: 'Chỉ đóng ngắt nguồn ON/OFF tải điện, chịu dòng tối đa 10A',
    };

    const sim = simulateComponentSwap(bomWithMotorAndDriver, 'item-driver', replacementRelay);

    // Should introduce a new issue: missing motor driver
    expect(sim.compatibilityDiff.newIssues.length).toBeGreaterThan(0);
    expect(sim.compatibilityDiff.statusChangedTo).toBe('conditional');
  });

  it('handles target item not found gracefully', () => {
    const replacement: BomItemAlternative = {
      title: 'Alternative item',
      url: 'https://example.com',
    };

    expect(() => {
      simulateComponentSwap(baseBom, 'non-existent-id', replacement);
    }).toThrow(/không tìm thấy/i);
  });
});

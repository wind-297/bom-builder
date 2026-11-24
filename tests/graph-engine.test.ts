import { describe, it, expect } from 'vitest';
import { buildSystemGraph } from '@/lib/graph-engine';
import { BomItem } from '@/lib/types';

describe('System Compatibility Graph Engine (Section 14.6)', () => {
  const lineFollowerBOM: BomItem[] = [
    {
      id: 'pwr-1',
      name: 'Pin LiPo 3S 11.1V 2200mAh',
      specification: 'Điện áp danh định 11.1V, xả 25C',
      subsystem: 'Hệ thống nguồn',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      currency: 'VND',
      status: 'found',
      selectedLink: 'https://shopee.vn/pin-lipo-3s',
      alternatives: [],
      note: '',
    },
    {
      id: 'buck-1',
      name: 'Mạch hạ áp LM2596 DC-DC',
      specification: 'Input: 4-40V, Output: 1.25-35V 3A',
      subsystem: 'Hệ thống nguồn',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      currency: 'VND',
      status: 'found',
      selectedLink: 'https://shopee.vn/lm2596',
      alternatives: [],
      note: '',
    },
    {
      id: 'mcu-1',
      name: 'ESP32 DevKit V1 30 chân',
      specification: 'MCU Dual Core 240MHz, 3.3V logic, WiFi/BLE',
      subsystem: 'Hệ thống điều khiển',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      currency: 'VND',
      status: 'found',
      selectedLink: 'https://shopee.vn/esp32',
      alternatives: [],
      note: '',
    },
    {
      id: 'drv-1',
      name: 'Mạch điều khiển động cơ TB6612FNG',
      specification: 'Điện áp motor 4.5-15V, dòng 1.2A/kênh, logic 2.7-5.5V',
      subsystem: 'Hệ thống truyền động',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      currency: 'VND',
      status: 'found',
      selectedLink: 'https://shopee.vn/tb6612',
      alternatives: [],
      note: '',
    },
    {
      id: 'mtr-1',
      name: 'Động cơ DC giảm tốc GA12-N20 6V 500RPM',
      specification: '6V DC, dòng không tải 0.08A, tải tối đa 1A',
      subsystem: 'Hệ thống truyền động',
      quantity: 2,
      unitPrice: 0,
      totalPrice: 0,
      currency: 'VND',
      status: 'found',
      selectedLink: 'https://shopee.vn/ga12-n20',
      alternatives: [],
      note: '',
    },
    {
      id: 'sns-1',
      name: 'Thanh cảm biến dò line 5 kênh TCRT5000',
      specification: 'Điện áp hoạt động 3.3V - 5V, ngõ ra Digital',
      subsystem: 'Hệ thống cảm biến',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      currency: 'VND',
      status: 'found',
      selectedLink: 'https://shopee.vn/tcrt5000',
      alternatives: [],
      note: '',
    },
  ];

  it('generates graph nodes for all BOM items grouped by subsystem', () => {
    const graph = buildSystemGraph(lineFollowerBOM);
    expect(graph.nodes).toHaveLength(6);

    const mcuNode = graph.nodes.find((n) => n.id === 'mcu-1');
    expect(mcuNode).toBeDefined();
    expect(mcuNode?.label).toContain('ESP32');
    expect(mcuNode?.subsystem).toBe('Hệ thống điều khiển');
  });

  it('builds power and signal edges between related subsystems', () => {
    const graph = buildSystemGraph(lineFollowerBOM);
    expect(graph.edges.length).toBeGreaterThan(0);

    // Power edges: Battery -> Buck and Battery -> Driver
    const powerEdges = graph.edges.filter((e) => e.type === 'power');
    expect(powerEdges.length).toBeGreaterThanOrEqual(2);

    // Signal edges: MCU -> Driver and Sensor -> MCU
    const signalEdges = graph.edges.filter((e) => e.type === 'signal');
    expect(signalEdges.length).toBeGreaterThanOrEqual(1);
  });

  it('detects conditional or incompatible edge when 3.3V MCU connects to 5V HC-SR04', () => {
    const bomWithHCSR04: BomItem[] = [
      ...lineFollowerBOM,
      {
        id: 'sns-hcsr04',
        name: 'Cảm biến siêu âm HC-SR04',
        specification: '5V DC, phát xung Echo 5V',
        subsystem: 'Hệ thống cảm biến',
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
        currency: 'VND',
        status: 'found',
        selectedLink: 'https://shopee.vn/hc-sr04',
        alternatives: [],
        note: '',
      },
    ];

    const graph = buildSystemGraph(bomWithHCSR04);
    const hcsr04Edge = graph.edges.find(
      (e) => (e.source === 'sns-hcsr04' || e.target === 'sns-hcsr04') && e.type === 'signal'
    );
    expect(hcsr04Edge).toBeDefined();
    expect(hcsr04Edge?.status).toBe('conditional');
    expect(hcsr04Edge?.description).toContain('Echo 5V');
  });

  it('detects missing driver when motors exist without driver', () => {
    const bomWithoutDriver = lineFollowerBOM.filter((it) => it.id !== 'drv-1');
    const graph = buildSystemGraph(bomWithoutDriver);
    
    // Motor should have an incompatible or missing driver edge
    const motorEdges = graph.edges.filter((e) => e.target === 'mtr-1' || e.source === 'mtr-1');
    const incompatibleMotorEdge = motorEdges.find((e) => e.status === 'incompatible');
    expect(incompatibleMotorEdge).toBeDefined();
  });

  it('handles empty BOM gracefully', () => {
    const graph = buildSystemGraph([]);
    expect(graph.nodes).toHaveLength(0);
    expect(graph.edges).toHaveLength(0);
    expect(graph.summary.compatibleCount).toBe(0);
  });
});

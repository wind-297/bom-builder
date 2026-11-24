import { BomItem } from './types';
import { checkBomCompatibility } from './compatibility';

export interface GraphNode {
  id: string;
  label: string;
  subsystem: string;
  voltage?: string;
  current?: string;
  status: 'compatible' | 'conditional' | 'incompatible' | 'unknown';
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'power' | 'signal' | 'mechanical';
  status: 'compatible' | 'conditional' | 'incompatible' | 'unknown';
  description: string;
}

export interface SystemGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  summary: {
    compatibleCount: number;
    conditionalCount: number;
    incompatibleCount: number;
    unknownCount: number;
  };
}

function extractVoltage(text: string): string | undefined {
  const m = text.match(/(\d+(?:\.\d+)?\s*(?:V|volt))/i);
  return m ? m[1] : undefined;
}

function extractCurrent(text: string): string | undefined {
  const m = text.match(/(\d+(?:\.\d+)?\s*(?:A|mA|amp|mAh))/i);
  return m ? m[1] : undefined;
}

export function buildSystemGraph(items: BomItem[]): SystemGraph {
  if (!items || items.length === 0) {
    return {
      nodes: [],
      edges: [],
      summary: {
        compatibleCount: 0,
        conditionalCount: 0,
        incompatibleCount: 0,
        unknownCount: 0,
      },
    };
  }

  // 1. Classify items into subsystems & categories
  const powerSources: BomItem[] = [];
  const powerConverters: BomItem[] = [];
  const controllers: BomItem[] = [];
  const drivers: BomItem[] = [];
  const motors: BomItem[] = [];
  const sensors: BomItem[] = [];
  const misc: BomItem[] = [];

  for (const it of items) {
    const text = `${it.name} ${it.specification || ''} ${it.subsystem || ''}`.toLowerCase();

    if (text.includes('hạ áp') || text.includes('buck') || text.includes('lm2596') || text.includes('tăng áp') || text.includes('boost')) {
      powerConverters.push(it);
    } else if (text.includes('pin') || text.includes('battery') || text.includes('nguồn') || text.includes('adapter') || text.includes('lipo')) {
      powerSources.push(it);
    } else if (text.includes('driver') || text.includes('l298n') || text.includes('tb6612') || text.includes('bts7960') || text.includes('a4988') || text.includes('mạch điều khiển động cơ')) {
      drivers.push(it);
    } else if (text.includes('động cơ') || text.includes('motor') || text.includes('servo') || text.includes('bước') || text.includes('step')) {
      motors.push(it);
    } else if (text.includes('cảm biến') || text.includes('sensor') || text.includes('hc-sr04') || text.includes('tcrt5000') || text.includes('mpu6050')) {
      sensors.push(it);
    } else if (text.includes('esp32') || text.includes('arduino') || text.includes('stm32') || text.includes('raspberry') || text.includes('điều khiển') || text.includes('uno') || text.includes('nano')) {
      controllers.push(it);
    } else {
      misc.push(it);
    }
  }

  // 2. Identify compatibility issues from rules engine
  const issues = checkBomCompatibility(items);
  const hasHighVoltageIssue = issues.some((i) => i.category === 'power' && i.severity === 'warning');
  const hasMissingDriverIssue = issues.some((i) => i.category === 'driver');
  const hasLogicLevelIssue = issues.some((i) => i.category === 'logic_level');

  // 3. Create nodes
  const nodes: GraphNode[] = items.map((it) => {
    const text = `${it.name} ${it.specification || ''}`.toLowerCase();
    let nodeStatus: 'compatible' | 'conditional' | 'incompatible' | 'unknown' = 'compatible';

    if (hasMissingDriverIssue && (text.includes('động cơ') || text.includes('motor')) && !text.includes('servo')) {
      nodeStatus = 'incompatible';
    } else if (hasHighVoltageIssue && (text.includes('esp32') || text.includes('arduino') || text.includes('stm32'))) {
      nodeStatus = 'conditional';
    } else if (hasLogicLevelIssue && text.includes('hc-sr04')) {
      nodeStatus = 'conditional';
    }

    return {
      id: it.id,
      label: it.name,
      subsystem: it.subsystem || 'Hệ thống phụ trợ',
      voltage: extractVoltage(it.specification || it.name),
      current: extractCurrent(it.specification || it.name),
      status: nodeStatus,
    };
  });

  // 4. Create edges
  const edges: GraphEdge[] = [];
  let edgeCounter = 1;

  // Power Distribution Edges
  if (powerSources.length > 0) {
    const primaryPwr = powerSources[0];

    // Source -> Converters
    for (const conv of powerConverters) {
      edges.push({
        id: `e-${edgeCounter++}`,
        source: primaryPwr.id,
        target: conv.id,
        type: 'power',
        status: 'compatible',
        description: 'Cung cấp nguồn đầu vào DC (Vin)',
      });
    }

    // Source/Converter -> MCU
    const mcuPowerFeed = powerConverters.length > 0 ? powerConverters[0] : primaryPwr;
    for (const mcu of controllers) {
      edges.push({
        id: `e-${edgeCounter++}`,
        source: mcuPowerFeed.id,
        target: mcu.id,
        type: 'power',
        status: hasHighVoltageIssue && powerConverters.length === 0 ? 'conditional' : 'compatible',
        description: powerConverters.length > 0
          ? 'Hạ áp ổn định 5V cấp cho vi điều khiển'
          : 'Cấp nguồn trực tiếp cho vi điều khiển (chú ý dải Vin)',
      });
    }

    // Source -> Drivers
    for (const drv of drivers) {
      edges.push({
        id: `e-${edgeCounter++}`,
        source: primaryPwr.id,
        target: drv.id,
        type: 'power',
        status: 'compatible',
        description: 'Cấp nguồn động lực Motor (Vm)',
      });
    }
  }

  // Driver -> Motors
  for (const mtr of motors) {
    if (drivers.length > 0) {
      for (const drv of drivers) {
        edges.push({
          id: `e-${edgeCounter++}`,
          source: drv.id,
          target: mtr.id,
          type: 'power',
          status: 'compatible',
          description: 'Cấp dòng công suất điều khiển đảo chiều (H-Bridge)',
        });
      }
    } else {
      // Missing driver issue: connect directly to controller or power as incompatible
      if (controllers.length > 0) {
        edges.push({
          id: `e-${edgeCounter++}`,
          source: controllers[0].id,
          target: mtr.id,
          type: 'power',
          status: 'incompatible',
          description: 'Lỗi: Vi điều khiển không thể cấp đủ dòng trực tiếp cho động cơ (Thiếu Driver)',
        });
      }
    }
  }

  // Signal Edges: MCU -> Drivers
  for (const mcu of controllers) {
    for (const drv of drivers) {
      edges.push({
        id: `e-${edgeCounter++}`,
        source: mcu.id,
        target: drv.id,
        type: 'signal',
        status: 'compatible',
        description: 'Tín hiệu PWM điều tốc & GPIO chọn hướng quay',
      });
    }
  }

  // Signal Edges: Sensors -> MCU
  for (const sns of sensors) {
    const isHCSR04 = `${sns.name} ${sns.specification || ''}`.toLowerCase().includes('hc-sr04');
    const isEspOrStm = controllers.some((c) =>
      `${c.name} ${c.specification || ''}`.toLowerCase().includes('esp32') ||
      `${c.name} ${c.specification || ''}`.toLowerCase().includes('stm32')
    );

    for (const mcu of controllers) {
      const isConditionalEcho = isHCSR04 && isEspOrStm;
      edges.push({
        id: `e-${edgeCounter++}`,
        source: sns.id,
        target: mcu.id,
        type: 'signal',
        status: isConditionalEcho ? 'conditional' : 'compatible',
        description: isConditionalEcho
          ? 'Tín hiệu Echo 5V vào GPIO 3.3V (Cần phân áp hoặc mạch chuyển mức logic)'
          : 'Đọc dữ liệu Digital / Analog / I2C',
      });
    }
  }

  // Compute summary stats
  let compatibleCount = 0;
  let conditionalCount = 0;
  let incompatibleCount = 0;
  let unknownCount = 0;

  for (const e of edges) {
    if (e.status === 'compatible') compatibleCount++;
    else if (e.status === 'conditional') conditionalCount++;
    else if (e.status === 'incompatible') incompatibleCount++;
    else unknownCount++;
  }

  return {
    nodes,
    edges,
    summary: {
      compatibleCount,
      conditionalCount,
      incompatibleCount,
      unknownCount,
    },
  };
}

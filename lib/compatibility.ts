import { BomItem } from './types';

export interface CompatibilityIssue {
  itemId?: string;
  itemName?: string;
  severity: 'error' | 'warning' | 'info';
  category: 'power' | 'voltage' | 'driver' | 'logic_level' | 'pin_count';
  message: string;
  recommendation: string;
}

export function checkBomCompatibility(items: BomItem[]): CompatibilityIssue[] {
  const issues: CompatibilityIssue[] = [];
  if (!items || items.length === 0) return issues;

  const allNamesAndSpecs = items
    .map((it) => `${it.name} ${it.specification || ''}`)
    .join(' ')
    .toLowerCase();

  const motors = items.filter((it) => {
    const text = `${it.name} ${it.specification || ''}`.toLowerCase();
    return (
      it.subsystem?.includes('truyền động') ||
      text.includes('động cơ') ||
      text.includes('motor') ||
      text.includes('step')
    );
  });

  const drivers = items.filter((it) => {
    const text = `${it.name} ${it.specification || ''}`.toLowerCase();
    return (
      text.includes('driver') ||
      text.includes('l298n') ||
      text.includes('tb6612') ||
      text.includes('bts7960') ||
      text.includes('a4988') ||
      text.includes('drv8825') ||
      text.includes('mạch điều khiển động cơ')
    );
  });

  const controllers = items.filter((it) => {
    const text = `${it.name} ${it.specification || ''}`.toLowerCase();
    return (
      it.subsystem?.includes('điều khiển') ||
      text.includes('arduino') ||
      text.includes('esp32') ||
      text.includes('stm32') ||
      text.includes('raspberry') ||
      text.includes('uno') ||
      text.includes('nano')
    );
  });

  const powerSources = items.filter((it) => {
    const text = `${it.name} ${it.specification || ''}`.toLowerCase();
    return (
      it.subsystem?.includes('nguồn') ||
      text.includes('pin') ||
      text.includes('battery') ||
      text.includes('nguồn') ||
      text.includes('adapter')
    );
  });

  const stepDowns = items.filter((it) => {
    const text = `${it.name} ${it.specification || ''}`.toLowerCase();
    return (
      text.includes('hạ áp') ||
      text.includes('buck') ||
      text.includes('lm2596') ||
      text.includes('xl4015') ||
      text.includes('bảo vệ pin')
    );
  });

  // Rule 1: Motor present but missing driver
  if (motors.length > 0 && drivers.length === 0) {
    const isOnlyServos = motors.every((m) =>
      `${m.name} ${m.specification}`.toLowerCase().includes('servo')
    );
    if (!isOnlyServos) {
      issues.push({
        severity: 'warning',
        category: 'driver',
        message: 'Dự án có động cơ DC/bước nhưng chưa có Mạch công suất điều khiển (Driver).',
        recommendation:
          'Bổ sung mạch Driver (như TB6612FNG, L298N, hoặc A4988) để vi điều khiển có thể điều khiển động cơ an toàn.',
      });
    }
  }

  // Rule 2: High voltage power source (e.g. 11.1V 3S LiPo, 12V) without Buck step-down converter
  const isHighVoltageBattery = powerSources.some((p) => {
    const text = `${p.name} ${p.specification}`.toLowerCase();
    return (
      text.includes('3s') ||
      text.includes('11.1v') ||
      text.includes('12v') ||
      text.includes('4s') ||
      text.includes('14.8v')
    );
  });

  if (isHighVoltageBattery && stepDowns.length === 0 && controllers.length > 0) {
    issues.push({
      severity: 'warning',
      category: 'power',
      message:
        'Nguồn pin điện áp cao (11.1V - 12V) cần module hạ áp (Buck) để cấp 5V an toàn cho vi điều khiển.',
      recommendation:
        'Bổ sung module hạ áp DC-DC Buck LM2596 để cấp 5V ổn định cho vi điều khiển và cảm biến.',
    });
  }

  // Rule 3: 3.3V logic MCU (ESP32, STM32, Raspberry Pi) paired with 5V ultrasonic HC-SR04 without level shifter
  const has3v3Mcu = controllers.some((c) => {
    const text = `${c.name} ${c.specification}`.toLowerCase();
    return text.includes('esp32') || text.includes('stm32') || text.includes('raspberry');
  });

  const has5vEchoSensor = items.some((it) => {
    const text = `${it.name} ${it.specification}`.toLowerCase();
    return text.includes('hc-sr04') && !text.includes('rcwl') && !text.includes('3.3v');
  });

  if (has3v3Mcu && has5vEchoSensor) {
    issues.push({
      severity: 'info',
      category: 'logic_level',
      message:
        'Cảm biến siêu âm HC-SR04 phát xung Echo 5V, trong khi chân GPIO của ESP32/STM32 chỉ chịu tối đa 3.3V.',
      recommendation:
        'Sử dụng cầu phân áp 2 điện trở (1kΩ + 2kΩ) hoặc mạch chuyển đổi mức logic I2C/GPIO 5V-3.3V để bảo vệ vi điều khiển.',
    });
  }

  return issues;
}

import { describe, it, expect } from 'vitest';
import { checkBomCompatibility, CompatibilityIssue } from '../lib/compatibility';
import { createNewBomItem, BomItem } from '../lib/types';

describe('Robotics BOM Compatibility Checker', () => {
  it('should detect when motor voltage exceeds driver voltage or driver is missing', () => {
    const motor = createNewBomItem('Động cơ GA25 12V 100rpm', 'Điện áp 12VDC, dòng tải 1.2A', 2);
    motor.subsystem = 'Hệ thống truyền động';

    const issues = checkBomCompatibility([motor]);
    expect(issues.some((i) => i.severity === 'warning' && i.message.toLowerCase().includes('driver'))).toBe(true);
  });

  it('should detect when battery voltage is high (e.g. 12V/11.1V) but buck converter / 5V regulator is missing', () => {
    const battery = createNewBomItem('Pin Li-Po 3S 11.1V 2200mAh', 'Điện áp 11.1V - 12.6V', 1);
    battery.subsystem = 'Hệ thống nguồn điện';
    const mcu = createNewBomItem('ESP32 NodeMCU', 'Điện áp hoạt động 3.3V/5V Vin', 1);
    mcu.subsystem = 'Hệ thống điều khiển';

    const issues = checkBomCompatibility([battery, mcu]);
    expect(issues.some((i) => i.message.toLowerCase().includes('hạ áp') || i.message.toLowerCase().includes('buck'))).toBe(true);
  });

  it('should pass cleanly when power, driver, motor, and controller are properly matched', () => {
    const mcu = createNewBomItem('Mạch vi điều khiển Arduino Uno R3', '5V', 1);
    mcu.subsystem = 'Hệ thống điều khiển';

    const driver = createNewBomItem('Mạch điều khiển động cơ L298N', 'Điện áp 5-35V, 2A', 1);
    driver.subsystem = 'Hệ thống truyền động';

    const motor = createNewBomItem('2 Động cơ DC 6V giảm tốc', '6V', 2);
    motor.subsystem = 'Hệ thống truyền động';

    const battery = createNewBomItem('Khay 2 pin 18650 7.4V', '7.4V', 1);
    battery.subsystem = 'Hệ thống nguồn điện';

    const issues = checkBomCompatibility([mcu, driver, motor, battery]);
    const errors = issues.filter((i) => i.severity === 'error');
    expect(errors.length).toBe(0);
  });
});

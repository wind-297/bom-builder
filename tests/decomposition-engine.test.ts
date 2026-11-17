import { describe, it, expect, vi } from 'vitest';
import {
  detectSearchIntent,
  validateBomCompleteness,
  parseBudgetConstraint,
  parseAlreadyOwnedItems,
  decomposeProjectOrProduct,
} from '../lib/decomposition-engine';

describe('Robotics BOM Decomposition Engine', () => {
  describe('Intent Detection', () => {
    it('should detect Single Product Search for single component queries', () => {
      expect(detectSearchIntent('Tìm ESP32')).toBe('single_product');
      expect(detectSearchIntent('Mua động cơ GA25 12V 100rpm')).toBe('single_product');
      expect(detectSearchIntent('Cảm biến siêu âm HC-SR04')).toBe('single_product');
      expect(detectSearchIntent('Driver L298N')).toBe('single_product');
    });

    it('should detect Project BOM Search for robot builds', () => {
      expect(detectSearchIntent('Robot dò line')).toBe('project_bom');
      expect(detectSearchIntent('Tìm vật tư để chế tạo robot dò line')).toBe('project_bom');
      expect(detectSearchIntent('Xe robot 4 bánh Mecanum')).toBe('project_bom');
      expect(detectSearchIntent('Cánh tay robot 4 bậc tự do')).toBe('project_bom');
      expect(detectSearchIntent('Robot tránh vật cản sử dụng Arduino')).toBe('project_bom');
    });
  });

  describe('Constraint Extraction', () => {
    it('should extract budget constraints from user prompt', () => {
      expect(parseBudgetConstraint('Tôi muốn làm robot dò line với ngân sách 800.000 VNĐ')).toBe(800000);
      expect(parseBudgetConstraint('Kinh phí 1.500.000đ cho robot mini')).toBe(1500000);
      expect(parseBudgetConstraint('Budget 500k')).toBe(500000);
      expect(parseBudgetConstraint('Robot dò line cơ bản')).toBeNull();
    });

    it('should extract already owned items to exclude from purchasing budget', () => {
      const owned = parseAlreadyOwnedItems('Tôi đã có ESP32 và pin, hãy loại chúng khỏi danh sách cần mua');
      expect(owned.length).toBeGreaterThan(0);
      expect(owned.some((item) => /esp32/i.test(item))).toBe(true);
      expect(owned.some((item) => /pin/i.test(item))).toBe(true);
    });
  });

  describe('BOM Completeness Validation', () => {
    it('should flag and auto-complete missing essential robotics subsystems', () => {
      // If a robot BOM only has motors and sensors, it lacks controller, driver, and power
      const partialItems = [
        { name: 'Động cơ DC giảm tốc', subsystem: 'Truyền động' },
        { name: 'Cảm biến dò line', subsystem: 'Cảm biến' },
      ];
      const validated = validateBomCompleteness('Robot dò line', partialItems as any);
      const names = validated.map((it) => it.name.toLowerCase());

      // Controller and Driver and Power should be added or present
      expect(names.some((n) => n.includes('điều khiển') || n.includes('arduino') || n.includes('esp32'))).toBe(true);
      expect(names.some((n) => n.includes('driver') || n.includes('l298n') || n.includes('mạch'))).toBe(true);
      expect(names.some((n) => n.includes('pin') || n.includes('nguồn'))).toBe(true);
    });
  });

  describe('Single Product vs Project Decomposition Execution', () => {
    it('should handle Single Product Search directly without full decomposition', async () => {
      const result = await decomposeProjectOrProduct('Tìm ESP32 NodeMCU');
      expect(result.intent).toBe('single_product');
      expect(result.items.length).toBe(1);
      expect(result.items[0].name.toLowerCase()).toContain('esp32');
    });

    it('should handle ambiguous prompts by asking clarifying questions or providing baseline', async () => {
      const result = await decomposeProjectOrProduct('Tôi muốn chế tạo một robot nhưng chưa xác định được loại cụ thể');
      expect(result.isAmbiguous).toBe(true);
      expect(result.clarifyingQuestion).toBeDefined();
    });

    it('Test A: decomposes "Robot dò line" into multi-subsystem BOM', async () => {
      const result = await decomposeProjectOrProduct('Robot dò line');
      expect(result.intent).toBe('project_bom');
      expect(result.items.length).toBeGreaterThanOrEqual(4);
      const subs = result.items.map((it) => it.subsystem || '');
      expect(subs.some((s) => s.includes('điều khiển') || s.includes('cảm biến'))).toBe(true);
    });

    it('Test B: decomposes "Robot tránh vật cản sử dụng Arduino" with Arduino and sensors', async () => {
      const result = await decomposeProjectOrProduct('Robot tránh vật cản sử dụng Arduino');
      expect(result.intent).toBe('project_bom');
      const allText = result.items.map((it) => `${it.name} ${it.specification} ${it.note}`).join(' ').toLowerCase();
      expect(allText).toContain('arduino');
      expect(allText).toContain('siêu âm');
    });

    it('Test C: decomposes "Cánh tay robot 4 bậc tự do" with servos and arm frame', async () => {
      const result = await decomposeProjectOrProduct('Cánh tay robot 4 bậc tự do');
      expect(result.intent).toBe('project_bom');
      const allText = result.items.map((it) => `${it.name} ${it.specification} ${it.note}`).join(' ').toLowerCase();
      expect(allText).toContain('servo');
      expect(allText).toContain('cánh tay');
    });

    it('Test D: decomposes camera robot "Robot tự hành sử dụng camera để nhận diện vật thể"', async () => {
      const result = await decomposeProjectOrProduct('Robot tự hành sử dụng camera để nhận diện vật thể');
      expect(result.intent).toBe('project_bom');
      expect(result.items.length).toBeGreaterThanOrEqual(4);
    });

    it('Test E: handles budget constraint "Tôi muốn làm robot dò line với ngân sách 800.000 VNĐ"', async () => {
      const result = await decomposeProjectOrProduct('Tôi muốn làm robot dò line với ngân sách 800.000 VNĐ');
      expect(result.intent).toBe('project_bom');
      expect(result.budgetConstraint).toBe(800000);
    });

    it('Test F: marks already-owned items "Tôi đã có ESP32 và pin, hãy loại chúng khỏi danh sách cần mua"', async () => {
      const result = await decomposeProjectOrProduct('Tôi đã có ESP32 và pin, hãy loại chúng khỏi danh sách cần mua');
      expect(result.intent).toBe('project_bom');
      const ownedItems = result.items.filter((it) => it.alreadyOwned);
      expect(ownedItems.length).toBeGreaterThan(0);
    });

    it('Test G: handles ambiguous prompt "Tôi muốn chế tạo một robot nhưng chưa xác định được loại cụ thể"', async () => {
      const result = await decomposeProjectOrProduct('Tôi muốn chế tạo một robot nhưng chưa xác định được loại cụ thể');
      expect(result.isAmbiguous).toBe(true);
      expect(result.clarifyingQuestion).toBeTruthy();
    });
  });
});

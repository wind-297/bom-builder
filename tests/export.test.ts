import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { exportBomToExcel, exportBomToCsv } from '../lib/excel';
import { BomItem } from '../lib/types';

describe('Excel Binary Export & File Formatting', () => {
  const sampleItems: BomItem[] = [
    {
      id: '1',
      name: 'Mạch nạp ST-Link V2',
      specification: 'Hỗ trợ STM32/STM8',
      quantity: 2,
      unitPrice: 45000,
      totalPrice: 90000,
      currency: 'VND',
      status: 'found',
      selectedLink: 'https://thegioiic.com/stlink',
      alternatives: [],
      note: 'Hàng chính hãng'
    },
    {
      id: '2',
      name: 'Cảm biến khoảng cách VL53L0X, ToF',
      specification: 'Giao tiếp I2C, đo tới 2m',
      quantity: 1,
      unitPrice: 65000,
      totalPrice: 65000,
      currency: 'VND',
      status: 'found',
      selectedLink: 'https://hshop.vn/vl53l0x',
      alternatives: [],
      note: 'Cần kèm cáp kết nối'
    }
  ];

  it('should generate valid excel buffer from bom list with custom project name', () => {
    const buffer = exportBomToExcel(sampleItems, 'Robot Cứu Hộ');
    expect(buffer).toBeDefined();
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer).toBeInstanceOf(Buffer);

    // Parse back using XLSX to verify contents
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    expect(workbook.SheetNames).toContain('BOM');
    expect(workbook.Props?.Title).toBe('Robot Cứu Hộ');

    const sheet = workbook.Sheets['BOM'];
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });
    expect(rows.length).toBe(3); // 1 header + 2 items
    expect(rows[0]).toEqual([
      'STT',
      'Tên linh kiện',
      'Thông số kỹ thuật',
      'Số lượng',
      'Đơn giá (VND)',
      'Thành tiền (VND)',
      'Link mua hàng',
      'Ghi chú'
    ]);
    expect(rows[1][1]).toBe('Mạch nạp ST-Link V2');
    expect(rows[1][3]).toBe(2);
    expect(rows[1][4]).toBe(45000);
    expect(rows[1][5]).toBe(90000);
    expect(rows[2][1]).toBe('Cảm biến khoảng cách VL53L0X, ToF');
  });

  it('should generate valid excel buffer for empty list', () => {
    const buffer = exportBomToExcel([], 'Dự án trống');
    expect(buffer).toBeDefined();
    expect(buffer.length).toBeGreaterThan(0);

    const workbook = XLSX.read(buffer, { type: 'buffer' });
    expect(workbook.SheetNames).toContain('BOM');
    const sheet = workbook.Sheets['BOM'];
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });
    expect(rows.length).toBe(1); // header only
  });

  it('should generate CSV with UTF-8 BOM, headers and escaped cells', () => {
    const csv = exportBomToCsv(sampleItems);
    expect(csv.startsWith('\uFEFF')).toBe(true);

    const lines = csv.split('\r\n');
    expect(lines[0]).toBe('\uFEFFSTT,Tên linh kiện,Thông số kỹ thuật,Số lượng,Đơn giá (VND),Thành tiền (VND),Link mua hàng,Ghi chú');

    // Second line should escape cell containing comma: 'Cảm biến khoảng cách VL53L0X, ToF'
    expect(lines[2]).toContain('"Cảm biến khoảng cách VL53L0X, ToF"');
    expect(lines[1]).toContain('Mạch nạp ST-Link V2');
    expect(lines[1]).toContain('90000');
  });

  it('should handle empty list in exportBomToCsv', () => {
    const csv = exportBomToCsv([]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    const lines = csv.split('\r\n');
    expect(lines.length).toBe(1);
  });
});

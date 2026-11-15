import { describe, it, expect } from 'vitest';
import { exportBomToCsv, exportBomToExcel, parseBomFile } from '../lib/excel';
import { BomItem } from '../lib/types';

describe('Excel/CSV Parser and Generator', () => {
  const sampleItems: BomItem[] = [
    {
      id: '1',
      name: 'Động cơ giảm tốc GA25',
      specification: '12V 300RPM',
      quantity: 4,
      unitPrice: 120000,
      totalPrice: 480000,
      currency: 'VND',
      status: 'found',
      selectedLink: 'https://hshop.vn/ga25',
      alternatives: [],
      note: 'Dùng cho bánh xe sau'
    }
  ];

  it('should export items to CSV and parse back correctly', async () => {
    const csvData = exportBomToCsv(sampleItems);
    expect(csvData).toContain('Động cơ giảm tốc GA25');
    expect(csvData).toContain('480000');

    const encoder = new TextEncoder();
    const buffer = encoder.encode(csvData).buffer;
    const parsed = await parseBomFile(buffer, 'test.csv');
    expect(parsed.length).toBe(1);
    expect(parsed[0].name).toBe('Động cơ giảm tốc GA25');
    expect(parsed[0].quantity).toBe(4);
  });

  it('should export items to Excel buffer and parse back', async () => {
    const excelBuffer = exportBomToExcel(sampleItems, 'Robot Test');
    expect(excelBuffer).toBeInstanceOf(Buffer);
    expect(excelBuffer.length).toBeGreaterThan(0);

    const parsed = await parseBomFile(excelBuffer, 'test.xlsx');
    expect(parsed.length).toBe(1);
    expect(parsed[0].name).toBe('Động cơ giảm tốc GA25');
    expect(parsed[0].unitPrice).toBe(120000);
  });

  it('should handle messy column headers in Excel/CSV gracefully', async () => {
    const messyCsv = 'Ten Linh Kien,So Luong,Ghi Chu\nCảm biến siêu âm SRF05,2,Gắn đầu xe';
    const encoder = new TextEncoder();
    const buffer = encoder.encode(messyCsv).buffer;
    const parsed = await parseBomFile(buffer, 'messy.csv');
    expect(parsed.length).toBe(1);
    expect(parsed[0].name).toBe('Cảm biến siêu âm SRF05');
    expect(parsed[0].quantity).toBe(2);
  });

  it('should handle empty buffer or files with only headers gracefully', async () => {
    const emptyCsv = 'Tên linh kiện,Số lượng,Đơn giá\n';
    const encoder = new TextEncoder();
    const parsed = await parseBomFile(encoder.encode(emptyCsv).buffer, 'empty.csv');
    expect(parsed).toEqual([]);
  });

  it('should handle formatted prices, quantity with units, and title rows', async () => {
    const complexCsv = [
      'BẢNG DỰ TOÁN CHI PHÍ ROBOT',
      '',
      'STT,Tên sản phẩm,Quy cách,SL,Đơn giá (VND),Ghi chú',
      '1,Driver động cơ L298N,2A Dual H-Bridge,2 cái,45.000 VND,Mạch cầu H điều khiển 2 động cơ',
      '2,Arduino Uno R3,DIP ATmega328P,1,"135,000",Bo mạch chính'
    ].join('\n');

    const encoder = new TextEncoder();
    const parsed = await parseBomFile(encoder.encode(complexCsv).buffer, 'complex.csv');
    expect(parsed.length).toBe(2);
    expect(parsed[0].name).toBe('Driver động cơ L298N');
    expect(parsed[0].specification).toBe('2A Dual H-Bridge');
    expect(parsed[0].quantity).toBe(2);
    expect(parsed[0].unitPrice).toBe(45000);
    expect(parsed[0].totalPrice).toBe(90000);

    expect(parsed[1].name).toBe('Arduino Uno R3');
    expect(parsed[1].quantity).toBe(1);
    expect(parsed[1].unitPrice).toBe(135000);
    expect(parsed[1].totalPrice).toBe(135000);
  });
});

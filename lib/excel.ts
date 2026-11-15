import * as XLSX from 'xlsx';
import { BomItem } from './types';

// ponytail: basic alias list covers common Vietnamese/English BOM columns. Upgrade to LLM header matching if exotic column names appear.
const NAME_ALIASES = ['ten linh kien', 'linh kien', 'item', 'name', 'component', 'ten san pham', 'san pham', 'ten'];
const SPEC_ALIASES = ['thong so ky thuat', 'thong so', 'quy cach', 'specification', 'spec', 'mo ta', 'description'];
const QTY_ALIASES = ['so luong', 'quantity', 'count', 'qty', 'sl'];
const PRICE_ALIASES = ['don gia', 'unit price', 'price', 'cost', 'gia'];
const NOTE_ALIASES = ['ghi chu', 'notes', 'note', 'remark'];
const LINK_ALIASES = ['link mua hang', 'link san pham', 'link mua', 'link', 'url'];

function cleanHeader(val: unknown): string {
  if (val == null) return '';
  return String(val)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function matchesAlias(header: string, aliases: string[]): boolean {
  for (const alias of aliases) {
    if (
      header === alias ||
      header.startsWith(alias + ' ') ||
      header.endsWith(' ' + alias) ||
      header.includes(' ' + alias + ' ')
    ) {
      return true;
    }
  }
  return false;
}

function parsePrice(val: unknown): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  let str = String(val).trim().replace(/[^0-9.,]/g, '');
  if (!str) return 0;
  if (/^\d{1,3}([.,]\d{3})+$/.test(str)) {
    str = str.replace(/[.,]/g, '');
  } else if (str.includes(',') && str.includes('.')) {
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    str = str.replace(',', '.');
  }
  const num = parseFloat(str);
  return isNaN(num) || num < 0 ? 0 : num;
}

function parseQuantity(val: unknown): number {
  if (typeof val === 'number') return isNaN(val) || val <= 0 ? 1 : val;
  if (!val) return 1;
  const str = String(val).trim().replace(/[^0-9.,]/g, '').replace(',', '.');
  const num = parseFloat(str);
  return isNaN(num) || num <= 0 ? 1 : num;
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 11);
}

function escapeCsvCell(val: unknown): string {
  if (val == null) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportBomToCsv(items: BomItem[]): string {
  const headers = ['STT', 'Tên linh kiện', 'Thông số kỹ thuật', 'Số lượng', 'Đơn giá (VND)', 'Thành tiền (VND)', 'Link mua hàng', 'Ghi chú'];
  const lines: string[] = [headers.join(',')];

  items.forEach((item, index) => {
    const qty = item.quantity ?? 1;
    const unitPrice = item.unitPrice ?? 0;
    const totalPrice = item.totalPrice ?? qty * unitPrice;
    const row = [
      index + 1,
      escapeCsvCell(item.name ?? ''),
      escapeCsvCell(item.specification ?? ''),
      qty,
      unitPrice,
      totalPrice,
      escapeCsvCell(item.selectedLink ?? ''),
      escapeCsvCell(item.note ?? '')
    ];
    lines.push(row.join(','));
  });

  return '\uFEFF' + lines.join('\r\n');
}

export function exportBomToExcel(items: BomItem[], projectName?: string): Buffer {
  const headers = [
    'STT',
    'Tên linh kiện',
    'Thông số kỹ thuật',
    'Số lượng',
    'Đơn giá (VND)',
    'Thành tiền (VND)',
    'Link mua hàng',
    'Ghi chú'
  ];

  const data = items.map((item, index) => {
    const qty = item.quantity ?? 1;
    const unitPrice = item.unitPrice ?? 0;
    const totalPrice = item.totalPrice ?? qty * unitPrice;
    return [
      index + 1,
      item.name ?? '',
      item.specification ?? '',
      qty,
      unitPrice,
      totalPrice,
      item.selectedLink ?? '',
      item.note ?? ''
    ];
  });

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
  worksheet['!cols'] = [
    { wch: 6 },
    { wch: 30 },
    { wch: 25 },
    { wch: 10 },
    { wch: 15 },
    { wch: 15 },
    { wch: 30 },
    { wch: 25 }
  ];

  const workbook = XLSX.utils.book_new();
  if (projectName) {
    workbook.Props = { Title: projectName };
  }
  XLSX.utils.book_append_sheet(workbook, worksheet, 'BOM');

  return XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' }) as Buffer;
}

export async function parseBomFile(buffer: Buffer | ArrayBuffer, fileName: string): Promise<BomItem[]> {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  const isCsv = fileName.toLowerCase().endsWith('.csv') || (buf.length >= 2 && buf[0] !== 0x50 && buf[0] !== 0xd0);
  const workbook = isCsv
    ? XLSX.read(new TextDecoder('utf-8').decode(buf), { type: 'string' })
    : XLSX.read(buf, { type: 'buffer' });

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    return [];
  }

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    return [];
  }

  const rows: unknown[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  if (rows.length === 0) {
    return [];
  }

  let headerRowIndex = -1;
  let columnMap: { [key: string]: number } = {};

  for (let r = 0; r < Math.min(rows.length, 25); r++) {
    const row = rows[r];
    if (!Array.isArray(row)) continue;

    const tempMap: { [key: string]: number } = {};
    for (let c = 0; c < row.length; c++) {
      const cleaned = cleanHeader(row[c]);
      if (!cleaned) continue;

      if (tempMap.name === undefined && matchesAlias(cleaned, NAME_ALIASES)) {
        tempMap.name = c;
      } else if (tempMap.spec === undefined && matchesAlias(cleaned, SPEC_ALIASES)) {
        tempMap.spec = c;
      } else if (tempMap.qty === undefined && matchesAlias(cleaned, QTY_ALIASES)) {
        tempMap.qty = c;
      } else if (
        tempMap.price === undefined &&
        !cleaned.includes('thanh tien') &&
        !cleaned.includes('tong') &&
        matchesAlias(cleaned, PRICE_ALIASES)
      ) {
        tempMap.price = c;
      } else if (tempMap.note === undefined && matchesAlias(cleaned, NOTE_ALIASES)) {
        tempMap.note = c;
      } else if (tempMap.link === undefined && matchesAlias(cleaned, LINK_ALIASES)) {
        tempMap.link = c;
      }
    }

    if (
      tempMap.name !== undefined ||
      (tempMap.qty !== undefined && (tempMap.price !== undefined || tempMap.spec !== undefined))
    ) {
      headerRowIndex = r;
      columnMap = tempMap;
      break;
    }
  }

  const startIndex = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;
  if (headerRowIndex === -1) {
    columnMap = { name: 0, spec: 1, qty: 2, price: 3, link: 4, note: 5 };
  }

  const items: BomItem[] = [];

  for (let r = startIndex; r < rows.length; r++) {
    const row = rows[r];
    if (!Array.isArray(row) || row.length === 0) continue;

    const rawName = columnMap.name !== undefined ? row[columnMap.name] : row[0];
    const name = String(rawName ?? '').trim();
    if (!name) continue;

    const rawSpec = columnMap.spec !== undefined ? row[columnMap.spec] : '';
    const specification = String(rawSpec ?? '').trim();

    const rawQty = columnMap.qty !== undefined ? row[columnMap.qty] : 1;
    const quantity = parseQuantity(rawQty);

    const rawPrice = columnMap.price !== undefined ? row[columnMap.price] : 0;
    const unitPrice = parsePrice(rawPrice);

    const rawNote = columnMap.note !== undefined ? row[columnMap.note] : '';
    const note = String(rawNote ?? '').trim();

    const rawLink = columnMap.link !== undefined ? row[columnMap.link] : '';
    const selectedLink = String(rawLink ?? '').trim();

    items.push({
      id: generateId(),
      name,
      specification,
      quantity,
      unitPrice,
      totalPrice: quantity * unitPrice,
      currency: 'VND',
      status: 'pending',
      selectedLink,
      alternatives: [],
      note,
    });
  }

  return items;
}

import { BomItem, BomItemAlternative } from './types';

export interface ComparisonCandidate {
  id: string;
  title: string;
  supplier: string;
  sourceUrl: string;
  verificationStatus: 'verified' | 'unverified' | 'dead' | 'blocked' | 'invalid';
  matchGrade?: string;
  specs: Record<string, string>;
  pros: string[];
  cons: string[];
  isPrimary?: boolean;
}

export interface ComparisonMatrix {
  specKeys: string[];
  candidates: ComparisonCandidate[];
}

function cleanSupplierName(rawSupplier?: string, domain?: string): string {
  if (rawSupplier && !/tier/i.test(rawSupplier)) {
    return rawSupplier;
  }
  if (domain) {
    if (domain.includes('shopee')) return 'Shopee';
    if (domain.includes('hshop')) return 'Hshop';
    if (domain.includes('nshop')) return 'NShop';
    if (domain.includes('banlinhkien') || domain.includes('mcu')) return 'BanLinhKien';
    if (domain.includes('thegioiic')) return 'TheGioiIC';
    if (domain.includes('dientudat')) return 'DienTuDat';
    if (domain.includes('digikey')) return 'DigiKey';
    if (domain.includes('mouser')) return 'Mouser';
    if (domain.includes('lcsc')) return 'LCSC';
    return domain.replace(/^www\./, '').split('.')[0];
  }
  return 'Nhà cung cấp Việt Nam';
}

function parseSpecsFromText(text: string): Record<string, string> {
  const specs: Record<string, string> = {};
  if (!text) return specs;

  // Split by comma, semicolon, or newline
  const parts = text.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);

  for (const part of parts) {
    if (part.includes(':')) {
      const [key, ...vals] = part.split(':');
      const k = key.trim();
      const v = vals.join(':').trim();
      if (k && v) {
        specs[k] = v;
      }
    } else {
      // Heuristic extraction for common robotics patterns
      const voltageMatch = part.match(/(\d+(?:\.\d+)?\s*(?:V|volt))/i);
      if (voltageMatch && !specs['Điện áp']) {
        specs['Điện áp'] = voltageMatch[1];
        continue;
      }

      const currentMatch = part.match(/(\d+(?:\.\d+)?\s*(?:A|mA|amp))/i);
      if (currentMatch && !specs['Dòng điện']) {
        specs['Dòng điện'] = currentMatch[1];
        continue;
      }

      const freqMatch = part.match(/(\d+(?:\.\d+)?\s*(?:MHz|GHz|RPM|vòng\/phút))/i);
      if (freqMatch && !specs['Tần số / Tốc độ']) {
        specs['Tần số / Tốc độ'] = freqMatch[1];
        continue;
      }

      // Connectivity
      if (/wifi|bluetooth|ble|i2c|spi|uart|pwm|can\s*bus/i.test(part)) {
        specs['Giao tiếp'] = specs['Giao tiếp'] ? `${specs['Giao tiếp']}, ${part}` : part;
        continue;
      }

      // Fallback
      if (part.length < 30) {
        specs[part] = 'Có hỗ trợ';
      }
    }
  }

  return specs;
}

export function buildComparisonMatrix(
  primary: BomItem,
  alternatives: BomItemAlternative[]
): ComparisonMatrix {
  const candidates: ComparisonCandidate[] = [];

  // 1. Process primary item
  const primarySpecs = parseSpecsFromText(primary.specification || primary.name);
  primarySpecs['Nhà cung cấp'] = cleanSupplierName(primary.supplierName, primary.supplierDomain);
  primarySpecs['Độ phù hợp'] = primary.matchGrade === 'exact_match' ? 'Khớp chính xác (Chính)' : 'Linh kiện chính';

  candidates.push({
    id: primary.id || 'primary-item',
    title: primary.name,
    supplier: cleanSupplierName(primary.supplierName, primary.supplierDomain),
    sourceUrl: primary.selectedLink,
    verificationStatus: primary.linkStatus || 'unverified',
    matchGrade: primary.matchGrade || 'exact_match',
    specs: primarySpecs,
    pros: ['Được cấu hình trong BOM hiện tại', 'Đã kiểm tra cấu hình kỹ thuật ban đầu'],
    cons: [],
    isPrimary: true,
  });

  // 2. Process alternatives (limit to top 3 alternatives so total max 4)
  const slicedAlts = alternatives.slice(0, 3);
  slicedAlts.forEach((alt, idx) => {
    const altSpecs = parseSpecsFromText(alt.title + (alt.reason ? `, ${alt.reason}` : ''));
    altSpecs['Nhà cung cấp'] = cleanSupplierName(alt.supplierName, alt.supplierDomain || alt.sourceDomain);
    
    let matchText = 'Phương án thay thế';
    if (alt.matchGrade === 'exact_match') matchText = 'Khớp hoàn toàn';
    else if (alt.matchGrade === 'strong_match') matchText = 'Khớp tương đương mạnh';
    else if (alt.matchGrade === 'possible_alternative') matchText = 'Thay thế khả thi';
    else if (alt.matchGrade === 'related') matchText = 'Linh kiện liên quan';
    altSpecs['Độ phù hợp'] = matchText;

    const pros: string[] = [];
    const cons: string[] = [];

    if (alt.reason) {
      if (/tiện|mạnh|nhanh|tốt|chuẩn|hoàn toàn/i.test(alt.reason)) {
        pros.push(alt.reason);
      } else if (/rẻ|tiết kiệm/i.test(alt.reason)) {
        pros.push('Tối ưu chi phí hơn');
      }
      if (/yếu|chậm|ít|hạn chế|cần thêm|lưu ý/i.test(alt.reason)) {
        cons.push(alt.reason);
      }
    }

    if (alt.linkStatus === 'verified') {
      pros.push('Đường dẫn nhà cung cấp đã được xác minh hoạt động');
    } else if (alt.linkStatus === 'unverified') {
      cons.push('Cần kiểm tra lại tồn kho thực tế từ người bán');
    }

    if (pros.length === 0) {
      pros.push('Giải pháp dự phòng sẵn có');
    }

    candidates.push({
      id: `alt-${idx}-${alt.url.slice(-8)}`,
      title: alt.title,
      supplier: cleanSupplierName(alt.supplierName, alt.supplierDomain || alt.sourceDomain),
      sourceUrl: alt.url,
      verificationStatus: alt.linkStatus || 'unverified',
      matchGrade: alt.matchGrade || 'alternative',
      specs: altSpecs,
      pros,
      cons,
      isPrimary: false,
    });
  });

  // 3. Compute unique spec keys in consistent order
  const standardPriorityKeys = ['Độ phù hợp', 'Nhà cung cấp', 'Điện áp', 'Dòng điện', 'Tần số / Tốc độ', 'Giao tiếp'];
  const allExtractedKeys = new Set<string>();

  for (const c of candidates) {
    for (const k of Object.keys(c.specs)) {
      allExtractedKeys.add(k);
    }
  }

  const sortedKeys: string[] = [];
  for (const pk of standardPriorityKeys) {
    if (allExtractedKeys.has(pk)) {
      sortedKeys.push(pk);
      allExtractedKeys.delete(pk);
    }
  }
  // Append remaining keys alphabetically
  Array.from(allExtractedKeys).sort().forEach((k) => sortedKeys.push(k));

  return {
    specKeys: sortedKeys,
    candidates,
  };
}

import { BomSearchResult } from './types';
import { isAllowedSourceUrl } from './sources';
import { isSpecificProductPath } from './link-validator';

export type MatchGrade = 'exact_match' | 'equivalent' | 'related' | 'no_match';

export interface ProductMatchClassification {
  grade: MatchGrade;
  reason: string;
  modelMatched: boolean;
  specMatched: boolean;
}

export interface ComponentKnowledge {
  rawInput: string;
  normalizedName: string;
  modelCode: string | null;
  category: string;
  subsystem: string;
  specifications: {
    voltage?: string;
    current?: string;
    power?: string;
    speedRpm?: string;
    ratio?: string;
    dimensions?: string;
  };
  isGeneric: boolean;
  searchKeywords: string[];
  expandedShopeeQueries: string[];
  expandedTier2Queries: string[];
}

/**
 * Normalizes common variations and abbreviations of robotics components
 */
function normalizeRawInput(input: string): string {
  let s = (input || '').trim();
  // hcsr04 -> HC-SR04
  s = s.replace(/\bhcsr0?4\b/gi, 'HC-SR04');
  s = s.replace(/\bhc-sr0?4\b/gi, 'HC-SR04');
  // tb6612 -> TB6612FNG
  s = s.replace(/\btb6612\b(?!\s*fng)/gi, 'TB6612FNG');
  // 3v670 -> 3V670
  s = s.replace(/\b3v[-_ ]?670\b/gi, '3V670');
  s = s.replace(/\b5v[-_ ]?1000\b/gi, '5V1000');
  return s;
}

/**
 * Extracts voltage specification (e.g. 12V, 5V, 3.3V, 24V)
 */
function extractVoltage(text: string): string | undefined {
  const m = text.match(/\b(12V|5V|3\.3V|24V|6V|9V|3V)\b/i);
  return m ? m[1].toUpperCase() : undefined;
}

/**
 * Understands component input: distinguishes model code, category, specifications and generic terms.
 */
export function understandComponent(input: string, spec?: string): ComponentKnowledge {
  const combined = [input, spec].filter(Boolean).join(' ').trim();
  const normalized = normalizeRawInput(combined);

  let modelCode: string | null = null;
  let category = 'Linh kiện kỹ thuật';
  let subsystem = 'Linh kiện đơn lẻ';
  let isGeneric = false;

  const specifications: ComponentKnowledge['specifications'] = {};
  const volt = extractVoltage(combined);
  if (volt) specifications.voltage = volt;

  // 1. DÂY CUROA / DÂY ĐAI (BELTS)
  const beltMatch = normalized.match(/\b(3V\d+|5V\d+|8V\d+|SPA\d+|SPB\d+|SPC\d+|SPZ\d+|XL\d+|MXL\d+|GT2(?:-\d+mm)?|HTD-?\d+M)\b/i);
  if (beltMatch) {
    modelCode = beltMatch[1].toUpperCase();
    category = 'Dây curoa / Dây đai truyền động';
    subsystem = 'Khung cơ khí & Bánh xe';
  } else if (/dây\s*curoa|dây\s*đai|v-?belt|timing\s*belt/i.test(normalized)) {
    isGeneric = true;
    category = 'Dây curoa / Dây đai truyền động';
    subsystem = 'Khung cơ khí & Bánh xe';
  }

  // 2. CẢM BIẾN SIÊU ÂM (ULTRASONIC SENSORS)
  if (!modelCode && /\b(HC-SR04|HC-SR05|US-015|US-100|VL53L0X)\b/i.test(normalized)) {
    const m = normalized.match(/\b(HC-SR04|HC-SR05|US-015|US-100|VL53L0X)\b/i);
    modelCode = m ? m[1].toUpperCase() : 'HC-SR04';
    category = 'Cảm biến siêu âm / Đo khoảng cách';
    subsystem = 'Hệ thống cảm biến';
  }

  // 3. VI ĐIỀU KHIỂN & MÁY TÍNH NHÚNG (MICROCONTROLLERS)
  if (!modelCode) {
    if (/ESP32.*DevKit.*V1/i.test(normalized) || /ESP32\s+DevKit\s+V1/i.test(normalized)) {
      modelCode = 'ESP32 DevKit V1';
      category = 'Vi điều khiển & Máy tính nhúng';
      subsystem = 'Hệ thống điều khiển';
    } else if (/\b(ESP32(?:-[A-Z0-9]+)?|ESP8266|STM32(?:F103[A-Z0-9]*)?|Arduino\s+(?:Uno|Nano|Mega)(?:\s+R3|\s+V3)?|Raspberry\s+Pi\s*\d?)\b/i.test(normalized)) {
      const m = normalized.match(/\b(ESP32(?:-[A-Z0-9]+)?|ESP8266|STM32(?:F103[A-Z0-9]*)?|Arduino\s+(?:Uno|Nano|Mega)(?:\s+R3|\s+V3)?|Raspberry\s+Pi\s*\d?)\b/i);
      modelCode = m ? m[1].trim() : null;
      category = 'Vi điều khiển & Máy tính nhúng';
      subsystem = 'Hệ thống điều khiển';
    }
  }

  // 4. ĐỘNG CƠ & CƠ CẤU CHẤP HÀNH (MOTORS & ACTUATORS)
  if (!modelCode) {
    const motorMatch = normalized.match(/\b(N20|GA25|GA12|JGB37|TT(?:\s*Motor)?|MG996R|MG995|SG90|DS3218|28BYJ-48|NEMA\s*17)\b/i);
    if (motorMatch) {
      modelCode = motorMatch[1].toUpperCase().replace(/\s+/g, ' ');
      category = 'Động cơ DC giảm tốc / Cơ cấu chấp hành';
      subsystem = 'Hệ thống truyền động';
    } else if (/động\s*cơ|motor|servo/i.test(normalized)) {
      isGeneric = true;
      category = 'Động cơ DC giảm tốc / Cơ cấu chấp hành';
      subsystem = 'Hệ thống truyền động';
    }
  }

  // 5. MẠCH ĐIỀU KHIỂN ĐỘNG CƠ (MOTOR DRIVERS)
  if (!modelCode) {
    const driverMatch = normalized.match(/\b(TB6612FNG|TB6612|L298N?|BTS7960|DRV8825|DRV8833|A4988|ULN2003)\b/i);
    if (driverMatch) {
      let code = driverMatch[1].toUpperCase();
      if (code === 'TB6612') code = 'TB6612FNG';
      if (code === 'L298') code = 'L298N';
      modelCode = code;
      category = 'Mạch điều khiển động cơ';
      subsystem = 'Hệ thống truyền động';
    }
  }

  // 6. NGUỒN ĐIỆN & HẠ ÁP (POWER & REGULATORS)
  if (!modelCode) {
    const pwrMatch = normalized.match(/\b(LM2596|XL4015|TP4056|MT3608|AMS1117|18650)\b/i);
    if (pwrMatch) {
      modelCode = pwrMatch[1].toUpperCase();
      category = 'Nguồn điện & Mạch hạ áp';
      subsystem = 'Hệ thống nguồn điện';
    }
  }

  // 7. CẢM BIẾN KHÁC (OTHER SENSORS)
  if (!modelCode) {
    const sensorMatch = normalized.match(/\b(TCRT5000|MPU-?6050|OV2640|DHT11|DHT22)\b/i);
    if (sensorMatch) {
      modelCode = sensorMatch[1].toUpperCase();
      category = 'Hệ thống cảm biến';
      subsystem = 'Hệ thống cảm biến';
    }
  }

  // 8. CÁC TỪ KHÓA CHUNG KHÁC (GENERIC PRODUCTS WITHOUT MODEL)
  if (!modelCode && !isGeneric) {
    if (/cảm\s*biến/i.test(normalized)) {
      isGeneric = true;
      category = 'Hệ thống cảm biến';
      subsystem = 'Hệ thống cảm biến';
    } else if (/khung\s*xe|bánh\s*xe|chassis/i.test(normalized)) {
      isGeneric = true;
      category = 'Khung cơ khí & Bánh xe';
      subsystem = 'Khung cơ khí & Bánh xe';
    } else if (/pin|sạc|hạ\s*áp/i.test(normalized)) {
      isGeneric = true;
      category = 'Hệ thống nguồn điện';
      subsystem = 'Hệ thống nguồn điện';
    } else {
      // Check for arbitrary specific alphanumeric model code (e.g. XYZ99999NONEXISTENT)
      const arbitraryCodeMatch = normalized.match(/\b([A-Z0-9]{5,})\b/i);
      if (arbitraryCodeMatch) {
        modelCode = arbitraryCodeMatch[1].toUpperCase();
        isGeneric = false;
      } else {
        isGeneric = true;
      }
    }
  }

  // Build expanded queries
  const baseForQueries = {
    rawInput: input,
    normalizedName: normalized,
    modelCode,
    category,
    subsystem,
    specifications,
    isGeneric,
    searchKeywords: [],
  };

  const expandedShopeeQueries = buildExpandedShopeeQueries(baseForQueries);
  const expandedTier2Queries = buildExpandedTier2Queries(baseForQueries);

  return {
    rawInput: input,
    normalizedName: normalized,
    modelCode: modelCode || null,
    category,
    subsystem,
    specifications,
    isGeneric,
    searchKeywords: [modelCode, ...Object.values(specifications)].filter(Boolean) as string[],
    expandedShopeeQueries,
    expandedTier2Queries,
  };
}

/**
 * Builds Shopee Vietnam expanded queries according to requirements:
 * Shopee-first, model preserved verbatim, technical & Vietnamese synonyms.
 */
export function buildExpandedShopeeQueries(
  input: string | Omit<ComponentKnowledge, 'expandedShopeeQueries' | 'expandedTier2Queries'>,
  specification?: string
): string[] {
  let item: Omit<ComponentKnowledge, 'expandedShopeeQueries' | 'expandedTier2Queries'>;
  if (typeof input === 'string') {
    const understood = understandComponent(input, specification);
    item = {
      rawInput: understood.rawInput,
      normalizedName: understood.normalizedName,
      modelCode: understood.modelCode,
      category: understood.category,
      subsystem: understood.subsystem,
      specifications: understood.specifications,
      isGeneric: understood.isGeneric,
      searchKeywords: understood.searchKeywords,
    };
  } else {
    item = input;
  }

  const queries: string[] = [];
  const model = item.modelCode;
  const volt = item.specifications?.voltage;

  if (model) {
    // 1. Exact model query
    queries.push(`site:shopee.vn ${model}`);

    if (model === '3V670') {
      queries.push('site:shopee.vn Dây curoa 3V670');
      queries.push('site:shopee.vn Dây đai 3V670');
      queries.push('site:shopee.vn 3V670 belt');
      queries.push('site:shopee.vn 3V670 V-belt');
    } else if (model === 'HC-SR04') {
      queries.push('site:shopee.vn Cảm biến siêu âm HC-SR04');
      queries.push('site:shopee.vn Module HC-SR04');
      queries.push('site:shopee.vn HC-SR04 ultrasonic sensor');
    } else if (model === 'ESP32 DevKit V1') {
      queries.push('site:shopee.vn ESP32 DevKit V1');
      queries.push('site:shopee.vn Board ESP32 DevKit V1');
      queries.push('site:shopee.vn Mạch ESP32 DevKit V1');
      queries.push('site:shopee.vn ESP32 NodeMCU DevKit V1');
    } else if (model === 'N20') {
      if (volt) {
        queries.push(`site:shopee.vn Motor N20 ${volt}`);
        queries.push(`site:shopee.vn Động cơ N20 ${volt}`);
        queries.push(`site:shopee.vn Động cơ giảm tốc N20 ${volt}`);
        queries.push(`site:shopee.vn N20 ${volt} DC motor`);
      } else {
        queries.push('site:shopee.vn Motor N20');
        queries.push('site:shopee.vn Động cơ giảm tốc N20');
      }
    } else if (model === 'TB6612FNG') {
      queries.push('site:shopee.vn Driver TB6612FNG');
      queries.push('site:shopee.vn Mạch điều khiển động cơ TB6612FNG');
      queries.push('site:shopee.vn Module TB6612FNG');
      queries.push('site:shopee.vn TB6612FNG dual motor driver');
    } else {
      // General model
      if (volt) {
        queries.push(`site:shopee.vn ${model} ${volt}`);
      }
      if (item.category.includes('Động cơ')) {
        queries.push(`site:shopee.vn Động cơ ${model}`);
      } else if (item.category.includes('Cảm biến')) {
        queries.push(`site:shopee.vn Cảm biến ${model}`);
      } else if (item.category.includes('Dây curoa')) {
        queries.push(`site:shopee.vn Dây curoa ${model}`);
      }
    }
  } else if (item.isGeneric) {
    if (/dây\s*curoa|dây\s*đai/i.test(item.rawInput)) {
      queries.push('site:shopee.vn Dây curoa');
      queries.push('site:shopee.vn Dây đai curoa');
      queries.push('site:shopee.vn V-belt');
    } else {
      queries.push(`site:shopee.vn ${item.rawInput}`);
    }
  }

  // Deduplicate case-insensitively
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const q of queries) {
    const key = q.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(q);
    }
  }
  return unique;
}

/**
 * Builds Tier 2 specialized store expanded queries
 */
function buildExpandedTier2Queries(item: Omit<ComponentKnowledge, 'expandedShopeeQueries' | 'expandedTier2Queries'>): string[] {
  const model = item.modelCode;
  const volt = item.specifications.voltage;
  const terms: string[] = [];

  if (model) {
    terms.push(model);
    if (volt) terms.push(`${model} ${volt}`);
  } else {
    terms.push(item.rawInput);
  }

  return Array.from(new Set(terms));
}

/**
 * Classifies a search result against the understood component knowledge:
 * - 'exact_match': Matches the exact model and required specifications
 * - 'equivalent': Verified technical replacement
 * - 'related': In the same category or related without model confirmation
 * - 'no_match': Unrelated, dead, homepage, or category listing
 */
export function classifyProductMatch(
  knowledge: ComponentKnowledge,
  result: BomSearchResult
): ProductMatchClassification {
  if (!result || !result.url) {
    return { grade: 'no_match', reason: 'URL trống', modelMatched: false, specMatched: false };
  }

  // 1. Must be an allowed source and a specific product path (never homepage, search, or collection)
  if (!isAllowedSourceUrl(result.url)) {
    return { grade: 'no_match', reason: 'Tên miền không nằm trong danh sách được cấp phép', modelMatched: false, specMatched: false };
  }
  if (!isSpecificProductPath(result.url)) {
    return { grade: 'no_match', reason: 'Đường dẫn là trang chủ hoặc trang danh mục không phải sản phẩm cụ thể', modelMatched: false, specMatched: false };
  }

  const title = (result.title || '').toLowerCase();
  const content = (result.content || '').toLowerCase();
  const fullText = `${title} ${content} ${result.url.toLowerCase()}`;

  // 2. Case A: User specified a model code
  if (knowledge.modelCode) {
    const model = knowledge.modelCode.toLowerCase();
    const modelClean = model.replace(/[-_ ]/g, '');

    // Check exact model match
    const hasModelExact =
      fullText.includes(model) ||
      fullText.replace(/[-_ ]/g, '').includes(modelClean);

    if (hasModelExact) {
      // Check voltage / spec conflict if specified
      if (knowledge.specifications.voltage) {
        const requiredVolt = knowledge.specifications.voltage.toLowerCase();
        // Check if conflicting voltage is present (e.g. required 12V but title says 3V or 5V or 24V without 12V)
        const hasRequiredVolt = fullText.includes(requiredVolt);
        const hasConflictingVolt =
          (requiredVolt === '12v' && (fullText.includes('3v') || fullText.includes('5v') || fullText.includes('24v')) && !hasRequiredVolt);

        if (hasConflictingVolt) {
          return {
            grade: 'related',
            reason: `Đúng model ${knowledge.modelCode} nhưng sai thông số điện áp (${knowledge.specifications.voltage})`,
            modelMatched: true,
            specMatched: false,
          };
        }

        return {
          grade: 'exact_match',
          reason: `Khớp chính xác model ${knowledge.modelCode} và thông số ${requiredVolt.toUpperCase()}`,
          modelMatched: true,
          specMatched: true,
        };
      }

      return {
        grade: 'exact_match',
        reason: `Khớp chính xác mã model ${knowledge.modelCode}`,
        modelMatched: true,
        specMatched: true,
      };
    }

    // Model did not match. Check if this is a known technical equivalent
    if (knowledge.modelCode === 'TB6612FNG' && (fullText.includes('drv8833') || fullText.includes('l298n'))) {
      return {
        grade: 'equivalent',
        reason: 'Mạch điều khiển động cơ thay thế tương đương kỹ thuật',
        modelMatched: false,
        specMatched: true,
      };
    }

    if (knowledge.modelCode === 'HC-SR04' && (fullText.includes('hc-sr05') || fullText.includes('us-015'))) {
      return {
        grade: 'equivalent',
        reason: 'Cảm biến siêu âm tương đương thông số',
        modelMatched: false,
        specMatched: true,
      };
    }

    if (knowledge.modelCode === 'ESP32 DevKit V1' && fullText.includes('esp32')) {
      return {
        grade: 'equivalent',
        reason: 'Board phát triển ESP32 tương thích',
        modelMatched: false,
        specMatched: true,
      };
    }

    // Check if result is at least in the same category
    if (knowledge.category.includes('Dây curoa') && (fullText.includes('curoa') || fullText.includes('dây đai') || fullText.includes('v-belt'))) {
      return {
        grade: 'related',
        reason: `Sản phẩm dây curoa nhưng không đúng mã ${knowledge.modelCode}`,
        modelMatched: false,
        specMatched: false,
      };
    }

    if (knowledge.category.includes('Động cơ') && (fullText.includes('động cơ') || fullText.includes('motor'))) {
      if (knowledge.specifications.voltage && !fullText.includes(knowledge.specifications.voltage.toLowerCase())) {
        return {
          grade: 'no_match',
          reason: `Động cơ sai điện áp và sai model ${knowledge.modelCode}`,
          modelMatched: false,
          specMatched: false,
        };
      }
      if (knowledge.modelCode === 'N20' && !fullText.includes('n20')) {
        return {
          grade: 'no_match',
          reason: `Động cơ không phải dòng N20`,
          modelMatched: false,
          specMatched: false,
        };
      }
      return {
        grade: 'related',
        reason: `Động cơ nhưng không đúng mã model ${knowledge.modelCode}`,
        modelMatched: false,
        specMatched: false,
      };
    }

    if (knowledge.category.includes('Cảm biến') && fullText.includes('cảm biến')) {
      return {
        grade: 'related',
        reason: `Cảm biến nhưng không đúng mã ${knowledge.modelCode}`,
        modelMatched: false,
        specMatched: false,
      };
    }

    return {
      grade: 'no_match',
      reason: `Không tìm thấy mã linh kiện ${knowledge.modelCode} trong sản phẩm`,
      modelMatched: false,
      specMatched: false,
    };
  }

  // 3. Case B: Generic input without specific model code (e.g. "Dây curoa")
  if (knowledge.isGeneric) {
    if (knowledge.category.includes('Dây curoa')) {
      if (fullText.includes('curoa') || fullText.includes('dây đai') || fullText.includes('timing belt') || fullText.includes('v-belt')) {
        return { grade: 'exact_match', reason: 'Khớp danh mục dây curoa / dây đai', modelMatched: true, specMatched: true };
      }
      return { grade: 'no_match', reason: 'Không phải sản phẩm dây curoa', modelMatched: false, specMatched: false };
    }

    if (knowledge.category.includes('Động cơ')) {
      if (fullText.includes('động cơ') || fullText.includes('motor') || fullText.includes('servo')) {
        return { grade: 'exact_match', reason: 'Khớp danh mục động cơ', modelMatched: true, specMatched: true };
      }
      return { grade: 'no_match', reason: 'Không phải sản phẩm động cơ', modelMatched: false, specMatched: false };
    }

    if (knowledge.category.includes('Cảm biến')) {
      if (fullText.includes('cảm biến') || fullText.includes('sensor')) {
        return { grade: 'exact_match', reason: 'Khớp danh mục cảm biến', modelMatched: true, specMatched: true };
      }
      return { grade: 'no_match', reason: 'Không phải sản phẩm cảm biến', modelMatched: false, specMatched: false };
    }
  }

  // Case C: For generic or non-model items, check keyword overlap with title
  const rawWords = (knowledge.rawInput || '')
    .toLowerCase()
    .split(/[\s,./\\_-]+/)
    .filter((w) => w.length > 2 && !['tìm', 'mua', 'bán', 'giá', 'cho', 'của', 'loại', 'mini'].includes(w));
  const matchedWords = rawWords.filter((w) => title.includes(w) || content.includes(w));

  if (rawWords.length > 0 && matchedWords.length / rawWords.length >= 0.5) {
    return {
      grade: 'exact_match',
      reason: 'Khớp từ khóa sản phẩm cụ thể',
      modelMatched: true,
      specMatched: true,
    };
  }

  return { grade: 'related', reason: 'Chưa đủ căn cứ xác nhận tương đương', modelMatched: false, specMatched: false };
}

import { BomSearchResult } from './types';
import { isAllowedSourceUrl } from './sources';
import { isSpecificProductPath } from './link-validator';

export type MatchGrade =
  | 'exact_match'
  | 'strong_match'
  | 'possible_alternative'
  | 'related'
  | 'no_match'
  | 'equivalent'; // equivalent is an alias for strong_match for backward compatibility

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
  functionalRole: string;
  synonyms: {
    vietnamese: string[];
    english: string[];
  };
  typicalVariants: string[];
  specifications: {
    voltage?: string;
    current?: string;
    power?: string;
    speedRpm?: string;
    ratio?: string;
    dimensions?: string;
    speedRequirement?: 'fast' | 'slow' | 'standard';
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

// Words that must NEVER be treated as model codes even if they have 5+ characters
const COMMON_ROBOTICS_WORDS = new Set([
  'ROBOT', 'NHANH', 'CHAY', 'CHUYEN', 'NGUON', 'MOTOR', 'SENSOR', 'MODULE',
  'DRIVER', 'BANH', 'KHUNG', 'DONGCO', 'CAMBIEN', 'GIADO', 'BRACKET', 'WHEEL',
  'TRACKING', 'CONVERTER', 'STEPDOWN', 'VOLTAGE', 'CHASSIS', 'CUROA', 'BELT'
]);

/**
 * Understands component input: distinguishes model code, category, specifications and generic terms.
 * Operates like a knowledgeable robotics engineer understanding what the component actually is.
 */
export function understandComponent(input: string, spec?: string): ComponentKnowledge {
  const combined = [input, spec].filter(Boolean).join(' ').trim();
  const normalized = normalizeRawInput(combined);
  const lower = normalized.toLowerCase();

  let modelCode: string | null = null;
  let category = 'Linh kiện kỹ thuật';
  let subsystem = 'Linh kiện đơn lẻ';
  let functionalRole = 'linh kiện lắp ráp';
  let isGeneric = false;

  const specifications: ComponentKnowledge['specifications'] = {};
  const volt = extractVoltage(combined);
  if (volt) specifications.voltage = volt;

  if (/chạy\s*nhanh|tốc\s*độ\s*cao|high\s*speed|fast/i.test(lower)) {
    specifications.speedRequirement = 'fast';
  }

  const synonymsVi: string[] = [];
  const synonymsEn: string[] = [];
  const typicalVariants: string[] = [];

  // 1. DÂY CUROA / DÂY ĐAI (BELTS)
  const beltMatch = normalized.match(/\b(3V\d+|5V\d+|8V\d+|SPA\d+|SPB\d+|SPC\d+|SPZ\d+|XL\d+|MXL\d+|GT2(?:-\d+mm)?|HTD-?\d+M)\b/i);
  if (beltMatch) {
    modelCode = beltMatch[1].toUpperCase();
    category = 'Dây curoa / Dây đai truyền động';
    subsystem = 'Khung cơ khí & Bánh xe';
    functionalRole = 'truyền động đai chữ V / răng cưa';
    synonymsVi.push('dây curoa', 'dây đai', 'dây curoa chữ V', `dây curoa ${modelCode}`, `dây đai ${modelCode}`);
    synonymsEn.push('V-belt', 'timing belt', `${modelCode} belt`, `${modelCode} V-belt`);
    typicalVariants.push('3V670', '5V1000', 'GT2');
  } else if (/dây\s*curoa|dây\s*đai|v-?belt|timing\s*belt/i.test(lower)) {
    isGeneric = true;
    category = 'Dây curoa / Dây đai truyền động';
    subsystem = 'Khung cơ khí & Bánh xe';
    functionalRole = 'truyền động đai';
    synonymsVi.push('dây curoa', 'dây đai', 'dây curoa truyền động', 'dây đai chữ V');
    synonymsEn.push('V-belt', 'timing belt', 'transmission belt');
    typicalVariants.push('dây curoa chữ V', 'timing belt GT2');
  }

  // 2. CẢM BIẾN SIÊU ÂM (ULTRASONIC SENSORS)
  else if (/\b(HC-SR04|HC-SR05|US-015|US-100|VL53L0X)\b/i.test(normalized)) {
    const m = normalized.match(/\b(HC-SR04|HC-SR05|US-015|US-100|VL53L0X)\b/i);
    modelCode = m ? m[1].toUpperCase() : 'HC-SR04';
    category = 'Cảm biến siêu âm / Đo khoảng cách';
    subsystem = 'Hệ thống cảm biến';
    functionalRole = 'đo khoảng cách vật cản bằng sóng siêu âm';
    synonymsVi.push('cảm biến siêu âm', 'module đo khoảng cách', 'cảm biến khoảng cách', `module ${modelCode}`);
    synonymsEn.push('ultrasonic sensor', 'distance measuring sensor', `${modelCode} module`);
    typicalVariants.push('HC-SR04', 'HC-SR05', 'US-015');
  } else if (/siêu\s*âm|khoảng\s*cách|ultrasonic|distance\s*sensor/i.test(lower)) {
    isGeneric = true;
    category = 'Cảm biến siêu âm / Đo khoảng cách';
    subsystem = 'Hệ thống cảm biến';
    functionalRole = 'đo khoảng cách siêu âm';
    synonymsVi.push('cảm biến siêu âm', 'module đo khoảng cách', 'cảm biến tránh vật cản');
    synonymsEn.push('ultrasonic sensor', 'distance sensor');
    typicalVariants.push('HC-SR04', 'HC-SR05');
  }

  // 3. CẢM BIẾN DÒ LINE / DÒ VẠCH (LINE TRACKING SENSORS)
  else if (/dò\s*line|dò\s*vạch|bám\s*vạch|line\s*tracking|line\s*follower|tcrt5000/i.test(lower)) {
    if (/\btcrt-?5000\b/i.test(normalized)) {
      modelCode = 'TCRT5000';
    } else {
      isGeneric = true;
    }
    category = 'Hệ thống cảm biến';
    subsystem = 'Hệ thống cảm biến';
    functionalRole = 'dò đường line và nhận diện bề mặt sáng tối';
    synonymsVi.push('cảm biến dò line', 'cảm biến dò vạch', 'module dò line', 'module bám vạch', 'cảm biến hồng ngoại dò đường');
    synonymsEn.push('line tracking sensor', 'line follower sensor', 'line tracker module', 'infrared tracking sensor');
    typicalVariants.push('TCRT5000', 'Module 5 mắt dò line', 'Module 4 kênh dò line', 'Module dò line 1 kênh');
  }

  // 4. GIÁ ĐỠ ĐỘNG CƠ / GÁ NHÔM (MOTOR BRACKETS)
  else if (/giá\s*đỡ\s*(?:động\s*cơ|motor)|gá\s*(?:động\s*cơ|nhôm|motor)|motor\s*(?:bracket|holder|mount)/i.test(lower)) {
    isGeneric = true;
    category = 'Khung cơ khí & Bánh xe';
    subsystem = 'Khung cơ khí & Bánh xe';
    functionalRole = 'gá kẹp cố định động cơ vào thân khung xe';
    synonymsVi.push('giá đỡ động cơ', 'gá động cơ', 'gá nhôm động cơ', 'khung gá motor', 'giá đỡ motor');
    synonymsEn.push('motor bracket', 'motor mounting holder', 'motor mount', 'L-bracket motor');
    typicalVariants.push('Gá nhôm chữ L GA25', 'Gá động cơ N20', 'Gá động cơ TT', 'Gá nhôm NEMA 17');
  }

  // 5. MODULE CHUYỂN NGUỒN / HẠ ÁP (POWER REGULATORS & DC-DC CONVERTERS)
  else if (/chuyển\s*nguồn|hạ\s*áp|giảm\s*áp|buck\s*converter|step\s*down|dc-?dc\s*converter/i.test(lower) || /\b(LM2596|XL4015|MP1584|AMS1117)\b/i.test(normalized)) {
    const pwrMatch = normalized.match(/\b(LM2596|XL4015|MP1584|AMS1117|TP4056|MT3608)\b/i);
    if (pwrMatch) {
      modelCode = pwrMatch[1].toUpperCase();
    } else {
      isGeneric = true;
    }
    category = 'Hệ thống nguồn điện';
    subsystem = 'Hệ thống nguồn điện';
    functionalRole = 'chuyển đổi điện áp DC-DC ổn định cấp nguồn';
    synonymsVi.push('module chuyển nguồn', 'mạch hạ áp', 'mạch giảm áp', 'bộ giảm áp', 'mạch nguồn DC-DC', 'module hạ áp');
    synonymsEn.push('DC-DC converter', 'buck converter', 'step-down converter', 'voltage regulator module');
    typicalVariants.push('LM2596 3A', 'XL4015 5A', 'MP1584 mini', 'AMS1117 3.3V/5V');
  }

  // 6. BÁNH XE ROBOT (ROBOT WHEELS)
  else if (/bánh\s*xe|mecanum|omni\s*wheel|robot\s*wheel/i.test(lower)) {
    if (/mecanum/i.test(lower)) {
      modelCode = 'Mecanum';
    } else {
      isGeneric = true;
    }
    category = 'Khung cơ khí & Bánh xe';
    subsystem = 'Khung cơ khí & Bánh xe';
    functionalRole = 'bánh xe tiếp đất di chuyển cho robot';
    synonymsVi.push('bánh xe robot', 'bánh xe cao su', 'bánh xe V1 65mm', 'bánh xe đa hướng', 'bánh xe mecanum');
    synonymsEn.push('robot wheel', 'wheel for mobile robot', 'rubber wheel 65mm', 'mecanum wheel', 'omni wheel');
    typicalVariants.push('Bánh xe cao su 65mm V1', 'Bánh xe Mecanum 60mm', 'Bánh mắt trâu đa hướng');
  }

  // 7. VI ĐIỀU KHIỂN & MÁY TÍNH NHÚNG (MICROCONTROLLERS)
  else if (/ESP32.*DevKit.*V1/i.test(normalized) || /ESP32\s+DevKit\s+V1/i.test(normalized)) {
    modelCode = 'ESP32 DevKit V1';
    category = 'Vi điều khiển & Máy tính nhúng';
    subsystem = 'Hệ thống điều khiển';
    functionalRole = 'bộ điều khiển trung tâm Wi-Fi/Bluetooth';
    synonymsVi.push('kit ESP32', 'bo mạch ESP32', 'ESP32 NodeMCU', 'kit phát triển ESP32');
    synonymsEn.push('ESP32 DevKit', 'ESP32 NodeMCU', 'ESP-WROOM-32 board');
    typicalVariants.push('ESP32 DevKit V1', 'ESP32-WROOM-32D', 'ESP32-S3');
  } else if (/\b(ESP32(?:-[A-Z0-9]+)?|ESP8266|STM32(?:F103[A-Z0-9]*)?|Arduino\s+(?:Uno|Nano|Mega)(?:\s+R3|\s+V3)?|Raspberry\s+Pi\s*\d?)\b/i.test(normalized)) {
    const m = normalized.match(/\b(ESP32(?:-[A-Z0-9]+)?|ESP8266|STM32(?:F103[A-Z0-9]*)?|Arduino\s+(?:Uno|Nano|Mega)(?:\s+R3|\s+V3)?|Raspberry\s+Pi\s*\d?)\b/i);
    modelCode = m ? m[1].trim() : null;
    category = 'Vi điều khiển & Máy tính nhúng';
    subsystem = 'Hệ thống điều khiển';
    functionalRole = 'bộ vi điều khiển xử lý logic';
    synonymsVi.push('bo mạch điều khiển', 'mạch vi điều khiển', 'kit vi điều khiển');
    synonymsEn.push('microcontroller board', 'dev kit');
    typicalVariants.push('Arduino Uno R3', 'Arduino Nano', 'ESP32 DevKit');
  }

  // 8. ĐỘNG CƠ & CƠ CẤU CHẤP HÀNH (MOTORS & ACTUATORS)
  else if (/\b(N20|GA25|GA12|JGB37|TT(?:\s*Motor)?|MG996R|MG995|SG90|DS3218|28BYJ-48|NEMA\s*17)\b/i.test(normalized)) {
    const motorMatch = normalized.match(/\b(N20|GA25|GA12|JGB37|TT(?:\s*Motor)?|MG996R|MG995|SG90|DS3218|28BYJ-48|NEMA\s*17)\b/i);
    modelCode = motorMatch ? motorMatch[1].toUpperCase().replace(/\s+/g, ' ') : null;
    category = 'Động cơ DC giảm tốc / Cơ cấu chấp hành';
    subsystem = 'Hệ thống truyền động';
    functionalRole = 'động cơ tạo lực quay dẫn động cơ cấu';
    synonymsVi.push('động cơ DC', 'động cơ giảm tốc', 'motor giảm tốc', `động cơ ${modelCode}`);
    synonymsEn.push('DC geared motor', 'gear motor', `${modelCode} motor`);
    typicalVariants.push('GA25 12V', 'N20 12V', 'Động cơ TT vàng', 'Servo MG996R');
  } else if (/động\s*cơ|motor|servo|chạy\s*nhanh/i.test(lower)) {
    isGeneric = true;
    category = 'Động cơ DC giảm tốc / Cơ cấu chấp hành';
    subsystem = 'Hệ thống truyền động';
    functionalRole = specifications.speedRequirement === 'fast'
      ? 'động cơ DC tốc độ cao dẫn động bánh xe robot'
      : 'động cơ truyền động dẫn động robot';
    synonymsVi.push('động cơ DC', 'động cơ giảm tốc', 'motor DC', 'động cơ robot', 'động cơ xe robot');
    synonymsEn.push('DC geared motor', 'high speed DC motor', 'robot motor', 'fast gear motor');
    typicalVariants.push('GA25 12V 300rpm', 'Động cơ TT vàng', 'N20 12V');
  }

  // 9. MẠCH ĐIỀU KHIỂN ĐỘNG CƠ (MOTOR DRIVERS)
  else if (/\b(TB6612FNG|TB6612|L298N?|BTS7960|DRV8825|DRV8833|A4988|ULN2003)\b/i.test(normalized)) {
    const driverMatch = normalized.match(/\b(TB6612FNG|TB6612|L298N?|BTS7960|DRV8825|DRV8833|A4988|ULN2003)\b/i);
    if (driverMatch) {
      let code = driverMatch[1].toUpperCase();
      if (code === 'TB6612') code = 'TB6612FNG';
      if (code === 'L298') code = 'L298N';
      modelCode = code;
      category = 'Mạch điều khiển động cơ';
      subsystem = 'Hệ thống truyền động';
      functionalRole = 'driver cầu H điều khiển đảo chiều và băm xung PWM';
      synonymsVi.push('mạch điều khiển động cơ', 'driver động cơ', `mạch ${modelCode}`);
      synonymsEn.push('motor driver carrier', 'dual motor driver', `${modelCode} driver`);
      typicalVariants.push('TB6612FNG', 'L298N', 'DRV8833');
    }
  }

  // 10. KHÁC: KIỂM TRA MÃ MODEL CỤ THỂ CHÍNH HÃNG (VÍ DỤ XYZ99999NONEXISTENT)
  else {
    // Only detect as modelCode if it has both letters and numbers, or is an explicit known code pattern, NOT common words!
    const tokenMatch = normalized.match(/\b([A-Z0-9]*[0-9]+[A-Z0-9]*)\b/i);
    if (tokenMatch && tokenMatch[1].length >= 3 && !COMMON_ROBOTICS_WORDS.has(tokenMatch[1].toUpperCase())) {
      modelCode = tokenMatch[1].toUpperCase();
      isGeneric = false;
    } else {
      isGeneric = true;
    }
  }

  const baseForQueries = {
    rawInput: input,
    normalizedName: normalized,
    modelCode,
    category,
    subsystem,
    functionalRole,
    synonyms: { vietnamese: synonymsVi, english: synonymsEn },
    typicalVariants,
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
    functionalRole,
    synonyms: { vietnamese: synonymsVi, english: synonymsEn },
    typicalVariants,
    specifications,
    isGeneric,
    searchKeywords: [modelCode, ...Object.values(specifications)].filter(Boolean) as string[],
    expandedShopeeQueries,
    expandedTier2Queries,
  };
}

/**
 * Builds Shopee Vietnam expanded queries according to Multi-Stage Search:
 * Stage 1: Exact Search (tên/model)
 * Stage 2: Synonym Search (tên phổ biến, tên kỹ thuật, từ đồng nghĩa tiếng Việt & tiếng Anh)
 * Stage 3: Functional Search (theo chức năng & công dụng)
 * Stage 4: Technical Variant Search (các biến thể sản phẩm phổ biến)
 * Stage 5: Alternative Product Search
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
      functionalRole: understood.functionalRole,
      synonyms: understood.synonyms,
      typicalVariants: understood.typicalVariants,
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
  const raw = item.rawInput.trim();

  // STAGE 1: Exact Search
  if (model) {
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
      queries.push('site:shopee.vn Kit ESP32 DevKit V1 NodeMCU');
      queries.push('site:shopee.vn ESP32 NodeMCU CP2102');
    } else if (model === 'N20') {
      if (volt) {
        queries.push(`site:shopee.vn Động cơ N20 ${volt}`);
        queries.push(`site:shopee.vn Motor N20 ${volt}`);
      } else {
        queries.push('site:shopee.vn Động cơ giảm tốc N20');
      }
    } else if (model === 'TB6612FNG') {
      queries.push('site:shopee.vn Driver TB6612FNG');
      queries.push('site:shopee.vn Mạch điều khiển động cơ TB6612FNG');
    }
  }
  queries.push(`site:shopee.vn ${raw}`);

  // STAGE 2: Synonym Search (Vietnamese & English)
  if (item.synonyms?.vietnamese?.length) {
    for (const syn of item.synonyms.vietnamese.slice(0, 3)) {
      queries.push(`site:shopee.vn ${syn}`);
    }
  }
  if (item.synonyms?.english?.length) {
    for (const enSyn of item.synonyms.english.slice(0, 2)) {
      queries.push(`site:shopee.vn ${enSyn}`);
    }
  }

  // STAGE 3: Functional Search
  if (item.functionalRole && item.functionalRole !== 'linh kiện lắp ráp') {
    queries.push(`site:shopee.vn ${item.functionalRole}`);
  }

  // STAGE 4: Technical Variant Search (only when appropriate)
  if (!item.isGeneric && item.typicalVariants?.length) {
    for (const variant of item.typicalVariants.slice(0, 2)) {
      queries.push(`site:shopee.vn ${variant}`);
    }
  }

  // Model + Voltage combo if present
  if (model && volt && !queries.some((q) => q.toLowerCase().includes(volt.toLowerCase()))) {
    queries.push(`site:shopee.vn ${model} ${volt}`);
  }

  // Deduplicate and cap at 10 rich queries
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const q of queries) {
    const key = q.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(q);
    }
    if (unique.length >= 10) break;
  }
  return unique;
}

/**
 * Builds Tier 2 specialized store expanded queries
 */
function buildExpandedTier2Queries(
  item: Omit<ComponentKnowledge, 'expandedShopeeQueries' | 'expandedTier2Queries'>
): string[] {
  const model = item.modelCode;
  const volt = item.specifications?.voltage;
  const terms: string[] = [];

  if (model) {
    terms.push(model);
    if (volt) terms.push(`${model} ${volt}`);
  }
  terms.push(item.rawInput);

  if (item.synonyms?.vietnamese?.length) {
    terms.push(...item.synonyms.vietnamese.slice(0, 2));
  }
  if (item.typicalVariants?.length) {
    terms.push(...item.typicalVariants.slice(0, 2));
  }

  return Array.from(new Set(terms)).slice(0, 5);
}

/**
 * Classifies a search result like a knowledgeable robotics engineer:
 * - 'exact_match': Đúng linh kiện, đúng model hoặc quy cách cần tìm
 * - 'strong_match': Khác tên gọi hoặc model nhưng cùng chức năng và các thông số quan trọng phù hợp
 * - 'possible_alternative': Có khả năng đáp ứng nhu cầu nhưng cần kiểm tra thêm một số thông số
 * - 'related': Có liên quan nhưng chưa đủ căn cứ xác nhận là sản phẩm thay thế
 * - 'no_match': Hoàn toàn sai phân hệ, rác, tin tức, nông sản
 */
export function classifyProductMatch(
  knowledge: ComponentKnowledge,
  result: BomSearchResult
): ProductMatchClassification {
  if (!result || !result.url) {
    return { grade: 'no_match', reason: 'URL trống', modelMatched: false, specMatched: false };
  }

  // 1. Must be an allowed source and a specific product path
  if (!isAllowedSourceUrl(result.url)) {
    return { grade: 'no_match', reason: 'Tên miền không nằm trong danh sách được cấp phép', modelMatched: false, specMatched: false };
  }
  if (!isSpecificProductPath(result.url)) {
    return { grade: 'no_match', reason: 'Đường dẫn là trang chủ hoặc trang danh mục không phải sản phẩm cụ thể', modelMatched: false, specMatched: false };
  }

  const title = (result.title || '').toLowerCase();
  const content = (result.content || '').toLowerCase();
  const fullText = `${title} ${content} ${result.url.toLowerCase()}`;

  // 2. CASE A: Specific Model Code was supplied by user (e.g. 3V670, HC-SR04, N20 12V, TB6612FNG, ESP32)
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

    // Model did not match verbatim. Check known technical equivalents (Strong Match)
    if (knowledge.modelCode === 'TB6612FNG' && (fullText.includes('drv8833') || fullText.includes('l298n') || fullText.includes('l298'))) {
      return {
        grade: 'strong_match',
        reason: 'Mạch điều khiển động cơ thay thế tương đương kỹ thuật',
        modelMatched: false,
        specMatched: true,
      };
    }

    if (knowledge.modelCode === 'HC-SR04' && (fullText.includes('hc-sr05') || fullText.includes('us-015') || fullText.includes('cảm biến siêu âm'))) {
      return {
        grade: 'strong_match',
        reason: 'Cảm biến siêu âm tương đương chức năng đo khoảng cách',
        modelMatched: false,
        specMatched: true,
      };
    }

    if (knowledge.modelCode.includes('ESP32') && fullText.includes('esp32')) {
      return {
        grade: 'strong_match',
        reason: 'Kit phát triển ESP32 tương thích chức năng',
        modelMatched: false,
        specMatched: true,
      };
    }

    // Check voltage mismatch on different motor model
    if (knowledge.category.includes('Động cơ')) {
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
        grade: 'possible_alternative',
        reason: `Động cơ cùng dải hoạt động nhưng khác mã model ${knowledge.modelCode}`,
        modelMatched: false,
        specMatched: false,
      };
    }

    // Check belt mismatch
    if (knowledge.category.includes('Dây curoa')) {
      if (fullText.includes('curoa') || fullText.includes('dây đai') || fullText.includes('v-belt')) {
        return {
          grade: 'related',
          reason: `Sản phẩm dây curoa nhưng không đúng mã ${knowledge.modelCode}`,
          modelMatched: false,
          specMatched: false,
        };
      }
      return {
        grade: 'no_match',
        reason: 'Không phải sản phẩm dây curoa',
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

  // 3. CASE B: Functional or Generic search without specific model code
  // Example: "động cơ robot chạy nhanh", "bánh xe robot", "giá đỡ động cơ", "cảm biến dò line", "module chuyển nguồn"

  // B.1 Giá đỡ động cơ / Gá nhôm (check before general motor)
  if (/giá\s*đỡ|gá\s*(?:động\s*cơ|nhôm|motor)|motor\s*bracket/i.test(knowledge.rawInput)) {
    if (fullText.includes('gá') || fullText.includes('giá đỡ') || fullText.includes('bracket') || fullText.includes('khung gá')) {
      return { grade: 'exact_match', reason: 'Khớp chính xác gá đỡ động cơ / cơ khí', modelMatched: true, specMatched: true };
    }
    return { grade: 'no_match', reason: 'Không phải gá đỡ động cơ', modelMatched: false, specMatched: false };
  }

  // B.2 Động cơ robot chạy nhanh / Động cơ DC
  if (knowledge.category.includes('Động cơ') || /động\s*cơ|motor/i.test(knowledge.rawInput)) {
    if (fullText.includes('động cơ') || fullText.includes('motor') || fullText.includes('ga25') || fullText.includes('n20') || fullText.includes('tt vàng') || fullText.includes('dc')) {
      if (knowledge.specifications.speedRequirement === 'fast') {
        const isHighSpeed = fullText.includes('300rpm') || fullText.includes('500rpm') || fullText.includes('ga25') || fullText.includes('tốc độ');
        return {
          grade: isHighSpeed ? 'exact_match' : 'strong_match',
          reason: isHighSpeed ? 'Động cơ tốc độ cao phù hợp yêu cầu chạy nhanh' : 'Động cơ DC giảm tốc đáp ứng công dụng',
          modelMatched: true,
          specMatched: isHighSpeed,
        };
      }
      return { grade: 'exact_match', reason: 'Khớp chính xác chủng loại động cơ', modelMatched: true, specMatched: true };
    }
    return { grade: 'no_match', reason: 'Không phải động cơ', modelMatched: false, specMatched: false };
  }

  // B.3 Cảm biến dò line
  if (/dò\s*line|dò\s*vạch|line\s*tracking|line\s*follower/i.test(knowledge.rawInput)) {
    if (fullText.includes('dò line') || fullText.includes('dò vạch') || fullText.includes('tcrt5000') || fullText.includes('line tracker') || fullText.includes('line tracking')) {
      return { grade: 'exact_match', reason: 'Khớp chính xác cảm biến dò line', modelMatched: true, specMatched: true };
    }
    return { grade: 'no_match', reason: 'Không phải cảm biến dò line', modelMatched: false, specMatched: false };
  }

  // B.4 Module chuyển nguồn / hạ áp
  if (/chuyển\s*nguồn|hạ\s*áp|giảm\s*áp|buck|converter/i.test(knowledge.rawInput)) {
    if (fullText.includes('hạ áp') || fullText.includes('giảm áp') || fullText.includes('lm2596') || fullText.includes('xl4015') || fullText.includes('buck') || fullText.includes('dc-dc')) {
      return { grade: 'exact_match', reason: 'Khớp chính xác mạch hạ áp / module chuyển nguồn', modelMatched: true, specMatched: true };
    }
    return { grade: 'no_match', reason: 'Không phải module chuyển nguồn', modelMatched: false, specMatched: false };
  }

  // B.5 Bánh xe robot
  if (/bánh\s*xe|mecanum|omni\s*wheel|robot\s*wheel/i.test(knowledge.rawInput)) {
    if (fullText.includes('bánh xe') || fullText.includes('wheel') || fullText.includes('mecanum') || fullText.includes('lốp')) {
      return { grade: 'exact_match', reason: 'Khớp chính xác bánh xe robot', modelMatched: true, specMatched: true };
    }
    return { grade: 'no_match', reason: 'Không phải bánh xe', modelMatched: false, specMatched: false };
  }

  // B.6 Dây curoa generic
  if (knowledge.category.includes('Dây curoa')) {
    if (fullText.includes('curoa') || fullText.includes('dây đai') || fullText.includes('timing belt') || fullText.includes('v-belt')) {
      return { grade: 'exact_match', reason: 'Khớp danh mục dây curoa / dây đai', modelMatched: true, specMatched: true };
    }
    return { grade: 'no_match', reason: 'Không phải sản phẩm dây curoa', modelMatched: false, specMatched: false };
  }

  // B.7 Cảm biến siêu âm generic
  if (knowledge.category.includes('siêu âm')) {
    if (fullText.includes('siêu âm') || fullText.includes('ultrasonic') || fullText.includes('hc-sr04')) {
      return { grade: 'exact_match', reason: 'Khớp cảm biến siêu âm', modelMatched: true, specMatched: true };
    }
    return { grade: 'no_match', reason: 'Không phải cảm biến siêu âm', modelMatched: false, specMatched: false };
  }

  // B.8 Generic word overlap
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

  if (matchedWords.length > 0) {
    return {
      grade: 'strong_match',
      reason: 'Khớp một phần đặc tính kỹ thuật sản phẩm',
      modelMatched: false,
      specMatched: true,
    };
  }

  return { grade: 'related', reason: 'Chưa đủ căn cứ xác nhận tương đương', modelMatched: false, specMatched: false };
}

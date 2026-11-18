import { BomItem, createNewBomItem } from './types';
import { getAppSettings } from './config';
import { cleanJsonFromLlmOutput } from './llm';
import { findCatalogMatches } from './catalog';
import { findSourceByUrl } from './sources';

export type SearchIntent = 'single_product' | 'project_bom';

export interface DecompositionResult {
  intent: SearchIntent;
  items: BomItem[];
  projectName?: string;
  budgetConstraint?: number | null;
  alreadyOwned?: string[];
  isAmbiguous?: boolean;
  clarifyingQuestion?: string;
}

const SINGLE_PRODUCT_PREFIXES = [
  'tìm',
  'mua',
  'tra cứu',
  'báo giá',
  'giá của',
  'giá',
  'linh kiện',
  'module',
  'mạch',
  'cảm biến',
  'động cơ',
  'driver',
  'ic',
];

const PROJECT_INDICATORS = [
  'robot',
  'xe',
  'cánh tay',
  'chế tạo',
  'chế xe',
  'làm robot',
  'dự án',
  'hệ thống',
  'bom',
  'vật tư để',
  'linh kiện để làm',
  'danh sách linh kiện',
  'bóc tách',
  'tự hành',
  'dò line',
  'tránh vật cản',
];

export function detectSearchIntent(query: string): SearchIntent {
  const lower = (query || '').toLowerCase().trim();

  // If starts with single product prefix (e.g. "Tìm ESP32", "Mua động cơ...", "Giá servo...")
  const startsWithSinglePrefix = SINGLE_PRODUCT_PREFIXES.some((p) =>
    lower.startsWith(p + ' ')
  );

  // If query explicitly requests a project build or BOM
  const hasProjectPhrases = [
    'chế tạo robot',
    'làm robot',
    'chế xe',
    'chế cánh tay',
    'dự án',
    'danh sách linh kiện',
    'danh sách cần mua',
    'danh sách',
    'bóc tách bom',
    'bóc tách',
    'vật tư để',
    'linh kiện để làm',
    'linh kiện làm',
    'loại chúng khỏi danh sách',
    'loại khỏi danh sách',
  ].some((phrase) => lower.includes(phrase));

  if (hasProjectPhrases) {
    return 'project_bom';
  }

  // Component-level keywords
  const isComponentQuery = [
    'cảm biến',
    'động cơ',
    'servo',
    'driver',
    'esp32',
    'arduino',
    'stm32',
    'raspberry',
    'pin',
    'mạch',
    'module',
    'khung',
    'bánh xe',
    'cáp',
  ].some((kw) => lower.includes(kw));

  // If starts with single prefix and has no project-scale phrases, it's single product
  if (startsWithSinglePrefix && (!lower.includes('robot') || isComponentQuery)) {
    return 'single_product';
  }

  // Check general project indicators
  const hasProjectIndicator = PROJECT_INDICATORS.some((ind) => lower.includes(ind));
  if (hasProjectIndicator) {
    return 'project_bom';
  }

  // If it's a short query or component name, default to single_product
  const words = lower.split(/\s+/).filter(Boolean);
  if (words.length <= 6 || isComponentQuery) {
    return 'single_product';
  }

  return 'project_bom';
}

export function parseBudgetConstraint(text: string): number | null {
  if (!text) return null;
  const lower = text.toLowerCase();

  const match = lower.match(
    /(?:ngân\s*sách|kinh\s*phí|budget|giá\s*tối\s*đa|chi\s*phí)[:\s]*([0-9]{1,3}(?:[.,][0-9]{3})+|[0-9]{1,4}(?:\s*k|\s*triệu|\s*tr)|\d+)\s*(?:đ|vnd|vnđ|₫|đồng)?/i
  );

  if (!match) return null;

  const raw = match[1].trim();

  // Handle "800k", "500 k"
  if (/^[0-9]+\s*k$/i.test(raw)) {
    const num = parseInt(raw.replace(/k/i, ''), 10);
    return isNaN(num) ? null : num * 1000;
  }

  // Handle "1.5 triệu", "2 tr"
  if (/(?:triệu|tr)/i.test(raw)) {
    const clean = raw.replace(/(?:triệu|tr)/i, '').replace(',', '.').trim();
    const num = parseFloat(clean);
    return isNaN(num) ? null : Math.round(num * 1000000);
  }

  // Handle "800.000", "1,500,000", "800000"
  const cleanNumber = raw.replace(/[.,\s]/g, '');
  const num = parseInt(cleanNumber, 10);
  return isNaN(num) || num <= 0 ? null : num;
}

export function parseAlreadyOwnedItems(text: string): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();

  const results: string[] = [];
  const ownedSentence = lower.match(/(?:đã\s*có|có\s*sẵn)[^,.;]+/gi);
  if (ownedSentence) {
    for (const phrase of ownedSentence) {
      const cleaned = phrase.replace(/^(?:đã\s*có|có\s*sẵn)\s+/i, '');
      const parts = cleaned.split(/\s+(?:và|với|,)\s+/i);
      for (const p of parts) {
        const item = p.trim();
        if (item && item.length > 1) {
          results.push(item);
        }
      }
    }
  }

  return Array.from(new Set(results));
}

export function validateBomCompleteness(
  projectDescription: string,
  items: BomItem[]
): BomItem[] {
  const result = [...items];
  const lowerDesc = (projectDescription || '').toLowerCase();
  const allItemNames = result.map((it) => (it.name || '').toLowerCase()).join(' ');

  const hasController =
    /vi điều khiển|arduino|esp32|stm32|raspberry|microcontroller|uno|nano/i.test(allItemNames);
  const hasDriver =
    /driver|l298n|tb6612|bts7960|a4988|drv8825|mạch cầu|điều khiển động cơ/i.test(allItemNames);
  const hasMotor =
    /động cơ|motor|servo|bánh xe|bước/i.test(allItemNames);
  const hasPower =
    /pin|battery|nguồn|18650|lipo|bms|hạ áp|lm2596|buck/i.test(allItemNames);
  const hasMechanics =
    /khung|chassis|bánh xe|mica|nhôm|trụ đồng|ốc vít/i.test(allItemNames);

  // Auto-complete controller if mobile robot lacks it
  if (!hasController) {
    const ctrlItem = createNewBomItem(
      'Mạch vi điều khiển ESP32 NodeMCU (hoặc Arduino Uno R3)',
      'Vi điều khiển 32-bit Wi-Fi/Bluetooth hoặc ATmega328P',
      1
    );
    ctrlItem.subsystem = 'Hệ thống điều khiển';
    ctrlItem.note = 'Tự động bổ sung: Trung tâm điều khiển toàn bộ robot';
    ctrlItem.priority = 'essential';
    result.unshift(ctrlItem);
  }

  // Auto-complete motor driver if motors are present but driver is absent
  if (hasMotor && !hasDriver && (lowerDesc.includes('xe') || lowerDesc.includes('robot'))) {
    const driverItem = createNewBomItem(
      'Mạch điều khiển động cơ Driver L298N (hoặc TB6612FNG)',
      'Hỗ trợ 2 động cơ DC độc lập, điện áp 5V-35V, dòng 2A',
      1
    );
    driverItem.subsystem = 'Hệ thống truyền động';
    driverItem.note = 'Tự động bổ sung: Mạch công suất điều khiển động cơ';
    driverItem.priority = 'essential';
    result.push(driverItem);
  }

  // Auto-complete power supply if absent
  if (!hasPower) {
    const powerItem = createNewBomItem(
      'Khay 2 pin 18650 kèm 2 cell pin sạc Li-ion 3.7V',
      'Điện áp 7.4V (2S), dung lượng ~2000-2600mAh',
      1
    );
    powerItem.subsystem = 'Hệ thống nguồn điện';
    powerItem.note = 'Tự động bổ sung: Nguồn cấp cho vi điều khiển và động cơ';
    powerItem.priority = 'essential';
    result.push(powerItem);
  }

  // Auto-complete mechanics / chassis if missing on mobile robot
  if (!hasMechanics && (lowerDesc.includes('xe') || lowerDesc.includes('dò line') || lowerDesc.includes('tránh vật cản'))) {
    const chassisItem = createNewBomItem(
      'Bộ khung xe robot 2 bánh / 3 bánh (kèm bánh xe và bánh mắt trâu)',
      'Khung mica hoặc nhôm, 2 bánh xe cao su, 1 bánh xe đa hướng',
      1
    );
    chassisItem.subsystem = 'Khung cơ khí & Bánh xe';
    chassisItem.note = 'Tự động bổ sung: Kết cấu khung gắn linh kiện';
    chassisItem.priority = 'essential';
    result.push(chassisItem);
  }

  return result;
}

export const ENHANCED_ROBOTICS_PROMPT = `Bạn là một kỹ sư trưởng Robotics & Hệ thống nhúng chuyên nghiệp.
Nhiệm vụ: Phân tích yêu cầu dự án robot của người dùng và bóc tách thành danh sách linh kiện (BOM - Bill of Materials) hoàn chỉnh, có thể lắp ráp và vận hành thực tế.

CÁC PHÂN HỆ BẮT BUỘC (SUBSYSTEMS):
1. Hệ thống điều khiển: Vi điều khiển (ESP32, STM32, Arduino Uno/Nano, Raspberry Pi...), bo mạch mở rộng.
2. Hệ thống cảm biến: Cảm biến dò line, siêu âm HC-SR04, IMU MPU6050, camera, công tắc hành trình...
3. Hệ thống truyền động & Cơ cấu chấp hành: Động cơ DC giảm tốc (GA25, V1 vàng), servo (MG996R, SG90), động cơ bước, driver tương ứng (L298N, TB6612, A4988...).
4. Hệ thống nguồn điện: Pin sạc (18650, LiPo 2S/3S), mạch bảo vệ sạc BMS, mạch hạ áp Buck LM2596 để cấp 5V ổn định cho vi điều khiển, công tắc nguồn.
5. Khung cơ khí & Cơ cấu: Khung xe, bánh xe (cao su, Mecanum, Omni), khớp nối, gá kẹp, ốc vít M3, trụ đồng.
6. Dây nối & Phụ kiện giao tiếp: Dây cắm cắm breadboard (đực-đực, đực-cái), đế pin, breadboard hoặc bo hàn đục lỗ.

QUY TẮC BẮT BUỘC:
- Mọi linh kiện phải thực tế, mua được tại các shop điện tử Việt Nam (Hshop, Nshop, Banlinhkien, LKCG...).
- KHÔNG dùng cụm từ chung chung như "phụ kiện khác", "linh kiện linh tinh". Từng món phải có tên và thông số cụ thể.
- Đảm bảo tính tương thích: Ví dụ động cơ 12V thì nguồn và driver phải chịu được 12V.
- TUYỆT ĐỐI KHÔNG tự điền giá đơn vị hay thành tiền. Người dùng sẽ nhập giá thủ công.

Chỉ trả về JSON thuần túy (không kèm giải thích) theo format:
{
  "projectName": "Tên dự án",
  "projectType": "mobile_robot | robotic_arm | autonomous | iot",
  "items": [
    {
      "name": "Tên linh kiện cụ thể",
      "specification": "Thông số kỹ thuật chi tiết",
      "subsystem": "Hệ thống điều khiển | Hệ thống cảm biến | Hệ thống truyền động | Hệ thống nguồn điện | Khung cơ khí & Bánh xe | Dây nối & Phụ kiện",
      "quantity": 1,
      "priority": "essential | recommended | optional",
      "note": "Vai trò và ghi chú lắp đặt"
    }
  ]
}`;

export async function decomposeProjectOrProduct(
  prompt: string,
  apiKey?: string,
  baseUrl?: string,
  model?: string
): Promise<DecompositionResult> {
  const trimmed = (prompt || '').trim();
  if (!trimmed) {
    return {
      intent: 'project_bom',
      items: [],
    };
  }

  // Check ambiguity
  const lower = trimmed.toLowerCase();
  const isTooVague =
    lower === 'làm robot' ||
    lower === 'chế tạo robot' ||
    lower === 'robot' ||
    lower.includes('chưa xác định được loại') ||
    lower.includes('chưa biết làm loại nào');

  if (isTooVague) {
    return {
      intent: 'project_bom',
      items: [],
      isAmbiguous: true,
      clarifyingQuestion:
        'Bạn muốn chế tạo loại robot nào? (Ví dụ: Robot dò line tự hành, Xe tránh vật cản, Cánh tay robot 4 bậc tự do, hoặc Xe Mecanum điều khiển từ xa?)',
    };
  }

  const intent = detectSearchIntent(trimmed);
  const budget = parseBudgetConstraint(trimmed);
  const ownedItems = parseAlreadyOwnedItems(trimmed);

  // FLOW A: Single Product Search
  if (intent === 'single_product') {
    let cleanName = trimmed;
    for (const prefix of SINGLE_PRODUCT_PREFIXES) {
      if (cleanName.toLowerCase().startsWith(prefix + ' ')) {
        cleanName = cleanName.slice(prefix.length + 1).trim();
      }
    }

    const singleItem = createNewBomItem(cleanName, '', 1);
    singleItem.subsystem = 'Linh kiện đơn lẻ';
    singleItem.note = 'Tìm kiếm sản phẩm đơn lẻ';
    singleItem.unitPrice = 0;
    singleItem.totalPrice = 0;
    singleItem.manualPrice = { amount: null, currency: 'VND', entrySource: null };

    const matches = findCatalogMatches(cleanName, 3);
    if (matches.length > 0) {
      const best = matches[0];
      const source = findSourceByUrl(best.url);
      singleItem.selectedLink = best.url;
      singleItem.supplierName = source?.name;
      singleItem.supplierDomain = source?.domain;
      singleItem.supplierTier = source?.tier;
      singleItem.supplierCountry = source?.country;
      singleItem.linkStatus = 'verified';
      singleItem.matchType = 'best_match';
      singleItem.status = 'found';

      if (matches.length > 1) {
        singleItem.alternatives = matches.slice(1).map((m, idx) => {
          const altSource = findSourceByUrl(m.url);
          return {
            title: m.title,
            url: m.url,
            supplierName: altSource?.name,
            supplierDomain: altSource?.domain,
            supplierTier: altSource?.tier,
            supplierCountry: altSource?.country,
            linkStatus: 'verified',
            matchType: idx === 0 ? 'most_reliable' : 'alternative',
            reason: 'Linh kiện thay thế từ nguồn uy tín',
          };
        });
      }
    }

    return {
      intent: 'single_product',
      items: [singleItem],
      budgetConstraint: budget,
    };
  }

  // FLOW B: Project BOM Search
  const settings = getAppSettings();
  const effectiveKey = apiKey ?? settings.llmApiKey;
  const effectiveBaseUrl = (baseUrl ?? settings.llmBaseUrl ?? 'https://api.openai.com/v1').replace(/\/+$/, '');
  const effectiveModel = model ?? settings.llmModel ?? 'gpt-4o-mini';

  const isTestEnv = typeof process !== 'undefined' && process.env.VITEST === 'true';
  if (!effectiveKey && !isTestEnv && effectiveBaseUrl.includes('api.openai.com')) {
    const fallback = generateFallbackRobotBom(trimmed, ownedItems);
    return {
      intent: 'project_bom',
      items: fallback,
      projectName: trimmed,
      budgetConstraint: budget,
      alreadyOwned: ownedItems,
    };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (effectiveKey) {
    headers['Authorization'] = `Bearer ${effectiveKey}`;
  }

  try {
    const res = await fetch(`${effectiveBaseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: effectiveModel,
        messages: [
          { role: 'system', content: ENHANCED_ROBOTICS_PROMPT },
          { role: 'user', content: trimmed },
        ],
        temperature: 0.2,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res || !res.ok) {
      throw new Error(`LLM API returned HTTP ${res?.status ?? 'error'}`);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Empty LLM response');
    }

    const cleaned = cleanJsonFromLlmOutput(content);
    const parsed = JSON.parse(cleaned);

    let rawList: any[] = [];
    if (Array.isArray(parsed)) {
      rawList = parsed;
    } else if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.items)) rawList = parsed.items;
      else if (Array.isArray(parsed.components)) rawList = parsed.components;
      else if (Array.isArray(parsed.bom)) rawList = parsed.bom;
    }

    const mappedItems: BomItem[] = rawList.map((raw, idx) => {
      const item = createNewBomItem(
        raw.name || `Linh kiện ${idx + 1}`,
        raw.specification || '',
        typeof raw.quantity === 'number' && raw.quantity > 0 ? raw.quantity : 1
      );
      if (raw.subsystem) item.subsystem = raw.subsystem;
      if (raw.priority) item.priority = raw.priority;
      if (raw.note) item.note = raw.note;

      // Always initialize manual price as null
      item.manualPrice = { amount: null, currency: 'VND', entrySource: null };
      item.unitPrice = 0;
      item.totalPrice = 0;

      // Check if user already owns this item
      if (ownedItems.length > 0) {
        const lowerName = item.name.toLowerCase();
        const isOwned = ownedItems.some((ow) => lowerName.includes(ow) || ow.includes(lowerName));
        if (isOwned) {
          item.alreadyOwned = true;
          item.note = item.note ? `${item.note} (Đã có sẵn)` : 'Đã có sẵn - không tính vào chi phí mua mới';
        }
      }

      return item;
    });

    const validatedItems = validateBomCompleteness(trimmed, mappedItems);

    return {
      intent: 'project_bom',
      items: validatedItems,
      projectName: parsed?.projectName || trimmed,
      budgetConstraint: budget,
      alreadyOwned: ownedItems,
    };
  } catch (err) {
    console.warn('decomposeProjectOrProduct LLM fallback:', err);
    const fallback = generateFallbackRobotBom(trimmed, ownedItems);
    return {
      intent: 'project_bom',
      items: fallback,
      projectName: trimmed,
      budgetConstraint: budget,
      alreadyOwned: ownedItems,
    };
  }
}

function generateFallbackRobotBom(prompt: string, ownedItems: string[]): BomItem[] {
  const lower = prompt.toLowerCase();
  const items: BomItem[] = [];

  const add = (name: string, spec: string, qty: number, sub: string, note: string) => {
    const it = createNewBomItem(name, spec, qty);
    it.subsystem = sub;
    it.note = note;
    it.unitPrice = 0;
    it.totalPrice = 0;
    it.manualPrice = { amount: null, currency: 'VND', entrySource: null };

    if (ownedItems.some((ow) => it.name.toLowerCase().includes(ow))) {
      it.alreadyOwned = true;
      it.note += ' (Đã có sẵn)';
    }

    // Attach verified product link from catalog if available (No price)
    const matches = findCatalogMatches(`${name} ${spec}`, 3);
    if (matches.length > 0) {
      const best = matches[0];
      const source = findSourceByUrl(best.url);
      it.selectedLink = best.url;
      it.supplierName = source?.name;
      it.supplierDomain = source?.domain;
      it.supplierTier = source?.tier;
      it.supplierCountry = source?.country;
      it.linkStatus = 'verified';
      it.matchType = 'best_match';
      it.status = 'found';

      if (matches.length > 1) {
        it.alternatives = matches.slice(1).map((m, idx) => {
          const altSource = findSourceByUrl(m.url);
          return {
            title: m.title,
            url: m.url,
            supplierName: altSource?.name,
            supplierDomain: altSource?.domain,
            supplierTier: altSource?.tier,
            supplierCountry: altSource?.country,
            linkStatus: 'verified',
            matchType: idx === 0 ? 'most_reliable' : 'alternative',
            reason: 'Linh kiện tương đương từ nguồn uy tín',
          };
        });
      }
    }

    items.push(it);
  };

  if (lower.includes('cánh tay') || lower.includes('arm')) {
    add('Board điều khiển Arduino Uno R3 DIP kèm cáp', 'ATmega328P 16MHz nạp chương trình', 1, 'Hệ thống điều khiển', 'Bộ não điều khiển 4 servo');
    add('Bộ 4 Servo MG996R bánh răng kim loại', 'Lực kéo 11kg/cm, góc quay 180 độ', 4, 'Hệ thống truyền động', 'Dẫn động các khớp xoay chịu lực');
    add('Bộ khung cánh tay robot 4 DOF mica/kim loại', 'Kèm gắp kẹp cơ khí, ốc vít M3', 1, 'Khung cơ khí & Cơ cấu', 'Kết cấu chịu lực cánh tay');
    add('Mạch giảm áp DC-DC Buck LM2596 3A', 'Hạ áp xuống 5V dòng cao cho servo', 1, 'Hệ thống nguồn điện', 'Cấp nguồn dòng cao độc lập cho servo');
    add('Khay 2 Pin 18650 kèm 2 cell pin sạc 3.7V', 'Điện áp 7.4V (2S) 2600mAh', 1, 'Hệ thống nguồn điện', 'Nguồn điện chính');
    add('Tép 40 dây cắm test board đực - cái 20cm', 'Dây nối tín hiệu PWM từ Arduino đến servo', 1, 'Dây nối & Phụ kiện', 'Kết nối tín hiệu');
  } else if (lower.includes('mecanum') || lower.includes('đa hướng') || lower.includes('4 bánh')) {
    add('Kit RF Thu Phát WiFi BLE ESP32 NodeMCU', 'Điều khiển qua Wi-Fi / Bluetooth điện thoại', 1, 'Hệ thống điều khiển', 'Vi điều khiển trung tâm 32-bit');
    add('Bộ 4 Bánh Xe Mecanum 60mm trục TT', 'Chuyển động đa hướng tiến lùi ngang xoay', 1, 'Khung cơ khí & Bánh xe', 'Cơ cấu chuyển động đa hướng');
    add('4 Động cơ DC giảm tốc TT vàng 1:48', 'Điện áp 3-6V, trục kép', 4, 'Hệ thống truyền động', 'Dẫn động độc lập 4 bánh');
    add('2 Mạch điều khiển động cơ L298N', 'Điều khiển 4 động cơ DC độc lập', 2, 'Hệ thống truyền động', 'Mạch công suất điều khiển 4 bánh');
    add('Khung xe robot 4 bánh mica 2 tầng', 'Kèm trụ đồng M3 và ốc vít', 1, 'Khung cơ khí & Bánh xe', 'Khung xe 2 tầng gắn linh kiện');
    add('Khay 2 Pin 18650 kèm 2 cell pin sạc 3.7V', 'Điện áp 7.4V 2600mAh', 1, 'Hệ thống nguồn điện', 'Nguồn cấp toàn hệ thống');
    add('Mạch giảm áp DC-DC Buck LM2596 3A', 'Hạ áp 7.4V xuống 5V cho ESP32', 1, 'Hệ thống nguồn điện', 'Ổn áp 5V');
    add('Tép 40 dây cắm test board đực - cái', 'Dây cắm nối chân GPIO và driver', 1, 'Dây nối & Phụ kiện', 'Dây tín hiệu');
  } else if (lower.includes('cân bằng') || lower.includes('balance')) {
    add('Kit STM32F103C8T6 Blue Pill ARM Cortex-M3', 'Xử lý thuật toán PID tần số cao', 1, 'Hệ thống điều khiển', 'Bộ điều khiển tính toán góc nghiêng');
    add('Module Cảm Biến Gia Tốc Con Quay MPU-6050', 'Đo góc nghiêng 6 trục I2C', 1, 'Hệ thống cảm biến', 'Cảm biến hồi tiếp góc nghiêng');
    add('2 Động cơ DC giảm tốc GA25 kèm encoder', 'Tốc độ 300rpm, đọc phản hồi xung encoder', 2, 'Hệ thống truyền động', 'Động cơ lực kéo mạnh đáp ứng nhanh');
    add('Mạch điều khiển động cơ TB6612FNG', 'Driver MOSFET hiệu suất cao tần số PWM cao', 1, 'Hệ thống truyền động', 'Mạch công suất động cơ');
    add('Bộ khung xe cân bằng 2 bánh hợp kim nhôm', 'Kèm bánh xe cao su 65mm bám đường', 1, 'Khung cơ khí & Bánh xe', 'Khung đứng xe tự cân bằng');
    add('Bộ nguồn pin sạc Li-ion 18650 3S 11.1V hoặc 2S', 'Dòng xả cao cho động cơ GA25', 1, 'Hệ thống nguồn điện', 'Nguồn điện công suất');
    add('Mạch giảm áp DC-DC Buck LM2596 3A', 'Hạ áp xuống 5V cho vi điều khiển', 1, 'Hệ thống nguồn điện', 'Nguồn nuôi mạch');
  } else if (lower.includes('cứu hỏa') || lower.includes('chữa cháy') || lower.includes('dập lửa')) {
    add('Kit Arduino Uno R3 DIP kèm cáp', 'ATmega328P 16MHz', 1, 'Hệ thống điều khiển', 'Vi điều khiển trung tâm');
    add('3 Module Cảm Biến Phát Hiện Lửa Flame Sensor', 'Phát hiện nguồn nhiệt lửa 3 hướng', 3, 'Hệ thống cảm biến', 'Cảm biến tìm hướng lửa');
    add('Động Cơ Quạt Mini Kèm Cánh Quạt Thổi Lửa', 'Thổi dập tắt ngọn nến/lửa', 1, 'Hệ thống truyền động', 'Cơ cấu dập lửa');
    add('Mạch điều khiển động cơ L298N', 'Điều khiển 2 động cơ di chuyển và động cơ quạt', 1, 'Hệ thống truyền động', 'Driver động cơ');
    add('2 Động cơ DC giảm tốc kèm bánh xe cao su', 'Tỷ số truyền 1:48, 3-6V', 2, 'Hệ thống truyền động', 'Di chuyển tiếp cận lửa');
    add('Bộ khung xe robot 2 bánh thông minh', 'Đế mica, 1 bánh đa hướng mắt trâu', 1, 'Khung cơ khí & Bánh xe', 'Khung xe cơ sở');
    add('Khay 2 Pin 18650 kèm pin sạc', 'Điện áp 7.4V', 1, 'Hệ thống nguồn điện', 'Nguồn điện chính');
  } else if (lower.includes('camera') || lower.includes('esp32-cam') || lower.includes('nhận diện') || lower.includes('thị giác')) {
    add('Kit RF Thu Phát WiFi BLE Camera ESP32-CAM', 'Tích hợp camera OV2640 2MP và khe thẻ nhớ', 1, 'Hệ thống điều khiển', 'Thu nhận hình ảnh và stream video');
    add('Mạch nạp ESP32-CAM-MB Micro USB', 'Mạch nạp chương trình và cấp nguồn', 1, 'Hệ thống điều khiển', 'Giao tiếp nạp code');
    add('Mạch điều khiển động cơ TB6612FNG', 'Hiệu suất cao tiết kiệm năng lượng', 1, 'Hệ thống truyền động', 'Điều khiển 2 bánh xe');
    add('2 Động cơ DC giảm tốc TT kèm bánh xe', 'Bánh xe cao su 65mm', 2, 'Hệ thống truyền động', 'Truyền động bánh xe');
    add('Bộ khung xe robot 2 bánh thông minh', 'Đế mica, 1 bánh đa hướng mắt trâu', 1, 'Khung cơ khí & Bánh xe', 'Khung gắn camera');
    add('Khay 2 Pin 18650 kèm mạch hạ áp 5V', 'Cấp nguồn 5V dòng ổn định tránh reset camera', 1, 'Hệ thống nguồn điện', 'Nguồn điện ổn định');
  } else if (lower.includes('tránh vật cản') || lower.includes('obstacle')) {
    add('Board Arduino Uno R3 hoặc Nano V3', 'ATmega328P 16MHz', 1, 'Hệ thống điều khiển', 'Vi điều khiển trung tâm');
    add('Cảm biến siêu âm HC-SR04 kèm giá đỡ', 'Khoảng cách đo 2cm - 400cm', 1, 'Hệ thống cảm biến', 'Phát hiện vật cản phía trước');
    add('Động Cơ RC Servo SG90 9G', 'Quay góc cảm biến siêu âm quét trái phải', 1, 'Hệ thống truyền động', 'Quét góc quan sát');
    add('Mạch điều khiển động cơ L298N', 'Điện áp 5-35V, dòng 2A/kênh', 1, 'Hệ thống truyền động', 'Điều khiển 2 động cơ DC');
    add('2 Động cơ DC giảm tốc kèm bánh xe cao su', 'Tỷ số truyền 1:48, điện áp 3-6V', 2, 'Hệ thống truyền động', 'Truyền động bánh xe');
    add('Bộ khung xe robot 2 bánh thông minh', 'Đế mica, 1 bánh đa hướng mắt trâu', 1, 'Khung cơ khí & Bánh xe', 'Khung gắn linh kiện');
    add('Khay 2 pin 18650 kèm pin sạc', 'Điện áp 7.4V cấp cho động cơ và Arduino', 1, 'Hệ thống nguồn điện', 'Nguồn điện chính');
  } else {
    // Default Line-follower or generic mobile robot
    add('Mạch vi điều khiển ESP32 NodeMCU hoặc Arduino Uno', 'Bộ điều khiển lập trình trung tâm', 1, 'Hệ thống điều khiển', 'Xử lý tín hiệu cảm biến và điều khiển');
    add('Module cảm biến dò line 5 kênh TCRT5000', 'Phát hiện đường vạch kẻ độ nhạy cao', 1, 'Hệ thống cảm biến', 'Cảm biến bám vạch dò line');
    add('Mạch điều khiển động cơ TB6612FNG (hoặc L298N)', 'Driver MOSFET hiệu suất cao', 1, 'Hệ thống truyền động', 'Điều khiển chiều và tốc độ động cơ');
    add('2 Động cơ DC giảm tốc GA25 hoặc vàng 1:48', 'Điện áp 6V - 12V, lực kéo khỏe', 2, 'Hệ thống truyền động', 'Dẫn động bánh xe di chuyển');
    add('Bộ khung xe robot 2 bánh kèm bánh mắt trâu', 'Bánh xe cao su bám đường tốt', 1, 'Khung cơ khí & Bánh xe', 'Kết cấu khung xe');
    add('Bộ nguồn pin sạc Li-ion 18650 2S 7.4V', 'Kèm mạch sạc và công tắc nguồn', 1, 'Hệ thống nguồn điện', 'Nguồn cấp toàn hệ thống');
  }

  return items;
}

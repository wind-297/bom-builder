import { getAppSettings } from './config';
import { BomItem } from './types';

const LLM_TIMEOUT_MS = 30000;

export const ROBOTICS_SYSTEM_PROMPT = `Bạn là một kỹ sư robotics chuyên gia bóc tách linh kiện (BOM - Bill of Materials).
Nhiệm vụ của bạn là phân rã ý tưởng/tên robot thành danh sách đầy đủ linh kiện phần cứng thực tế có thể mua trên thị trường Việt Nam (Shopee, Hshop, Thegioiic...).

Hãy phân rã theo 6 phân hệ cốt lõi:
1. Vi điều khiển / Bo mạch chủ (ESP32, STM32, Arduino Uno/Nano, Raspberry Pi, Jetson Nano, ...)
2. Mạch điều khiển động cơ / Driver (L298N, TB6612FNG, BTS7960, DRV8825, A4988, ...)
3. Động cơ & Truyền động (Động cơ DC giảm tốc GA25/V1, Động cơ bước, Servo MG996R/SG90, ...)
4. Cảm biến (Dò line hồng ngoại, Siêu âm HC-SR04, IMU MPU6050, Lidar, Camera, ...)
5. Nguồn điện & Quản lý pin (Pin Li-Po/18650, Mạch sạc BMS, Mạch hạ áp Buck LM2596, Jack nối, Công tắc, ...)
6. Khung cơ khí & Bánh xe (Khung nhôm/mica/in 3D, Bánh xe Mecanum/Omni/cao su, Trụ đồng, ốc vít, ...)

Chỉ trả về JSON thuần túy (không kèm giải thích) theo định dạng:
{
  "items": [
    {
      "name": "Tên linh kiện",
      "specification": "Thông số kỹ thuật chi tiết",
      "quantity": 1,
      "note": "Ghi chú vai trò trong hệ thống"
    }
  ]
}`;

export function cleanJsonFromLlmOutput(content: string): string {
  const trimmed = content.trim();

  // Strip markdown code fences ```json ... ``` or ``` ... ```
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // Find boundaries of outer JSON object or array
  const firstBrace = trimmed.indexOf('{');
  const firstBracket = trimmed.indexOf('[');

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    const lastBrace = trimmed.lastIndexOf('}');
    if (lastBrace > firstBrace) {
      return trimmed.slice(firstBrace, lastBrace + 1);
    }
  } else if (firstBracket !== -1) {
    const lastBracket = trimmed.lastIndexOf(']');
    if (lastBracket > firstBracket) {
      return trimmed.slice(firstBracket, lastBracket + 1);
    }
  }

  return trimmed;
}

function generateItemId(index: number): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `bom-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`;
}

interface RawLlmItem {
  id?: string;
  name?: string;
  specification?: string;
  quantity?: number;
  note?: string;
}

export function normalizeBomItem(raw: RawLlmItem, index: number): BomItem {
  const quantity = typeof raw.quantity === 'number' && raw.quantity > 0 ? raw.quantity : 1;
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : generateItemId(index),
    name: typeof raw.name === 'string' ? raw.name.trim() : `Linh kiện ${index + 1}`,
    specification: typeof raw.specification === 'string' ? raw.specification.trim() : '',
    quantity,
    unitPrice: 0,
    totalPrice: 0,
    currency: 'VND',
    status: 'pending',
    selectedLink: '',
    alternatives: [],
    note: typeof raw.note === 'string' ? raw.note.trim() : '',
  };
}

export async function decomposeRobotToBom(
  botDescription: string,
  apiKey?: string,
  baseUrl?: string,
  model?: string
): Promise<BomItem[]> {
  const trimmedDesc = botDescription?.trim();
  if (!trimmedDesc) {
    return [];
  }

  const settings = getAppSettings();
  const effectiveKey = apiKey ?? settings.llmApiKey;
  const effectiveBaseUrl = (baseUrl ?? settings.llmBaseUrl ?? 'https://api.openai.com/v1').replace(/\/+$/, '');
  const effectiveModel = model ?? settings.llmModel ?? 'gpt-4o-mini';

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
          { role: 'system', content: ROBOTICS_SYSTEM_PROMPT },
          { role: 'user', content: trimmedDesc },
        ],
        temperature: 0.2,
      }),
      signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
    });

    if (!res.ok) {
      console.warn(`LLM API returned HTTP ${res.status}: ${res.statusText}`);
      return [];
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      return [];
    }

    const cleaned = cleanJsonFromLlmOutput(content);
    const parsed = JSON.parse(cleaned);

    let rawList: RawLlmItem[] = [];
    if (Array.isArray(parsed)) {
      rawList = parsed;
    } else if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.items)) {
        rawList = parsed.items;
      } else if (Array.isArray(parsed.components)) {
        rawList = parsed.components;
      } else if (Array.isArray(parsed.bom)) {
        rawList = parsed.bom;
      }
    }

    return rawList.map((item, index) => normalizeBomItem(item, index));
  } catch (err) {
    console.warn('decomposeRobotToBom error:', err);
    return [];
  }
}

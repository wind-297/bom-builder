import { describe, it, expect, vi, beforeEach } from 'vitest';
import { decomposeRobotToBom } from '../lib/llm';
import { POST } from '../app/api/decompose/route';
import { resetAppSettings, updateAppSettings } from '../lib/config';

describe('LLM Robot BOM Decomposition', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetAppSettings();
  });

  it('should extract structured BOM items from robot description', async () => {
    const mockLlmResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              items: [
                {
                  name: 'Vi điều khiển ESP32',
                  specification: 'ESP-WROOM-32 30 chân Type-C',
                  quantity: 1,
                  note: 'Bộ não xử lý chính',
                },
                {
                  name: 'Mạch điều khiển động cơ L298N',
                  specification: '2A dual H-bridge 5V-35V',
                  quantity: 1,
                  note: 'Điều khiển 2 động cơ',
                },
              ],
            }),
          },
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockLlmResponse,
    } as Response);

    const items = await decomposeRobotToBom('Robot dò đường ESP32');
    expect(items.length).toBe(2);
    expect(items[0].name).toContain('ESP32');
    expect(items[1].quantity).toBe(1);
    expect(items[0].status).toBe('pending');
    expect(items[0].currency).toBe('VND');
  });

  it('should parse markdown-wrapped JSON code blocks cleanly', async () => {
    const mockLlmResponse = {
      choices: [
        {
          message: {
            content: '```json\n{\n  "items": [\n    {"name": "Động cơ servo SG90", "quantity": 2}\n  ]\n}\n```',
          },
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockLlmResponse,
    } as Response);

    const items = await decomposeRobotToBom('Cánh tay robot mini');
    expect(items.length).toBe(1);
    expect(items[0].name).toBe('Động cơ servo SG90');
    expect(items[0].quantity).toBe(2);
  });

  it('should parse plain markdown-wrapped JSON without json lang tag or with array format', async () => {
    const mockLlmResponse = {
      choices: [
        {
          message: {
            content: '```\n[\n  {"name": "Cảm biến siêu âm HC-SR04", "quantity": 1}\n]\n```',
          },
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockLlmResponse,
    } as Response);

    const items = await decomposeRobotToBom('Robot tránh vật cản');
    expect(items.length).toBe(1);
    expect(items[0].name).toBe('Cảm biến siêu âm HC-SR04');
    expect(items[0].quantity).toBe(1);
  });

  it('should handle LLM API failures gracefully without throwing', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('API quota exceeded'));
    const items = await decomposeRobotToBom('Xe thám hiểm');
    expect(items).toEqual([]);
  });

  it('should handle non-200 HTTP response gracefully without throwing', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: async () => 'Invalid API key',
    } as Response);

    const items = await decomposeRobotToBom('Robot nhện 4 chân');
    expect(items).toEqual([]);
  });

  it('should return empty array for empty description', async () => {
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy;

    const items = await decomposeRobotToBom('   ');
    expect(items).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('should use custom apiKey, baseUrl, and model when provided', async () => {
    let calledUrl = '';
    let calledHeaders: Record<string, string> = {};
    let calledBody: any = null;

    global.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      calledUrl = url;
      calledHeaders = init?.headers as Record<string, string>;
      calledBody = JSON.parse((init?.body as string) || '{}');
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '{"items": []}' } }],
        }),
      } as Response;
    });

    await decomposeRobotToBom(
      'Robot lau nhà',
      'sk-custom-test-key',
      'https://custom-llm.example.com/v1',
      'gpt-4o'
    );

    expect(calledUrl).toBe('https://custom-llm.example.com/v1/chat/completions');
    expect(calledHeaders['Authorization']).toBe('Bearer sk-custom-test-key');
    expect(calledBody.model).toBe('gpt-4o');
  });
});

describe('Decompose API Route (POST /api/decompose)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetAppSettings();
  });

  it('should return 400 when description is missing or blank', async () => {
    const req = new Request('http://localhost:3000/api/decompose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it('should return 200 with items for valid description', async () => {
    const mockLlmResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              items: [
                {
                  name: 'Pin Li-Po 3S 11.1V',
                  specification: '2200mAh 25C',
                  quantity: 1,
                },
              ],
            }),
          },
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockLlmResponse,
    } as Response);

    const req = new Request('http://localhost:3000/api/decompose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'Xe cân bằng 2 bánh' }),
    });

    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.items).toBeDefined();
    expect(data.items.length).toBe(1);
    expect(data.items[0].name).toBe('Pin Li-Po 3S 11.1V');
  });
});
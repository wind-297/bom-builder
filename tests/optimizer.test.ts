import { describe, it, expect, vi, beforeEach } from 'vitest';
import { optimizeBomItemWithSearchResults, extractPriceFromText } from '../lib/optimizer';
import { BomItem, BomSearchResult } from '../lib/types';
import { POST } from '../app/api/optimize/route';

describe('AI Product Optimizer', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const baseItem: BomItem = {
    id: 'item-1',
    name: 'Động cơ servo MG996R',
    specification: 'Kim loại 180 độ 5V-7.2V',
    quantity: 2,
    unitPrice: 0,
    totalPrice: 0,
    currency: 'VND',
    status: 'pending',
    selectedLink: '',
    alternatives: [],
    note: '',
  };

  const sampleResults: BomSearchResult[] = [
    {
      title: 'Servo MG996R Nhông Kim Loại - Hshop.vn',
      url: 'https://hshop.vn/mg996r',
      content: 'Động cơ RC Servo MG996R nhông kim loại lực kéo khỏe. Giá bán: 85.000đ',
      engine: 'google',
    },
    {
      title: 'Kẹp càng cua cho robot servo',
      url: 'https://thegioiic.com/kep-cang-cua',
      content: 'Phụ kiện robot gắp. Giá: 120.000đ',
      engine: 'google',
    },
  ];

  it('should select best matching product link and extract unit price', async () => {
    const mockLlmDecision = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              selectedUrl: 'https://hshop.vn/mg996r',
              estimatedPrice: 85000,
              currency: 'VND',
              reason: 'Đúng chuẩn nhông kim loại MG996R, giá tốt từ shop uy tín',
              alternatives: [
                {
                  title: 'Kẹp càng cua cho robot servo',
                  url: 'https://thegioiic.com/kep-cang-cua',
                  price: 120000,
                  reason: 'Phụ kiện kèm theo',
                },
              ],
            }),
          },
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockLlmDecision,
    } as Response);

    const optimized = await optimizeBomItemWithSearchResults(baseItem, sampleResults);
    expect(optimized.selectedLink).toBe('https://hshop.vn/mg996r');
    expect(optimized.unitPrice).toBe(85000);
    expect(optimized.totalPrice).toBe(170000);
    expect(optimized.status).toBe('found');
    expect(optimized.alternatives.length).toBe(1);
    expect(optimized.note).toContain('Đúng chuẩn');
  });

  it('should fallback to not_found if search results are empty', async () => {
    const optimized = await optimizeBomItemWithSearchResults(baseItem, []);
    expect(optimized.status).toBe('not_found');
    expect(optimized.selectedLink).toBe('');
  });

  it('should fallback gracefully when LLM fails without crashing', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('LLM Timeout'));
    const optimized = await optimizeBomItemWithSearchResults(baseItem, sampleResults);
    // If LLM fails, select the first search result as fallback or mark found
    expect(optimized.selectedLink).toBe('https://hshop.vn/mg996r');
    expect(optimized.status).toBe('found');
    expect(optimized.unitPrice).toBe(85000);
    expect(optimized.totalPrice).toBe(170000);
  });

  it('should handle markdown code fences in LLM response', async () => {
    const mockLlmDecision = {
      choices: [
        {
          message: {
            content: '```json\n{\n  "selectedUrl": "https://hshop.vn/mg996r",\n  "estimatedPrice": 85000\n}\n```',
          },
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockLlmDecision,
    } as Response);

    const optimized = await optimizeBomItemWithSearchResults(baseItem, sampleResults);
    expect(optimized.selectedLink).toBe('https://hshop.vn/mg996r');
    expect(optimized.unitPrice).toBe(85000);
  });

  it('should extract price from snippet with various currency formats', () => {
    expect(extractPriceFromText('Giá bán: 85.000đ')).toBe(85000);
    expect(extractPriceFromText('Đơn giá: 120.000 VND')).toBe(120000);
    expect(extractPriceFromText('Combo 50k freeship')).toBe(50000);
    expect(extractPriceFromText('Không có giá')).toBe(0);
  });

  it('should pass custom apiKey, baseUrl, and model to LLM call', async () => {
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
          choices: [
            {
              message: {
                content: JSON.stringify({
                  selectedUrl: 'https://hshop.vn/mg996r',
                  estimatedPrice: 85000,
                }),
              },
            },
          ],
        }),
      } as Response;
    });

    await optimizeBomItemWithSearchResults(
      baseItem,
      sampleResults,
      'custom-api-key',
      'https://api.custom.com/v1',
      'custom-model'
    );

    expect(calledUrl).toBe('https://api.custom.com/v1/chat/completions');
    expect(calledHeaders['Authorization']).toBe('Bearer custom-api-key');
    expect(calledBody.model).toBe('custom-model');
  });
});

describe('Optimize API Route (POST /api/optimize)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const baseItem: BomItem = {
    id: 'item-1',
    name: 'Động cơ servo MG996R',
    specification: 'Kim loại 180 độ 5V-7.2V',
    quantity: 2,
    unitPrice: 0,
    totalPrice: 0,
    currency: 'VND',
    status: 'pending',
    selectedLink: '',
    alternatives: [],
    note: '',
  };

  it('should return 400 when item or searchResults is missing', async () => {
    const req1 = new Request('http://localhost:3000/api/optimize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res1 = await POST(req1);
    expect(res1.status).toBe(400);

    const req2 = new Request('http://localhost:3000/api/optimize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item: baseItem }),
    });
    const res2 = await POST(req2);
    expect(res2.status).toBe(400);
  });

  it('should return 200 with optimized item', async () => {
    const mockLlmDecision = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              selectedUrl: 'https://hshop.vn/mg996r',
              estimatedPrice: 85000,
            }),
          },
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockLlmDecision,
    } as Response);

    const req = new Request('http://localhost:3000/api/optimize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item: baseItem,
        searchResults: [
          {
            title: 'Servo MG996R - Hshop.vn',
            url: 'https://hshop.vn/mg996r',
            content: 'Giá bán: 85.000đ',
          },
        ],
      }),
    });

    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.item).toBeDefined();
    expect(data.item.selectedLink).toBe('https://hshop.vn/mg996r');
    expect(data.item.totalPrice).toBe(170000);
  });
});

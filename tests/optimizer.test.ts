import { describe, it, expect, vi, beforeEach } from 'vitest';
import { optimizeBomItemWithSearchResults } from '../lib/optimizer';
import { BomItem, BomSearchResult } from '../lib/types';
import { POST } from '../app/api/optimize/route';

describe('AI Product Technical Optimizer & Link Selector', () => {
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
    manualPrice: {
      amount: null,
      currency: 'VND',
      entrySource: null,
    },
  };

  const sampleResults: BomSearchResult[] = [
    {
      title: 'Servo MG996R Nhông Kim Loại - Hshop.vn',
      url: 'https://hshop.vn/mg996r',
      content: 'Động cơ RC Servo MG996R nhông kim loại lực kéo khỏe.',
      engine: 'google',
    },
    {
      title: 'Module Điều Khiển Động Cơ L298N - Nshop',
      url: 'https://nshopvn.com/mach-dieu-khien-dong-co-l298n',
      content: 'Mạch cầu H điều khiển động cơ DC/bước.',
      engine: 'google',
    },
  ];

  it('should select best matching product link based on technical criteria and not inject auto-price', async () => {
    const mockLlmDecision = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              selectedUrl: 'https://hshop.vn/mg996r',
              matchType: 'best_match',
              reason: 'Đúng chuẩn nhông kim loại MG996R từ nhà cung cấp Tier 2 Hshop',
              alternatives: [
                {
                  title: 'Module L298N',
                  url: 'https://nshopvn.com/mach-dieu-khien-dong-co-l298n',
                  matchType: 'alternative',
                  reason: 'Lựa chọn thay thế',
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
    expect(optimized.supplierName).toBe('Hshop');
    expect(optimized.supplierTier).toBe(2);
    expect(optimized.linkStatus).toBe('verified');
    expect(optimized.matchType).toBe('best_match');
    expect(optimized.status).toBe('found');
    // Manual price remains unassigned (null) until user manually enters price
    expect(optimized.manualPrice?.amount).toBeNull();
    expect(optimized.unitPrice).toBe(0);
    expect(optimized.totalPrice).toBe(0);
    expect(optimized.alternatives.length).toBe(1);
    expect(optimized.note).toContain('Đúng chuẩn');
  });

  it('should preserve existing user manual price when optimizing product link', async () => {
    const itemWithManualPrice: BomItem = {
      ...baseItem,
      manualPrice: {
        amount: 85000,
        currency: 'VND',
        entrySource: 'user_input',
      },
      unitPrice: 85000,
      totalPrice: 170000,
    };

    const mockLlmDecision = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              selectedUrl: 'https://hshop.vn/mg996r',
              matchType: 'best_match',
              reason: 'Lựa chọn chuẩn',
            }),
          },
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockLlmDecision,
    } as Response);

    const optimized = await optimizeBomItemWithSearchResults(itemWithManualPrice, sampleResults);
    expect(optimized.selectedLink).toBe('https://hshop.vn/mg996r');
    expect(optimized.manualPrice?.amount).toBe(85000);
    expect(optimized.unitPrice).toBe(85000);
    expect(optimized.totalPrice).toBe(170000);
  });

  it('should fallback to not_found if search results are empty', async () => {
    const optimized = await optimizeBomItemWithSearchResults(baseItem, []);
    expect(optimized.status).toBe('not_found');
    expect(optimized.selectedLink).toBe('');
    expect(optimized.linkStatus).toBe('unverified');
  });

  it('should fallback gracefully to top-ranked allowed link when LLM fails', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('LLM Timeout'));
    const optimized = await optimizeBomItemWithSearchResults(baseItem, sampleResults);
    expect(optimized.selectedLink).toBe('https://hshop.vn/mg996r');
    expect(optimized.status).toBe('found');
    expect(optimized.supplierName).toBe('Hshop');
    expect(optimized.linkStatus).toBe('verified');
  });

  it('should reject news articles, disallowed domains, and root homepages as selectedLink', async () => {
    const dirtyResults: BomSearchResult[] = [
      {
        title: 'Báo Nông Nghiệp: Ứng dụng máy bơm nước trong tưới tiêu',
        url: 'https://nongnghiep.vn/tin-tuc-may-bom-nuoc.html',
        content: 'Nông nghiệp sạch áp dụng máy bơm nước mini tưới tiêu hoa màu.',
      },
      {
        title: 'Hshop - Trang chủ',
        url: 'https://hshop.vn/',
        content: 'Trang chủ siêu thị điện tử Hshop.',
      },
      {
        title: 'Máy Bơm Nước Chìm Mini 5V - Nshop',
        url: 'https://nshopvn.com/may-bom-nuoc-chim-mini-5v',
        content: 'Máy Bơm Chìm Mini 5V 1.2-1.6L/phút cho mô hình robot.',
      },
    ];

    // Mock LLM mistakenly returning the root homepage
    const mockLlmDecision = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              selectedUrl: 'https://hshop.vn/',
              reason: 'Nhà cung cấp uy tín',
            }),
          },
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockLlmDecision,
    } as Response);

    const item: BomItem = {
      ...baseItem,
      name: 'Máy bơm mini 5V',
    };

    const optimized = await optimizeBomItemWithSearchResults(item, dirtyResults);
    // Must reject the root homepage and news article, selecting the specific product link instead
    expect(optimized.selectedLink).toBe('https://nshopvn.com/may-bom-nuoc-chim-mini-5v');
    expect(optimized.supplierName).toBe('NShop');
    expect(optimized.status).toBe('found');
  });

  it('should mark item as not_found if all search results are irrelevant news or homepages', async () => {
    const onlyJunkResults: BomSearchResult[] = [
      {
        title: 'Báo Nông Nghiệp: Ứng dụng tưới tiêu',
        url: 'https://nongnghiep.vn/bai-viet.html',
        content: 'Tưới tiêu nông nghiệp.',
      },
      {
        title: 'Dân Trí: Nghiên cứu nông sản',
        url: 'https://dantri.com.vn/nong-san.htm',
        content: 'Nghiên cứu nông nghiệp.',
      },
      {
        title: 'Shopee Việt Nam',
        url: 'https://shopee.vn/',
        content: 'Mua sắm trực tuyến.',
      },
    ];

    global.fetch = vi.fn().mockRejectedValue(new Error('LLM error'));

    const item: BomItem = {
      ...baseItem,
      name: 'Máy bơm mini 5V',
    };

    const optimized = await optimizeBomItemWithSearchResults(item, onlyJunkResults);
    expect(optimized.status).toBe('not_found');
    expect(optimized.selectedLink).toBe('');
  });

  it('should handle markdown code fences in LLM response', async () => {
    const mockLlmDecision = {
      choices: [
        {
          message: {
            content: '```json\n{\n  "selectedUrl": "https://hshop.vn/mg996r",\n  "matchType": "best_match"\n}\n```',
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
    expect(optimized.matchType).toBe('best_match');
  });

  it('API route /api/optimize should validate request and return optimized item', async () => {
    const request = new Request('http://localhost:3000/api/optimize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item: baseItem,
        searchResults: sampleResults,
      }),
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                selectedUrl: 'https://hshop.vn/mg996r',
                matchType: 'best_match',
                reason: 'Hàng chuẩn',
              }),
            },
          },
        ],
      }),
    } as Response);

    const res = await POST(request as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.item.selectedLink).toBe('https://hshop.vn/mg996r');
  });
});

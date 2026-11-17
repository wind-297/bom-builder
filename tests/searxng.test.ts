import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchSearxng, buildProductSearchQuery } from '../lib/searxng';
import { POST } from '../app/api/search/route';
import { resetAppSettings, updateAppSettings } from '../lib/config';

describe('buildProductSearchQuery', () => {
  it('should append linh kiện when query lacks shopping/component keywords', () => {
    expect(buildProductSearchQuery('Cảm biến độ ẩm đất')).toBe('Cảm biến độ ẩm đất linh kiện');
    expect(buildProductSearchQuery('Arduino Uno R3', 'DIP ATmega328P')).toBe('Arduino Uno R3 DIP ATmega328P linh kiện');
  });

  it('should not duplicate when keywords like linh kiện, mua, bán, or giá already exist', () => {
    expect(buildProductSearchQuery('Linh kiện IC 555')).toBe('Linh kiện IC 555');
    expect(buildProductSearchQuery('Mua động cơ servo SG90 giá rẻ')).toBe('Mua động cơ servo SG90 giá rẻ');
  });

  it('should return empty string for empty input', () => {
    expect(buildProductSearchQuery('')).toBe('');
    expect(buildProductSearchQuery('   ')).toBe('');
  });
});

describe('SearXNG Search Service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetAppSettings();
  });

  it('should format search results correctly from SearXNG JSON response', async () => {
    const mockSearxResponse = {
      results: [
        {
          title: 'Động cơ giảm tốc V1 - Hshop.vn',
          url: 'https://hshop.vn/products/dong-co-v1',
          content: 'Giá: 25.000đ. Động cơ giảm tốc V1 bánh xe robot',
          engine: 'google',
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockSearxResponse,
    } as Response);

    const results = await searchSearxng('động cơ v1', 'http://localhost:8080');
    expect(results.length).toBe(1);
    expect(results[0].title).toContain('Động cơ giảm tốc V1');
    expect(results[0].url).toBe('https://hshop.vn/products/dong-co-v1');
    expect(results[0].content).toContain('25.000đ');
    expect(results[0].engine).toBe('google');
  });

  it('should handle SearXNG network failure gracefully by returning empty array without throwing', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));
    const results = await searchSearxng('cảm biến', 'http://localhost:8080');
    expect(results).toEqual([]);
  });

  it('should handle non-200 HTTP response gracefully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    } as Response);
    const results = await searchSearxng('cảm biến', 'http://localhost:8080');
    expect(results).toEqual([]);
  });

  it('should use default getAppSettings().searxngUrl when customUrl is not provided', async () => {
    updateAppSettings({ searxngUrl: 'http://custom-searxng:8888' });

    let fetchedUrl = '';
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      fetchedUrl = url;
      return {
        ok: true,
        json: async () => ({ results: [] }),
      } as Response;
    });

    await searchSearxng('arduino uno');
    expect(fetchedUrl).toContain('http://custom-searxng:8888/search');
    expect(fetchedUrl).toContain('q=arduino%20uno');
  });

  it('should fallback to snippet if content is missing', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            title: 'Arduino Nano',
            url: 'https://example.com/nano',
            snippet: 'Snippet description here',
          },
        ],
      }),
    } as Response);

    const results = await searchSearxng('arduino nano', 'http://localhost:8080');
    expect(results.length).toBe(1);
    expect(results[0].content).toBe('Snippet description here');
  });

  it('should return empty array for empty query', async () => {
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy;

    const results = await searchSearxng('');
    expect(results).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('should filter out news/agriculture portals and root domains, retaining deep product links', async () => {
    const mockSearxResponse = {
      results: [
        {
          title: 'Báo Nông Nghiệp: Ứng dụng cảm biến độ ẩm',
          url: 'https://baonongnghiep.vn/cam-bien-do-am.html',
          content: 'Kỹ thuật tưới cây nông nghiệp',
        },
        {
          title: 'Hshop.vn - Cửa hàng linh kiện điện tử',
          url: 'https://hshop.vn/',
          content: 'Trang chủ cung cấp linh kiện robot',
        },
        {
          title: 'Dân Trí: Nông sản sạch công nghệ cao',
          url: 'https://dantri.com.vn/nong-san-cong-nghe-cao.htm',
          content: 'Nông nghiệp thông minh',
        },
        {
          title: 'Cảm Biến Độ Ẩm Đất Relay Đóng Ngắt 12V - Hshop.vn',
          url: 'https://hshop.vn/products/cam-bien-do-am-dat-relay',
          content: 'Giá bán: 45.000đ. Cảm biến độ ẩm đất tự động tưới',
        },
        {
          title: 'Wikipedia: Cảm biến độ ẩm',
          url: 'https://vi.wikipedia.org/wiki/C%E1%BA%A3m_bi%E1%BA%BFn',
          content: 'Định nghĩa khoa học cảm biến',
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockSearxResponse,
    } as Response);

    const results = await searchSearxng('cảm biến độ ẩm đất');
    expect(results.length).toBe(1);
    expect(results[0].url).toBe('https://hshop.vn/products/cam-bien-do-am-dat-relay');
    expect(results[0].title).toContain('Hshop.vn');
  });
});

describe('Search API Route (POST /api/search)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should return 400 when query is missing', async () => {
    const req = new Request('http://localhost:3000/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it('should return search results for valid query', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            title: 'SG90 Servo',
            url: 'https://example.com/sg90',
            content: 'Mini servo 9g',
          },
        ],
      }),
    } as Response);

    const req = new Request('http://localhost:3000/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'servo sg90' }),
    });

    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.results).toBeDefined();
    expect(data.results.length).toBe(1);
    expect(data.results[0].title).toBe('SG90 Servo');
  });
});

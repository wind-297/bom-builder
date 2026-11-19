import { NextResponse } from 'next/server';
import { searchWithMandatoryShopee } from '@/lib/searxng';
import { findCatalogMatches } from '@/lib/catalog';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const query = typeof body?.query === 'string' ? body.query.trim() : '';

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const customUrl = typeof body?.customUrl === 'string' ? body.customUrl : undefined;
    const specification = typeof body?.specification === 'string' ? body.specification : undefined;
    let { results, searchLog } = await searchWithMandatoryShopee(query, customUrl, specification);

    // If live search returned 0 items (e.g. SearXNG offline / rate-limited), seamlessly fallback to catalog
    if (results.length === 0) {
      const catalogMatches = findCatalogMatches(query, 6);
      if (catalogMatches.length > 0) {
        results = catalogMatches;
        if (searchLog) {
          const shopeeCount = catalogMatches.filter((m) => m.url.includes('shopee.vn')).length;
          const storeCount = catalogMatches.length - shopeeCount;
          searchLog.shopeeFound = shopeeCount > 0;
          searchLog.shopeeProductsRetained = shopeeCount;
          searchLog.specializedProductsRetained = storeCount;
          searchLog.totalFilteredCount = catalogMatches.length;
          searchLog.statusNotes = `Đã tìm thấy ${catalogMatches.length} sản phẩm phù hợp từ cơ sở dữ liệu linh kiện robotics.`;
        }
      }
    }

    return NextResponse.json({ results, searchLog });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid request';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

import { NextResponse } from 'next/server';
import { optimizeBomItemWithSearchResults } from '@/lib/optimizer';
import { validateProductLink } from '@/lib/link-validator';
import { BomItem, BomSearchResult } from '@/lib/types';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const item = body?.item as BomItem | undefined;
    const searchResults = body?.searchResults as BomSearchResult[] | undefined;

    if (!item || typeof item !== 'object' || !item.name) {
      return NextResponse.json({ error: 'Valid item is required' }, { status: 400 });
    }

    if (!Array.isArray(searchResults)) {
      return NextResponse.json({ error: 'searchResults array is required' }, { status: 400 });
    }

    const apiKey = typeof body?.apiKey === 'string' ? body.apiKey : undefined;
    const baseUrl = typeof body?.baseUrl === 'string' ? body.baseUrl : undefined;
    const model = typeof body?.model === 'string' ? body.model : undefined;

    let optimized = await optimizeBomItemWithSearchResults(
      item,
      searchResults,
      apiKey,
      baseUrl,
      model
    );

    // Live HTTP link verification in non-test runtime to guarantee zero 404/dead links reach UI
    const isTestEnv = typeof process !== 'undefined' && process.env.VITEST === 'true';
    if (!isTestEnv && optimized.selectedLink) {
      const check = await validateProductLink(optimized.selectedLink, optimized.name);

      if (check.linkStatus === 'dead' || check.linkStatus === 'invalid') {
        // Try promoting first working alternative
        let promoted = false;
        const remainingAlts = [...(optimized.alternatives || [])];
        for (let i = 0; i < remainingAlts.length; i++) {
          const alt = remainingAlts[i];
          const altCheck = await validateProductLink(alt.url, optimized.name);
          if (altCheck.linkStatus !== 'dead' && altCheck.linkStatus !== 'invalid') {
            optimized = {
              ...optimized,
              selectedLink: altCheck.finalUrl || alt.url,
              linkStatus: altCheck.linkStatus,
              supplierName: alt.supplierName || alt.sourceName || optimized.supplierName,
              supplierDomain: alt.supplierDomain || alt.sourceDomain || optimized.supplierDomain,
              supplierTier: alt.supplierTier || alt.tier || optimized.supplierTier,
              supplierCountry: alt.supplierCountry || alt.country || optimized.supplierCountry,
              alternatives: remainingAlts.filter((_, idx) => idx !== i),
              status: 'found',
            };
            promoted = true;
            break;
          }
        }

        if (!promoted) {
          optimized = {
            ...optimized,
            selectedLink: '',
            linkStatus: check.linkStatus,
            status: 'not_found',
            note: 'Chưa tìm thấy sản phẩm phù hợp có đường dẫn xác minh được trong các nguồn được hỗ trợ.',
          };
        }
      } else {
        optimized = {
          ...optimized,
          selectedLink: check.finalUrl || optimized.selectedLink,
          linkStatus: check.linkStatus,
        };
      }
    }

    return NextResponse.json({ item: optimized });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid request';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

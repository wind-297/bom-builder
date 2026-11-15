import { NextResponse } from 'next/server';
import { optimizeBomItemWithSearchResults } from '@/lib/optimizer';
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

    const optimized = await optimizeBomItemWithSearchResults(
      item,
      searchResults,
      apiKey,
      baseUrl,
      model
    );

    return NextResponse.json({ item: optimized });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid request';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

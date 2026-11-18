import { NextResponse } from 'next/server';
import { searchWithMandatoryShopee } from '@/lib/searxng';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const query = typeof body?.query === 'string' ? body.query.trim() : '';

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const customUrl = typeof body?.customUrl === 'string' ? body.customUrl : undefined;
    const specification = typeof body?.specification === 'string' ? body.specification : undefined;
    const { results, searchLog } = await searchWithMandatoryShopee(query, customUrl, specification);

    return NextResponse.json({ results, searchLog });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid request';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

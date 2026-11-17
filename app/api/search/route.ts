import { NextResponse } from 'next/server';
import { searchSearxng } from '@/lib/searxng';
import { findCatalogMatches } from '@/lib/catalog';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const query = typeof body?.query === 'string' ? body.query.trim() : '';

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const customUrl = typeof body?.customUrl === 'string' ? body.customUrl : undefined;
    let results = await searchSearxng(query, customUrl);

    // Fallback to verified robotics catalog if SearXNG is unavailable or returns 0 results
    if (!results || results.length === 0) {
      results = findCatalogMatches(query);
    }

    return NextResponse.json({ results });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid request';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

import { NextResponse } from 'next/server';
import { decomposeRobotToBom } from '@/lib/llm';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const description = typeof body?.description === 'string' ? body.description.trim() : '';

    if (!description) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }

    const apiKey = typeof body?.apiKey === 'string' ? body.apiKey : undefined;
    const baseUrl = typeof body?.baseUrl === 'string' ? body.baseUrl : undefined;
    const model = typeof body?.model === 'string' ? body.model : undefined;

    const items = await decomposeRobotToBom(description, apiKey, baseUrl, model);
    return NextResponse.json({ items });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid request';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

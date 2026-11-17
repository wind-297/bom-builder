import { NextResponse } from 'next/server';
import { decomposeProjectOrProduct } from '@/lib/decomposition-engine';

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

    const result = await decomposeProjectOrProduct(description, apiKey, baseUrl, model);
    return NextResponse.json({
      items: result.items,
      intent: result.intent,
      projectName: result.projectName,
      budgetConstraint: result.budgetConstraint,
      alreadyOwned: result.alreadyOwned,
      isAmbiguous: result.isAmbiguous,
      clarifyingQuestion: result.clarifyingQuestion,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid request';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

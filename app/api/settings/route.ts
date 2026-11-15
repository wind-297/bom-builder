import { NextResponse } from 'next/server';
import { getAppSettings, updateAppSettings, maskApiKey } from '@/lib/config';

export async function GET() {
  const settings = getAppSettings();
  return NextResponse.json({
    searxngUrl: settings.searxngUrl,
    llmBaseUrl: settings.llmBaseUrl,
    llmModel: settings.llmModel,
    llmApiKey: maskApiKey(settings.llmApiKey),
    hasApiKey: Boolean(settings.llmApiKey),
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const updatePayload = { ...body };
    if (typeof updatePayload.llmApiKey === 'string' && updatePayload.llmApiKey.includes('...')) {
      delete updatePayload.llmApiKey;
    }
    const updated = updateAppSettings(updatePayload);
    return NextResponse.json({
      success: true,
      settings: {
        searxngUrl: updated.searxngUrl,
        llmBaseUrl: updated.llmBaseUrl,
        llmModel: updated.llmModel,
        llmApiKey: maskApiKey(updated.llmApiKey),
        hasApiKey: Boolean(updated.llmApiKey),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid request';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

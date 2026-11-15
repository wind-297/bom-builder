import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getAppSettings, updateAppSettings, resetAppSettings } from '../lib/config';
import { GET, POST } from '../app/api/settings/route';

describe('AppSettings Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    resetAppSettings();
  });

  afterEach(() => {
    process.env = originalEnv;
    resetAppSettings();
  });

  it('should return default settings with fallback values', () => {
    delete process.env.SEARXNG_URL;
    delete process.env.LLM_API_KEY;
    delete process.env.LLM_BASE_URL;
    delete process.env.LLM_MODEL;

    const settings = getAppSettings();
    expect(settings).toHaveProperty('searxngUrl', 'http://localhost:8080');
    expect(settings).toHaveProperty('llmApiKey', '');
    expect(settings).toHaveProperty('llmBaseUrl', 'https://api.openai.com/v1');
    expect(settings).toHaveProperty('llmModel', 'gpt-4o-mini');
  });

  it('should use environment variables if present', () => {
    process.env.SEARXNG_URL = 'http://searxng.local:8888';
    process.env.LLM_API_KEY = 'test-env-key';
    process.env.LLM_BASE_URL = 'https://openrouter.ai/api/v1';
    process.env.LLM_MODEL = 'deepseek/chat';

    const settings = getAppSettings();
    expect(settings.searxngUrl).toBe('http://searxng.local:8888');
    expect(settings.llmApiKey).toBe('test-env-key');
    expect(settings.llmBaseUrl).toBe('https://openrouter.ai/api/v1');
    expect(settings.llmModel).toBe('deepseek/chat');
  });

  it('should allow runtime settings update', () => {
    updateAppSettings({
      searxngUrl: 'http://custom-searxng:8080',
      llmModel: 'gpt-4o',
    });

    const settings = getAppSettings();
    expect(settings.searxngUrl).toBe('http://custom-searxng:8080');
    expect(settings.llmModel).toBe('gpt-4o');
  });
});

describe('Settings API Route', () => {
  beforeEach(() => {
    resetAppSettings();
  });

  afterEach(() => {
    resetAppSettings();
  });

  it('GET /api/settings should return current settings with masked API key', async () => {
    updateAppSettings({
      llmApiKey: 'sk-1234567890abcdef',
    });

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.searxngUrl).toBeDefined();
    expect(data.llmBaseUrl).toBeDefined();
    expect(data.llmModel).toBeDefined();
    expect(data.hasApiKey).toBe(true);
    expect(data.llmApiKey).not.toBe('sk-1234567890abcdef');
    expect(data.llmApiKey).toContain('...');
  });

  it('POST /api/settings should update runtime settings', async () => {
    const req = new Request('http://localhost:3000/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        searxngUrl: 'http://new-searxng:8080',
        llmModel: 'claude-3-5-sonnet',
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);

    const current = getAppSettings();
    expect(current.searxngUrl).toBe('http://new-searxng:8080');
    expect(current.llmModel).toBe('claude-3-5-sonnet');
  });
});

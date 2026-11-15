import { AppSettings } from './types';

// In-memory runtime settings override
let runtimeSettings: Partial<AppSettings> = {};

export function getAppSettings(): AppSettings {
  return {
    searxngUrl: runtimeSettings.searxngUrl ?? process.env.SEARXNG_URL ?? 'http://localhost:8080',
    llmApiKey: runtimeSettings.llmApiKey ?? process.env.LLM_API_KEY ?? '',
    llmBaseUrl: runtimeSettings.llmBaseUrl ?? process.env.LLM_BASE_URL ?? 'https://api.openai.com/v1',
    llmModel: runtimeSettings.llmModel ?? process.env.LLM_MODEL ?? 'gpt-4o-mini',
  };
}

export function updateAppSettings(newSettings: Partial<AppSettings>): AppSettings {
  runtimeSettings = {
    ...runtimeSettings,
    ...newSettings,
  };
  return getAppSettings();
}

export function resetAppSettings(): void {
  runtimeSettings = {};
}

export function maskApiKey(key: string): string {
  if (!key) return '';
  if (key.length <= 8) return '********';
  return `${key.slice(0, 3)}...${key.slice(-4)}`;
}

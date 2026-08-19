import { AI_SETTING_KEYS } from '@/constants/ai-settings';
import { getSetting } from '@/repositories/settings';

export async function getClaudeApiKey() {
  return getSetting(AI_SETTING_KEYS.CLAUDE_API_KEY);
}

export async function getDeepgramApiKey() {
  return getSetting(AI_SETTING_KEYS.DEEPGRAM_API_KEY);
}

export function maskApiKey(apiKey) {
  if (!apiKey || apiKey.length < 8) return '***';
  const start = apiKey.substring(0, 4);
  const end = apiKey.substring(apiKey.length - 4);
  return `${start}***${end}`;
}

export const AI_SETTING_KEYS = {
  DEFAULT_SYSTEM_PROMPT: 'ai_default_system_prompt',
  VOICE_MODE_DEFAULT: 'ai_voice_mode_default',
  TOOLS_DISABLED_DEFAULT: 'ai_tools_disabled_default',
  CLAUDE_API_KEY: 'ai_claude_api_key',
  DEEPGRAM_API_KEY: 'ai_deepgram_api_key',
};

export const boolFromSetting = (value) => value === 'true';
export const settingFromBool = (value) => (value ? 'true' : 'false');

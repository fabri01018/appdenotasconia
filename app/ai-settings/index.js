import AISettingsHeader from '@/components/ai-settings/AISettingsHeader';
import AISettingsNavButton from '@/components/ai-settings/AISettingsNavButton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AI_SETTING_KEYS, boolFromSetting } from '@/constants/ai-settings';
import { useSetting } from '@/hooks/use-settings';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';

export default function AISettingsIndexScreen() {
  const router = useRouter();

  const { value: savedClaudeKey } = useSetting(AI_SETTING_KEYS.CLAUDE_API_KEY);
  const { value: savedDeepgramKey } = useSetting(AI_SETTING_KEYS.DEEPGRAM_API_KEY);
  const { value: savedVoiceMode } = useSetting(AI_SETTING_KEYS.VOICE_MODE_DEFAULT);
  const { value: savedToolsDisabled } = useSetting(AI_SETTING_KEYS.TOOLS_DISABLED_DEFAULT);
  const { value: savedSystemPrompt } = useSetting(AI_SETTING_KEYS.DEFAULT_SYSTEM_PROMPT);

  const apiKeysSummary =
    savedClaudeKey && savedDeepgramKey
      ? 'Both keys configured'
      : savedClaudeKey || savedDeepgramKey
        ? 'Partially configured'
        : 'Not configured';

  const chatDefaultsSummary = [
    boolFromSetting(savedVoiceMode) ? 'Voice on' : 'Voice off',
    boolFromSetting(savedToolsDisabled) ? 'Tools off' : 'Tools on',
  ].join(' · ');

  const systemPromptSummary = savedSystemPrompt
    ? `${savedSystemPrompt.trim().slice(0, 48)}${savedSystemPrompt.trim().length > 48 ? '…' : ''}`
    : 'No system prompt set';

  const toolsSummary = boolFromSetting(savedToolsDisabled) ? 'Tools disabled' : 'Tools enabled';

  return (
    <ThemedView style={styles.container}>
      <AISettingsHeader title="AI Settings" />

      <ScrollView style={styles.content}>
        <ThemedText style={styles.subtitle}>
          Configure AI chat behavior, API keys, and prompts.
        </ThemedText>

        <AISettingsNavButton
          icon="key-outline"
          iconColor="#FF9500"
          title="API Keys"
          description={apiKeysSummary}
          onPress={() => router.push('/ai-settings/api-keys')}
        />

        <AISettingsNavButton
          icon="chatbubbles-outline"
          iconColor="#0a7ea4"
          title="Chat Defaults"
          description={chatDefaultsSummary}
          onPress={() => router.push('/ai-settings/chat-defaults')}
        />

        <AISettingsNavButton
          icon="document-text-outline"
          iconColor="#AF52DE"
          title="System Prompt"
          description={systemPromptSummary}
          onPress={() => router.push('/ai-settings/system-prompt')}
        />

        <AISettingsNavButton
          icon="construct-outline"
          iconColor="#34C759"
          title="Tools"
          description={toolsSummary}
          onPress={() => router.push('/ai-settings/tools')}
        />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  subtitle: {
    fontSize: 15,
    opacity: 0.6,
    lineHeight: 22,
    marginBottom: 24,
  },
});

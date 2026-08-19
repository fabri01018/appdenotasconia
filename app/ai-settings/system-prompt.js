import AISettingsHeader from '@/components/ai-settings/AISettingsHeader';
import PromptsSelectionModal from '@/components/prompts-selection-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AI_SETTING_KEYS } from '@/constants/ai-settings';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSetting } from '@/hooks/use-settings';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

export default function AISettingsSystemPromptScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const { value: savedSystemPrompt, setValue: setSavedSystemPrompt } = useSetting(
    AI_SETTING_KEYS.DEFAULT_SYSTEM_PROMPT
  );

  const [systemPromptDraft, setSystemPromptDraft] = useState('');
  const [showPromptsModal, setShowPromptsModal] = useState(false);

  useEffect(() => {
    setSystemPromptDraft(savedSystemPrompt || '');
  }, [savedSystemPrompt]);

  const saveSystemPrompt = () => {
    const trimmed = systemPromptDraft.trim();
    setSavedSystemPrompt(trimmed || null);
  };

  const clearSystemPrompt = () => {
    setSystemPromptDraft('');
    setSavedSystemPrompt(null);
  };

  return (
    <ThemedView style={styles.container}>
      <AISettingsHeader title="System Prompt" />

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        <ThemedText style={styles.description}>
          Instructions sent to the AI at the start of every chat. If empty, no system prompt is
          used. Manage reusable prompts in a project named &quot;prompts&quot;.
        </ThemedText>

        <TextInput
          style={[
            styles.promptInput,
            {
              color: isDark ? '#ECEDEE' : '#11181C',
              borderColor: isDark ? '#444' : '#ddd',
              backgroundColor: isDark ? '#2c2c2e' : '#fff',
            },
          ]}
          value={systemPromptDraft}
          onChangeText={setSystemPromptDraft}
          onBlur={saveSystemPrompt}
          multiline
          textAlignVertical="top"
          placeholder="Enter default system prompt..."
          placeholderTextColor={isDark ? '#9BA1A6' : '#687076'}
        />

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, { borderColor: isDark ? '#444' : '#ddd' }]}
            onPress={() => setShowPromptsModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="document-text-outline" size={18} color="#0a7ea4" />
            <ThemedText style={styles.actionButtonText}>Pick from Prompts</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { borderColor: isDark ? '#444' : '#ddd' }]}
            onPress={clearSystemPrompt}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={18} color={isDark ? '#ECEDEE' : '#11181C'} />
            <ThemedText style={styles.actionButtonText}>Clear</ThemedText>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <PromptsSelectionModal
        visible={showPromptsModal}
        onClose={() => setShowPromptsModal(false)}
        onSelectPrompt={(prompt) => {
          setSystemPromptDraft(prompt);
          setSavedSystemPrompt(prompt);
        }}
      />
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
  description: {
    fontSize: 14,
    opacity: 0.6,
    lineHeight: 20,
    marginBottom: 16,
  },
  promptInput: {
    minHeight: 200,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

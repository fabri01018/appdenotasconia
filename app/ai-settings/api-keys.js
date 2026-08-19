import AISettingsHeader from '@/components/ai-settings/AISettingsHeader';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AI_SETTING_KEYS } from '@/constants/ai-settings';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSetting } from '@/hooks/use-settings';
import { maskApiKey } from '@/lib/api-keys';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

const CLAUDE_MODEL = 'claude-sonnet-4-5';
const TTS_MODEL = 'aura-2-thalia-en';

export default function AISettingsApiKeysScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const { value: savedClaudeKey, setValue: setSavedClaudeKey } = useSetting(
    AI_SETTING_KEYS.CLAUDE_API_KEY
  );
  const { value: savedDeepgramKey, setValue: setSavedDeepgramKey } = useSetting(
    AI_SETTING_KEYS.DEEPGRAM_API_KEY
  );

  const [claudeKeyDraft, setClaudeKeyDraft] = useState('');
  const [deepgramKeyDraft, setDeepgramKeyDraft] = useState('');
  const [showClaudeKey, setShowClaudeKey] = useState(false);
  const [showDeepgramKey, setShowDeepgramKey] = useState(false);

  const inputStyle = {
    color: isDark ? '#ECEDEE' : '#11181C',
    borderColor: isDark ? '#444' : '#ddd',
    backgroundColor: isDark ? '#2c2c2e' : '#fff',
  };

  const saveClaudeKey = () => {
    const trimmed = claudeKeyDraft.trim();
    if (trimmed) {
      setSavedClaudeKey(trimmed);
      setClaudeKeyDraft('');
    }
  };

  const saveDeepgramKey = () => {
    const trimmed = deepgramKeyDraft.trim();
    if (trimmed) {
      setSavedDeepgramKey(trimmed);
      setDeepgramKeyDraft('');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <AISettingsHeader title="API Keys" />

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        <ThemedText style={styles.description}>
          Paste your API keys here. They are stored locally on this device only.
        </ThemedText>

        <View style={styles.keyField}>
          <View style={styles.keyFieldHeader}>
            <ThemedText style={styles.keyLabel}>Claude API Key</ThemedText>
            <View style={styles.statusBadge}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: savedClaudeKey ? '#34C759' : '#FF3B30' },
                ]}
              />
              <ThemedText style={styles.statusText}>
                {savedClaudeKey ? maskApiKey(savedClaudeKey) : 'Not set'}
              </ThemedText>
            </View>
          </View>
          <View style={[styles.keyInputRow, inputStyle]}>
            <TextInput
              style={[styles.keyInput, { color: inputStyle.color }]}
              value={claudeKeyDraft}
              onChangeText={setClaudeKeyDraft}
              onBlur={saveClaudeKey}
              secureTextEntry={!showClaudeKey}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Paste Claude API key"
              placeholderTextColor={isDark ? '#9BA1A6' : '#687076'}
            />
            <TouchableOpacity
              onPress={() => setShowClaudeKey((v) => !v)}
              style={styles.keyToggle}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={showClaudeKey ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={isDark ? '#9BA1A6' : '#687076'}
              />
            </TouchableOpacity>
          </View>
          {savedClaudeKey ? (
            <TouchableOpacity
              onPress={() => setSavedClaudeKey(null)}
              style={styles.clearKeyButton}
              activeOpacity={0.7}
            >
              <ThemedText style={styles.clearKeyText}>Clear Claude key</ThemedText>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.keyField}>
          <View style={styles.keyFieldHeader}>
            <ThemedText style={styles.keyLabel}>Deepgram API Key</ThemedText>
            <View style={styles.statusBadge}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: savedDeepgramKey ? '#34C759' : '#FF3B30' },
                ]}
              />
              <ThemedText style={styles.statusText}>
                {savedDeepgramKey ? maskApiKey(savedDeepgramKey) : 'Not set'}
              </ThemedText>
            </View>
          </View>
          <View style={[styles.keyInputRow, inputStyle]}>
            <TextInput
              style={[styles.keyInput, { color: inputStyle.color }]}
              value={deepgramKeyDraft}
              onChangeText={setDeepgramKeyDraft}
              onBlur={saveDeepgramKey}
              secureTextEntry={!showDeepgramKey}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Paste Deepgram API key"
              placeholderTextColor={isDark ? '#9BA1A6' : '#687076'}
            />
            <TouchableOpacity
              onPress={() => setShowDeepgramKey((v) => !v)}
              style={styles.keyToggle}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={showDeepgramKey ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={isDark ? '#9BA1A6' : '#687076'}
              />
            </TouchableOpacity>
          </View>
          {savedDeepgramKey ? (
            <TouchableOpacity
              onPress={() => setSavedDeepgramKey(null)}
              style={styles.clearKeyButton}
              activeOpacity={0.7}
            >
              <ThemedText style={styles.clearKeyText}>Clear Deepgram key</ThemedText>
            </TouchableOpacity>
          ) : null}
        </View>

        <ThemedView style={styles.modelsSection}>
          <ThemedText style={styles.modelsHeader}>Models</ThemedText>
          <View style={[styles.statusRow, { borderColor: isDark ? '#444' : '#ddd' }]}>
            <ThemedText style={styles.statusLabel}>Chat Model</ThemedText>
            <ThemedText style={styles.statusValue}>{CLAUDE_MODEL}</ThemedText>
          </View>
          <View style={[styles.statusRow, { borderColor: isDark ? '#444' : '#ddd' }]}>
            <ThemedText style={styles.statusLabel}>Voice Model</ThemedText>
            <ThemedText style={styles.statusValue}>{TTS_MODEL}</ThemedText>
          </View>
        </ThemedView>
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
  description: {
    fontSize: 14,
    opacity: 0.6,
    lineHeight: 20,
    marginBottom: 20,
  },
  keyField: {
    marginBottom: 24,
    gap: 8,
  },
  keyFieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  keyLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  keyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  keyInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 12,
  },
  keyToggle: {
    padding: 4,
  },
  clearKeyButton: {
    alignSelf: 'flex-start',
  },
  clearKeyText: {
    fontSize: 13,
    color: '#FF3B30',
  },
  modelsSection: {
    marginTop: 8,
  },
  modelsHeader: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  statusLabel: {
    fontSize: 15,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
    opacity: 0.7,
  },
  statusValue: {
    fontSize: 14,
    opacity: 0.7,
    fontFamily: 'monospace',
  },
});

import AISettingsHeader from '@/components/ai-settings/AISettingsHeader';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AI_SETTING_KEYS, boolFromSetting, settingFromBool } from '@/constants/ai-settings';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSetting } from '@/hooks/use-settings';
import React from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';

export default function AISettingsChatDefaultsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const { value: savedVoiceMode, setValue: setSavedVoiceMode } = useSetting(
    AI_SETTING_KEYS.VOICE_MODE_DEFAULT
  );
  const { value: savedToolsDisabled, setValue: setSavedToolsDisabled } = useSetting(
    AI_SETTING_KEYS.TOOLS_DISABLED_DEFAULT
  );

  return (
    <ThemedView style={styles.container}>
      <AISettingsHeader title="Chat Defaults" />

      <ScrollView style={styles.content}>
        <ThemedText style={styles.description}>
          These options are applied when you open a new AI chat.
        </ThemedText>

        <View style={[styles.row, { borderColor: isDark ? '#444' : '#ddd' }]}>
          <View style={styles.rowText}>
            <ThemedText style={styles.rowLabel}>Voice Mode</ThemedText>
            <ThemedText style={styles.rowDescription}>
              Automatically read AI responses aloud
            </ThemedText>
          </View>
          <Switch
            value={boolFromSetting(savedVoiceMode)}
            onValueChange={(val) => setSavedVoiceMode(settingFromBool(val))}
            trackColor={{ false: '#767577', true: 'rgba(10, 126, 164, 0.5)' }}
            thumbColor={boolFromSetting(savedVoiceMode) ? '#0a7ea4' : '#f4f3f4'}
          />
        </View>

        <View style={[styles.row, { borderColor: isDark ? '#444' : '#ddd' }]}>
          <View style={styles.rowText}>
            <ThemedText style={styles.rowLabel}>Disable Tools</ThemedText>
            <ThemedText style={styles.rowDescription}>
              Start chats without task/project tools enabled
            </ThemedText>
          </View>
          <Switch
            value={boolFromSetting(savedToolsDisabled)}
            onValueChange={(val) => setSavedToolsDisabled(settingFromBool(val))}
            trackColor={{ false: '#767577', true: 'rgba(10, 126, 164, 0.5)' }}
            thumbColor={boolFromSetting(savedToolsDisabled) ? '#0a7ea4' : '#f4f3f4'}
          />
        </View>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  rowText: {
    flex: 1,
    gap: 4,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  rowDescription: {
    fontSize: 13,
    opacity: 0.6,
    lineHeight: 18,
  },
});

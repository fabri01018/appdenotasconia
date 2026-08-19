import AISettingsHeader from '@/components/ai-settings/AISettingsHeader';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AI_SETTING_KEYS, boolFromSetting, settingFromBool } from '@/constants/ai-settings';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSetting } from '@/hooks/use-settings';
import { getAllTools } from '@/lib/tools';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';

export default function AISettingsToolsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const { value: savedToolsDisabled, setValue: setSavedToolsDisabled } = useSetting(
    AI_SETTING_KEYS.TOOLS_DISABLED_DEFAULT
  );

  const toolsEnabled = !boolFromSetting(savedToolsDisabled);
  const tools = useMemo(() => getAllTools(), []);

  return (
    <ThemedView style={styles.container}>
      <AISettingsHeader title="Tools" />

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        <ThemedText style={styles.description}>
          Tools let the AI read and manage your tasks, projects, sections, and tags.
        </ThemedText>

        <View style={[styles.masterRow, { borderColor: isDark ? '#444' : '#ddd', backgroundColor: isDark ? '#1c1c1e' : '#f9f9f9' }]}>
          <View style={styles.masterRowText}>
            <ThemedText style={styles.masterRowLabel}>Enable Tools</ThemedText>
            <ThemedText style={styles.masterRowDescription}>
              Allow the AI to call tools during conversations
            </ThemedText>
          </View>
          <Switch
            value={toolsEnabled}
            onValueChange={(val) => setSavedToolsDisabled(settingFromBool(!val))}
            trackColor={{ false: '#767577', true: 'rgba(10, 126, 164, 0.5)' }}
            thumbColor={toolsEnabled ? '#0a7ea4' : '#f4f3f4'}
          />
        </View>

        <ThemedText style={styles.sectionTitle}>
          Available tools ({tools.length})
        </ThemedText>

        {tools.map((tool) => (
          <View
            key={tool.name}
            style={[
              styles.toolRow,
              {
                borderColor: isDark ? '#333' : '#e8e8e8',
                backgroundColor: isDark ? '#1c1c1e' : '#fff',
                opacity: toolsEnabled ? 1 : 0.45,
              },
            ]}
          >
            <View style={[styles.toolIcon, { backgroundColor: isDark ? '#2c2c2e' : '#f0f0f0' }]}>
              <Ionicons name="construct-outline" size={16} color="#0a7ea4" />
            </View>
            <View style={styles.toolText}>
              <ThemedText style={styles.toolName}>{tool.name}</ThemedText>
              <ThemedText style={styles.toolDescription}>{tool.description}</ThemedText>
            </View>
          </View>
        ))}
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
  masterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 10,
    gap: 12,
    marginBottom: 28,
  },
  masterRowText: {
    flex: 1,
    gap: 3,
  },
  masterRowLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  masterRowDescription: {
    fontSize: 13,
    opacity: 0.6,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.5,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  toolRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
  },
  toolIcon: {
    width: 30,
    height: 30,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  toolText: {
    flex: 1,
    gap: 3,
  },
  toolName: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'monospace',
  },
  toolDescription: {
    fontSize: 13,
    opacity: 0.6,
    lineHeight: 18,
  },
});

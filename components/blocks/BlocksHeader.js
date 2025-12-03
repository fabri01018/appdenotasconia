import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

/**
 * Header component for blocks screen with save status
 */
export default function BlocksHeader({ task, saveStatus }) {
  const colorScheme = useColorScheme();

  if (!task) return null;

  return (
    <View style={styles.header}>
      <ThemedText style={styles.headerText}>
        Blocks from "{task.title}" in "{task.project_name}"
      </ThemedText>
      {saveStatus && (
        <View style={styles.saveStatusIndicator}>
          {saveStatus.isSaving && (
            <ActivityIndicator 
              size="small" 
              color={colorScheme === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(55,53,47,0.4)'} 
            />
          )}
          {saveStatus.lastSaved && !saveStatus.isSaving && (
            <Ionicons
              name="checkmark-circle"
              size={18}
              color={colorScheme === 'dark' ? 'rgba(76,175,80,0.7)' : 'rgba(76,175,80,0.8)'}
            />
          )}
          {saveStatus.error && !saveStatus.isSaving && (
            <Ionicons
              name="alert-circle"
              size={18}
              color={colorScheme === 'dark' ? 'rgba(255,107,107,0.7)' : 'rgba(255,107,107,0.8)'}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  saveStatusIndicator: {
    marginLeft: 12,
  },
});


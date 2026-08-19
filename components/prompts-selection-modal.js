import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useProjects } from '@/hooks/use-projects';
import { useTasksByProject } from '@/hooks/use-tasks';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

const ACCENT = '#0a7ea4';

// A set of subtle accent colors cycled per prompt card so they're visually distinct
const CARD_ACCENTS = ['#0a7ea4', '#7c3aed', '#0891b2', '#059669', '#d97706', '#dc2626', '#db2777'];

export default function PromptsSelectionModal({ visible, onClose, onSelectPrompt }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const { data: projects } = useProjects();
  const promptsProject = projects?.find(p => p.name.toLowerCase() === 'prompts');
  const { data: tasks, isLoading: tasksLoading } = useTasksByProject(promptsProject?.id);

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const filteredTasks = useMemo(() => {
    if (!tasks || !Array.isArray(tasks)) return [];
    if (!searchQuery.trim()) return tasks;
    const q = searchQuery.toLowerCase();
    return tasks.filter(t =>
      t.title?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q)
    );
  }, [tasks, searchQuery]);

  const handleSelectTask = (task) => {
    if (!task) return;
    const systemMessage = [task.title, task.description].filter(Boolean).join('\n\n');
    if (systemMessage) {
      onSelectPrompt(systemMessage);
      onClose();
      setSearchQuery('');
      setExpandedId(null);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setExpandedId(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: isDark ? '#2a2a2a' : '#ebebeb' }]}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={22} color={isDark ? '#fff' : '#000'} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <View style={[styles.headerIcon, { backgroundColor: isDark ? '#1a3a4a' : '#e0f2fe' }]}>
              <Ionicons name="sparkles" size={16} color={ACCENT} />
            </View>
            <ThemedText style={styles.title}>Select Prompt</ThemedText>
          </View>

          <View style={styles.closeButton} />
        </View>

        {/* Search bar */}
        {!tasksLoading && promptsProject && tasks && tasks.length > 0 && (
          <View style={[styles.searchRow, { borderBottomColor: isDark ? '#2a2a2a' : '#ebebeb' }]}>
            <View style={[styles.searchBox, { backgroundColor: isDark ? '#2a2a2a' : '#f2f2f2' }]}>
              <Ionicons name="search" size={16} color={isDark ? '#777' : '#999'} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.searchInput, { color: isDark ? '#eee' : '#111' }]}
                placeholder="Search prompts…"
                placeholderTextColor={isDark ? '#666' : '#aaa'}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={16} color={isDark ? '#666' : '#bbb'} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Content */}
        {tasksLoading ? (
          <ThemedView style={styles.centeredBox}>
            <ActivityIndicator size="large" color={ACCENT} />
            <ThemedText style={styles.centeredText}>Loading prompts…</ThemedText>
          </ThemedView>

        ) : !promptsProject ? (
          <ThemedView style={styles.centeredBox}>
            <View style={[styles.emptyIcon, { backgroundColor: isDark ? '#222' : '#f5f5f5' }]}>
              <Ionicons name="folder-open-outline" size={32} color={isDark ? '#555' : '#bbb'} />
            </View>
            <ThemedText style={styles.emptyTitle}>No prompts project</ThemedText>
            <ThemedText style={styles.centeredText}>
              Create a project named{' '}
              <ThemedText style={{ fontWeight: '700', color: ACCENT }}>"prompts"</ThemedText>
              {' '}and add tasks to it — each task becomes a reusable prompt.
            </ThemedText>
          </ThemedView>

        ) : !tasks || tasks.length === 0 ? (
          <ThemedView style={styles.centeredBox}>
            <View style={[styles.emptyIcon, { backgroundColor: isDark ? '#222' : '#f5f5f5' }]}>
              <Ionicons name="document-text-outline" size={32} color={isDark ? '#555' : '#bbb'} />
            </View>
            <ThemedText style={styles.emptyTitle}>No prompts yet</ThemedText>
            <ThemedText style={styles.centeredText}>
              Add tasks to the{' '}
              <ThemedText style={{ fontWeight: '700', color: ACCENT }}>"prompts"</ThemedText>
              {' '}project to use them here as quick-start prompts.
            </ThemedText>
          </ThemedView>

        ) : filteredTasks.length === 0 ? (
          <ThemedView style={styles.centeredBox}>
            <Ionicons name="search-outline" size={40} color={isDark ? '#555' : '#ccc'} />
            <ThemedText style={styles.centeredText}>No prompts match your search.</ThemedText>
          </ThemedView>

        ) : (
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
          >
            {filteredTasks.map((item, index) => {
              if (!item) return null;
              const accent = CARD_ACCENTS[index % CARD_ACCENTS.length];
              const isExpanded = expandedId === item.id;
              const hasDescription = !!item.description;
              const charCount = [item.title, item.description].filter(Boolean).join('\n\n').length;

              return (
                <View
                  key={item.id}
                  style={[
                    styles.card,
                    {
                      backgroundColor: isDark ? '#1e1e1e' : '#fff',
                      borderColor: isDark ? '#2a2a2a' : '#ebebeb',
                    },
                  ]}
                >
                  {/* Colored left accent bar */}
                  <View style={[styles.cardAccent, { backgroundColor: accent }]} />

                  <View style={styles.cardBody}>
                    {/* Title row */}
                    <TouchableOpacity
                      style={styles.cardHeader}
                      onPress={() => hasDescription && setExpandedId(isExpanded ? null : item.id)}
                      activeOpacity={hasDescription ? 0.6 : 1}
                    >
                      <View style={[styles.cardIconWrap, { backgroundColor: accent + '22' }]}>
                        <Ionicons name="sparkles-outline" size={14} color={accent} />
                      </View>
                      <ThemedText style={styles.cardTitle} numberOfLines={isExpanded ? undefined : 2}>
                        {item.title || 'Untitled'}
                      </ThemedText>
                      {hasDescription && (
                        <Ionicons
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={16}
                          color={isDark ? '#555' : '#bbb'}
                          style={{ marginLeft: 6 }}
                        />
                      )}
                    </TouchableOpacity>

                    {/* Expanded description preview */}
                    {isExpanded && hasDescription && (
                      <View style={[styles.descriptionBox, { backgroundColor: isDark ? '#252525' : '#fafafa', borderColor: isDark ? '#333' : '#eee' }]}>
                        <ThemedText style={styles.descriptionText}>
                          {item.description}
                        </ThemedText>
                      </View>
                    )}

                    {/* Footer: char count + Use button */}
                    <View style={styles.cardFooter}>
                      <ThemedText style={[styles.charCount, { color: isDark ? '#555' : '#bbb' }]}>
                        {charCount} chars
                      </ThemedText>
                      <TouchableOpacity
                        style={[styles.useButton, { backgroundColor: accent }]}
                        onPress={() => handleSelectTask(item)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="arrow-forward" size={13} color="#fff" style={{ marginRight: 4 }} />
                        <ThemedText style={styles.useButtonText}>Use</ThemedText>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeButton: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  searchRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  centeredBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  centeredText: {
    fontSize: 15,
    opacity: 0.6,
    textAlign: 'center',
    lineHeight: 22,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    // subtle shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardAccent: {
    width: 4,
    alignSelf: 'stretch',
  },
  cardBody: {
    flex: 1,
    padding: 14,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  cardIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 21,
  },
  descriptionBox: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
  },
  descriptionText: {
    fontSize: 13,
    lineHeight: 19,
    opacity: 0.75,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  charCount: {
    fontSize: 12,
  },
  useButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  useButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});

import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
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
import { useTasks } from '@/hooks/use-tasks';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

/**
 * Multi-select task picker.
 *
 * Props:
 *   visible        – boolean
 *   onClose        – () => void
 *   onUpdateTasks  – (tasks: Task[]) => void  called when Done is pressed
 *   selectedTasks  – Task[]  currently selected tasks (controls initial state)
 *   excludeTaskId  – optional task id to exclude from list
 *   projectId      – optional project id to filter by
 */
export default function TaskSelectionModal({
  visible,
  onClose,
  onUpdateTasks,
  selectedTasks = [],
  excludeTaskId,
  projectId,
  // legacy single-select compat (used outside AI context flow)
  onSelectTask,
  selectedTask,
}) {
  const colorScheme = useColorScheme();
  const { data: tasks, isLoading: tasksLoading } = useTasks();
  const [searchQuery, setSearchQuery] = useState('');

  // Local draft selection — initialised from selectedTasks when modal opens
  const [draft, setDraft] = useState([]);

  useEffect(() => {
    if (visible) {
      // Support both multi (selectedTasks) and legacy single (selectedTask)
      if (selectedTasks && selectedTasks.length > 0) {
        setDraft(selectedTasks);
      } else if (selectedTask) {
        setDraft([selectedTask]);
      } else {
        setDraft([]);
      }
      setSearchQuery('');
    }
  }, [visible]);

  const isMultiMode = !onSelectTask; // multi-select mode when no legacy callback

  const filteredTasks = useMemo(() => {
    if (!tasks || !Array.isArray(tasks)) return [];

    let filtered = tasks;

    if (projectId) {
      filtered = filtered.filter(t => t.project_id === projectId);
    }
    if (excludeTaskId) {
      filtered = filtered.filter(t => t.id !== excludeTaskId);
    }
    if (!searchQuery.trim()) return filtered;

    const query = searchQuery.toLowerCase();
    return filtered.filter(task =>
      task.title?.toLowerCase().includes(query) ||
      task.description?.toLowerCase().includes(query) ||
      task.project_name?.toLowerCase().includes(query)
    );
  }, [tasks, searchQuery, excludeTaskId, projectId]);

  const isSelected = (task) => draft.some(t => t.id === task.id);

  const toggleTask = (task) => {
    if (!isMultiMode) {
      // Legacy single-select behaviour
      onSelectTask(task);
      onClose();
      setSearchQuery('');
      return;
    }
    setDraft(prev =>
      prev.some(t => t.id === task.id)
        ? prev.filter(t => t.id !== task.id)
        : [...prev, task]
    );
  };

  const handleDone = () => {
    onUpdateTasks(draft);
    onClose();
  };

  const handleClearAll = () => {
    if (isMultiMode) {
      setDraft([]);
    } else {
      onSelectTask(null);
      onClose();
      setSearchQuery('');
    }
  };

  // Group tasks by project, keeping "No Project" tasks in a separate bucket
  const groupedTasks = useMemo(() => {
    const groups = {};
    filteredTasks.forEach(task => {
      const key = task.project_id ? String(task.project_id) : '__none__';
      const label = task.project_name || 'No Project';
      if (!groups[key]) groups[key] = { label, tasks: [] };
      groups[key].tasks.push(task);
    });
    // Sort: named projects first (alphabetically), then "No Project"
    return Object.entries(groups).sort(([aKey, a], [bKey, b]) => {
      if (aKey === '__none__') return 1;
      if (bKey === '__none__') return -1;
      return a.label.localeCompare(b.label);
    });
  }, [filteredTasks]);

  // Expanded state per project key — start all expanded
  const [expandedGroups, setExpandedGroups] = useState({});

  useEffect(() => {
    if (visible) {
      // Expand all groups when modal opens or tasks change
      const initial = {};
      groupedTasks.forEach(([key]) => { initial[key] = true; });
      setExpandedGroups(initial);
    }
  }, [visible, groupedTasks.length]);

  // When searching, auto-expand all matching groups
  useEffect(() => {
    if (searchQuery.trim()) {
      const expanded = {};
      groupedTasks.forEach(([key]) => { expanded[key] = true; });
      setExpandedGroups(expanded);
    }
  }, [searchQuery]);

  const toggleGroup = (key) => {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isDark = colorScheme === 'dark';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={isMultiMode ? handleDone : onClose}
    >
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={isMultiMode ? handleDone : onClose}
            style={styles.headerButton}
          >
            {isMultiMode ? (
              <ThemedText style={[styles.headerButtonText, { color: '#0a7ea4' }]}>
                Done{draft.length > 0 ? ` (${draft.length})` : ''}
              </ThemedText>
            ) : (
              <Ionicons name="close" size={24} color={isDark ? '#fff' : '#000'} />
            )}
          </TouchableOpacity>

          <ThemedText type="title" style={styles.title}>
            {isMultiMode ? 'Select Context Tasks' : 'Select Task Context'}
          </ThemedText>

          <TouchableOpacity
            style={styles.headerButton}
            onPress={isMultiMode ? handleClearAll : onClose}
            disabled={isMultiMode && draft.length === 0}
          >
            {isMultiMode ? (
              <ThemedText
                style={[
                  styles.headerButtonText,
                  { color: draft.length > 0 ? '#e74c3c' : (isDark ? '#555' : '#ccc') },
                ]}
              >
                Clear
              </ThemedText>
            ) : (
              <View style={styles.headerButton} />
            )}
          </TouchableOpacity>
        </View>

        {/* Selected chips row (multi-mode only) */}
        {isMultiMode && draft.length > 0 && (
          <View style={[styles.chipsRow, { borderBottomColor: isDark ? '#333' : '#e0e0e0' }]}>
            {draft.map(task => (
              <TouchableOpacity
                key={task.id}
                style={[styles.chip, { backgroundColor: '#0a7ea4' }]}
                onPress={() => toggleTask(task)}
                activeOpacity={0.7}
              >
                <ThemedText style={styles.chipText} numberOfLines={1}>
                  {task.title || 'Untitled'}
                </ThemedText>
                <Ionicons name="close-circle" size={14} color="#fff" style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Search Bar */}
        <ThemedView style={[styles.searchContainer, { borderBottomColor: isDark ? '#333' : '#e0e0e0' }]}>
          <Ionicons
            name="search"
            size={20}
            color={isDark ? '#9BA1A6' : '#687076'}
            style={styles.searchIcon}
          />
          <TextInput
            style={[
              styles.searchInput,
              {
                color: isDark ? '#ECEDEE' : '#11181C',
                backgroundColor: isDark ? '#3A3A3A' : '#F0F0F0',
              },
            ]}
            placeholder="Search tasks..."
            placeholderTextColor={isDark ? '#9BA1A6' : '#687076'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchButton}>
              <Ionicons name="close-circle" size={20} color={isDark ? '#9BA1A6' : '#687076'} />
            </TouchableOpacity>
          )}
        </ThemedView>

        {/* Content */}
        {tasksLoading ? (
          <ThemedView style={styles.loadingContainer}>
            <ActivityIndicator />
            <ThemedText style={styles.loadingText}>Loading tasks...</ThemedText>
          </ThemedView>
        ) : !tasks || tasks.length === 0 ? (
          <ThemedView style={styles.emptyContainer}>
            <Ionicons name="document-outline" size={48} color={isDark ? '#888' : '#666'} />
            <ThemedText style={styles.emptyText}>No tasks found in your database.</ThemedText>
          </ThemedView>
        ) : filteredTasks.length === 0 ? (
          <ThemedView style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={48} color={isDark ? '#888' : '#666'} />
            <ThemedText style={styles.emptyText}>No tasks match your search.</ThemedText>
          </ThemedView>
        ) : (
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {groupedTasks.map(([groupKey, group]) => {
              const isExpanded = !!expandedGroups[groupKey];
              const allSelected = group.tasks.every(t => isSelected(t));
              const someSelected = group.tasks.some(t => isSelected(t));

              return (
                <View key={groupKey} style={styles.groupContainer}>
                  {/* Project header / toggle */}
                  <TouchableOpacity
                    style={[
                      styles.groupHeader,
                      { backgroundColor: isDark ? '#2A2A2A' : '#E8E8E8' },
                    ]}
                    onPress={() => toggleGroup(groupKey)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.groupHeaderLeft}>
                      <Ionicons
                        name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                        size={16}
                        color={isDark ? '#aaa' : '#666'}
                        style={{ marginRight: 6 }}
                      />
                      <Ionicons
                        name="folder-outline"
                        size={15}
                        color="#0a7ea4"
                        style={{ marginRight: 6 }}
                      />
                      <ThemedText style={styles.groupLabel} numberOfLines={1}>
                        {group.label}
                      </ThemedText>
                      <ThemedText style={[styles.groupCount, { color: isDark ? '#777' : '#999' }]}>
                        {` (${group.tasks.length})`}
                      </ThemedText>
                    </View>
                    {isMultiMode && someSelected && (
                      <View style={[
                        styles.groupBadge,
                        { backgroundColor: allSelected ? '#0a7ea4' : 'rgba(10,126,164,0.35)' },
                      ]}>
                        <ThemedText style={styles.groupBadgeText}>
                          {group.tasks.filter(t => isSelected(t)).length}
                        </ThemedText>
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Task rows */}
                  {isExpanded && group.tasks.map(item => {
                    const selected = isSelected(item);
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.taskItem,
                          {
                            backgroundColor: selected
                              ? '#0a7ea4'
                              : (isDark ? '#3A3A3A' : '#F5F5F5'),
                          },
                        ]}
                        onPress={() => toggleTask(item)}
                        activeOpacity={0.7}
                      >
                        <ThemedView style={styles.taskContent}>
                          <ThemedText
                            type="defaultSemiBold"
                            style={[styles.taskTitle, selected && styles.taskTitleSelected]}
                          >
                            {item.title || 'Untitled Task'}
                          </ThemedText>
                          {item.description ? (
                            <ThemedText
                              style={[styles.taskDescription, selected && styles.taskDescriptionSelected]}
                              numberOfLines={2}
                            >
                              {item.description}
                            </ThemedText>
                          ) : null}
                        </ThemedView>
                        <Ionicons
                          name={selected
                            ? (isMultiMode ? 'checkbox' : 'checkmark-circle')
                            : (isMultiMode ? 'square-outline' : 'chevron-forward')}
                          size={22}
                          color={selected ? '#fff' : (isDark ? '#888' : '#666')}
                          style={styles.chevronIcon}
                        />
                      </TouchableOpacity>
                    );
                  })}
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
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerButton: {
    minWidth: 60,
    padding: 4,
    alignItems: 'center',
  },
  headerButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    maxWidth: 160,
  },
  chipText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
    flexShrink: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  clearSearchButton: {
    marginLeft: 8,
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    opacity: 0.7,
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 16,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 12,
    paddingBottom: 32,
  },
  groupContainer: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  groupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  groupLabel: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  groupCount: {
    fontSize: 13,
  },
  groupBadge: {
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginLeft: 8,
  },
  groupBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginTop: 2,
  },
  taskContent: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  taskTitleSelected: {
    color: '#FFFFFF',
  },
  taskDescription: {
    fontSize: 13,
    opacity: 0.7,
    lineHeight: 18,
  },
  taskDescriptionSelected: {
    color: '#FFFFFF',
    opacity: 0.9,
  },
  chevronIcon: {
    marginLeft: 12,
  },
});

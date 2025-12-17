import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PIN_TAG_NAME } from '@/constants/pin';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useDatabase } from '@/hooks/use-database';
import { useDeleteFilter, useFilter, useFilterTasks } from '@/hooks/use-filters';
import { useDeleteTask } from '@/hooks/use-tasks';
import { getTagsForTasks, toggleTaskExpansion } from '@/repositories/tasks';
import AddFilterModal from './add-filter-modal';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

const LONG_PRESS_DELAY_MS = 500;

export default function FilterDetailView({ filterId }) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const taskBackgroundColor = colorScheme === 'dark' ? '#252525' : '#FFFFFF';
  const taskBorderColor = colorScheme === 'dark' ? '#3A3A3A' : '#E5E5E5';
  const selectedTaskBackgroundColor = colorScheme === 'dark' ? '#3A2018' : '#FFF5F0';

  const { isInitialized } = useDatabase();
  const [tagsByTaskId, setTagsByTaskId] = useState({});
  const [selectedTaskIds, setSelectedTaskIds] = useState(new Set());
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Ensure filterId is a number
  const numericFilterId = parseInt(filterId);
  
  const { data: filter, isLoading: filterLoading } = useFilter(numericFilterId);
  const { data: tasks = [], isLoading: tasksLoading } = useFilterTasks(numericFilterId);
  const deleteTaskMutation = useDeleteTask();
  const deleteFilterMutation = useDeleteFilter();
  
  const isMultiSelectMode = selectedTaskIds.size > 0;
  const selectedCount = selectedTaskIds.size;

  // Process tasks into hierarchy
  const { rootTasks, subTaskMap } = useMemo(() => {
    if (!tasks) return { rootTasks: [], subTaskMap: {} };
    const roots = [];
    const map = {};
    
    tasks.forEach(t => {
      if (t.parent_id) {
        if (!map[t.parent_id]) map[t.parent_id] = [];
        map[t.parent_id].push(t);
      } else {
        roots.push(t);
      }
    });
    
    // Sort subtasks: completed at bottom, then by ID
    Object.values(map).forEach(list => {
      list.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed - b.completed;
        return a.id - b.id;
      });
    });
    
    return { rootTasks: roots, subTaskMap: map };
  }, [tasks]);

  const handleToggleExpand = useCallback(async (taskId, currentExpanded) => {
    try {
      await toggleTaskExpansion(taskId, !currentExpanded);
      queryClient.invalidateQueries({ queryKey: ['filter-tasks', numericFilterId] });
    } catch (error) {
      console.error('Error toggling task expansion:', error);
    }
  }, [numericFilterId, queryClient]);

  const exitMultiSelect = useCallback(() => {
    setSelectedTaskIds(new Set());
  }, []);

  const handleTaskPress = (taskId) => {
    if (isMultiSelectMode) {
      setSelectedTaskIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(taskId)) {
          newSet.delete(taskId);
        } else {
          newSet.add(taskId);
        }
        return newSet;
      });
    } else {
      router.push(`/task/${taskId}`);
    }
  };

  const handleTaskLongPress = (taskId) => {
    if (!isMultiSelectMode) {
      setSelectedTaskIds(new Set([taskId]));
    }
  };

  const handleDeleteTask = async (taskId) => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTaskMutation.mutateAsync(taskId);
              Alert.alert('Success', 'Task deleted successfully!');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete task');
              console.error('Error deleting task:', error);
            }
          }
        }
      ]
    );
  };

  const handleDeleteFilter = () => {
    setShowOptionsMenu(false);
    Alert.alert(
      'Delete Filter',
      `Are you sure you want to delete "${filter?.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFilterMutation.mutateAsync(numericFilterId);
              router.push('/inbox');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete filter');
              console.error('Error deleting filter:', error);
            }
          }
        }
      ]
    );
  };

  const handleEditFilter = () => {
    setShowOptionsMenu(false);
    setShowEditModal(true);
  };

  const handleBack = () => {
    if (isMultiSelectMode) {
      exitMultiSelect();
    } else {
      router.back();
    }
  };

  // Load tags for all tasks
  useEffect(() => {
    const loadTags = async () => {
      if (tasks && tasks.length > 0) {
        try {
          const taskIds = tasks.map(task => task.id);
          const tagsMap = await getTagsForTasks(taskIds);
          setTagsByTaskId(tagsMap);
        } catch (error) {
          console.error('Failed to load tags:', error);
        }
      } else {
        setTagsByTaskId({});
      }
    };

    if (isInitialized) {
      loadTags();
    }
  }, [tasks, isInitialized]);

  // Helper to check if task is pinned
  const isTaskPinned = (taskId) => {
    const taskTags = tagsByTaskId[taskId] || [];
    return taskTags.some(tag => tag.name === PIN_TAG_NAME);
  };

  // Group tasks by pinned status
  const groupedTasks = () => {
    if (!rootTasks) return { pinned: [], unpinned: [] };
    
    const pinned = [];
    const unpinned = [];
    
    rootTasks.forEach(task => {
      const isPinned = isTaskPinned(task.id);
      if (isPinned) {
        pinned.push(task);
      } else {
        unpinned.push(task);
      }
    });
    
    // Sort pinned: incomplete first, then by ID desc
    pinned.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed - b.completed;
      return b.id - a.id;
    });
    
    // Sort unpinned: incomplete first, then by ID desc
    unpinned.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed - b.completed;
      return b.id - a.id;
    });
    
    return { pinned, unpinned };
  };

  const { pinned, unpinned } = groupedTasks();

  const headerTopPadding = Math.max(50, insets.top + 16);
  const contentPaddingBottom = Math.max(100, insets.bottom + 80);

  const renderTaskRow = (task, index, group, depth = 0, isStandalone = false, parentIsLast = false) => {
    const isSubtask = depth > 0;
    const isLast = index === group.length - 1;
    const isSelected = selectedTaskIds.has(task.id);
    const children = subTaskMap[task.id] || [];
    const hasChildren = children.length > 0;
    const isExpanded = !!task.is_expanded;
    const completedChildren = children.filter(c => c.completed).length;
    
    let taskStyle = [styles.taskItem];
    
    if (isStandalone) {
      if (!isSubtask) {
        taskStyle.push(styles.taskItemStandalone);
        if (isExpanded && hasChildren) {
          taskStyle.push({ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, marginBottom: 0 });
        }
      } else {
        if (isLast) {
          taskStyle.push(styles.taskItemLast);
        } else {
          taskStyle.push(styles.taskItemMiddle);
        }
      }
    } else {
      const effectiveLast = isSubtask 
        ? (isLast && parentIsLast) 
        : (isLast && (!isExpanded || !hasChildren));
        
      if (effectiveLast) {
        taskStyle.push(styles.taskItemLast);
      } else {
        taskStyle.push(styles.taskItemMiddle);
      }
    }
    
    const combinedTaskStyle = [...taskStyle, isSelected && styles.taskItemSelected].filter(Boolean);
    
    return (
      <TouchableOpacity 
        key={task.id}
        style={[
          ...combinedTaskStyle,
          {
            backgroundColor: isSelected ? selectedTaskBackgroundColor : taskBackgroundColor,
            borderColor: isSelected ? '#FF6B35' : taskBorderColor,
            paddingLeft: 16 + (depth * 32),
          }
        ]}
        onPress={() => handleTaskPress(task.id)}
        onLongPress={() => handleTaskLongPress(task.id)}
        delayLongPress={LONG_PRESS_DELAY_MS}
        activeOpacity={0.9}
      >
        <TouchableOpacity 
          onPress={(e) => {
            e.stopPropagation();
            handleDeleteTask(task.id);
          }}
          style={styles.checkboxContainer}
        >
          <Ionicons 
            name="square-outline" 
            size={20} 
            color={colorScheme === 'dark' ? '#888' : '#666'} 
            style={styles.checkbox}
          />
        </TouchableOpacity>
        <ThemedView style={styles.taskContent}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <ThemedText type="defaultSemiBold" style={styles.taskTitle}>
              {task.title}
            </ThemedText>
            {hasChildren && (
              <ThemedText style={{ fontSize: 12, opacity: 0.5, marginRight: 8 }}>
                {completedChildren}/{children.length}
              </ThemedText>
            )}
          </View>
          {task.project_name && (
            <ThemedText style={[styles.taskDescription, { fontSize: 12, opacity: 0.6, marginBottom: 4 }]}>
              from {task.project_name}
            </ThemedText>
          )}
          <ThemedText style={styles.taskDescription} numberOfLines={2}>
            {task.description || 'No description'}
          </ThemedText>
          {tagsByTaskId[task.id] && tagsByTaskId[task.id].filter(tag => tag.name !== PIN_TAG_NAME).length > 0 && (
            <View style={styles.tagsContainer}>
              {tagsByTaskId[task.id].filter(tag => tag.name !== PIN_TAG_NAME).map((tag) => (
                <View key={tag.id} style={styles.tagItem}>
                  <ThemedText style={styles.tagText}>{tag.name}</ThemedText>
                </View>
              ))}
            </View>
          )}
        </ThemedView>

        {hasChildren && (
          <TouchableOpacity 
            style={{ padding: 8, marginRight: -8 }}
            onPress={(e) => {
              e.stopPropagation();
              handleToggleExpand(task.id, isExpanded);
            }}
          >
            <Ionicons 
              name={isExpanded ? "chevron-down" : "chevron-forward"} 
              size={16} 
              color={colorScheme === 'dark' ? '#888' : '#666'} 
            />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const renderTask = (task, taskIndex, allTasksInGroup, depth = 0, isStandalone = false) => {
    const isLast = taskIndex === allTasksInGroup.length - 1;
    const children = subTaskMap[task.id] || [];
    const isExpanded = !!task.is_expanded;
    
    return (
      <View key={task.id}>
        {renderTaskRow(task, taskIndex, allTasksInGroup, depth, isStandalone)}

        {isExpanded && children.length > 0 && (
          <View>
            {children.map((child, index) => 
              renderTask(child, index, children, depth + 1, isStandalone)
            )}
          </View>
        )}
      </View>
    );
  };

  // Loading state
  if (filterLoading || tasksLoading) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.header, { paddingTop: headerTopPadding }]}>
          <ThemedText style={styles.headerTitle}>Loading...</ThemedText>
        </View>
        <ThemedView style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <ThemedText>Loading filter...</ThemedText>
        </ThemedView>
      </ThemedView>
    );
  }

  // Error state - filter not found
  if (!filter) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.header, { paddingTop: headerTopPadding }]}>
          <ThemedText style={styles.headerTitle}>Filter Not Found</ThemedText>
        </View>
        <ThemedView style={styles.emptyState}>
          <ThemedText style={styles.emptyText}>
            This filter may have been deleted.
          </ThemedText>
        </ThemedView>
      </ThemedView>
    );
  }

  const allTasks = [...pinned, ...unpinned];

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: headerTopPadding }]}>
        <ThemedText style={styles.headerTitle} numberOfLines={1}>
          {filter.name}
        </ThemedText>
        <TouchableOpacity 
          onPress={() => setShowOptionsMenu(true)}
          style={styles.optionsButton}
        >
          <Ionicons 
            name="ellipsis-horizontal" 
            size={24} 
            color={colorScheme === 'dark' ? '#fff' : '#000'} 
          />
        </TouchableOpacity>
      </View>

      {/* Criteria Summary */}
      {filter && (filter.tags?.length > 0 || filter.projects?.length > 0) && (
        <View style={styles.criteriaSummary}>
          <View style={styles.criteriaHeader}>
            <Ionicons 
              name="funnel-outline" 
              size={16} 
              color={colorScheme === 'dark' ? '#888' : '#666'} 
            />
            <ThemedText style={styles.criteriaHeaderText}>
              Showing tasks with any of these:
            </ThemedText>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.criteriaPillsContainer}
          >
            {filter.tags?.map(tag => (
              <View key={`tag-${tag.id}`} style={[styles.criteriaPill, styles.criteriaPillTag]}>
                <Ionicons name="pricetag" size={12} color="#fff" />
                <ThemedText style={styles.criteriaPillText}>{tag.name}</ThemedText>
              </View>
            ))}
            {filter.projects?.map(project => (
              <View key={`project-${project.id}`} style={[styles.criteriaPill, styles.criteriaPillProject]}>
                <Ionicons name="folder" size={12} color="#fff" />
                <ThemedText style={styles.criteriaPillText}>{project.name}</ThemedText>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Tasks List */}
      <ThemedView style={styles.content}>
        {tasksLoading ? (
          <ThemedView style={styles.loadingContainer}>
            <ActivityIndicator />
            <ThemedText>Loading tasks...</ThemedText>
          </ThemedView>
        ) : tasks && tasks.length > 0 ? (
          <FlatList
            data={[{ type: 'all-tasks', tasks: allTasks }]}
            extraData={selectedTaskIds}
            keyExtractor={(item, index) => `filtered-tasks-${index}`}
            renderItem={({ item }) => {
              const allFilteredTasks = item.tasks;
              return (
                <View key="filtered-tasks">
                  {allFilteredTasks.map((task, taskIndex) => 
                    renderTask(task, taskIndex, allFilteredTasks, 0, true)
                  )}
                </View>
              );
            }}
            style={styles.tasksList}
            contentContainerStyle={[
              styles.tasksListContent,
              { paddingBottom: contentPaddingBottom },
            ]}
          />
        ) : (
          <ThemedView style={styles.emptyState}>
            <Ionicons 
              name="filter-outline" 
              size={64} 
              color={colorScheme === 'dark' ? '#444' : '#ccc'} 
              style={{ marginBottom: 16 }}
            />
            <ThemedText style={styles.emptyTitle}>No tasks match this filter</ThemedText>
            <ThemedText style={styles.emptyText}>
              {filter && (filter.tags?.length > 0 || filter.projects?.length > 0)
                ? 'Create a task with any of these criteria to see it here:'
                : 'This filter has no criteria set. Edit the filter to add tags or projects.'}
            </ThemedText>
            {filter && (filter.tags?.length > 0 || filter.projects?.length > 0) && (
              <View style={styles.emptyCriteria}>
                {filter.tags?.map(tag => (
                  <View key={`empty-tag-${tag.id}`} style={[styles.criteriaPill, styles.criteriaPillTag, { marginBottom: 8 }]}>
                    <Ionicons name="pricetag" size={12} color="#fff" />
                    <ThemedText style={styles.criteriaPillText}>{tag.name}</ThemedText>
                  </View>
                ))}
                {filter.projects?.map(project => (
                  <View key={`empty-project-${project.id}`} style={[styles.criteriaPill, styles.criteriaPillProject, { marginBottom: 8 }]}>
                    <Ionicons name="folder" size={12} color="#fff" />
                    <ThemedText style={styles.criteriaPillText}>{project.name}</ThemedText>
                  </View>
                ))}
              </View>
            )}
            <TouchableOpacity 
              onPress={() => setShowOptionsMenu(true)}
              style={styles.emptyEditButton}
            >
              <ThemedText style={styles.emptyEditButtonText}>Edit Filter</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        )}
      </ThemedView>

      {/* Options Menu Modal */}
      <Modal
        visible={showOptionsMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOptionsMenu(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOptionsMenu(false)}
        >
          <View 
            style={[
              styles.optionsMenuContainer,
              { backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#fff' }
            ]}
          >
            <TouchableOpacity 
              style={styles.optionsMenuItem}
              onPress={handleEditFilter}
            >
              <Ionicons 
                name="create-outline" 
                size={22} 
                color={colorScheme === 'dark' ? '#fff' : '#000'} 
              />
              <ThemedText style={styles.optionsMenuItemText}>Edit Filter</ThemedText>
            </TouchableOpacity>
            <View style={[styles.optionsMenuDivider, { 
              backgroundColor: colorScheme === 'dark' ? '#3A3A3C' : '#E5E5E5' 
            }]} />
            <TouchableOpacity 
              style={styles.optionsMenuItem}
              onPress={handleDeleteFilter}
            >
              <Ionicons 
                name="trash-outline" 
                size={22} 
                color="#FF3B30" 
              />
              <ThemedText style={[styles.optionsMenuItemText, { color: '#FF3B30' }]}>
                Delete Filter
              </ThemedText>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Filter Modal */}
      <AddFilterModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        editMode={true}
        initialFilter={filter}
      />

      {/* Multi-select bar */}
      {isMultiSelectMode && (
        <View
          style={[
            styles.multiSelectBar,
            {
              paddingBottom: Math.max(insets.bottom + 16, 24),
              backgroundColor: colorScheme === 'dark' ? 'rgba(28,28,30,0.98)' : '#fff',
            },
          ]}
        >
          <View style={styles.multiSelectInfo}>
            <Ionicons
              name="checkmark-done-circle"
              size={22}
              color="#FF6B35"
            />
            <ThemedText style={styles.multiSelectCount}>
              {selectedCount} {selectedCount === 1 ? 'task' : 'tasks'} selected
            </ThemedText>
          </View>
          <TouchableOpacity
            style={styles.multiSelectCancel}
            onPress={exitMultiSelect}
            activeOpacity={0.7}
          >
            <ThemedText style={styles.multiSelectCancelText}>Cancel</ThemedText>
          </TouchableOpacity>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    fontSize: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
    marginLeft: 50, // Space for hamburger button
  },
  content: {
    flex: 1,
    paddingTop: 0,
    paddingHorizontal: 20,
  },
  tasksList: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: 12,
    marginTop: 10,
  },
  tasksListContent: {
    paddingBottom: 20,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  taskItemSelected: {
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  taskItemMiddle: {
    marginTop: 0,
    marginBottom: 0,
    borderRadius: 0,
  },
  taskItemLast: {
    marginTop: 0,
    marginBottom: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  taskItemStandalone: {
    marginVertical: 6,
    borderRadius: 12,
  },
  checkboxContainer: {
    padding: 4,
    marginRight: 8,
  },
  checkbox: {
    marginTop: 2,
  },
  taskContent: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 22,
  },
  taskDescription: {
    fontSize: 14,
    opacity: 0.7,
    lineHeight: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.6,
    textAlign: 'center',
    lineHeight: 24,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  tagItem: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#8B4513',
    marginRight: 4,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
  },
  multiSelectBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 16,
    paddingHorizontal: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 12,
  },
  multiSelectInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  multiSelectCount: {
    fontSize: 16,
    fontWeight: '600',
  },
  multiSelectCancel: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  multiSelectCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B35',
  },
  optionsButton: {
    padding: 8,
    marginRight: -8,
  },
  criteriaSummary: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: 'transparent',
  },
  criteriaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  criteriaHeaderText: {
    fontSize: 13,
    opacity: 0.6,
    fontWeight: '500',
  },
  criteriaPillsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 20,
  },
  criteriaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 6,
  },
  criteriaPillTag: {
    backgroundColor: '#8B4513',
  },
  criteriaPillProject: {
    backgroundColor: '#FF6B35',
  },
  criteriaPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyCriteria: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
    justifyContent: 'center',
  },
  emptyEditButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#FF6B35',
    borderRadius: 8,
  },
  emptyEditButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsMenuContainer: {
    width: 250,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  optionsMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  optionsMenuItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  optionsMenuDivider: {
    height: 1,
  },
});


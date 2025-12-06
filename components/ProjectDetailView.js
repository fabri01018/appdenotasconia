import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, FlatList, Modal, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AddTaskModal from '@/components/add-task-modal';
import ProjectSelectionModal from '@/components/task-detail/modals/ProjectSelectionModal';
import SectionSelectionModal from '@/components/task-detail/modals/SectionSelectionModal';
import TagSelectionModal from '@/components/task-detail/modals/TagSelectionModal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PIN_TAG_NAME } from '@/constants/pin';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useDatabase } from '@/hooks/use-database';
import { useProjects } from '@/hooks/use-projects';
import { useSectionsByProject } from '@/hooks/use-sections';
import { useTags } from '@/hooks/use-tags';
import { useDeleteTask, useTasksByProject } from '@/hooks/use-tasks';
import { getProjectById } from '@/repositories/projects';
import { addTagToTask, getTagsForTasks, toggleTaskExpansion, updateTask } from '@/repositories/tasks';

const LONG_PRESS_DELAY_MS = 500;

export default function ProjectDetailView({ projectId }) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();

  const taskBackgroundColor = colorScheme === 'dark' ? '#252525' : '#FFFFFF';
  const taskBorderColor = colorScheme === 'dark' ? '#3A3A3A' : '#E5E5E5';
  const selectedTaskBackgroundColor = colorScheme === 'dark' ? '#3A2018' : '#FFF5F0';
  const { isInitialized, isInitializing, error: dbError } = useDatabase();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [tagsByTaskId, setTagsByTaskId] = useState({});
  const [hiddenSections, setHiddenSections] = useState(new Set());
  const [selectedTaskIds, setSelectedTaskIds] = useState(new Set());
  const [showSectionSelectionModal, setShowSectionSelectionModal] = useState(false);
  const [isBulkUpdatingSection, setIsBulkUpdatingSection] = useState(false);
  const [showProjectSelectionModal, setShowProjectSelectionModal] = useState(false);
  const [isBulkUpdatingProject, setIsBulkUpdatingProject] = useState(false);
  const [showTagSelectionModal, setShowTagSelectionModal] = useState(false);
  const [isBulkUpdatingTags, setIsBulkUpdatingTags] = useState(false);
  
  const queryClient = useQueryClient();
  // Ensure projectId is a number
  const numericProjectId = parseInt(projectId);
  const { data: tasks, isLoading: tasksLoading } = useTasksByProject(numericProjectId);
  const { data: sections, isLoading: sectionsLoading } = useSectionsByProject(numericProjectId);
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { data: allTags = [], isLoading: tagsLoading } = useTags();
  const deleteTaskMutation = useDeleteTask();
  const isMultiSelectMode = selectedTaskIds.size > 0;
  const selectedCount = selectedTaskIds.size;

  // Process tasks into hierarchy
  const { rootTasks, subTaskMap } = useMemo(() => {
    if (!tasks) return { rootTasks: [], subTaskMap: {} };
    const roots = [];
    const map = {};
    
    // Sort by ID desc (newest first) or user preference
    // The existing logic sorts later, so we just split here
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
        // Optimistic update handled by React Query if we invalidate
        await toggleTaskExpansion(taskId, !currentExpanded);
        queryClient.invalidateQueries({ queryKey: ['tasks', numericProjectId] });
    } catch (error) {
        console.error('Error toggling task expansion:', error);
    }
  }, [numericProjectId, queryClient]);

  const exitMultiSelect = useCallback(() => {
    setSelectedTaskIds(new Set());
  }, []);

  const toggleTaskSelection = useCallback((taskId) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }, []);

  const enterMultiSelect = useCallback((taskId) => {
    setSelectedTaskIds((prev) => {
      if (prev.has(taskId)) {
        return prev;
      }
      const next = new Set(prev);
      next.add(taskId);
      return next;
    });
  }, []);

  const handleTaskPress = useCallback((taskId) => {
    if (isMultiSelectMode) {
      toggleTaskSelection(taskId);
      return;
    }
    router.push(`/task/${taskId}`);
  }, [isMultiSelectMode, router, toggleTaskSelection]);

  const handleTaskLongPress = useCallback((taskId) => {
    enterMultiSelect(taskId);
  }, [enterMultiSelect]);

  const handleOpenBulkSectionModal = useCallback(() => {
    if (selectedTaskIds.size === 0) return;
    setShowSectionSelectionModal(true);
  }, [selectedTaskIds]);

  const handleCloseBulkSectionModal = useCallback(() => {
    if (!isBulkUpdatingSection) {
      setShowSectionSelectionModal(false);
    }
  }, [isBulkUpdatingSection]);

  const handleBulkSelectSection = useCallback(async (sectionId) => {
    if (!tasks || tasks.length === 0) return;
    const selectedTasks = tasks.filter(task => selectedTaskIds.has(task.id));
    if (selectedTasks.length === 0) {
      setShowSectionSelectionModal(false);
      return;
    }

    setIsBulkUpdatingSection(true);
    try {
      await Promise.all(
        selectedTasks.map(task =>
          updateTask(task.id, {
            project_id: task.project_id,
            section_id: sectionId,
            title: task.title,
            description: task.description,
          })
        )
      );

      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', numericProjectId] });
      Alert.alert(
        'Success',
        selectedTasks.length === 1 ? 'Task section updated successfully' : 'Task sections updated successfully'
      );
      exitMultiSelect();
      setShowSectionSelectionModal(false);
    } catch (error) {
      console.error('Error updating task sections:', error);
      Alert.alert('Error', 'Failed to update task sections');
    } finally {
      setIsBulkUpdatingSection(false);
    }
  }, [tasks, selectedTaskIds, queryClient, numericProjectId, exitMultiSelect]);

  const handleOpenBulkProjectModal = useCallback(() => {
    if (selectedTaskIds.size === 0) return;
    setShowProjectSelectionModal(true);
  }, [selectedTaskIds]);

  const handleCloseBulkProjectModal = useCallback(() => {
    if (!isBulkUpdatingProject) {
      setShowProjectSelectionModal(false);
    }
  }, [isBulkUpdatingProject]);

  const handleOpenBulkTagModal = useCallback(() => {
    if (selectedTaskIds.size === 0) return;
    setShowTagSelectionModal(true);
  }, [selectedTaskIds]);

  const handleCloseBulkTagModal = useCallback(() => {
    if (!isBulkUpdatingTags) {
      setShowTagSelectionModal(false);
    }
  }, [isBulkUpdatingTags]);

  const handleBulkSelectTag = useCallback(async (tagId) => {
    if (!tasks || tasks.length === 0) return;
    const selectedTasks = tasks.filter(task => selectedTaskIds.has(task.id));
    if (selectedTasks.length === 0) {
      setShowTagSelectionModal(false);
      return;
    }

    setIsBulkUpdatingTags(true);
    try {
      await Promise.all(
        selectedTasks.map(task => addTagToTask(task.id, tagId))
      );

      // Reload tags
      const taskIds = tasks.map(task => task.id);
      const tagsMap = await getTagsForTasks(taskIds);
      setTagsByTaskId(tagsMap);

      Alert.alert(
        'Success',
        selectedTasks.length === 1 ? 'Tag added to task successfully' : 'Tag added to tasks successfully'
      );
      exitMultiSelect();
      setShowTagSelectionModal(false);
    } catch (error) {
      console.error('Error adding tags to tasks:', error);
      Alert.alert('Error', 'Failed to add tags to tasks');
    } finally {
      setIsBulkUpdatingTags(false);
    }
  }, [tasks, selectedTaskIds, exitMultiSelect]);

  const handleBulkSelectProject = useCallback(async (newProjectId) => {
    if (!tasks || tasks.length === 0) return;
    const selectedTasks = tasks.filter(task => selectedTaskIds.has(task.id));
    if (selectedTasks.length === 0) {
      setShowProjectSelectionModal(false);
      return;
    }

    setIsBulkUpdatingProject(true);
    try {
      await Promise.all(
        selectedTasks.map(task =>
          updateTask(task.id, {
            project_id: newProjectId,
            section_id: null, // Reset section when moving to a different project
            title: task.title,
            description: task.description,
          })
        )
      );

      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', numericProjectId] });
      if (newProjectId) {
        queryClient.invalidateQueries({ queryKey: ['tasks', newProjectId] });
      }
      Alert.alert(
        'Success',
        selectedTasks.length === 1 ? 'Task project updated successfully' : 'Task projects updated successfully'
      );
      exitMultiSelect();
      setShowProjectSelectionModal(false);
    } catch (error) {
      console.error('Error updating task projects:', error);
      Alert.alert('Error', 'Failed to update task projects');
    } finally {
      setIsBulkUpdatingProject(false);
    }
  }, [tasks, selectedTaskIds, queryClient, numericProjectId, exitMultiSelect]);

  useEffect(() => {
    if (!isMultiSelectMode) {
      setShowSectionSelectionModal(false);
      setShowProjectSelectionModal(false);
      setShowTagSelectionModal(false);
    }
  }, [isMultiSelectMode]);

  useFocusEffect(
    useCallback(() => {
      // Refresh tasks when screen comes into focus to pick up any subtask changes
      if (numericProjectId) {
        queryClient.invalidateQueries({ queryKey: ['tasks', numericProjectId] });
      }

      const onBackPress = () => {
        if (isMultiSelectMode) {
          exitMultiSelect();
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [exitMultiSelect, isMultiSelectMode, numericProjectId, queryClient])
  );

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

  // Group tasks by section and pinned status
  const groupedTasks = () => {
    if (!rootTasks || !sections) return { pinned: [], bySection: {}, noSection: { pinned: [], unpinned: [] } };
    
    const pinned = [];
    const bySection = {};
    const noSection = { pinned: [], unpinned: [] };
    
    sections.forEach(section => {
      bySection[section.id] = { section, pinned: [], unpinned: [] };
    });
    
    rootTasks.forEach(task => {
      const isPinned = isTaskPinned(task.id);
      
      if (isPinned) {
        // Add to pinned section
        pinned.push(task);
        // Don't add to regular sections - pinned tasks only appear in the Pinned section
      } else {
        // Only add unpinned tasks to their sections
        if (task.section_id && bySection[task.section_id]) {
          bySection[task.section_id].unpinned.push(task);
        } else {
          noSection.unpinned.push(task);
        }
      }
    });
    
    // Sort pinned tasks by updated_at DESC (most recent first)
    pinned.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));
    
    // Sort within sections (only unpinned tasks now)
    Object.values(bySection).forEach(group => {
      group.unpinned.sort((a, b) => b.id - a.id);
    });
    
    noSection.unpinned.sort((a, b) => b.id - a.id);
    
    return { pinned, bySection, noSection };
  };
  
  const { pinned, bySection, noSection } = groupedTasks();

  useEffect(() => {
    const loadProjectData = async () => {
      try {
        setLoading(true);
        
        // Only load project data when database is initialized
        if (isInitialized && numericProjectId) {
          const projectData = await getProjectById(numericProjectId);
          setProject(projectData);
        }
        
      } catch (err) {
        console.error('Failed to load project:', err);
        Alert.alert('Error', 'Failed to load project details');
      } finally {
        setLoading(false);
      }
    };

    loadProjectData();
  }, [numericProjectId, isInitialized]);

  const handleAddTask = () => {
    setShowAddTaskModal(true);
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

  const handleCreateSection = () => {
    setShowMenuModal(false);
    router.push(`/project/${numericProjectId}/sections`);
  };

  const toggleSection = (sectionId) => {
    setHiddenSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };


  if (isInitializing) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <ThemedText>Initializing database...</ThemedText>
      </ThemedView>
    );
  }

  if (dbError) {
    return (
      <ThemedView style={styles.errorContainer}>
        <ThemedText style={styles.errorText}>Database Error: {dbError}</ThemedText>
      </ThemedView>
    );
  }

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <ThemedText>Loading project...</ThemedText>
      </ThemedView>
    );
  }

  if (!project) {
    return (
      <ThemedView style={styles.errorContainer}>
        <ThemedText style={styles.errorText}>Project not found</ThemedText>
      </ThemedView>
    );
  }

  const baseContentPaddingBottom = Math.max(100, insets.bottom + 80);
  const contentPaddingBottom = isMultiSelectMode ? baseContentPaddingBottom + 80 : baseContentPaddingBottom;
  const baseListContentPaddingBottom = Math.max(20, insets.bottom + 20);
  const listContentPaddingBottom = isMultiSelectMode ? baseListContentPaddingBottom + 80 : baseListContentPaddingBottom;
  const fabBottomOffset = Math.max(30, insets.bottom + 16);
  // Align header with the sidebar hamburger button (which is at top: 50 or insets.top + 16)
  const headerTopPadding = Math.max(50, insets.top + 16);

  const renderTaskRow = (task, index, group, depth = 0, isStandalone = false, parentIsLast = false) => {
    const isSubtask = depth > 0;
    const isLast = index === group.length - 1;
    const isSelected = selectedTaskIds.has(task.id);
    const sectionName = !isSubtask && sections ? sections.find(s => s.id === task.section_id)?.name : null;
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
          {sectionName && (
            <ThemedText style={[styles.taskDescription, { fontSize: 12, opacity: 0.6, marginBottom: 4 }]}>
              from {sectionName}
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

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: headerTopPadding }]}>
        <ThemedText style={styles.headerTitle} numberOfLines={1}>
          {project.name}
        </ThemedText>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setShowMenuModal(true)}
          activeOpacity={0.7}
        >
          <Ionicons 
            name="ellipsis-vertical" 
            size={24} 
            color={colorScheme === 'dark' ? '#fff' : '#000'} 
          />
        </TouchableOpacity>
      </View>

      {/* Tasks List */}
      <ThemedView style={styles.content}>
        {tasksLoading || sectionsLoading ? (
          <ThemedView style={styles.loadingContainer}>
            <ActivityIndicator />
            <ThemedText>Loading tasks...</ThemedText>
          </ThemedView>
        ) : tasks && tasks.length > 0 ? (
          <FlatList
            data={[
              ...(pinned.length > 0 ? [{ type: 'pinned', tasks: pinned }] : []),
              ...Object.values(bySection).map(group => ({ type: 'section', ...group })),
              ...(noSection.pinned.length > 0 || noSection.unpinned.length > 0 ? [{ type: 'no-section', ...noSection }] : [])
            ]}
            extraData={selectedTaskIds}
            keyExtractor={(item, index) => {
              if (item.type === 'pinned') return 'pinned-section';
              if (item.type === 'section') return `section-${item.section.id}`;
              return `no-section-${index}`;
            }}
            renderItem={({ item }) => {
              // Render pinned section
              if (item.type === 'pinned') {
                const isHidden = hiddenSections.has('pinned');
                const allPinnedTasks = [...item.tasks];
                return (
                  <View key="pinned-section">
                    <TouchableOpacity
                      style={[
                        styles.sectionBar,
                        {
                          backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                        },
                        !isHidden && allPinnedTasks.length > 0 && styles.sectionBarWithTasks
                      ]}
                      onPress={() => toggleSection('pinned')}
                      activeOpacity={0.7}
                    >
                      <ThemedText style={styles.sectionBarText}>📌 Pinned</ThemedText>
                      <View style={styles.sectionBarRight}>
                        <ThemedText style={styles.sectionTaskCount}>{allPinnedTasks.length} {allPinnedTasks.length === 1 ? 'task' : 'tasks'}</ThemedText>
                        <Ionicons
                          name={isHidden ? "chevron-down" : "chevron-up"}
                          size={20}
                          color={colorScheme === 'dark' ? '#fff' : '#000'}
                        />
                      </View>
                    </TouchableOpacity>
                    {!isHidden && allPinnedTasks.map((task, taskIndex) => 
                      renderTask(task, taskIndex, allPinnedTasks)
                    )}
                  </View>
                );
              }
              
              if (item.type === 'section') {
                const isHidden = hiddenSections.has(item.section.id);
                const allTasks = [...item.pinned, ...item.unpinned];
                return (
                  <View key={item.section.id}>
                    {/* Section Bar */}
                    <TouchableOpacity
                      style={[
                        styles.sectionBar,
                        {
                          backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                        },
                        !isHidden && allTasks.length > 0 && styles.sectionBarWithTasks
                      ]}
                      onPress={() => toggleSection(item.section.id)}
                      activeOpacity={0.7}
                    >
                      <ThemedText style={styles.sectionBarText}>{item.section.name}</ThemedText>
                      <View style={styles.sectionBarRight}>
                        <ThemedText style={styles.sectionTaskCount}>{allTasks.length} {allTasks.length === 1 ? 'task' : 'tasks'}</ThemedText>
                        <Ionicons
                          name={isHidden ? "chevron-down" : "chevron-up"}
                          size={20}
                          color={colorScheme === 'dark' ? '#fff' : '#000'}
                        />
                      </View>
                    </TouchableOpacity>
                    
                    {/* Section Tasks - Only unpinned tasks (pinned tasks appear in Pinned section) */}
                    {!isHidden && allTasks.map((task, taskIndex) => 
                      renderTask(task, taskIndex, allTasks)
                    )}
                  </View>
                );
              } else {
                // Tasks without section - Only unpinned tasks (pinned tasks appear in Pinned section)
                const allNoSectionTasks = [...item.pinned, ...item.unpinned];
                return (
                  <View key="no-section-tasks">
                    {allNoSectionTasks.map((task, taskIndex) => 
                      renderTask(task, taskIndex, allNoSectionTasks, true)
                    )}
                  </View>
                );
              }
            }}
            style={styles.tasksList}
            contentContainerStyle={[
              styles.tasksListContent,
              { paddingBottom: contentPaddingBottom }, // Use the larger padding for the list content to clear FAB
            ]}
          />
        ) : (
          <ThemedView style={styles.emptyState}>
            <ThemedText style={styles.emptyText}>
              No tasks yet. Tap the + button to add your first task.
            </ThemedText>
          </ThemedView>
        )}
      </ThemedView>

      {/* Floating Action Button */}
      {!isMultiSelectMode && (
        <TouchableOpacity
          style={[
            styles.fab,
            { backgroundColor: '#FF6B35', bottom: fabBottomOffset }
          ]}
          onPress={handleAddTask}
          activeOpacity={0.8}
        >
          <Ionicons 
            name="add" 
            size={24} 
            color="white" 
          />
        </TouchableOpacity>
      )}

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
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.multiSelectActions}
            contentContainerStyle={styles.multiSelectActionsContent}
          >
            <TouchableOpacity
              style={[
                styles.multiSelectButton,
                (tagsLoading || isBulkUpdatingTags) && styles.multiSelectButtonDisabled
              ]}
              activeOpacity={0.85}
              onPress={handleOpenBulkTagModal}
              disabled={tagsLoading || isBulkUpdatingTags}
            >
              <ThemedText style={styles.multiSelectButtonText}>
                Tags
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.multiSelectButton,
                (projectsLoading || isBulkUpdatingProject) && styles.multiSelectButtonDisabled
              ]}
              activeOpacity={0.85}
              onPress={handleOpenBulkProjectModal}
              disabled={projectsLoading || isBulkUpdatingProject}
            >
              <ThemedText style={styles.multiSelectButtonText}>
                Change Project
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.multiSelectButton,
                (sectionsLoading || isBulkUpdatingSection) && styles.multiSelectButtonDisabled
              ]}
              activeOpacity={0.85}
              onPress={handleOpenBulkSectionModal}
              disabled={sectionsLoading || isBulkUpdatingSection}
            >
              <ThemedText style={styles.multiSelectButtonText}>
                Change Section
              </ThemedText>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Add Task Modal */}
      <AddTaskModal
        visible={showAddTaskModal}
        onClose={() => setShowAddTaskModal(false)}
        projectId={numericProjectId}
        projectName={project?.name}
      />

      {/* Menu Modal */}
      <Modal
        visible={showMenuModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMenuModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowMenuModal(false)}
        >
          <View 
            style={[
              styles.menuModalContent,
              {
                backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#fff',
              }
            ]}
            onStartShouldSetResponder={() => true}
          >
            <TouchableOpacity
              style={styles.menuButtonItem}
              onPress={handleCreateSection}
              activeOpacity={0.7}
            >
              <ThemedText style={styles.menuButtonText}>Create Section</ThemedText>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <SectionSelectionModal
        visible={showSectionSelectionModal}
        onClose={handleCloseBulkSectionModal}
        task={null}
        sections={sections || []}
        sectionsLoading={sectionsLoading}
        isUpdating={isBulkUpdatingSection}
        onSelectSection={handleBulkSelectSection}
      />

      <ProjectSelectionModal
        visible={showProjectSelectionModal}
        onClose={handleCloseBulkProjectModal}
        task={null}
        projects={projects}
        projectsLoading={projectsLoading}
        isUpdating={isBulkUpdatingProject}
        onSelectProject={handleBulkSelectProject}
      />

      <TagSelectionModal
        visible={showTagSelectionModal}
        onClose={handleCloseBulkTagModal}
        taskTags={[]}
        allTags={allTags}
        tagsLoading={tagsLoading}
        isAdding={isBulkUpdatingTags}
        onSelectTag={handleBulkSelectTag}
      />

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
    paddingTop: 0, // Reduced since we now have a header
    paddingHorizontal: 20,
    // paddingBottom removed to allow list to sit behind FAB
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
  // Task in section - first item (directly below section header)
  taskItemFirst: {
    marginTop: 0,
    marginBottom: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  // Task in section - middle items
  taskItemMiddle: {
    marginTop: 0,
    marginBottom: 0,
    borderRadius: 0,
  },
  // Task in section - last item
  taskItemLast: {
    marginTop: 0,
    marginBottom: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  // Task in section - only item (both first and last)
  taskItemOnly: {
    marginTop: 0,
    marginBottom: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  // Standalone task (no section)
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
  menuButton: {
    padding: 8,
    // Removed absolute positioning to keep it in flow with header
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuModalContent: {
    borderRadius: 12,
    padding: 8,
    minWidth: 200,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  menuButtonItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  menuButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  sectionBar: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 0,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionBarWithTasks: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  sectionBarText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.8,
  },
  sectionBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTaskCount: {
    fontSize: 12,
    opacity: 0.6,
  },
  toggleButton: {
    padding: 4,
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
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    flexDirection: 'column',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 12,
  },
  multiSelectInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  multiSelectCount: {
    fontSize: 16,
    fontWeight: '600',
  },
  multiSelectActions: {
    flexGrow: 0,
  },
  multiSelectActionsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
  },
  multiSelectButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: '#FF6B35',
  },
  multiSelectButtonDisabled: {
    opacity: 0.5,
  },
  multiSelectButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});


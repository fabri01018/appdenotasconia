import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTasks } from '@/hooks/use-tasks';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

export default function TaskSelectionModal({ visible, onClose, onSelectTask, selectedTask, excludeTaskId, projectId }) {
  const colorScheme = useColorScheme();
  const { data: tasks, isLoading: tasksLoading } = useTasks();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter tasks based on search query and exclude task
  const filteredTasks = useMemo(() => {
    if (!tasks || !Array.isArray(tasks)) return [];
    
    let filtered = tasks;

    // Filter by project if provided
    if (projectId) {
      filtered = filtered.filter(t => t.project_id === projectId);
    }
    
    // Exclude specific task (e.g. self)
    if (excludeTaskId) {
      filtered = filtered.filter(t => t.id !== excludeTaskId);
    }

    if (!searchQuery.trim()) {
      return filtered;
    }

    const query = searchQuery.toLowerCase();
    return filtered.filter(task => {
      const titleMatch = task.title?.toLowerCase().includes(query);
      const descriptionMatch = task.description?.toLowerCase().includes(query);
      const projectMatch = task.project_name?.toLowerCase().includes(query);
      
      return titleMatch || descriptionMatch || projectMatch;
    });
  }, [tasks, searchQuery, excludeTaskId, projectId]);

  const handleSelectTask = (task) => {
    if (!task) return;
    onSelectTask(task);
    onClose();
    setSearchQuery(''); // Clear search when closing
  };

  const handleClearContext = () => {
    onSelectTask(null);
    onClose();
    setSearchQuery('');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colorScheme === 'dark' ? '#fff' : '#000'} />
          </TouchableOpacity>
          <ThemedText type="title" style={styles.title}>Select Task Context</ThemedText>
          <View style={styles.closeButton} /> {/* Spacer for centering */}
        </View>

        {/* Search Bar */}
        <ThemedView style={styles.searchContainer}>
          <Ionicons 
            name="search" 
            size={20} 
            color={colorScheme === 'dark' ? '#9BA1A6' : '#687076'} 
            style={styles.searchIcon}
          />
          <TextInput
            style={[
              styles.searchInput,
              {
                color: colorScheme === 'dark' ? '#ECEDEE' : '#11181C',
                backgroundColor: colorScheme === 'dark' ? '#3A3A3A' : '#F0F0F0',
              },
            ]}
            placeholder="Search tasks..."
            placeholderTextColor={colorScheme === 'dark' ? '#9BA1A6' : '#687076'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchButton}>
              <Ionicons 
                name="close-circle" 
                size={20} 
                color={colorScheme === 'dark' ? '#9BA1A6' : '#687076'} 
              />
            </TouchableOpacity>
          )}
        </ThemedView>

        {/* Clear Context Button (if task is selected) */}
        {selectedTask && (
          <TouchableOpacity
            style={[
              styles.clearButton,
              {
                backgroundColor: colorScheme === 'dark' ? '#3A3A3A' : '#E0E0E0',
              },
            ]}
            onPress={handleClearContext}
            activeOpacity={0.7}
          >
            <Ionicons 
              name="close-circle-outline" 
              size={18} 
              color={colorScheme === 'dark' ? '#fff' : '#000'} 
              style={styles.clearButtonIcon}
            />
            <ThemedText style={styles.clearButtonText}>Clear Context</ThemedText>
          </TouchableOpacity>
        )}

        {/* Content */}
        {tasksLoading ? (
          <ThemedView style={styles.loadingContainer}>
            <ActivityIndicator />
            <ThemedText style={styles.loadingText}>Loading tasks...</ThemedText>
          </ThemedView>
        ) : !tasks || tasks.length === 0 ? (
          <ThemedView style={styles.emptyContainer}>
            <Ionicons 
              name="document-outline" 
              size={48} 
              color={colorScheme === 'dark' ? '#888' : '#666'} 
            />
            <ThemedText style={styles.emptyText}>
              No tasks found in your database.
            </ThemedText>
          </ThemedView>
        ) : filteredTasks.length === 0 ? (
          <ThemedView style={styles.emptyContainer}>
            <Ionicons 
              name="search-outline" 
              size={48} 
              color={colorScheme === 'dark' ? '#888' : '#666'} 
            />
            <ThemedText style={styles.emptyText}>
              No tasks match your search.
            </ThemedText>
          </ThemedView>
        ) : (
          <FlatList
            data={filteredTasks || []}
            keyExtractor={(item) => item?.id?.toString() || String(item)}
            renderItem={({ item }) => {
              if (!item) return null;
              
              const isSelected = selectedTask?.id === item.id;
              
              return (
                <TouchableOpacity
                  style={[
                    styles.taskItem,
                    {
                      backgroundColor: isSelected
                        ? (colorScheme === 'dark' ? '#0a7ea4' : '#0a7ea4')
                        : (colorScheme === 'dark' ? '#3A3A3A' : '#F0F0F0'),
                    },
                  ]}
                  onPress={() => handleSelectTask(item)}
                  activeOpacity={0.7}
                >
                  <ThemedView style={styles.taskContent}>
                    <ThemedText 
                      type="defaultSemiBold" 
                      style={[
                        styles.taskTitle,
                        isSelected && styles.taskTitleSelected
                      ]}
                    >
                      {item.title || 'Untitled Task'}
                    </ThemedText>
                    {item.description ? (
                      <ThemedText 
                        style={[
                          styles.taskDescription,
                          isSelected && styles.taskDescriptionSelected
                        ]}
                        numberOfLines={2}
                      >
                        {item.description}
                      </ThemedText>
                    ) : null}
                    {item.project_name ? (
                      <ThemedText 
                        style={[
                          styles.projectName,
                          isSelected && styles.projectNameSelected
                        ]}
                      >
                        Project: {item.project_name}
                      </ThemedText>
                    ) : null}
                  </ThemedView>
                  <Ionicons 
                    name={isSelected ? "checkmark-circle" : "chevron-forward"} 
                    size={20} 
                    color={isSelected 
                      ? '#fff' 
                      : (colorScheme === 'dark' ? '#888' : '#666')
                    }
                    style={styles.chevronIcon}
                  />
                </TouchableOpacity>
              );
            }}
            style={styles.list}
            contentContainerStyle={styles.listContent}
          />
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
  closeButton: {
    width: 40,
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
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
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    justifyContent: 'center',
  },
  clearButtonIcon: {
    marginRight: 8,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '500',
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
    padding: 16,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  taskTitleSelected: {
    color: '#FFFFFF',
  },
  taskDescription: {
    fontSize: 14,
    opacity: 0.7,
    lineHeight: 20,
    marginBottom: 4,
  },
  taskDescriptionSelected: {
    color: '#FFFFFF',
    opacity: 0.9,
  },
  projectName: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 4,
  },
  projectNameSelected: {
    color: '#FFFFFF',
    opacity: 0.8,
  },
  chevronIcon: {
    marginLeft: 12,
  },
});


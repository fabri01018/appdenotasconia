import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useProjects } from '@/hooks/use-projects';
import { useTasksByProject } from '@/hooks/use-tasks';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

export default function PromptsSelectionModal({ visible, onClose, onSelectPrompt }) {
  const colorScheme = useColorScheme();
  const { data: projects } = useProjects();
  
  // Find prompts project
  const promptsProject = projects?.find(p => p.name.toLowerCase() === 'prompts');

  const { data: tasks, isLoading: tasksLoading } = useTasksByProject(promptsProject?.id);

  const handleSelectTask = (task) => {
    if (!task) return;
    // Combine title and description for the system message
    const systemMessage = [task.title, task.description].filter(Boolean).join('\n\n');
    if (systemMessage) {
      onSelectPrompt(systemMessage);
      onClose();
    }
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
          <ThemedText type="title" style={styles.title}>Select Prompt</ThemedText>
          <View style={styles.closeButton} /> {/* Spacer for centering */}
        </View>

        {/* Content */}
        {tasksLoading ? (
          <ThemedView style={styles.loadingContainer}>
            <ActivityIndicator />
            <ThemedText style={styles.loadingText}>Loading prompts...</ThemedText>
          </ThemedView>
        ) : !promptsProject ? (
          <ThemedView style={styles.emptyContainer}>
            <Ionicons 
              name="folder-outline" 
              size={48} 
              color={colorScheme === 'dark' ? '#888' : '#666'} 
            />
            <ThemedText style={styles.emptyText}>
              No "prompts" project found. Please create a project named "prompts" and add prompt tasks to it.
            </ThemedText>
          </ThemedView>
        ) : !tasks || tasks.length === 0 ? (
          <ThemedView style={styles.emptyContainer}>
            <Ionicons 
              name="document-outline" 
              size={48} 
              color={colorScheme === 'dark' ? '#888' : '#666'} 
            />
            <ThemedText style={styles.emptyText}>
              No prompts found in the "prompts" project. Add tasks to use them as prompts.
            </ThemedText>
          </ThemedView>
        ) : (
          <FlatList
            data={tasks || []}
            keyExtractor={(item) => item?.id?.toString() || String(item)}
            renderItem={({ item }) => {
              if (!item) return null;
              return (
                <TouchableOpacity
                  style={[
                    styles.taskItem,
                    {
                      backgroundColor: colorScheme === 'dark' ? '#3A3A3A' : '#F0F0F0',
                    },
                  ]}
                  onPress={() => handleSelectTask(item)}
                  activeOpacity={0.7}
                >
                  <ThemedView style={styles.taskContent}>
                    <ThemedText type="defaultSemiBold" style={styles.taskTitle}>
                      {item.title || 'Untitled Task'}
                    </ThemedText>
                    {item.description && (
                      <ThemedText style={styles.taskDescription}>
                        {item.description}
                      </ThemedText>
                    )}
                  </ThemedView>
                  <Ionicons 
                    name="chevron-forward" 
                    size={20} 
                    color={colorScheme === 'dark' ? '#888' : '#666'}
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
  taskDescription: {
    fontSize: 14,
    opacity: 0.7,
    lineHeight: 20,
  },
  chevronIcon: {
    marginLeft: 12,
  },
});


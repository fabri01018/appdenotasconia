import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';

import { TEMPLATE_TAG_NAME } from '@/constants/templates';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getTagsForTasks, getTasksByTagName } from '@/repositories/tasks';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

export default function TemplateSelectionModal({ visible, onClose, onSelectTemplate }) {
  const colorScheme = useColorScheme();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tagsByTaskId, setTagsByTaskId] = useState({});

  useEffect(() => {
    if (visible) {
      loadTemplates();
    }
  }, [visible]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const templateTasks = await getTasksByTagName(TEMPLATE_TAG_NAME);
      setTemplates(templateTasks || []);

      // Load tags for all template tasks
      if (templateTasks && templateTasks.length > 0) {
        const taskIds = templateTasks.map(t => t.id);
        const tags = await getTagsForTasks(taskIds);
        setTagsByTaskId(tags || {});
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = (template) => {
    if (!template) return;
    onSelectTemplate(template);
    onClose();
  };

  const getPreviewText = (description) => {
    if (!description) return '';
    const lines = description.split('\n').slice(0, 3);
    return lines.join('\n');
  };

  const getOtherTags = (taskId) => {
    const taskTags = tagsByTaskId[taskId] || [];
    return taskTags.filter(tag => tag.name !== TEMPLATE_TAG_NAME);
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
          <ThemedText type="title" style={styles.title}>Select Template</ThemedText>
          <View style={styles.closeButton} /> {/* Spacer for centering */}
        </View>

        {/* Content */}
        {loading ? (
          <ThemedView style={styles.loadingContainer}>
            <ActivityIndicator />
            <ThemedText style={styles.loadingText}>Loading templates...</ThemedText>
          </ThemedView>
        ) : !templates || templates.length === 0 ? (
          <ThemedView style={styles.emptyContainer}>
            <Ionicons 
              name="document-outline" 
              size={48} 
              color={colorScheme === 'dark' ? '#888' : '#666'} 
            />
            <ThemedText style={styles.emptyText}>
              No templates yet
            </ThemedText>
            <ThemedText style={styles.emptySubtext}>
              Mark a task as template using the menu (⋮) in task detail
            </ThemedText>
          </ThemedView>
        ) : (
          <FlatList
            data={templates}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => {
              const otherTags = getOtherTags(item.id);
              const preview = getPreviewText(item.description);
              
              return (
                <TouchableOpacity
                  style={[
                    styles.templateItem,
                    {
                      backgroundColor: colorScheme === 'dark' ? '#3A3A3A' : '#F0F0F0',
                    },
                  ]}
                  onPress={() => handleSelectTemplate(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.templateContent}>
                    <ThemedText type="defaultSemiBold" style={styles.templateTitle}>
                      {item.title || 'Untitled Template'}
                    </ThemedText>
                    
                    {otherTags.length > 0 && (
                      <View style={styles.tagsContainer}>
                        {otherTags.map((tag) => (
                          <View
                            key={tag.id}
                            style={[
                              styles.tagChip,
                              {
                                backgroundColor: colorScheme === 'dark' 
                                  ? 'rgba(0,122,255,0.2)' 
                                  : 'rgba(0,122,255,0.1)',
                              },
                            ]}
                          >
                            <ThemedText style={styles.tagText}>#{tag.name}</ThemedText>
                          </View>
                        ))}
                      </View>
                    )}
                    
                    {preview && (
                      <ThemedText 
                        style={[
                          styles.templatePreview,
                          { color: colorScheme === 'dark' ? '#aaa' : '#666' }
                        ]}
                        numberOfLines={3}
                      >
                        {preview}
                      </ThemedText>
                    )}
                  </View>
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
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  templateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  templateContent: {
    flex: 1,
  },
  templateTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
    gap: 6,
  },
  tagChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  templatePreview: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  chevronIcon: {
    marginLeft: 12,
  },
});


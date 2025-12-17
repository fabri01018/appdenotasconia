import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCreateFilter, useUpdateFilter } from '@/hooks/use-filters';
import { useProjects } from '@/hooks/use-projects';
import { useTags } from '@/hooks/use-tags';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

export default function AddFilterModal({ visible, onClose, editMode = false, initialFilter = null }) {
  const colorScheme = useColorScheme();
  const [filterName, setFilterName] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState([]);
  
  const createFilterMutation = useCreateFilter();
  const updateFilterMutation = useUpdateFilter();
  const { data: tags = [], isLoading: tagsLoading } = useTags();
  const { data: projects = [], isLoading: projectsLoading } = useProjects();

  // Pre-populate fields when in edit mode
  useEffect(() => {
    if (editMode && initialFilter) {
      setFilterName(initialFilter.name || '');
      setSelectedTagIds(initialFilter.tags?.map(t => t.id) || []);
      setSelectedProjectIds(initialFilter.projects?.map(p => p.id) || []);
    }
  }, [editMode, initialFilter]);

  const toggleTag = (tagId) => {
    setSelectedTagIds(prev => {
      if (prev.includes(tagId)) {
        return prev.filter(id => id !== tagId);
      } else {
        return [...prev, tagId];
      }
    });
  };

  const toggleProject = (projectId) => {
    setSelectedProjectIds(prev => {
      if (prev.includes(projectId)) {
        return prev.filter(id => id !== projectId);
      } else {
        return [...prev, projectId];
      }
    });
  };

  const handleSubmit = async () => {
    if (!filterName.trim()) {
      Alert.alert('Error', 'Please enter a filter name');
      return;
    }

    // Validation: At least one tag OR one project required
    if (selectedTagIds.length === 0 && selectedProjectIds.length === 0) {
      Alert.alert('Error', 'Please select at least one tag or project');
      return;
    }

    try {
      if (editMode && initialFilter) {
        // Update existing filter
        await updateFilterMutation.mutateAsync({
          filterId: initialFilter.id,
          name: filterName.trim(),
          icon: initialFilter.icon || 'filter-outline',
          color: initialFilter.color || null,
          tagIds: selectedTagIds,
          projectIds: selectedProjectIds
        });
        Alert.alert('Success', 'Filter updated successfully!');
      } else {
        // Create new filter
        await createFilterMutation.mutateAsync({
          name: filterName.trim(),
          icon: 'filter-outline',
          color: null,
          tagIds: selectedTagIds,
          projectIds: selectedProjectIds
        });
        Alert.alert('Success', 'Filter created successfully!');
      }
      
      // Reset form
      setFilterName('');
      setSelectedTagIds([]);
      setSelectedProjectIds([]);
      onClose();
    } catch (error) {
      Alert.alert('Error', editMode ? 'Failed to update filter' : 'Failed to create filter');
      console.error(`Error ${editMode ? 'updating' : 'creating'} filter:`, error);
    }
  };

  const handleClose = () => {
    setFilterName('');
    setSelectedTagIds([]);
    setSelectedProjectIds([]);
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
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colorScheme === 'dark' ? '#fff' : '#000'} />
          </TouchableOpacity>
          <ThemedText type="title" style={styles.title}>
            {editMode ? 'Edit Filter' : 'Add Filter'}
          </ThemedText>
          <TouchableOpacity 
            onPress={handleSubmit} 
            style={[
              styles.saveButton,
              { backgroundColor: (createFilterMutation.isPending || updateFilterMutation.isPending) ? '#ccc' : '#007AFF' }
            ]}
            disabled={createFilterMutation.isPending || updateFilterMutation.isPending}
          >
            <ThemedText style={styles.saveButtonText}>
              {editMode 
                ? (updateFilterMutation.isPending ? 'Saving...' : 'Save')
                : (createFilterMutation.isPending ? 'Creating...' : 'Create')
              }
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Filter Info */}
        <View style={styles.filterInfo}>
          <Ionicons 
            name="filter-outline" 
            size={16} 
            color={colorScheme === 'dark' ? '#fff' : '#000'} 
          />
          <ThemedText style={styles.filterInfoText}>
            {editMode ? 'Edit your custom filter' : 'Create a custom filter'}
          </ThemedText>
        </View>

        {/* Form */}
        <ScrollView style={styles.form} contentContainerStyle={styles.formContent}>
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Filter Name *</ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colorScheme === 'dark' ? '#333' : '#fff',
                  color: colorScheme === 'dark' ? '#fff' : '#000',
                  borderColor: colorScheme === 'dark' ? '#555' : '#ddd',
                }
              ]}
              value={filterName}
              onChangeText={setFilterName}
              placeholder="Enter filter name"
              placeholderTextColor={colorScheme === 'dark' ? '#888' : '#999'}
              autoFocus
            />
          </View>

          {/* Tag Selection */}
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Filter by Tags</ThemedText>
            {tagsLoading ? (
              <ThemedText style={styles.loadingText}>Loading tags...</ThemedText>
            ) : tags.length === 0 ? (
              <ThemedText style={styles.emptyText}>No tags available</ThemedText>
            ) : (
              <View style={styles.checkboxContainer}>
                {tags.map(tag => (
                  <TouchableOpacity
                    key={tag.id}
                    style={[
                      styles.checkboxItem,
                      {
                        backgroundColor: colorScheme === 'dark' ? '#333' : '#f5f5f5',
                        borderColor: selectedTagIds.includes(tag.id) 
                          ? '#007AFF' 
                          : (colorScheme === 'dark' ? '#555' : '#ddd'),
                      }
                    ]}
                    onPress={() => toggleTag(tag.id)}
                  >
                    <View style={[
                      styles.checkbox,
                      {
                        borderColor: selectedTagIds.includes(tag.id) 
                          ? '#007AFF' 
                          : (colorScheme === 'dark' ? '#666' : '#ccc'),
                        backgroundColor: selectedTagIds.includes(tag.id) 
                          ? '#007AFF' 
                          : 'transparent',
                      }
                    ]}>
                      {selectedTagIds.includes(tag.id) && (
                        <Ionicons name="checkmark" size={14} color="white" />
                      )}
                    </View>
                    <ThemedText style={styles.checkboxLabel}>{tag.name}</ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Project Selection */}
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Filter by Projects</ThemedText>
            {projectsLoading ? (
              <ThemedText style={styles.loadingText}>Loading projects...</ThemedText>
            ) : projects.length === 0 ? (
              <ThemedText style={styles.emptyText}>No projects available</ThemedText>
            ) : (
              <View style={styles.checkboxContainer}>
                {projects.map(project => (
                  <TouchableOpacity
                    key={project.id}
                    style={[
                      styles.checkboxItem,
                      {
                        backgroundColor: colorScheme === 'dark' ? '#333' : '#f5f5f5',
                        borderColor: selectedProjectIds.includes(project.id) 
                          ? '#007AFF' 
                          : (colorScheme === 'dark' ? '#555' : '#ddd'),
                      }
                    ]}
                    onPress={() => toggleProject(project.id)}
                  >
                    <View style={[
                      styles.checkbox,
                      {
                        borderColor: selectedProjectIds.includes(project.id) 
                          ? '#007AFF' 
                          : (colorScheme === 'dark' ? '#666' : '#ccc'),
                        backgroundColor: selectedProjectIds.includes(project.id) 
                          ? '#007AFF' 
                          : 'transparent',
                      }
                    ]}>
                      {selectedProjectIds.includes(project.id) && (
                        <Ionicons name="checkmark" size={14} color="white" />
                      )}
                    </View>
                    <ThemedText style={styles.checkboxLabel}>{project.name}</ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.helpText}>
            <Ionicons 
              name="information-circle-outline" 
              size={16} 
              color={colorScheme === 'dark' ? '#888' : '#666'} 
            />
            <ThemedText style={styles.helpTextContent}>
              Select at least one tag or project. Tasks matching ANY of the selected criteria will appear in this filter.
            </ThemedText>
          </View>
        </ScrollView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  filterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,122,255,0.1)',
    gap: 8,
  },
  filterInfoText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
  form: {
    flex: 1,
  },
  formContent: {
    padding: 20,
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  checkboxContainer: {
    gap: 8,
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxLabel: {
    fontSize: 15,
    flex: 1,
  },
  loadingText: {
    fontSize: 14,
    opacity: 0.6,
    fontStyle: 'italic',
  },
  emptyText: {
    fontSize: 14,
    opacity: 0.5,
    fontStyle: 'italic',
  },
  helpText: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  },
  helpTextContent: {
    fontSize: 14,
    opacity: 0.7,
    flex: 1,
    lineHeight: 20,
  },
});


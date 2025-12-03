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
import { useProjects } from '@/hooks/use-projects';
import { useSectionsByProject } from '@/hooks/use-sections';
import { useSetting } from '@/hooks/use-settings';
import { useTags } from '@/hooks/use-tags';
import { useCreateTask } from '@/hooks/use-tasks';
import { addTagToTask } from '@/repositories/tasks';
import TemplateSelectionModal from './template-selection-modal';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

export default function AddTaskModal({ visible, onClose, projectId, projectName, parentId }) {
  const colorScheme = useColorScheme();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [showTags, setShowTags] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [showSections, setShowSections] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(projectId ? parseInt(projectId) : null);
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const createTaskMutation = useCreateTask();
  const { data: tags } = useTags();
  const { data: projects = [] } = useProjects();
  const { value: defaultTagId } = useSetting('default_tag_id');
  const { value: defaultProjectId } = useSetting('default_project_id');
  const { value: defaultSectionId } = useSetting('default_section_id');
  
  // Fetch sections for currently selected project
  const { data: projectSections = [] } = useSectionsByProject(selectedProjectId);

  // Initialize with defaults
  useEffect(() => {
    if (visible) {
      let targetProjectId = selectedProjectId;

      // If no projectId prop provided, check for default project
      if (!projectId && defaultProjectId && targetProjectId === null) {
        const defProjId = parseInt(defaultProjectId);
        if (!isNaN(defProjId)) {
          setSelectedProjectId(defProjId);
          targetProjectId = defProjId;
        }
      }
      
      // Check for project-specific default section first
      const project = projects.find(p => p.id === targetProjectId);
      
      if (selectedSectionId === null) {
        if (project?.default_section_id) {
           setSelectedSectionId(project.default_section_id);
        } 
        // Fallback to global default section if we are on the default project
        else if (defaultSectionId) {
          const defSecId = parseInt(defaultSectionId);
          if (!isNaN(defSecId)) {
             // Only apply if we are on the default project
             if (targetProjectId && defaultProjectId && targetProjectId.toString() === defaultProjectId) {
                  setSelectedSectionId(defSecId);
             }
          }
        }
      }
    }
  }, [visible, projectId, defaultProjectId, defaultSectionId, selectedProjectId, projects]);

  // Validate selectedSectionId against projectSections when they load
  useEffect(() => {
    if (selectedSectionId && projectSections.length > 0) {
      const sectionExists = projectSections.some(s => s.id === selectedSectionId);
      if (!sectionExists && selectedProjectId) {
        // If selected section is not in the current project, clear it
        // UNLESS we are in the initial load state and projectSections hasn't updated for the new project yet?
        // But useSectionsByProject returns sections for the passed ID.
        // So if we switched project, projectSections updates.
        setSelectedSectionId(null);
      }
    }
  }, [projectSections, selectedSectionId, selectedProjectId]);

  useEffect(() => {
    if (visible && defaultTagId && selectedTags.length === 0) {
      const tagId = parseInt(defaultTagId);
      // Ensure the tag exists in the available tags list
      const tagExists = tags?.some(t => t.id === tagId);
      
      if (!isNaN(tagId) && tagExists) {
        setSelectedTags([tagId]);
      }
    }
  }, [visible, defaultTagId, tags]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    // Use selected project or fall back to the default projectId prop
    const finalProjectId = selectedProjectId || (projectId ? parseInt(projectId) : null);
    
    if (!finalProjectId) {
      Alert.alert('Error', 'Please select a project');
      return;
    }

    try {
      const newTask = await createTaskMutation.mutateAsync({
        projectId: finalProjectId,
        sectionId: selectedSectionId,
        title: title.trim(),
        description: description.trim() || null,
        parentId: parentId || null,
      });
      
      // Add selected tags to the task
      if (selectedTags.length > 0 && newTask.id) {
        for (const tagId of selectedTags) {
          try {
            await addTagToTask(newTask.id, tagId);
          } catch (error) {
            console.error('Error adding tag to task:', error);
          }
        }
      }
      
      // Reset form
      setTitle('');
      setDescription('');
      setSelectedTags([]);
      setShowTags(false);
      setShowProjects(false);
      setSelectedProjectId(projectId ? parseInt(projectId) : null);
      onClose();
      
      Alert.alert('Success', 'Task created successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to create task');
      console.error('Error creating task:', error);
    }
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setSelectedTags([]);
    setShowTags(false);
    setShowProjects(false);
    setSelectedProjectId(projectId ? parseInt(projectId) : null);
    setSelectedSectionId(null);
    setShowSections(false);
    onClose();
  };

  // Update selected project when projectId prop changes
  useEffect(() => {
    if (projectId) {
      setSelectedProjectId(parseInt(projectId));
    }
  }, [projectId]);

  const handleSelectProject = (projId) => {
    setSelectedProjectId(projId);
    
    // Update section to default for the selected project if available
    const project = projects.find(p => p.id === projId);
    if (project?.default_section_id) {
      setSelectedSectionId(project.default_section_id);
    } else {
      setSelectedSectionId(null);
    }
    
    setShowProjects(false);
  };

  const handleSelectSection = (sectionId) => {
    setSelectedSectionId(sectionId);
    setShowSections(false);
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const displayProjectName = selectedProject?.name || projectName || 'Select Project';
  
  const selectedSection = projectSections.find(s => s.id === selectedSectionId);
  const displaySectionName = selectedSection?.name || 'No Section';

  const toggleTag = (tagId) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleSelectTemplate = (template) => {
    if (!template) return;
    
    // Pre-fill form with template data
    setTitle(template.title || '');
    setDescription(template.description || '');
    
    // Note: We don't copy tags from template - user can add their own
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
          <ThemedText type="title" style={styles.title}>Add Task</ThemedText>
          <TouchableOpacity 
            onPress={handleSubmit} 
            style={[
              styles.saveButton,
              { backgroundColor: createTaskMutation.isPending ? '#ccc' : '#007AFF' }
            ]}
            disabled={createTaskMutation.isPending}
          >
            <ThemedText style={styles.saveButtonText}>
              {createTaskMutation.isPending ? 'Saving...' : 'Save'}
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
          {/* Project Selector */}
          <View style={styles.inputGroup}>
            <TouchableOpacity
              style={styles.projectToggle}
              onPress={() => setShowProjects(!showProjects)}
              activeOpacity={0.7}
            >
              <View style={styles.projectToggleLeft}>
                <Ionicons 
                  name="folder-outline" 
                  size={20} 
                  color={colorScheme === 'dark' ? '#fff' : '#000'} 
                />
                <ThemedText style={styles.label}>Project</ThemedText>
              </View>
              <View style={styles.projectToggleRight}>
                <ThemedText style={styles.projectName}>{displayProjectName}</ThemedText>
                <Ionicons 
                  name={showProjects ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color={colorScheme === 'dark' ? '#fff' : '#000'} 
                />
              </View>
            </TouchableOpacity>

            {showProjects && projects && projects.length > 0 && (
              <ScrollView 
                style={[
                  styles.projectsContainer,
                  {
                    backgroundColor: colorScheme === 'dark' ? '#333' : '#f5f5f5',
                    borderColor: colorScheme === 'dark' ? '#555' : '#ddd',
                  }
                ]}
                nestedScrollEnabled={true}
              >
                {projects.map((project) => {
                  const isSelected = selectedProjectId === project.id;
                  return (
                    <TouchableOpacity
                      key={project.id}
                      style={[
                        styles.projectOption,
                        isSelected && {
                          backgroundColor: colorScheme === 'dark' ? 'rgba(0,122,255,0.3)' : 'rgba(0,122,255,0.1)',
                          borderColor: '#007AFF',
                        }
                      ]}
                      onPress={() => handleSelectProject(project.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons 
                        name={isSelected ? "checkmark-circle" : "radio-button-off-outline"} 
                        size={20} 
                        color={isSelected ? "#007AFF" : (colorScheme === 'dark' ? '#888' : '#999')} 
                      />
                      <ThemedText style={[
                        styles.projectOptionText,
                        isSelected && { color: '#007AFF', fontWeight: '600' }
                      ]}>
                        {project.name}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {showProjects && projects && projects.length === 0 && (
              <ThemedText style={styles.noProjectsText}>
                No projects available.
              </ThemedText>
            )}
          </View>

          {/* Section Selector */}
          {selectedProjectId && (
            <View style={styles.inputGroup}>
              <TouchableOpacity
                style={styles.projectToggle}
                onPress={() => setShowSections(!showSections)}
                activeOpacity={0.7}
              >
                <View style={styles.projectToggleLeft}>
                  <Ionicons 
                    name="list-outline" 
                    size={20} 
                    color={colorScheme === 'dark' ? '#fff' : '#000'} 
                  />
                  <ThemedText style={styles.label}>Section</ThemedText>
                </View>
                <View style={styles.projectToggleRight}>
                  <ThemedText style={styles.projectName}>{displaySectionName}</ThemedText>
                  <Ionicons 
                    name={showSections ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color={colorScheme === 'dark' ? '#fff' : '#000'} 
                  />
                </View>
              </TouchableOpacity>

              {showSections && (
                <ScrollView 
                  style={[
                    styles.projectsContainer,
                    {
                      backgroundColor: colorScheme === 'dark' ? '#333' : '#f5f5f5',
                      borderColor: colorScheme === 'dark' ? '#555' : '#ddd',
                    }
                  ]}
                  nestedScrollEnabled={true}
                >
                  <TouchableOpacity
                    style={[
                      styles.projectOption,
                      !selectedSectionId && {
                        backgroundColor: colorScheme === 'dark' ? 'rgba(0,122,255,0.3)' : 'rgba(0,122,255,0.1)',
                        borderColor: '#007AFF',
                      }
                    ]}
                    onPress={() => handleSelectSection(null)}
                    activeOpacity={0.7}
                  >
                    <Ionicons 
                      name={!selectedSectionId ? "checkmark-circle" : "radio-button-off-outline"} 
                      size={20} 
                      color={!selectedSectionId ? "#007AFF" : (colorScheme === 'dark' ? '#888' : '#999')} 
                    />
                    <ThemedText style={[
                      styles.projectOptionText,
                      !selectedSectionId && { color: '#007AFF', fontWeight: '600' }
                    ]}>
                      No Section
                    </ThemedText>
                  </TouchableOpacity>

                  {projectSections.map((section) => {
                    const isSelected = selectedSectionId === section.id;
                    return (
                      <TouchableOpacity
                        key={section.id}
                        style={[
                          styles.projectOption,
                          isSelected && {
                            backgroundColor: colorScheme === 'dark' ? 'rgba(0,122,255,0.3)' : 'rgba(0,122,255,0.1)',
                            borderColor: '#007AFF',
                          }
                        ]}
                        onPress={() => handleSelectSection(section.id)}
                        activeOpacity={0.7}
                      >
                        <Ionicons 
                          name={isSelected ? "checkmark-circle" : "radio-button-off-outline"} 
                          size={20} 
                          color={isSelected ? "#007AFF" : (colorScheme === 'dark' ? '#888' : '#999')} 
                        />
                        <ThemedText style={[
                          styles.projectOptionText,
                          isSelected && { color: '#007AFF', fontWeight: '600' }
                        ]}>
                          {section.name}
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                  
                  {projectSections.length === 0 && (
                    <View style={styles.projectOption}>
                       <ThemedText style={{ opacity: 0.6, fontStyle: 'italic' }}>No sections in this project</ThemedText>
                    </View>
                  )}
                </ScrollView>
              )}
            </View>
          )}

          {/* Use Template Button */}
          <TouchableOpacity
            style={[
              styles.templateButton,
              {
                backgroundColor: colorScheme === 'dark' ? '#3A3A3A' : '#F0F0F0',
                borderColor: colorScheme === 'dark' ? '#555' : '#ddd',
              }
            ]}
            onPress={() => setShowTemplateModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons 
              name="document-text-outline" 
              size={20} 
              color={colorScheme === 'dark' ? '#fff' : '#000'} 
            />
            <ThemedText style={styles.templateButtonText}>Use Template</ThemedText>
            <Ionicons 
              name="chevron-forward" 
              size={18} 
              color={colorScheme === 'dark' ? '#888' : '#666'} 
            />
          </TouchableOpacity>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Title *</ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colorScheme === 'dark' ? '#333' : '#fff',
                  color: colorScheme === 'dark' ? '#fff' : '#000',
                  borderColor: colorScheme === 'dark' ? '#555' : '#ddd',
                }
              ]}
              value={title}
              onChangeText={setTitle}
              placeholder="Enter task title"
              placeholderTextColor={colorScheme === 'dark' ? '#888' : '#999'}
              autoFocus
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Description</ThemedText>
            <TextInput
              style={[
                styles.textArea,
                {
                  backgroundColor: colorScheme === 'dark' ? '#333' : '#fff',
                  color: colorScheme === 'dark' ? '#fff' : '#000',
                  borderColor: colorScheme === 'dark' ? '#555' : '#ddd',
                }
              ]}
              value={description}
              onChangeText={setDescription}
              placeholder="Enter task description (optional)"
              placeholderTextColor={colorScheme === 'dark' ? '#888' : '#999'}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Tags Section */}
          <View style={styles.inputGroup}>
            <TouchableOpacity
              style={styles.tagsToggle}
              onPress={() => setShowTags(!showTags)}
              activeOpacity={0.7}
            >
              <View style={styles.tagsToggleLeft}>
                <Ionicons 
                  name="pricetag-outline" 
                  size={20} 
                  color={colorScheme === 'dark' ? '#fff' : '#000'} 
                />
                <ThemedText style={styles.label}>Tags {selectedTags.length > 0 && `(${selectedTags.length})`}</ThemedText>
              </View>
              <Ionicons 
                name={showTags ? "chevron-up" : "chevron-down"} 
                size={20} 
                color={colorScheme === 'dark' ? '#fff' : '#000'} 
              />
            </TouchableOpacity>

            {showTags && tags && tags.length > 0 && (
              <ScrollView 
                style={[
                  styles.tagsContainer,
                  {
                    backgroundColor: colorScheme === 'dark' ? '#333' : '#f5f5f5',
                    borderColor: colorScheme === 'dark' ? '#555' : '#ddd',
                  }
                ]}
                nestedScrollEnabled={true}
              >
                {tags.map((tag) => {
                  const isSelected = selectedTags.includes(tag.id);
                  return (
                    <TouchableOpacity
                      key={tag.id}
                      style={[
                        styles.tagOption,
                        isSelected && {
                          backgroundColor: colorScheme === 'dark' ? 'rgba(0,122,255,0.3)' : 'rgba(0,122,255,0.1)',
                          borderColor: '#007AFF',
                        }
                      ]}
                      onPress={() => toggleTag(tag.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons 
                        name={isSelected ? "checkbox" : "checkbox-outline"} 
                        size={20} 
                        color={isSelected ? "#007AFF" : (colorScheme === 'dark' ? '#888' : '#999')} 
                      />
                      <ThemedText style={[
                        styles.tagOptionText,
                        isSelected && { color: '#007AFF', fontWeight: '600' }
                      ]}>
                        {tag.name}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {showTags && tags && tags.length === 0 && (
              <ThemedText style={styles.noTagsText}>
                No tags available. Create tags in the Tags screen.
              </ThemedText>
            )}
          </View>
        </ScrollView>

        {/* Template Selection Modal */}
        <TemplateSelectionModal
          visible={showTemplateModal}
          onClose={() => setShowTemplateModal(false)}
          onSelectTemplate={handleSelectTemplate}
        />
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
  projectToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  projectToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  projectToggleRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  projectName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
  },
  projectsContainer: {
    maxHeight: 200,
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 8,
  },
  projectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    gap: 12,
  },
  projectOptionText: {
    fontSize: 16,
  },
  noProjectsText: {
    fontSize: 14,
    opacity: 0.6,
    fontStyle: 'italic',
    marginTop: 8,
  },
  form: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    gap: 8,
    marginBottom: 20,
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
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 100,
  },
  tagsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  tagsToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tagsContainer: {
    maxHeight: 200,
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 8,
  },
  tagOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    gap: 12,
  },
  tagOptionText: {
    fontSize: 16,
  },
  noTagsText: {
    fontSize: 14,
    opacity: 0.6,
    fontStyle: 'italic',
    marginTop: 8,
  },
  templateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 20,
    gap: 8,
  },
  templateButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
});

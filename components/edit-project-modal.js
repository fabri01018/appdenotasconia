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
import { useUpdateProject } from '@/hooks/use-projects';
import { useSectionsByProject } from '@/hooks/use-sections';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

export default function EditProjectModal({ visible, onClose, project }) {
  const colorScheme = useColorScheme();
  const [projectName, setProjectName] = useState('');
  const [defaultSectionId, setDefaultSectionId] = useState(null);
  const [showSectionSelector, setShowSectionSelector] = useState(false);
  
  const updateProjectMutation = useUpdateProject();
  const { data: sections = [] } = useSectionsByProject(project?.id);

  // Set initial state when modal opens
  useEffect(() => {
    if (project && visible) {
      setProjectName(project.name);
      setDefaultSectionId(project.default_section_id || null);
    }
  }, [project, visible]);

  const selectedSection = sections.find(s => s.id === defaultSectionId);

  const handleSubmit = async () => {
    if (!projectName.trim()) {
      Alert.alert('Error', 'Please enter a project name');
      return;
    }

    // Check if anything changed
    if (projectName.trim() === project?.name && defaultSectionId === project?.default_section_id) {
      Alert.alert('No Changes', 'No changes were made to the project');
      return;
    }

    try {
      await updateProjectMutation.mutateAsync({
        id: project.id,
        name: projectName.trim(),
        defaultSectionId: defaultSectionId
      });
      
      // Reset form
      setProjectName('');
      setDefaultSectionId(null);
      onClose();
      
      Alert.alert('Success', 'Project updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update project');
      console.error('Error updating project:', error);
    }
  };

  const handleClose = () => {
    setProjectName('');
    setDefaultSectionId(null);
    onClose();
  };

  if (!project) return null;

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
          <ThemedText type="title" style={styles.title}>Edit Project</ThemedText>
          <TouchableOpacity 
            onPress={handleSubmit} 
            style={[
              styles.saveButton,
              { backgroundColor: updateProjectMutation.isPending ? '#ccc' : '#007AFF' }
            ]}
            disabled={updateProjectMutation.isPending}
          >
            <ThemedText style={styles.saveButtonText}>
              {updateProjectMutation.isPending ? 'Saving...' : 'Save'}
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Project Info */}
        <View style={styles.projectInfo}>
          <Ionicons 
            name="folder-outline" 
            size={16} 
            color={colorScheme === 'dark' ? '#fff' : '#000'} 
          />
          <ThemedText style={styles.projectInfoText}>
            Editing "{project.name}"
          </ThemedText>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Project Name *</ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colorScheme === 'dark' ? '#333' : '#fff',
                  color: colorScheme === 'dark' ? '#fff' : '#000',
                  borderColor: colorScheme === 'dark' ? '#555' : '#ddd',
                }
              ]}
              value={projectName}
              onChangeText={setProjectName}
              placeholder="Enter project name"
              placeholderTextColor={colorScheme === 'dark' ? '#888' : '#999'}
              autoFocus
            />
          </View>

          {/* Default Section Selector */}
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Default Section</ThemedText>
            <TouchableOpacity
              style={[
                styles.selectorButton,
                { 
                  backgroundColor: colorScheme === 'dark' ? '#333' : '#fff',
                  borderColor: colorScheme === 'dark' ? '#555' : '#ddd'
                }
              ]}
              onPress={() => setShowSectionSelector(!showSectionSelector)}
              activeOpacity={0.7}
            >
              <ThemedText style={[
                styles.selectorValue,
                !selectedSection && { opacity: 0.5, fontStyle: 'italic' }
              ]}>
                {selectedSection ? selectedSection.name : 'None (Inbox/No Section)'}
              </ThemedText>
              <Ionicons 
                name={showSectionSelector ? "chevron-up" : "chevron-down"} 
                size={20} 
                color={colorScheme === 'dark' ? '#888' : '#999'} 
              />
            </TouchableOpacity>

            {showSectionSelector && (
              <ScrollView 
                style={[
                  styles.optionsContainer,
                  {
                    backgroundColor: colorScheme === 'dark' ? '#333' : '#f5f5f5',
                    borderColor: colorScheme === 'dark' ? '#555' : '#ddd',
                  }
                ]}
                nestedScrollEnabled={true}
              >
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    !defaultSectionId && {
                      backgroundColor: colorScheme === 'dark' ? 'rgba(0,122,255,0.3)' : 'rgba(0,122,255,0.1)',
                    }
                  ]}
                  onPress={() => {
                    setDefaultSectionId(null);
                    setShowSectionSelector(false);
                  }}
                >
                  <ThemedText style={[
                    styles.optionText,
                    !defaultSectionId && { color: '#007AFF', fontWeight: '600' }
                  ]}>None</ThemedText>
                  {!defaultSectionId && (
                    <Ionicons name="checkmark" size={20} color="#007AFF" />
                  )}
                </TouchableOpacity>
                
                {sections.map((section) => {
                  const isSelected = section.id === defaultSectionId;
                  return (
                    <TouchableOpacity
                      key={section.id}
                      style={[
                        styles.optionItem,
                        isSelected && {
                          backgroundColor: colorScheme === 'dark' ? 'rgba(0,122,255,0.3)' : 'rgba(0,122,255,0.1)',
                        }
                      ]}
                      onPress={() => {
                        setDefaultSectionId(section.id);
                        setShowSectionSelector(false);
                      }}
                    >
                      <ThemedText style={[
                        styles.optionText,
                        isSelected && { color: '#007AFF', fontWeight: '600' }
                      ]}>{section.name}</ThemedText>
                      {isSelected && (
                        <Ionicons name="checkmark" size={20} color="#007AFF" />
                      )}
                    </TouchableOpacity>
                  );
                })}
                
                {sections.length === 0 && (
                  <View style={styles.optionItem}>
                    <ThemedText style={{ opacity: 0.6, fontStyle: 'italic' }}>No sections in this project</ThemedText>
                  </View>
                )}
              </ScrollView>
            )}
            <ThemedText style={styles.helpTextContentSmall}>
              New tasks added to this project will automatically be assigned to this section.
            </ThemedText>
          </View>

          <View style={styles.helpText}>
            <Ionicons 
              name="information-circle-outline" 
              size={16} 
              color={colorScheme === 'dark' ? '#888' : '#666'} 
            />
            <ThemedText style={styles.helpTextContent}>
              You can rename your project at any time. The change will be synced across all your devices.
            </ThemedText>
          </View>
        </View>
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
  projectInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,122,255,0.1)',
    gap: 8,
  },
  projectInfoText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
  form: {
    flex: 1,
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
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  selectorValue: {
    fontSize: 16,
  },
  optionsContainer: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 8,
    maxHeight: 200,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  optionText: {
    fontSize: 16,
  },
  helpTextContentSmall: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 8,
    fontStyle: 'italic',
  },
});

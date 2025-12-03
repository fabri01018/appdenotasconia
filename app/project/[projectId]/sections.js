import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useDatabase } from '@/hooks/use-database';
import { useCreateSection, useDeleteSection, useSectionsByProject, useUpdateSection } from '@/hooks/use-sections';
import { useTasksByProject } from '@/hooks/use-tasks';
import { getProjectById } from '@/repositories/projects';
import { assignAllTasksToSection } from '@/repositories/tasks';

export default function SectionsScreen() {
  const { projectId } = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { isInitialized, isInitializing, error: dbError } = useDatabase();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sectionName, setSectionName] = useState('');
  const [selectedSection, setSelectedSection] = useState(null);
  const [showSectionMenu, setShowSectionMenu] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [editSectionName, setEditSectionName] = useState('');
  
  const { data: sections, isLoading: sectionsLoading } = useSectionsByProject(parseInt(projectId));
  const { data: tasks } = useTasksByProject(parseInt(projectId));
  const createSectionMutation = useCreateSection();
  const updateSectionMutation = useUpdateSection();
  const deleteSectionMutation = useDeleteSection();
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadProjectData = async () => {
      try {
        setLoading(true);
        
        if (isInitialized && projectId) {
          const projectData = await getProjectById(parseInt(projectId));
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
  }, [projectId, isInitialized]);

  // Get task count per section
  const getTaskCountForSection = (sectionId) => {
    if (!tasks) return 0;
    return tasks.filter(task => task.section_id === sectionId).length;
  };

  const handleSectionMenu = (section) => {
    setSelectedSection(section);
    setShowSectionMenu(true);
  };

  const handleEditSection = (section) => {
    setEditingSection(section);
    setEditSectionName(section.name);
    setShowSectionMenu(false);
  };

  const handleSaveEdit = async () => {
    if (!editSectionName.trim()) {
      Alert.alert('Error', 'Please enter a section name');
      return;
    }

    try {
      await updateSectionMutation.mutateAsync({
        id: editingSection.id,
        name: editSectionName.trim(),
      });
      
      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['sections', parseInt(projectId)] });
      
      setEditingSection(null);
      setEditSectionName('');
      Alert.alert('Success', 'Section updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update section');
      console.error('Error updating section:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingSection(null);
    setEditSectionName('');
  };

  const handleDeleteSection = (section) => {
    setShowSectionMenu(false);
    Alert.alert(
      'Delete Section',
      `Are you sure you want to delete "${section.name}"? Tasks in this section will be moved out of the section.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSectionMutation.mutateAsync(section.id);
              queryClient.invalidateQueries({ queryKey: ['sections', parseInt(projectId)] });
              queryClient.invalidateQueries({ queryKey: ['tasks', parseInt(projectId)] });
              Alert.alert('Success', 'Section deleted successfully!');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete section');
              console.error('Error deleting section:', error);
            }
          },
        },
      ]
    );
  };

  const handleCreateSection = async () => {
    if (!sectionName.trim()) {
      Alert.alert('Error', 'Please enter a section name');
      return;
    }

    try {
      const newSection = await createSectionMutation.mutateAsync({
        projectId: parseInt(projectId),
        name: sectionName.trim(),
      });
      
      // Reset form
      setSectionName('');
      
      // Check if this is the first section by checking current sections
      const currentSections = sections || [];
      
      // If this is the first section for this project, assign all tasks to it
      if (currentSections.length <= 0) {
        try {
          await assignAllTasksToSection(parseInt(projectId), newSection.id);
          // Invalidate queries to refresh UI
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
          queryClient.invalidateQueries({ queryKey: ['tasks', parseInt(projectId)] });
          queryClient.invalidateQueries({ queryKey: ['sections', parseInt(projectId)] });
        } catch (error) {
          console.error('Error assigning tasks to section:', error);
          Alert.alert('Warning', 'Section created but failed to assign existing tasks');
        }
      }
      
      Alert.alert('Success', 'Section created successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to create section');
      console.error('Error creating section:', error);
    }
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

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={[
        styles.header,
        {
          backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#fff',
          borderBottomColor: colorScheme === 'dark' ? '#444' : '#ddd',
        }
      ]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons 
            name="arrow-back" 
            size={24} 
            color={colorScheme === 'dark' ? '#fff' : '#000'} 
          />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.headerTitle}>
          Sections - {project.name}
        </ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      {/* Sections List */}
      <View style={styles.content}>
        {sectionsLoading ? (
          <ThemedView style={styles.loadingContainer}>
            <ActivityIndicator />
            <ThemedText>Loading sections...</ThemedText>
          </ThemedView>
        ) : sections && sections.length > 0 ? (
          <FlatList
            data={sections}
            keyExtractor={(item) => `section-${item.id}`}
            renderItem={({ item }) => {
              const taskCount = getTaskCountForSection(item.id);
              const isEditing = editingSection?.id === item.id;
              
              return (
                <View style={[
                  styles.sectionItem,
                  {
                    backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                    borderColor: colorScheme === 'dark' ? '#444' : '#ddd',
                  }
                ]}>
                  {isEditing ? (
                    <View style={styles.editContainer}>
                      <TextInput
                        style={[
                          styles.editInput,
                          {
                            backgroundColor: colorScheme === 'dark' ? '#333' : '#f5f5f5',
                            color: colorScheme === 'dark' ? '#fff' : '#000',
                            borderColor: colorScheme === 'dark' ? '#555' : '#ddd',
                          }
                        ]}
                        value={editSectionName}
                        onChangeText={setEditSectionName}
                        placeholder="Section name"
                        placeholderTextColor={colorScheme === 'dark' ? '#888' : '#999'}
                        autoFocus
                      />
                      <TouchableOpacity
                        onPress={handleSaveEdit}
                        style={[styles.iconButton, { marginRight: 8 }]}
                        activeOpacity={0.7}
                      >
                        <Ionicons 
                          name="checkmark" 
                          size={20} 
                          color="#4CAF50" 
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleCancelEdit}
                        style={styles.iconButton}
                        activeOpacity={0.7}
                      >
                        <Ionicons 
                          name="close" 
                          size={20} 
                          color={colorScheme === 'dark' ? '#ff6b6b' : '#ff4444'} 
                        />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      <View style={styles.sectionInfo}>
                        <Ionicons 
                          name="folder-outline" 
                          size={20} 
                          color={colorScheme === 'dark' ? '#fff' : '#000'} 
                          style={styles.sectionIcon}
                        />
                        <View style={styles.sectionTextContainer}>
                          <ThemedText style={styles.sectionName}>{item.name}</ThemedText>
                          <ThemedText style={styles.sectionTaskCount}>
                            {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
                          </ThemedText>
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleSectionMenu(item)}
                        style={styles.sectionMenuButton}
                        activeOpacity={0.7}
                      >
                        <Ionicons 
                          name="ellipsis-vertical" 
                          size={20} 
                          color={colorScheme === 'dark' ? '#888' : '#666'} 
                        />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              );
            }}
            style={styles.sectionsList}
            contentContainerStyle={styles.sectionsListContent}
          />
        ) : (
          <ThemedView style={styles.emptyState}>
            <Ionicons 
              name="folder-outline" 
              size={48} 
              color={colorScheme === 'dark' ? '#666' : '#999'} 
            />
            <ThemedText style={styles.emptyText}>
              No sections yet. Create one below to get started.
            </ThemedText>
          </ThemedView>
        )}
      </View>

      {/* Create Section Form */}
      <View style={[
        styles.formContainer,
        {
          backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#fff',
          borderTopColor: colorScheme === 'dark' ? '#444' : '#ddd',
        }
      ]}>
        <View style={styles.formHeader}>
          <ThemedText type="defaultSemiBold" style={styles.formTitle}>
            Create New Section
          </ThemedText>
        </View>
        
        <View style={styles.inputContainer}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colorScheme === 'dark' ? '#333' : '#f5f5f5',
                color: colorScheme === 'dark' ? '#fff' : '#000',
                borderColor: colorScheme === 'dark' ? '#555' : '#ddd',
              }
            ]}
            value={sectionName}
            onChangeText={setSectionName}
            placeholder="Enter section name"
            placeholderTextColor={colorScheme === 'dark' ? '#888' : '#999'}
            autoFocus={false}
          />
        </View>

        <TouchableOpacity
          style={[
            styles.createButton,
            {
              backgroundColor: createSectionMutation.isPending ? '#ccc' : '#007AFF',
            }
          ]}
          onPress={handleCreateSection}
          disabled={createSectionMutation.isPending || !sectionName.trim()}
          activeOpacity={0.8}
        >
          <ThemedText style={styles.createButtonText}>
            {createSectionMutation.isPending ? 'Creating...' : 'Create Section'}
          </ThemedText>
        </TouchableOpacity>

        <View style={styles.helpTextContainer}>
          <Ionicons 
            name="information-circle-outline" 
            size={16} 
            color={colorScheme === 'dark' ? '#888' : '#666'} 
          />
          <ThemedText style={styles.helpText}>
            Sections help you group and organize tasks within a project. If this is the first section, all existing tasks will be moved to it.
          </ThemedText>
        </View>
      </View>

      {/* Section Menu Modal */}
      <Modal
        visible={showSectionMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSectionMenu(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowSectionMenu(false)}
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
              style={styles.menuItem}
              onPress={() => {
                if (selectedSection) {
                  handleEditSection(selectedSection);
                }
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name="pencil-outline"
                size={20}
                color={colorScheme === 'dark' ? '#fff' : '#000'}
                style={styles.menuIcon}
              />
              <ThemedText style={styles.menuItemText}>Edit</ThemedText>
            </TouchableOpacity>

            <View style={[
              styles.menuDivider,
              { backgroundColor: colorScheme === 'dark' ? '#444' : '#ddd' }
            ]} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                if (selectedSection) {
                  handleDeleteSection(selectedSection);
                }
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name="trash-outline"
                size={20}
                color="#ff4444"
                style={styles.menuIcon}
              />
              <ThemedText style={[styles.menuItemText, { color: '#ff4444' }]}>
                Delete
              </ThemedText>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    paddingTop: 50, // Account for status bar
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  headerSpacer: {
    width: 40, // Same width as back button to center title
  },
  content: {
    flex: 1,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  sectionsList: {
    flex: 1,
  },
  sectionsListContent: {
    paddingBottom: 16,
    gap: 12,
  },
  sectionItem: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionMenuButton: {
    padding: 8,
    marginLeft: 8,
  },
  sectionIcon: {
    marginRight: 12,
  },
  sectionTextContainer: {
    flex: 1,
  },
  sectionName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionTaskCount: {
    fontSize: 14,
    opacity: 0.6,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.6,
    textAlign: 'center',
    lineHeight: 24,
  },
  formContainer: {
    padding: 16,
    borderTopWidth: 1,
    paddingBottom: 32,
  },
  formHeader: {
    marginBottom: 12,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  createButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  createButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  helpTextContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  },
  helpText: {
    fontSize: 13,
    opacity: 0.7,
    flex: 1,
    lineHeight: 18,
  },
  editContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  editInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
  },
  iconButton: {
    padding: 4,
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
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  menuIcon: {
    marginRight: 12,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
    marginVertical: 4,
  },
});

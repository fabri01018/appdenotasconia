import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useProjects, useUpdateProject } from '@/hooks/use-projects';
import { useSections } from '@/hooks/use-sections';
import { useSetting } from '@/hooks/use-settings';
import { useTags } from '@/hooks/use-tags';
import { resetDatabase } from '@/lib/database';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [isResetting, setIsResetting] = useState(false);
  const { data: tags } = useTags();
  const { data: projects } = useProjects();
  const { data: sections } = useSections();
  const updateProjectMutation = useUpdateProject();
  
  const { value: defaultTagId, setValue: setDefaultTagId } = useSetting('default_tag_id');
  const { value: defaultProjectId, setValue: setDefaultProjectId } = useSetting('default_project_id');
  
  const [showTagSelector, setShowTagSelector] = useState(false);
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [showSectionSelector, setShowSectionSelector] = useState(false);

  const selectedDefaultTag = tags?.find(t => t.id.toString() === defaultTagId);
  const selectedDefaultProject = projects?.find(p => p.id.toString() === defaultProjectId);
  const selectedDefaultSection = sections?.find(s => s.id === selectedDefaultProject?.default_section_id);

  // Filter sections by selected default project
  const availableSections = sections?.filter(s => 
    !defaultProjectId || s.project_id.toString() === defaultProjectId
  );

  const handleResetDatabase = () => {
    Alert.alert(
      'Reset Database',
      'This will delete ALL local data and recreate the database with the new schema. This action cannot be undone!\n\nMake sure to PULL from Supabase first to sync your data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsResetting(true);
              await resetDatabase();
              
              // Invalidate all queries to refresh the UI
              queryClient.invalidateQueries({ queryKey: ['projects'] });
              queryClient.invalidateQueries({ queryKey: ['tasks'] });
              queryClient.invalidateQueries({ queryKey: ['tags'] });
              
              Alert.alert('Success', 'Database reset successfully!');
            } catch (error) {
              console.error('Reset error:', error);
              Alert.alert('Error', `Failed to reset database: ${error.message}`);
            } finally {
              setIsResetting(false);
            }
          }
        }
      ]
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.content}>
        <ThemedText style={styles.header}>Settings</ThemedText>
        
        {/* Test Button */}
        <TouchableOpacity 
          style={[
            styles.button,
            { 
              backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
              borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'
            }
          ]}
          onPress={() => router.push('/test')}
          activeOpacity={0.7}
        >
          <Ionicons 
            name="flask-outline" 
            size={24} 
            color={colorScheme === 'dark' ? '#fff' : '#000'} 
          />
          <ThemedView style={styles.settingContent}>
            <ThemedText style={styles.buttonTitle}>Test</ThemedText>
            <ThemedText style={styles.settingDescription}>Open Test Screen</ThemedText>
          </ThemedView>
        </TouchableOpacity>
        
        {/* Blocks Button */}
        <TouchableOpacity 
          style={[
            styles.button,
            { 
              backgroundColor: colorScheme === 'dark' ? 'rgba(0, 122, 255, 0.2)' : 'rgba(0, 122, 255, 0.1)',
              borderColor: colorScheme === 'dark' ? 'rgba(0, 122, 255, 0.4)' : 'rgba(0, 122, 255, 0.3)'
            }
          ]}
          onPress={() => router.push('/blocks')}
          activeOpacity={0.7}
        >
          <Ionicons 
            name="cube-outline" 
            size={24} 
            color="#007AFF" 
          />
          <ThemedView style={styles.settingContent}>
            <ThemedText style={[styles.buttonTitle, { color: '#007AFF' }]}>Blocks</ThemedText>
            <ThemedText style={styles.settingDescription}>Open Blocks Screen</ThemedText>
          </ThemedView>
        </TouchableOpacity>
        
        {/* Default Settings */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionHeader}>Defaults</ThemedText>
          
          {/* Default Project Selector */}
          <TouchableOpacity 
            style={[
              styles.selectorButton,
              { 
                backgroundColor: colorScheme === 'dark' ? '#333' : '#fff',
                borderColor: colorScheme === 'dark' ? '#555' : '#ddd',
                marginBottom: 8
              }
            ]}
            onPress={() => {
              setShowProjectSelector(!showProjectSelector);
              setShowTagSelector(false);
              setShowSectionSelector(false);
            }}
            activeOpacity={0.7}
          >
            <ThemedView style={styles.selectorContent}>
              <ThemedText style={styles.selectorLabel}>Default Project</ThemedText>
              <ThemedText style={[
                styles.selectorValue,
                !selectedDefaultProject && { opacity: 0.5, fontStyle: 'italic' }
              ]}>
                {selectedDefaultProject ? selectedDefaultProject.name : 'None (Select on create)'}
              </ThemedText>
            </ThemedView>
            <Ionicons 
              name={showProjectSelector ? "chevron-up" : "chevron-down"} 
              size={20} 
              color={colorScheme === 'dark' ? '#888' : '#999'} 
            />
          </TouchableOpacity>

          {showProjectSelector && (
            <ThemedView style={[
              styles.optionsContainer,
              {
                backgroundColor: colorScheme === 'dark' ? '#333' : '#f5f5f5',
                borderColor: colorScheme === 'dark' ? '#555' : '#ddd',
                marginBottom: 16
              }
            ]}>
              <TouchableOpacity
                style={[
                  styles.optionItem,
                  !defaultProjectId && {
                    backgroundColor: colorScheme === 'dark' ? 'rgba(0,122,255,0.3)' : 'rgba(0,122,255,0.1)',
                  }
                ]}
                onPress={() => {
                  setDefaultProjectId(null);
                  setShowProjectSelector(false);
                }}
              >
                <ThemedText style={[
                  styles.optionText,
                  !defaultProjectId && { color: '#007AFF', fontWeight: '600' }
                ]}>None</ThemedText>
                {!defaultProjectId && (
                  <Ionicons name="checkmark" size={20} color="#007AFF" />
                )}
              </TouchableOpacity>
              
              {projects?.map((project) => {
                const isSelected = project.id.toString() === defaultProjectId;
                return (
                  <TouchableOpacity
                    key={project.id}
                    style={[
                      styles.optionItem,
                      isSelected && {
                        backgroundColor: colorScheme === 'dark' ? 'rgba(0,122,255,0.3)' : 'rgba(0,122,255,0.1)',
                      }
                    ]}
                    onPress={() => {
                      setDefaultProjectId(project.id.toString());
                      setShowProjectSelector(false);
                    }}
                  >
                    <ThemedText style={[
                      styles.optionText,
                      isSelected && { color: '#007AFF', fontWeight: '600' }
                    ]}>{project.name}</ThemedText>
                    {isSelected && (
                      <Ionicons name="checkmark" size={20} color="#007AFF" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ThemedView>
          )}

          {/* Default Section Selector - Only show if project is selected or if we allow cross-project section default (we don't) */}
          {defaultProjectId && (
            <>
              <TouchableOpacity 
                style={[
                  styles.selectorButton,
                  { 
                    backgroundColor: colorScheme === 'dark' ? '#333' : '#fff',
                    borderColor: colorScheme === 'dark' ? '#555' : '#ddd',
                    marginBottom: 8
                  }
                ]}
                onPress={() => {
                  setShowSectionSelector(!showSectionSelector);
                  setShowTagSelector(false);
                  setShowProjectSelector(false);
                }}
                activeOpacity={0.7}
              >
                <ThemedView style={styles.selectorContent}>
                  <ThemedText style={styles.selectorLabel}>Default Section</ThemedText>
                  <ThemedText style={[
                    styles.selectorValue,
                    !selectedDefaultSection && { opacity: 0.5, fontStyle: 'italic' }
                  ]}>
                    {selectedDefaultSection ? selectedDefaultSection.name : 'None (Inbox/No Section)'}
                  </ThemedText>
                </ThemedView>
                <Ionicons 
                  name={showSectionSelector ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color={colorScheme === 'dark' ? '#888' : '#999'} 
                />
              </TouchableOpacity>

              {showSectionSelector && (
                <ThemedView style={[
                  styles.optionsContainer,
                  {
                    backgroundColor: colorScheme === 'dark' ? '#333' : '#f5f5f5',
                    borderColor: colorScheme === 'dark' ? '#555' : '#ddd',
                    marginBottom: 16
                  }
                ]}>
                  <TouchableOpacity
                    style={[
                      styles.optionItem,
                      !selectedDefaultProject?.default_section_id && {
                        backgroundColor: colorScheme === 'dark' ? 'rgba(0,122,255,0.3)' : 'rgba(0,122,255,0.1)',
                      }
                    ]}
                    onPress={() => {
                      if (selectedDefaultProject) {
                        updateProjectMutation.mutate({
                          id: selectedDefaultProject.id,
                          name: selectedDefaultProject.name,
                          defaultSectionId: null
                        });
                      }
                      setShowSectionSelector(false);
                    }}
                  >
                    <ThemedText style={[
                      styles.optionText,
                      !selectedDefaultProject?.default_section_id && { color: '#007AFF', fontWeight: '600' }
                    ]}>None</ThemedText>
                    {!selectedDefaultProject?.default_section_id && (
                      <Ionicons name="checkmark" size={20} color="#007AFF" />
                    )}
                  </TouchableOpacity>
                  
                  {availableSections?.map((section) => {
                    const isSelected = section.id === selectedDefaultProject?.default_section_id;
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
                          if (selectedDefaultProject) {
                            updateProjectMutation.mutate({
                              id: selectedDefaultProject.id,
                              name: selectedDefaultProject.name,
                              defaultSectionId: section.id
                            });
                          }
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
                  {availableSections?.length === 0 && (
                    <View style={styles.optionItem}>
                      <ThemedText style={{ opacity: 0.5, fontStyle: 'italic' }}>No sections in this project</ThemedText>
                    </View>
                  )}
                </ThemedView>
              )}
            </>
          )}

          {/* Default Tag Selector */}
          <TouchableOpacity 
            style={[
              styles.selectorButton,
              { 
                backgroundColor: colorScheme === 'dark' ? '#333' : '#fff',
                borderColor: colorScheme === 'dark' ? '#555' : '#ddd'
              }
            ]}
            onPress={() => {
              setShowTagSelector(!showTagSelector);
              setShowProjectSelector(false);
              setShowSectionSelector(false);
            }}
            activeOpacity={0.7}
          >
            <ThemedView style={styles.selectorContent}>
              <ThemedText style={styles.selectorLabel}>Default Task Tag</ThemedText>
              <ThemedText style={[
                styles.selectorValue,
                !selectedDefaultTag && { opacity: 0.5, fontStyle: 'italic' }
              ]}>
                {selectedDefaultTag ? selectedDefaultTag.name : 'None'}
              </ThemedText>
            </ThemedView>
            <Ionicons 
              name={showTagSelector ? "chevron-up" : "chevron-down"} 
              size={20} 
              color={colorScheme === 'dark' ? '#888' : '#999'} 
            />
          </TouchableOpacity>

          {showTagSelector && (
            <ThemedView style={[
              styles.optionsContainer,
              {
                backgroundColor: colorScheme === 'dark' ? '#333' : '#f5f5f5',
                borderColor: colorScheme === 'dark' ? '#555' : '#ddd',
              }
            ]}>
              <TouchableOpacity
                style={[
                  styles.optionItem,
                  !defaultTagId && {
                    backgroundColor: colorScheme === 'dark' ? 'rgba(0,122,255,0.3)' : 'rgba(0,122,255,0.1)',
                  }
                ]}
                onPress={() => {
                  setDefaultTagId(null);
                  setShowTagSelector(false);
                }}
              >
                <ThemedText style={[
                  styles.optionText,
                  !defaultTagId && { color: '#007AFF', fontWeight: '600' }
                ]}>None</ThemedText>
                {!defaultTagId && (
                  <Ionicons name="checkmark" size={20} color="#007AFF" />
                )}
              </TouchableOpacity>
              
              {tags?.map((tag) => {
                const isSelected = tag.id.toString() === defaultTagId;
                return (
                  <TouchableOpacity
                    key={tag.id}
                    style={[
                      styles.optionItem,
                      isSelected && {
                        backgroundColor: colorScheme === 'dark' ? 'rgba(0,122,255,0.3)' : 'rgba(0,122,255,0.1)',
                      }
                    ]}
                    onPress={() => {
                      setDefaultTagId(tag.id.toString());
                      setShowTagSelector(false);
                    }}
                  >
                    <ThemedText style={[
                      styles.optionText,
                      isSelected && { color: '#007AFF', fontWeight: '600' }
                    ]}>{tag.name}</ThemedText>
                    {isSelected && (
                      <Ionicons name="checkmark" size={20} color="#007AFF" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ThemedView>
          )}
        </ThemedView>

        {/* Reset Database Button */}
        <TouchableOpacity 
          style={[
            styles.dangerButton,
            { 
              backgroundColor: colorScheme === 'dark' ? 'rgba(255, 59, 48, 0.2)' : 'rgba(255, 59, 48, 0.1)',
              borderColor: colorScheme === 'dark' ? 'rgba(255, 59, 48, 0.4)' : 'rgba(255, 59, 48, 0.3)'
            }
          ]}
          onPress={handleResetDatabase}
          activeOpacity={0.7}
          disabled={isResetting}
        >
          <Ionicons name="refresh" size={24} color="#FF3B30" />
          <ThemedView style={styles.settingContent}>
            <ThemedText style={[styles.dangerButtonTitle, { color: '#FF3B30' }]}>Reset DB Schema</ThemedText>
            <ThemedText style={styles.settingDescription}>Delete all local data and recreate database</ThemedText>
          </ThemedView>
          {isResetting && (
            <Ionicons name="hourglass" size={20} color="#FF3B30" />
          )}
        </TouchableOpacity>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  header: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 40,
  },
  settingContent: {
    flex: 1,
    gap: 4,
  },
  settingDescription: {
    fontSize: 14,
    opacity: 0.6,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    gap: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  buttonTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    gap: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  dangerButtonTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FF3B30',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    opacity: 0.8,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderWidth: 1,
    borderRadius: 8,
  },
  selectorContent: {
    flex: 1,
    backgroundColor: 'transparent', // Inherit from parent or be transparent
  },
  selectorLabel: {
    fontSize: 14,
    opacity: 0.6,
    marginBottom: 4,
  },
  selectorValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  optionsContainer: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  optionText: {
    fontSize: 16,
  },
});


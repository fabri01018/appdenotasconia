import PullButton from '@/components/pull-button';
import PushButton from '@/components/push-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useProjects, useUpdateProject } from '@/hooks/use-projects';
import { useSections } from '@/hooks/use-sections';
import { useSetting } from '@/hooks/use-settings';
import { useAutoSyncContext } from '@/hooks/AutoSyncProvider';
import { useSyncActions } from '@/hooks/useSyncActions';
import { useTags } from '@/hooks/use-tags';
import { THEME_SETTING_KEY } from '@/components/ThemeSettingSync';
import { useTheme } from '@/hooks/useTheme';
import { dumpDatabaseContents, resetDatabase } from '@/lib/database';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const { themePreference, setThemePreference } = useTheme();
  const { setValue: saveThemePreference } = useSetting(THEME_SETTING_KEY);
  const queryClient = useQueryClient();

  const handleThemeChange = (value) => {
    setThemePreference(value);
    saveThemePreference(value);
  };
  const router = useRouter();
  const [isResetting, setIsResetting] = useState(false);
  const { data: tags } = useTags();
  const { data: projects } = useProjects();
  const { data: sections } = useSections();
  const updateProjectMutation = useUpdateProject();
  
  const { value: defaultTagId, setValue: setDefaultTagId } = useSetting('default_tag_id');
  const { value: defaultProjectId, setValue: setDefaultProjectId } = useSetting('default_project_id');
  const { isPulling, isPushing, handlePull, handlePush } = useSyncActions();
  const { isEnabled: isSyncEnabled, toggleAutoSync } = useAutoSyncContext();
  
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

        {/* Appearance */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionHeader}>Appearance</ThemedText>
          <ThemedView style={[
            styles.themeSelector,
            {
              backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f2f2f7',
              borderColor: colorScheme === 'dark' ? '#3a3a3c' : '#e0e0e0',
            }
          ]}>
            {[
              { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
              { value: 'light', label: 'Light', icon: 'sunny-outline' },
              { value: 'dark', label: 'Dark', icon: 'moon-outline' },
            ].map(({ value, label, icon }) => {
              const isActive = themePreference === value;
              return (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.themeOption,
                    isActive && {
                      backgroundColor: colorScheme === 'dark' ? '#3a3a3c' : '#fff',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.1,
                      shadowRadius: 2,
                      elevation: 2,
                    }
                  ]}
                  onPress={() => handleThemeChange(value)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={icon}
                    size={18}
                    color={isActive ? '#0a7ea4' : (colorScheme === 'dark' ? '#888' : '#666')}
                  />
                  <ThemedText style={[
                    styles.themeOptionLabel,
                    { color: isActive ? '#0a7ea4' : (colorScheme === 'dark' ? '#888' : '#666') },
                    isActive && { fontWeight: '600' }
                  ]}>
                    {label}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </ThemedView>
        </ThemedView>

        {/* Sync */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionHeader}>Sync</ThemedText>

          {/* Enable / Disable Supabase sync */}
          <View style={[
            styles.syncToggleRow,
            {
              backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f2f2f7',
              borderColor: colorScheme === 'dark' ? '#3a3a3c' : '#e0e0e0',
            }
          ]}>
            <Ionicons
              name="cloud-outline"
              size={20}
              color={isSyncEnabled ? '#0a7ea4' : (colorScheme === 'dark' ? '#888' : '#999')}
            />
            <ThemedView style={styles.syncToggleText}>
              <ThemedText style={styles.syncToggleLabel}>Supabase Sync</ThemedText>
              <ThemedText style={styles.syncToggleDescription}>
                {isSyncEnabled ? 'Auto-sync active every 4 min' : 'Sync paused'}
              </ThemedText>
            </ThemedView>
            <Switch
              value={isSyncEnabled}
              onValueChange={toggleAutoSync}
              trackColor={{ false: '#767577', true: 'rgba(10, 126, 164, 0.5)' }}
              thumbColor={isSyncEnabled ? '#0a7ea4' : '#f4f3f4'}
            />
          </View>

          <View style={[styles.syncButtonsContainer, !isSyncEnabled && styles.syncButtonsDisabled]}>
            <PushButton onPress={handlePush} disabled={isPushing || !isSyncEnabled} />
            <PullButton onPress={handlePull} disabled={isPulling || !isSyncEnabled} />
          </View>
        </ThemedView>
        
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
        
        {/* Tags Button */}
        <TouchableOpacity 
          style={[
            styles.button,
            { 
              backgroundColor: colorScheme === 'dark' ? 'rgba(76, 217, 100, 0.2)' : 'rgba(76, 217, 100, 0.1)',
              borderColor: colorScheme === 'dark' ? 'rgba(76, 217, 100, 0.4)' : 'rgba(76, 217, 100, 0.3)'
            }
          ]}
          onPress={() => router.push('/tags')}
          activeOpacity={0.7}
        >
          <Ionicons 
            name="pricetags-outline" 
            size={24} 
            color="#4CD964" 
          />
          <ThemedView style={styles.settingContent}>
            <ThemedText style={[styles.buttonTitle, { color: '#4CD964' }]}>Tags</ThemedText>
            <ThemedText style={styles.settingDescription}>Manage your tags</ThemedText>
          </ThemedView>
        </TouchableOpacity>

        {/* Snippets Button */}
        <TouchableOpacity 
          style={[
            styles.button,
            { 
              backgroundColor: colorScheme === 'dark' ? 'rgba(175, 82, 222, 0.2)' : 'rgba(175, 82, 222, 0.12)',
              borderColor: colorScheme === 'dark' ? 'rgba(175, 82, 222, 0.4)' : 'rgba(175, 82, 222, 0.3)'
            }
          ]}
          onPress={() => router.push('/snippets')}
          activeOpacity={0.7}
        >
          <Ionicons 
            name="code-slash-outline" 
            size={24} 
            color="#AF52DE" 
          />
          <ThemedView style={styles.settingContent}>
            <ThemedText style={[styles.buttonTitle, { color: '#AF52DE' }]}>Snippets</ThemedText>
            <ThemedText style={styles.settingDescription}>Manage slash-command snippets</ThemedText>
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

        {/* Dump Database Button */}
        <TouchableOpacity 
          style={[
            styles.button,
            { 
              backgroundColor: colorScheme === 'dark' ? 'rgba(90, 200, 250, 0.2)' : 'rgba(90, 200, 250, 0.1)',
              borderColor: colorScheme === 'dark' ? 'rgba(90, 200, 250, 0.4)' : 'rgba(90, 200, 250, 0.3)',
              marginTop: 16
            }
          ]}
          onPress={async () => {
            const success = await dumpDatabaseContents();
            if (success) {
              Alert.alert('Success', 'Database contents dumped to console. Check your terminal.');
            } else {
              Alert.alert('Error', 'Failed to dump database contents.');
            }
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="list-outline" size={24} color="#5AC8FA" />
          <ThemedView style={styles.settingContent}>
            <ThemedText style={[styles.buttonTitle, { color: '#5AC8FA' }]}>Dump Database</ThemedText>
            <ThemedText style={styles.settingDescription}>Print all tables and data to the console</ThemedText>
          </ThemedView>
        </TouchableOpacity>

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
  syncToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  syncToggleText: {
    flex: 1,
    backgroundColor: 'transparent',
    gap: 2,
  },
  syncToggleLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  syncToggleDescription: {
    fontSize: 13,
    opacity: 0.55,
  },
  syncButtonsContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  syncButtonsDisabled: {
    opacity: 0.4,
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
  themeSelector: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  themeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 7,
  },
  themeOptionLabel: {
    fontSize: 14,
  },
});


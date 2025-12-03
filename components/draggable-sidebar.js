import { useColorScheme } from '@/hooks/use-color-scheme';
import { useDatabase } from '@/hooks/use-database';
import { useProjects } from '@/hooks/use-projects';
import { useProjectOptions } from '@/hooks/useProjectOptions';
import { SIDEBAR_WIDTH, useSidebarAnimation } from '@/hooks/useSidebarAnimation';
import { useSyncActions } from '@/hooks/useSyncActions';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Animated,
    Modal,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AddProjectModal from './add-project-modal';
import AddTaskButton from './add-task-button';
import AddTaskModal from './add-task-modal';
import EditProjectModal from './edit-project-modal';
import PullButton from './pull-button';
import PushButton from './push-button';
import SettingsButton from './settings-button';
import TagsButton from './tags-button';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

export default function DraggableSidebar({ children }) {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { isInitialized, isInitializing, error: dbError } = useDatabase();
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const { isPulling, isPushing, handlePull, handlePush } = useSyncActions();
  
  // Sidebar animation hook
  const {
    isOpen,
    openSidebar,
    closeSidebar,
    translateX,
    overlayOpacity,
    hamburgerIconRotation,
    hamburgerIconOpacity,
    closeIconRotation,
    closeIconOpacity,
    onGestureEvent,
    onHandlerStateChange,
    onEdgeSwipeEvent,
    onEdgeSwipeStateChange,
  } = useSidebarAnimation();

  // Project options hook
  const {
    selectedProject,
    showOptions: showProjectOptions,
    showEditModal: showEditProjectModal,
    handleProjectOptions,
    handleOptionSelect,
    closeOptions: closeProjectOptions,
    closeEditModal,
  } = useProjectOptions();

  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);

  const navigateToScreen = (screen) => {
    router.push(`/${screen}`);
    closeSidebar();
  };

  const navigateToProject = (projectId) => {
    // Check if this is the inbox project
    const inboxProject = projects?.find(p => p.name === 'Inbox');
    if (inboxProject && projectId === inboxProject.id) {
      router.push('/inbox');
    } else {
      router.push(`/project/${projectId}`);
    }
    closeSidebar();
  };


  const hamburgerTopOffset = Math.max(50, insets.top + 16);
  const sidebarContentPaddingTop = Math.max(100, insets.top + 60);
  const actionButtonsPaddingBottom = Math.max(20, insets.bottom + 12);

  return (
    <View style={styles.container}>
      {/* Main Content with Edge Swipe Detection */}
      <PanGestureHandler
        onGestureEvent={onEdgeSwipeEvent}
        onHandlerStateChange={onEdgeSwipeStateChange}
        enabled={!isOpen}
        activeOffsetX={[-1000, 10]}
        failOffsetY={[-10, 10]}
        minPointers={1}
      >
        <View style={styles.mainContent}>
          {children}
        </View>
      </PanGestureHandler>

      {/* Hamburger Button */}
      {!pathname?.startsWith('/task/') && (
      <TouchableOpacity
        style={[
          styles.hamburgerButton,
          { 
            backgroundColor: colorScheme === 'dark' ? '#333' : '#fff',
            top: hamburgerTopOffset,
          }
        ]}
        onPress={() => isOpen ? closeSidebar() : openSidebar()}
        activeOpacity={0.7}
      >
        <View style={styles.hamburgerInner}>
          <Animated.View
            style={[
              styles.hamburgerLine,
              {
                top: 15,
                transform: [{ rotate: hamburgerIconRotation }],
                opacity: hamburgerIconOpacity,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.hamburgerLine,
              {
                top: 21, // Spacing for the second line if we had 3, but here it's just 2 lines animating?
                // Actually, usually a hamburger has 3 lines. The current code only has 2 animated views that seem to be doing double duty or just 2 lines.
                // Let's make it a standard 3-line hamburger that transforms into an X or just stays simple.
                // For now, respecting existing logic but fixing visibility.
                // The issue is likely that they are absolutely positioned on top of each other or missing dimensions.
                
                // Re-reading: There are 2 Animated.Views. One rotates for hamburger, one for close?
                // Let's simplify to a standard icon for now if the animation is complex/broken.
                // But the user asked to "change styling".
                // I'll replace the custom lines with an Ionicons "menu" icon which is standard and reliable.
              }
            ]} 
          />
        </View>
        {/* Replacing custom lines with standard icon for reliability per user request "only see round background" */}
        <Ionicons name={isOpen ? "close" : "menu"} size={24} color={colorScheme === 'dark' ? '#fff' : '#000'} />
      </TouchableOpacity>
      )}

      {/* Overlay */}
      <Animated.View
        style={[
          styles.overlay,
          { opacity: overlayOpacity }
        ]}
        pointerEvents={isOpen ? 'auto' : 'none'}
      >
        <TouchableOpacity
          style={styles.overlayTouchable}
          onPress={closeSidebar}
          activeOpacity={1}
          disabled={!isOpen}
        />
      </Animated.View>

      {/* Sidebar */}
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        enabled={isOpen}
      >
        <Animated.View
          style={[
            styles.sidebar,
            {
              transform: [{ translateX }],
              backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#f8f9fa',
            },
          ]}
        >
          <ScrollView 
            style={styles.sidebarScrollView} 
            contentContainerStyle={styles.sidebarScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <ThemedView style={[styles.sidebarContent, { paddingTop: sidebarContentPaddingTop }]}>
              {/* Push and Pull Buttons */}
              <View style={styles.syncButtonsContainer}>
                <PushButton onPress={handlePush} disabled={isPushing} />
                <PullButton onPress={handlePull} disabled={isPulling} />
              </View>

              <View style={styles.sidebarItems}>
                {/* Database Status */}
                {isInitializing ? (
                  <ThemedText style={styles.loadingText}>Initializing database...</ThemedText>
                ) : dbError ? (
                  <ThemedText style={styles.errorText}>Database error: {dbError}</ThemedText>
                ) : projectsLoading ? (
                  <ThemedText style={styles.loadingText}>Loading projects...</ThemedText>
                ) : projects && projects.length > 0 ? (
                  projects.map((project) => (
                    <TouchableOpacity 
                      key={project.id}
                      style={styles.inboxItem}
                      onPress={() => {
                        if (project.name === 'Inbox') {
                          navigateToProject(project.id);
                        } else {
                          navigateToProject(project.id);
                        }
                      }}
                    >
                      <Ionicons 
                        name={project.name === 'Inbox' ? 'mail-outline' : 'folder-outline'}
                        size={22} 
                        color={colorScheme === 'dark' ? '#fff' : '#000'} 
                      />
                      <ThemedText style={styles.inboxItemText}>{project.name}</ThemedText>
                      <TouchableOpacity 
                        style={styles.verticalDots}
                        onPress={() => handleProjectOptions(project)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.dot} />
                        <View style={styles.dot} />
                        <View style={styles.dot} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))
                ) : (
                  <ThemedText style={styles.noProjectsText}>No projects yet</ThemedText>
                )}
              </View>
            </ThemedView>
          </ScrollView>

          {/* Action Buttons Container - Fixed at Bottom */}
          <View style={[
            styles.actionButtonsContainer,
            {
              borderTopColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
              paddingBottom: actionButtonsPaddingBottom,
            }
          ]}>
            {/* Add Project Button */}
            <TouchableOpacity 
              style={styles.addProjectButton}
              onPress={() => {
                setShowAddProjectModal(true);
                closeSidebar();
              }}
            >
              <Ionicons 
                name="add" 
                size={24} 
                color="#007AFF" 
              />
            </TouchableOpacity>

            {/* AI Button */}
            <TouchableOpacity 
              style={styles.addProjectButton}
              onPress={() => {
                navigateToScreen('ai');
              }}
            >
              <Ionicons 
                name="sparkles" 
                size={24} 
                color="#8A2BE2" 
              />
            </TouchableOpacity>

            {/* Add Task Button */}
            <AddTaskButton 
              onPress={() => {
                setShowAddTaskModal(true);
                closeSidebar();
              }}
            />

            {/* Settings Button */}
            <SettingsButton 
              onPress={() => {
                navigateToScreen('settings');
              }}
            />

            {/* Tags Button */}
            <TagsButton 
              onPress={() => {
                navigateToScreen('tags');
              }}
            />
          </View>
        </Animated.View>
      </PanGestureHandler>

      {/* Add Project Modal */}
      <AddProjectModal
        visible={showAddProjectModal}
        onClose={() => setShowAddProjectModal(false)}
      />

      {/* Add Task Modal */}
      <AddTaskModal
        visible={showAddTaskModal}
        onClose={() => setShowAddTaskModal(false)}
      />

      {/* Edit Project Modal */}
      <EditProjectModal
        visible={showEditProjectModal}
        onClose={closeEditModal}
        project={selectedProject}
      />

      {/* Project Options Popup */}
      <Modal
        visible={showProjectOptions && !showEditProjectModal}
        transparent={true}
        animationType="fade"
        onRequestClose={closeProjectOptions}
      >
        <TouchableWithoutFeedback onPress={closeProjectOptions}>
          <View style={styles.popupOverlay}>
            <TouchableWithoutFeedback>
              <ThemedView 
                style={[
                  styles.popupContainer,
                  { backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#FFFFFF' }
                ]}
              >
                <ThemedText 
                  style={styles.popupTitle}
                  lightColor="#000"
                  darkColor="#fff"
                >
                  {selectedProject?.name} Options
                </ThemedText>
                
                <TouchableOpacity 
                  style={styles.popupOption}
                  onPress={() => handleOptionSelect('Edit')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="pencil" size={20} color="#007AFF" />
                  <ThemedText 
                    style={styles.popupOptionText}
                    lightColor="#000"
                    darkColor="#fff"
                  >
                    Edit Project
                  </ThemedText>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.popupOption}
                  onPress={() => handleOptionSelect('Archive')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="archive" size={20} color="#FF9500" />
                  <ThemedText 
                    style={styles.popupOptionText}
                    lightColor="#000"
                    darkColor="#fff"
                  >
                    Archive Project
                  </ThemedText>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.popupOption}
                  onPress={() => handleOptionSelect('Delete')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash" size={20} color="#FF3B30" />
                  <ThemedText 
                    style={[styles.popupOptionText, { color: '#FF3B30' }]}
                    lightColor="#FF3B30"
                    darkColor="#FF3B30"
                  >
                    Delete Project
                  </ThemedText>
                </TouchableOpacity>
              </ThemedView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  mainContent: {
    flex: 1,
  },
  hamburgerButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22, // Circular
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    // Remove elevation/shadow if it looks like just a "round background" without content
    // elevation: 5,
    // shadowColor: '#000',
    // ...
    // Making it transparent or simple to fit the new header design
    backgroundColor: 'transparent', // Changed from opaque to transparent to blend with header
  },
  hamburgerLine: {
    position: 'absolute',
    width: 20,
    height: 2,
    backgroundColor: '#333',
    borderRadius: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
  },
  overlayTouchable: {
    flex: 1,
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  sidebarScrollView: {
    flex: 1,
  },
  sidebarScrollContent: {
    flexGrow: 0,
  },
  sidebarContent: {
    paddingTop: 100,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  syncButtonsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  sidebarTitle: {
    marginBottom: 30,
    fontSize: 24,
    fontWeight: 'bold',
  },
  sidebarItems: {
    gap: 15,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    gap: 15,
  },
  sidebarItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  inboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 15,
    borderRadius: 8,
    gap: 15,
    backgroundColor: 'rgba(0,122,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,122,255,0.2)',
    marginBottom: 8,
  },
  inboxItemText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#007AFF',
  },
  projectsSection: {
    marginTop: 10,
    marginBottom: 10,
  },
  projectsSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    opacity: 0.8,
  },
  projectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginLeft: 8,
    borderRadius: 6,
    gap: 10,
  },
  projectItemText: {
    fontSize: 14,
    fontWeight: '400',
    flex: 1,
  },
  loadingText: {
    fontSize: 12,
    opacity: 0.6,
    marginLeft: 8,
    fontStyle: 'italic',
  },
  noProjectsText: {
    fontSize: 12,
    opacity: 0.6,
    marginLeft: 8,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 12,
    color: 'red',
    marginLeft: 8,
    fontStyle: 'italic',
  },
  debugText: {
    fontSize: 10,
    color: 'red',
    marginLeft: 8,
    fontStyle: 'italic',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  addProjectButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,122,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,122,255,0.3)',
    borderStyle: 'dashed',
  },
  verticalDots: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 'auto',
    paddingRight: 8,
    gap: 2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#999',
  },
  popupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popupContainer: {
    borderRadius: 12,
    padding: 20,
    minWidth: 250,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  popupTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  popupOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 12,
  },
  popupOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

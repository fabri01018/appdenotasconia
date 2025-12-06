import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Switch, TouchableOpacity, View } from 'react-native';

import AddTaskModal from '@/components/add-task-modal';
import AIView from '@/components/AIView';
import PromptsSelectionModal from '@/components/prompts-selection-modal';
import EditingToolbar from '@/components/task-detail/EditingToolbar';
import AIProcessingModal from '@/components/task-detail/modals/AIProcessingModal';
import HierarchyNavigationModal from '@/components/task-detail/modals/HierarchyNavigationModal';
import ProjectSelectionModal from '@/components/task-detail/modals/ProjectSelectionModal';
import SectionSelectionModal from '@/components/task-detail/modals/SectionSelectionModal';
import TagSelectionModal from '@/components/task-detail/modals/TagSelectionModal';
import TaskMenuModal from '@/components/task-detail/modals/TaskMenuModal';
import { styles } from '@/components/task-detail/task-detail-styles';
import TaskBlocksSection from '@/components/task-detail/TaskBlocksSection';
import TaskHeader from '@/components/task-detail/TaskHeader';
import TaskLoadingState from '@/components/task-detail/TaskLoadingState';
import TaskTagsDisplay from '@/components/task-detail/TaskTagsDisplay';
import TaskTextEditMode from '@/components/task-detail/TaskTextEditMode';
import TaskTitleSection from '@/components/task-detail/TaskTitleSection';
import TaskSelectionModal from '@/components/task-selection-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useBlocksForTask } from '@/hooks/task-detail/useBlocksForTask';
import { useTaskActions } from '@/hooks/task-detail/useTaskActions';
import { useTaskDetail } from '@/hooks/task-detail/useTaskDetail';
import { useTaskEditing } from '@/hooks/task-detail/useTaskEditing';
import { useTaskModals } from '@/hooks/task-detail/useTaskModals';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useProjects } from '@/hooks/use-projects';
import { useSectionsByProject } from '@/hooks/use-sections';
import { useTags } from '@/hooks/use-tags';
import { useFloatingNote } from '@/hooks/useFloatingNote';
import { descriptionToBlocks } from '@/lib/blocks-utils';

export default function TaskDetailScreen() {
  const { taskId } = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const [viewMode, setViewMode] = useState('note');
  const [isTextMode, setIsTextMode] = useState(false);
  const [showAddSubtaskModal, setShowAddSubtaskModal] = useState(false);
  const [showParentSelectionModal, setShowParentSelectionModal] = useState(false);
  const [showHierarchyModal, setShowHierarchyModal] = useState(false);
  const aiViewRef = useRef(null);

  // Data hooks
  const { task, tags, loading, setTask, setTags, refreshTask } = useTaskDetail(taskId);

  // Refresh task data when switching back from AI view
  // and whenever the screen gains focus to ensure sync
  useFocusEffect(
    useCallback(() => {
      refreshTask();
    }, [taskId])
  );

  // Also refresh when switching modes within the screen
  React.useEffect(() => {
    if (viewMode === 'note') {
      refreshTask();
    }
  }, [viewMode]);

  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { data: sections = [], isLoading: sectionsLoading } = useSectionsByProject(task?.project_id);
  const { data: allTags = [], isLoading: tagsLoading } = useTags();

  // UI state hooks
  const modals = useTaskModals();
  const editing = useTaskEditing(taskId, task, setTask);
  const actions = useTaskActions(taskId, task, setTask, setTags, refreshTask);
  
  // Floating note hook
  const floatingNote = useFloatingNote();
  
  // Refresh floating note when task updates (if this is the active floating note)
  React.useEffect(() => {
    if (floatingNote.isVisible && floatingNote.taskId === parseInt(taskId) && task) {
      floatingNote.refreshTaskData();
    }
  }, [task?.title, task?.description, task?.project_id]);
  
  // Blocks hook - single instance shared between toolbar and blocks section
  // Pass task and setTask from useTaskDetail to unify task state
  const blocksApi = useBlocksForTask(taskId, task, setTask);

  // Modal handlers
  const handleChangeProject = () => {
    modals.openProjectModal();
  };

  const handleChangeSection = () => {
    modals.openSectionModal();
  };

  const handleAddTags = () => {
    modals.openTagsModal();
  };

  const handleAIFeature = () => {
    modals.closeMenuModal(); // Close the menu first
    router.push(`/ai?taskId=${taskId}`); // Navigate to AI screen with taskId parameter
  };

  const handleSelectProject = (projectId) => {
    actions.handleSelectProject(projectId, modals.closeProjectModal);
  };

  const handleSelectSection = (sectionId) => {
    actions.handleSelectSection(sectionId, modals.closeSectionModal);
  };

  const handleSelectTag = (tagId) => {
    actions.handleSelectTag(tagId, tags, modals.closeTagsModal);
  };

  const handleSelectPrompt = (prompt) => {
    actions.handleSelectPrompt(prompt, editing.setDescription, modals.closePromptsModal);
  };

  const handleAddSubtask = () => {
    modals.closeMenuModal();
    setShowAddSubtaskModal(true);
  };

  const handleConvertToSubtask = () => {
    modals.closeMenuModal();
    setShowParentSelectionModal(true);
  };

  const handleSelectParentForConversion = (parentTask) => {
    actions.handleConvertToSubtask(parentTask, () => setShowParentSelectionModal(false));
  };

  const handleCreateFloatingNote = () => {
    if (!taskId) return;
    
    // If floating note is already active for this task, toggle it off
    if (floatingNote.isVisible && floatingNote.taskId === parseInt(taskId)) {
      floatingNote.hideFloatingNote();
    } else {
      // Create or switch to this task's floating note
      floatingNote.createFloatingNote(parseInt(taskId));
    }
    
    modals.closeMenuModal();
  };

  const handleDeleteFloatingNote = () => {
    // Completely delete/remove the floating note (not just hide)
    floatingNote.deleteFloatingNote();
    modals.closeMenuModal();
  };
  
  const handleNavigateTask = (newTaskId) => {
    setShowHierarchyModal(false);
    router.push(`/task/${newTaskId}`);
  };

  // Text Edit Mode Handlers
  const handleEditAsText = () => {
    modals.closeMenuModal();
    setIsTextMode(true);
  };

  const handleSaveText = (newText) => {
    console.log('Saving text:', newText);
    
    // Convert the edited text back to blocks
    const newBlocks = descriptionToBlocks(newText);
    
    // Update the blocks state and save to backend
    blocksApi.updateAllBlocks(newBlocks);
    
    // Exit text mode
    setIsTextMode(false);
  };

  // Check loading/error states
  const loadingState = <TaskLoadingState loading={loading} task={task} />;
  if (loading || !task) {
    return loadingState;
  }

  return (
    <ThemedView style={styles.container}>
      <TaskHeader 
        task={task}
        onChangeProject={handleChangeProject}
        onOpenMenu={modals.openMenuModal}
        onTogglePin={() => actions.handleTogglePin(tags)}
        isPinned={actions.isPinned(tags)}
      />

      <View style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 0 }}>
        <View style={styles.dateRow}>
          <View style={styles.dateLeft}>
            <Ionicons 
              name="square-outline" 
              size={18} 
              color={colorScheme === 'dark' ? '#888' : '#666'} 
            />
            <ThemedText style={styles.dateText}>Date and repetition</ThemedText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity 
                onPress={() => setShowHierarchyModal(true)}
                style={{ 
                    marginRight: 4, 
                    padding: 4,
                    backgroundColor: 'rgba(10, 126, 164, 0.1)',
                    borderRadius: 8
                }}
            >
                <Ionicons name="git-merge-outline" size={20} color="#0a7ea4" />
            </TouchableOpacity>
            
            {viewMode === 'ai' && (
              <TouchableOpacity 
                onPress={() => aiViewRef.current?.startNewChat()}
                style={{ marginRight: 8, padding: 4 }}
              >
                <Ionicons name="add-circle-outline" size={20} color="#0a7ea4" />
              </TouchableOpacity>
            )}
            <ThemedText style={{ fontSize: 12, color: '#888' }}>{viewMode === 'ai' ? 'AI' : 'Note'}</ThemedText>
            <Switch  
              value={viewMode === 'ai'} 
              onValueChange={(val) => setViewMode(val ? 'ai' : 'note')}
              trackColor={{ false: "#767577", true: "rgba(10, 126, 164, 0.5)" }}
              thumbColor={viewMode === 'ai' ? "#0a7ea4" : "#f4f3f4"}
            />
          </View>
        </View>
      </View>

      {viewMode === 'note' ? (
        isTextMode ? (
          <TaskTextEditMode 
            blocks={blocksApi.blocks}
            onSave={handleSaveText}
            onCancel={() => setIsTextMode(false)}
          />
        ) : (
          <KeyboardAvoidingView 
            style={[styles.content, { paddingTop: 0 }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          >
            <TaskTitleSection
              title={editing.title}
              onTitleChange={editing.setTitle}
              saveStatus={editing.titleSaveStatus}
            />

            <TaskBlocksSection 
              loading={blocksApi.loading}
              blocks={blocksApi.blocks}
              editingIndex={blocksApi.editingIndex}
              editValue={blocksApi.editValue}
              saveStatus={blocksApi.saveStatus}
              onEdit={blocksApi.handleEdit}
              onSave={blocksApi.handleSave}
              onAddBlock={blocksApi.addBlock}
              onAddToggleBlock={blocksApi.addToggleBlock}
              onAddCheckBlock={blocksApi.addCheckBlock}
              onDeleteBlock={blocksApi.deleteBlock}
              onEnterPress={blocksApi.handleEnterPress}
              onTextChange={blocksApi.handleTextChange}
              onToggle={blocksApi.handleToggle}
              onAddChildBlock={blocksApi.addChildBlock}
              onAddChildToggle={blocksApi.addChildToggle}
              onBackspaceOnEmpty={blocksApi.handleBackspaceOnEmpty}
              onCheckToggle={blocksApi.handleCheckToggle}
            >
              <TaskTagsDisplay 
                tags={tags} 
                onRemoveTag={(tagId) => actions.handleRemoveTag(tagId)}
              />
            </TaskBlocksSection>
          </KeyboardAvoidingView>
        )
      ) : (
        <View style={{ flex: 1 }}>
          <AIView 
            ref={aiViewRef}
            taskId={taskId} 
            initialTask={task} 
            showHeader={false} 
          />
        </View>
      )}

      {/* Modals */}
      <AddTaskModal
        visible={showAddSubtaskModal}
        onClose={() => setShowAddSubtaskModal(false)}
        projectId={task?.project_id}
        projectName={projects.find(p => p.id === task?.project_id)?.name}
        parentId={taskId}
      />

      <TaskMenuModal
        visible={modals.showMenuModal}
        onClose={modals.closeMenuModal}
        onChangeSection={handleChangeSection}
        onAddTags={handleAddTags}
        onAIFeature={handleAIFeature}
        onAddSubtask={handleAddSubtask}
        onMarkAsTemplate={() => actions.handleMarkAsTemplate(tags, modals.closeMenuModal)}
        onRemoveTemplate={() => actions.handleRemoveTemplate(tags, modals.closeMenuModal)}
        isTemplate={actions.isTemplate(tags)}
        onCreateFloatingNote={handleCreateFloatingNote}
        onDeleteFloatingNote={handleDeleteFloatingNote}
        isFloatingNoteActive={floatingNote.isVisible && floatingNote.taskId === parseInt(taskId)}
        onConvertToNormalTask={() => actions.handleConvertToNormalTask(modals.closeMenuModal)}
        onConvertToSubtask={handleConvertToSubtask}
        isSubtask={!!task?.parent_id}
        onEditAsText={handleEditAsText}
      />

      <TaskSelectionModal
        visible={showParentSelectionModal}
        onClose={() => setShowParentSelectionModal(false)}
        onSelectTask={handleSelectParentForConversion}
        excludeTaskId={parseInt(taskId)}
        projectId={task?.project_id}
      />
      
      <HierarchyNavigationModal
        visible={showHierarchyModal}
        onClose={() => setShowHierarchyModal(false)}
        currentTaskId={parseInt(taskId)}
        onNavigate={handleNavigateTask}
      />

      <ProjectSelectionModal
        visible={modals.showProjectModal}
        onClose={() => actions.closeProjectModal(modals.closeProjectModal)}
        task={task}
        projects={projects}
        projectsLoading={projectsLoading}
        isUpdating={actions.isUpdatingProject}
        onSelectProject={handleSelectProject}
      />

      <SectionSelectionModal
        visible={modals.showSectionModal}
        onClose={() => actions.closeSectionModal(modals.closeSectionModal)}
        task={task}
        sections={sections}
        sectionsLoading={sectionsLoading}
        isUpdating={actions.isUpdatingSection}
        onSelectSection={handleSelectSection}
      />

      <TagSelectionModal
        visible={modals.showTagsModal}
        onClose={() => actions.closeTagsModal(modals.closeTagsModal)}
        taskTags={tags}
        allTags={allTags}
        tagsLoading={tagsLoading}
        isAdding={actions.isAddingTag}
        onSelectTag={handleSelectTag}
      />

      <PromptsSelectionModal
        visible={modals.showPromptsModal}
        onClose={modals.closePromptsModal}
        onSelectPrompt={handleSelectPrompt}
      />

      <AIProcessingModal visible={actions.isProcessingAI} />

      {/* Editing Toolbar - Only visible in note mode and not in text mode */}
      {viewMode === 'note' && !isTextMode && (
        <EditingToolbar 
          visible={true}
          onAddToggleBlock={() => blocksApi.addToggleBlock(null)}
          onAddCheckBlock={() => blocksApi.addCheckBlock(null)}
          onInsertTab={blocksApi.handleInsertTab}
        />
      )}
    </ThemedView>
  );
}

import { PIN_TAG_NAME } from '@/constants/pin';
import { TEMPLATE_TAG_NAME } from '@/constants/templates';
import { sendMessageToClaude } from '@/lib/claude-api';
import { getOrCreateTag } from '@/repositories/tags';
import { addTagToTask, getTaskTags, removeTagFromTask, updateTask } from '@/repositories/tasks';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert } from 'react-native';

export function useTaskActions(taskId, task, setTask, setTags, refreshTask) {
  const [isUpdatingProject, setIsUpdatingProject] = useState(false);
  const [isUpdatingSection, setIsUpdatingSection] = useState(false);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const queryClient = useQueryClient();

  const handleSelectProject = async (projectId, onClose) => {
    if (!task) return;
    
    if (projectId === task.project_id) {
      onClose();
      return;
    }

    const oldProjectId = task.project_id;

    try {
      setIsUpdatingProject(true);
      
      // Auto-unpin: Remove Pinned tag when project changes
      const currentTags = await getTaskTags(parseInt(taskId));
      const pinnedTag = currentTags.find(tag => tag.name === PIN_TAG_NAME);
      if (pinnedTag) {
        await removeTagFromTask(parseInt(taskId), pinnedTag.id);
        // Update tags state
        setTags(prevTags => prevTags.filter(tag => tag.id !== pinnedTag.id));
      }
      
      await updateTask(parseInt(taskId), {
        project_id: projectId,
        title: task.title,
        description: task.description,
      });
      
      // Reload task data
      await refreshTask();
      
      // Invalidate task queries to refresh task lists in both old and new projects
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      if (oldProjectId) {
        queryClient.invalidateQueries({ queryKey: ['tasks', oldProjectId] });
      }
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      }
      
      onClose();
      Alert.alert('Success', 'Task project updated successfully');
    } catch (error) {
      console.error('Error updating task project:', error);
      Alert.alert('Error', 'Failed to update task project');
    } finally {
      setIsUpdatingProject(false);
    }
  };

  const closeProjectModal = (onClose) => {
    if (!isUpdatingProject) {
      onClose();
    }
  };

  const handleSelectSection = async (sectionId, onClose) => {
    if (!task) return;
    
    if (sectionId === task.section_id) {
      onClose();
      return;
    }

    try {
      setIsUpdatingSection(true);
      await updateTask(parseInt(taskId), {
        project_id: task.project_id,
        section_id: sectionId,
        title: task.title,
        description: task.description,
      });
      
      // Reload task data
      await refreshTask();
      
      // Invalidate task queries to refresh task lists
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', task.project_id] });
      
      onClose();
      Alert.alert('Success', 'Task section updated successfully');
    } catch (error) {
      console.error('Error updating task section:', error);
      Alert.alert('Error', 'Failed to update task section');
    } finally {
      setIsUpdatingSection(false);
    }
  };

  const closeSectionModal = (onClose) => {
    if (!isUpdatingSection) {
      onClose();
    }
  };

  const handleSelectTag = async (tagId, taskTags, onClose) => {
    if (!task) return;
    
    // Check if tag is already attached to this task
    const currentTaskTagIds = taskTags.map(t => t.id);
    if (currentTaskTagIds.includes(tagId)) {
      onClose();
      return;
    }

    try {
      setIsAddingTag(true);
      await addTagToTask(parseInt(taskId), tagId);
      
      // Reload task tags
      const updatedTaskTags = await getTaskTags(parseInt(taskId));
      setTags(updatedTaskTags || []);
      
      // Invalidate queries to refresh
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', task.project_id] });
      
      onClose();
      Alert.alert('Success', 'Tag added successfully');
    } catch (error) {
      console.error('Error adding tag to task:', error);
      Alert.alert('Error', 'Failed to add tag to task');
    } finally {
      setIsAddingTag(false);
    }
  };

  const closeTagsModal = (onClose) => {
    if (!isAddingTag) {
      onClose();
    }
  };

  const handleSelectPrompt = async (prompt, setEditedDescription, onClose) => {
    if (!task) return;
    
    onClose();
    setIsProcessingAI(true);

    try {
      // Use the task description (or title if no description) as the user message
      const userMessage = task.description || task.title || '';
      
      // Send to Claude API with the prompt as system message
      const response = await sendMessageToClaude(userMessage, [], prompt);
      
      if (response.error) {
        Alert.alert('Error', response.error);
        setIsProcessingAI(false);
        return;
      }

      // Update task description with the AI response
      await updateTask(parseInt(taskId), {
        project_id: task.project_id,
        section_id: task.section_id,
        title: task.title,
        description: response.text,
      });
      
      // Reload task data to reflect changes
      await refreshTask();
      setEditedDescription(response.text);
      
      // Invalidate queries to refresh task lists
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', task.project_id] });
      
      Alert.alert('Success', 'Task description updated with AI response');
    } catch (error) {
      console.error('Error processing AI feature:', error);
      Alert.alert('Error', 'Failed to process AI feature. Please try again.');
    } finally {
      setIsProcessingAI(false);
    }
  };

  const handleRemoveTag = async (tagId) => {
    if (!task) return;
    
    try {
      await removeTagFromTask(parseInt(taskId), tagId);
      
      // Optimistically update tags
      setTags(prevTags => prevTags.filter(tag => tag.id !== tagId));
      
      // Refresh task data to ensure consistency
      await refreshTask();
      
      // Invalidate queries to refresh task lists
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', task.project_id] });
    } catch (error) {
      console.error('Error removing tag from task:', error);
      Alert.alert('Error', 'Failed to remove tag from task');
      // Revert optimistic update on error
      await refreshTask();
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            // TODO: Implement delete task functionality
            Alert.alert('Delete', 'Delete functionality will be implemented here');
          }
        }
      ]
    );
  };

  const handleMarkAsTemplate = async (taskTags, onClose) => {
    if (!task) return;
    
    // Check if task already has Template tag
    const hasTemplateTag = taskTags.some(tag => tag.name === TEMPLATE_TAG_NAME);
    if (hasTemplateTag) {
      onClose();
      return;
    }

    try {
      setIsAddingTag(true);
      
      // Get or create Template tag
      const templateTag = await getOrCreateTag(TEMPLATE_TAG_NAME);
      
      // Add Template tag to task
      await addTagToTask(parseInt(taskId), templateTag.id);
      
      // Reload task tags
      const updatedTaskTags = await getTaskTags(parseInt(taskId));
      setTags(updatedTaskTags || []);
      
      // Invalidate queries to refresh
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', task.project_id] });
      
      onClose();
      Alert.alert('Success', 'Task marked as template');
    } catch (error) {
      console.error('Error marking task as template:', error);
      Alert.alert('Error', 'Failed to mark task as template');
    } finally {
      setIsAddingTag(false);
    }
  };

  const handleRemoveTemplate = async (taskTags, onClose) => {
    if (!task) return;
    
    // Find Template tag
    const templateTag = taskTags.find(tag => tag.name === TEMPLATE_TAG_NAME);
    if (!templateTag) {
      onClose();
      return;
    }

    try {
      // Remove Template tag from task
      await removeTagFromTask(parseInt(taskId), templateTag.id);
      
      // Optimistically update tags
      setTags(prevTags => prevTags.filter(tag => tag.id !== templateTag.id));
      
      // Refresh task data to ensure consistency
      await refreshTask();
      
      // Invalidate queries to refresh task lists
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', task.project_id] });
      
      onClose();
      Alert.alert('Success', 'Template tag removed from task');
    } catch (error) {
      console.error('Error removing template tag:', error);
      Alert.alert('Error', 'Failed to remove template tag');
      // Revert optimistic update on error
      await refreshTask();
    }
  };

  // Check if task is a template
  const isTemplate = (taskTags) => {
    return taskTags?.some(tag => tag.name === TEMPLATE_TAG_NAME) || false;
  };

  const handleTogglePin = async (taskTags) => {
    if (!task) return;
    
    const pinnedTag = taskTags.find(tag => tag.name === PIN_TAG_NAME);
    const isPinned = !!pinnedTag;

    try {
      if (isPinned) {
        // Unpin: Remove Pinned tag
        await removeTagFromTask(parseInt(taskId), pinnedTag.id);
        setTags(prevTags => prevTags.filter(tag => tag.id !== pinnedTag.id));
      } else {
        // Pin: Add Pinned tag
        setIsAddingTag(true);
        const pinTag = await getOrCreateTag(PIN_TAG_NAME);
        await addTagToTask(parseInt(taskId), pinTag.id);
        
        // Reload task tags
        const updatedTaskTags = await getTaskTags(parseInt(taskId));
        setTags(updatedTaskTags || []);
      }
      
      // Update task's updated_at to reflect pin change (for sorting)
      await updateTask(parseInt(taskId), {
        project_id: task.project_id,
        section_id: task.section_id,
        title: task.title,
        description: task.description,
      });
      
      // Refresh task data
      await refreshTask();
      
      // Invalidate queries to refresh task lists
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', task.project_id] });
    } catch (error) {
      console.error('Error toggling pin:', error);
      Alert.alert('Error', 'Failed to toggle pin status');
      await refreshTask();
    } finally {
      setIsAddingTag(false);
    }
  };

  // Check if task is pinned
  const isPinned = (taskTags) => {
    return taskTags?.some(tag => tag.name === PIN_TAG_NAME) || false;
  };

  return {
    isUpdatingProject,
    isUpdatingSection,
    isAddingTag,
    isProcessingAI,
    handleSelectProject,
    closeProjectModal,
    handleSelectSection,
    closeSectionModal,
    handleSelectTag,
    closeTagsModal,
    handleSelectPrompt,
    handleRemoveTag,
    handleDelete,
    handleMarkAsTemplate,
    handleRemoveTemplate,
    isTemplate,
    handleTogglePin,
    isPinned,
    handleConvertToNormalTask: async (onClose) => {
      if (!task) return;
      
      try {
        await updateTask(parseInt(taskId), {
          parent_id: null,
          project_id: task.project_id, // Ensure it stays in the same project
          section_id: task.section_id, // Ensure it stays in the same section
        });
        
        // Refresh task data
        await refreshTask();
        
        // Invalidate queries to refresh task lists
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        queryClient.invalidateQueries({ queryKey: ['tasks', task.project_id] });
        if (task.parent_id) {
           // If we knew the parent ID, we could be more specific, but general tasks invalidation should cover it
           // Also might want to invalidate the parent task to update its subtask count/list if we had that info
           queryClient.invalidateQueries({ queryKey: ['task', task.parent_id] }); 
        }

        onClose();
        Alert.alert('Success', 'Task converted to normal task');
      } catch (error) {
        console.error('Error converting to normal task:', error);
        Alert.alert('Error', 'Failed to convert task');
      }
    },
    handleConvertToSubtask: async (parentTask, onClose) => {
      if (!task || !parentTask) return;
      
      try {
        await updateTask(parseInt(taskId), {
          parent_id: parentTask.id,
          project_id: parentTask.project_id, // Inherit project from parent
          section_id: parentTask.section_id, // Inherit section from parent
        });
        
        // Refresh task data
        await refreshTask();
        
        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        queryClient.invalidateQueries({ queryKey: ['tasks', task.project_id] });
        if (parentTask.project_id !== task.project_id) {
            queryClient.invalidateQueries({ queryKey: ['tasks', parentTask.project_id] });
        }
        
        // Invalidate parent task to update its subtask list
        queryClient.invalidateQueries({ queryKey: ['task', parentTask.id] });

        onClose();
        Alert.alert('Success', `Task converted to subtask of "${parentTask.title}"`);
      } catch (error) {
        console.error('Error converting to subtask:', error);
        Alert.alert('Error', 'Failed to convert task');
      }
    }
  };
}

// Separate hook for floating note actions to avoid circular dependencies
export function useFloatingNoteActions() {
  // This will be imported and used in task detail screen
  // The actual implementation uses useFloatingNote hook
  return {};
}


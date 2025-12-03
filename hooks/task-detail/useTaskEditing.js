import { getTaskById, updateTask } from '@/repositories/tasks';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useDebouncedAutoSave } from './useDebouncedAutoSave';

export function useTaskEditing(taskId, task, setTask) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [savedTitle, setSavedTitle] = useState('');
  const [savedDescription, setSavedDescription] = useState('');
  const queryClient = useQueryClient();
  const previousTaskIdRef = useRef(null);
  const titleRef = useRef('');
  const descriptionRef = useRef('');
  const savedTitleRef = useRef('');
  const savedDescriptionRef = useRef('');

  // Keep refs in sync with state
  useEffect(() => {
    titleRef.current = title;
    descriptionRef.current = description;
  }, [title, description]);

  useEffect(() => {
    savedTitleRef.current = savedTitle;
    savedDescriptionRef.current = savedDescription;
  }, [savedTitle, savedDescription]);

  // Initialize values when task loads or changes
  useEffect(() => {
    if (!task) return;
    
    const taskTitle = task.title || '';
    const taskDescription = task.description || '';
    const isNewTask = previousTaskIdRef.current !== task.id;
    
    if (isNewTask) {
      // New task loaded - reset everything
      setTitle(taskTitle);
      setDescription(taskDescription);
      setSavedTitle(taskTitle);
      setSavedDescription(taskDescription);
      previousTaskIdRef.current = task.id;
    } else {
      // Same task, but might have been updated externally
      // Check if local editing state matches previous saved state (no unsaved user edits)
      // Use refs to get current values without triggering re-runs
      const hasUnsavedTitleChanges = titleRef.current !== savedTitleRef.current;
      const hasUnsavedDescriptionChanges = descriptionRef.current !== savedDescriptionRef.current;
      
      // Always update saved values to reflect the latest task state
      setSavedTitle(taskTitle);
      setSavedDescription(taskDescription);
      
      // Only update editing state if user hasn't made changes
      // (i.e., local state still matches what was previously saved)
      if (!hasUnsavedTitleChanges) {
        setTitle(taskTitle);
      }
      if (!hasUnsavedDescriptionChanges) {
        setDescription(taskDescription);
      }
    }
  }, [task, task?.id, task?.title, task?.description]); // React to task changes only
  
  // Note: External updates (like AI processing) should manually call setTitle/setDescription
  // to update local state, which will then trigger auto-save if different from saved value

  // Auto-save title
  const saveTitle = async (newTitle) => {
    if (!task) return;
    
    try {
      await updateTask(parseInt(taskId), {
        project_id: task.project_id,
        section_id: task.section_id,
        title: newTitle.trim(),
        // Use latest local description to avoid overwriting unsaved edits
        description: description,
      });
      
      const updatedTask = await getTaskById(parseInt(taskId));
      setTask(updatedTask);
      const persistedTitle = updatedTask?.title ?? newTitle.trim();
      const persistedDescription = updatedTask?.description ?? description;
      setSavedTitle(persistedTitle);
      setSavedDescription(persistedDescription);
      
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', task.project_id] });
    } catch (error) {
      console.error('Error auto-saving title:', error);
      throw error; // Let the auto-save hook handle the error
    }
  };

  const titleSaveStatus = useDebouncedAutoSave(
    title,
    savedTitle,
    saveTitle,
    1500
  );

  // Auto-save description
  const saveDescription = async (newDescription) => {
    if (!task) return;
    
    try {
      await updateTask(parseInt(taskId), {
        project_id: task.project_id,
        section_id: task.section_id,
        // Use latest local title to avoid overwriting unsaved edits
        title: title.trim(),
        description: newDescription,
      });
      
      const updatedTask = await getTaskById(parseInt(taskId));
      setTask(updatedTask);
      const persistedTitle = updatedTask?.title ?? title.trim();
      const persistedDescription = updatedTask?.description ?? newDescription;
      setSavedTitle(persistedTitle);
      setSavedDescription(persistedDescription);
      
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', task.project_id] });
    } catch (error) {
      console.error('Error auto-saving description:', error);
      throw error; // Let the auto-save hook handle the error
    }
  };

  const descriptionSaveStatus = useDebouncedAutoSave(
    description,
    savedDescription,
    saveDescription,
    1500
  );

  return {
    // Values
    title,
    description,
    
    // Setters
    setTitle,
    setDescription,
    
    // Save status
    titleSaveStatus,
    descriptionSaveStatus,
  };
}


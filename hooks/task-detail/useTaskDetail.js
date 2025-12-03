import { getTaskById, getTaskTags } from '@/repositories/tasks';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';

export function useTaskDetail(taskId) {
  const [task, setTask] = useState(null);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Track if this is the first load to show the spinner
  const isFirstLoad = useRef(true);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadTaskData = async () => {
        if (!taskId) return;

        try {
          // Only show loading spinner on first load
          if (isFirstLoad.current) {
            setLoading(true);
          }
          
          // Load task details
          const taskData = await getTaskById(parseInt(taskId));
          
          // Load task tags
          const taskTags = await getTaskTags(parseInt(taskId));
          
          if (isActive) {
            setTask(taskData);
            setTags(taskTags || []);
          }
          
        } catch (err) {
          console.error('Failed to load task:', err);
          if (isActive) {
            Alert.alert('Error', 'Failed to load task details');
          }
        } finally {
          if (isActive && isFirstLoad.current) {
            setLoading(false);
            isFirstLoad.current = false;
          }
        }
      };

      loadTaskData();

      return () => {
        isActive = false;
      };
    }, [taskId])
  );

  const refreshTask = async () => {
    if (!taskId) return;
    
    try {
      const taskData = await getTaskById(parseInt(taskId));
      setTask(taskData);
      
      const taskTags = await getTaskTags(parseInt(taskId));
      setTags(taskTags || []);
    } catch (err) {
      console.error('Failed to refresh task:', err);
    }
  };

  return {
    task,
    tags,
    loading,
    setTask,
    setTags,
    refreshTask,
  };
}

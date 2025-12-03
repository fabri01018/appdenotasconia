import { descriptionToBlocks } from '@/lib/blocks-utils';
import { getTaskById } from '@/repositories/tasks';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

// Create context for floating note state
const FloatingNoteContext = createContext(null);

// Provider component
export function FloatingNoteProvider({ children }) {
  const [isVisible, setIsVisible] = useState(false);
  const [taskId, setTaskId] = useState(null);
  const [taskData, setTaskData] = useState(null);
  const [position, setPosition] = useState({ x: null, y: null }); // null means use default
  const [loading, setLoading] = useState(false);

  // Load task data when taskId changes
  useEffect(() => {
    const loadTaskData = async () => {
      if (!taskId) {
        setTaskData(null);
        return;
      }

      try {
        setLoading(true);
        const task = await getTaskById(parseInt(taskId));
        if (task) {
          // Parse blocks from description
          const blocks = descriptionToBlocks(task.description || '');
          setTaskData({
            ...task,
            blocks,
          });
        } else {
          setTaskData(null);
        }
      } catch (error) {
        console.error('Error loading task for floating note:', error);
        setTaskData(null);
      } finally {
        setLoading(false);
      }
    };

    loadTaskData();
  }, [taskId]);

  // Create floating note for a task
  const createFloatingNote = useCallback((newTaskId) => {
    setTaskId(newTaskId);
    setIsVisible(true);
  }, []);

  // Toggle visibility
  const toggleVisibility = useCallback(() => {
    setIsVisible(prev => !prev);
  }, []);

  // Hide floating note (just hides, keeps data)
  const hideFloatingNote = useCallback(() => {
    setIsVisible(false);
  }, []);

  // Delete floating note (completely removes it, clears all data)
  const deleteFloatingNote = useCallback(() => {
    console.log('[FloatingNote] deleteFloatingNote called');
    setIsVisible(false);
    setTaskId(null);
    setTaskData(null);
    setPosition({ x: null, y: null });
    console.log('[FloatingNote] Floating note deleted');
  }, []);

  // Update position
  const updatePosition = useCallback((newPosition) => {
    setPosition(newPosition);
  }, []);

  // Refresh task data (when task is updated)
  const refreshTaskData = useCallback(async () => {
    if (!taskId) return;

    try {
      const task = await getTaskById(parseInt(taskId));
      if (task) {
        const blocks = descriptionToBlocks(task.description || '');
        setTaskData({
          ...task,
          blocks,
        });
      }
    } catch (error) {
      console.error('Error refreshing floating note task:', error);
    }
  }, [taskId]);

  const value = {
    isVisible,
    taskId,
    taskData,
    position,
    loading,
    createFloatingNote,
    toggleVisibility,
    hideFloatingNote,
    deleteFloatingNote,
    updatePosition,
    refreshTaskData,
  };

  return (
    <FloatingNoteContext.Provider value={value}>
      {children}
    </FloatingNoteContext.Provider>
  );
}

// Hook to use floating note context
export function useFloatingNote() {
  const context = useContext(FloatingNoteContext);
  if (!context) {
    throw new Error('useFloatingNote must be used within FloatingNoteProvider');
  }
  return context;
}


import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { createTask, deleteTask, getSubTasks, updateTask } from '@/repositories/tasks';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import SubTaskItem from './SubTaskItem';

export default function SubTaskList({ parentTaskId, projectId }) {
  const colorScheme = useColorScheme();
  const queryClient = useQueryClient();
  const [subTasks, setSubTasks] = useState([]);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSubTasks();
  }, [parentTaskId]);

  const loadSubTasks = async () => {
    if (!parentTaskId) return;
    setIsLoading(true);
    try {
      const tasks = await getSubTasks(parentTaskId);
      setSubTasks(tasks || []);
    } catch (error) {
      console.error('Error loading subtasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSubTask = async () => {
    if (!newItemTitle.trim() || !parentTaskId) return;

    const title = newItemTitle.trim();
    setNewItemTitle(''); // Clear input immediately

    try {
        // Optimistic update (optional, but better to wait for ID in this case or use temp ID)
        // For simplicity, we wait for the result
        const newTask = await createTask(projectId, title, null, null, parentTaskId);
        setSubTasks(prev => [...prev, newTask]);
        // Invalidate tasks query to update main list
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch (error) {
        console.error('Error creating subtask:', error);
    }
  };

  const handleUpdateSubTask = async (id, updates) => {
    // Optimistic update
    setSubTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates, completed: updates.completed !== undefined ? (updates.completed ? 1 : 0) : t.completed } : t));

    try {
        await updateTask(id, updates);
        // Invalidate tasks query to update main list
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch (error) {
        console.error('Error updating subtask:', error);
        // Revert on error would go here
    }
  };

  const handleDeleteSubTask = async (id) => {
    // Optimistic update
    setSubTasks(prev => prev.filter(t => t.id !== id));

    try {
        await deleteTask(id);
        // Invalidate tasks query to update main list
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch (error) {
        console.error('Error deleting subtask:', error);
    }
  };

  if (!parentTaskId) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="defaultSemiBold" style={styles.headerTitle}>Subtasks</ThemedText>
      </View>

      <View style={styles.list}>
        {subTasks.map(task => (
            <SubTaskItem
                key={task.id}
                subTask={task}
                onUpdate={handleUpdateSubTask}
                onDelete={handleDeleteSubTask}
            />
        ))}
      </View>

      <View style={styles.addItemContainer}>
        <Ionicons 
            name="add" 
            size={20} 
            color={colorScheme === 'dark' ? '#666' : '#999'} 
            style={styles.addIcon}
        />
        <TextInput
            style={[
                styles.addItemInput,
                { color: colorScheme === 'dark' ? '#fff' : '#000' }
            ]}
            placeholder="Add subtask..."
            placeholderTextColor={colorScheme === 'dark' ? '#666' : '#999'}
            value={newItemTitle}
            onChangeText={setNewItemTitle}
            onSubmitEditing={handleAddSubTask}
            blurOnSubmit={false} // Keep focus to add multiple items? Actually better to keep it simple
        />
        {newItemTitle.length > 0 && (
            <TouchableOpacity onPress={handleAddSubTask}>
                <Ionicons 
                    name="arrow-up-circle" 
                    size={24} 
                    color={colorScheme === 'dark' ? '#fff' : '#000'} 
                />
            </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    paddingHorizontal: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  list: {
    marginBottom: 8,
  },
  addItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    opacity: 0.8,
  },
  addIcon: {
    marginRight: 8,
  },
  addItemInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
});


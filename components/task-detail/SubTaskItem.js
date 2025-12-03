import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

export default function SubTaskItem({ 
  subTask, 
  onUpdate, 
  onDelete,
}) {
  const colorScheme = useColorScheme();
  const [isEditing, setIsEditing] = useState(false);
  const [localTitle, setLocalTitle] = useState(subTask.title);
  const inputRef = useRef(null);

  const isCompleted = subTask.completed === 1;

  const handleToggleCheck = () => {
    onUpdate(subTask.id, { completed: !isCompleted });
  };

  const handleSave = () => {
    setIsEditing(false);
    if (localTitle.trim() !== subTask.title) {
      onUpdate(subTask.id, { title: localTitle });
    }
  };

  const handleDelete = () => {
    onDelete(subTask.id);
  };

  return (
    <View style={styles.container}>
        <TouchableOpacity 
            style={styles.checkboxContainer} 
            onPress={handleToggleCheck}
            activeOpacity={0.7}
        >
            <Ionicons 
                name={isCompleted ? "checkbox" : "checkbox-outline"} 
                size={20} 
                color={isCompleted ? (colorScheme === 'dark' ? '#888' : '#888') : (colorScheme === 'dark' ? '#ccc' : '#666')}
            />
        </TouchableOpacity>

        <View style={styles.contentContainer}>
            {isEditing ? (
                <TextInput
                    ref={inputRef}
                    style={[
                        styles.input,
                        { color: colorScheme === 'dark' ? '#fff' : '#000' }
                    ]}
                    value={localTitle}
                    onChangeText={setLocalTitle}
                    onBlur={handleSave}
                    onSubmitEditing={handleSave}
                    autoFocus
                />
            ) : (
                <Pressable onPress={() => setIsEditing(true)} style={styles.textContainer}>
                    <ThemedText style={[
                        styles.text,
                        isCompleted && styles.completedText
                    ]}>
                        {subTask.title}
                    </ThemedText>
                </Pressable>
            )}
        </View>

        <TouchableOpacity 
            style={styles.deleteButton} 
            onPress={handleDelete}
            activeOpacity={0.7}
        >
            <Ionicons 
                name="close" 
                size={16} 
                color={colorScheme === 'dark' ? '#666' : '#aaa'}
            />
        </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 0,
  },
  checkboxContainer: {
    padding: 4,
    marginRight: 8,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  textContainer: {
    paddingVertical: 4,
  },
  text: {
    fontSize: 15,
    lineHeight: 20,
  },
  completedText: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  input: {
    fontSize: 15,
    paddingVertical: 2,
    paddingHorizontal: 0,
  },
  deleteButton: {
    padding: 6,
    opacity: 0.7,
  },
});


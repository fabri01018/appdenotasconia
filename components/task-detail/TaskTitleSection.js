import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, TextInput, View } from 'react-native';
import { styles } from './task-detail-styles';

export default function TaskTitleSection({ 
  title, 
  onTitleChange,
  saveStatus,
}) {
  const colorScheme = useColorScheme();
  const [isFocused, setIsFocused] = useState(false);

  const getInputStyle = () => {
    const baseStyle = [
      styles.inlineTitleInput,
      {
        color: colorScheme === 'dark' ? '#fff' : '#000',
      }
    ];

    // Subtle border/background on focus
    if (isFocused) {
      baseStyle.push({
        backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
        borderBottomWidth: 1,
        borderBottomColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)',
      });
    }

    return baseStyle;
  };

  return (
    <View style={styles.titleSection}>
      <View style={styles.inlineInputContainer}>
        <TextInput
          style={getInputStyle()}
          value={title}
          onChangeText={onTitleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Task title..."
          placeholderTextColor={colorScheme === 'dark' ? '#666' : '#999'}
          multiline
          textAlignVertical="top"
        />
        
        {/* Save status indicator */}
        {saveStatus && (
          <View style={styles.saveStatusIndicator}>
            {saveStatus.isSaving && (
              <ActivityIndicator 
                size="small" 
                color={colorScheme === 'dark' ? '#888' : '#666'} 
              />
            )}
            {saveStatus.lastSaved && !saveStatus.isSaving && (
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={colorScheme === 'dark' ? '#4CAF50' : '#4CAF50'}
              />
            )}
            {saveStatus.error && !saveStatus.isSaving && (
              <Ionicons
                name="alert-circle"
                size={16}
                color={colorScheme === 'dark' ? '#FF6B6B' : '#FF6B6B'}
              />
            )}
          </View>
        )}
      </View>
    </View>
  );
}


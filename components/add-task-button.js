import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

export default function AddTaskButton({ onPress }) {
  const colorScheme = useColorScheme();

  return (
    <TouchableOpacity 
      style={[
        styles.addTaskButton,
        { 
          backgroundColor: colorScheme === 'dark' ? 'rgba(0, 122, 255, 0.15)' : 'rgba(0, 122, 255, 0.1)',
          borderColor: colorScheme === 'dark' ? 'rgba(0, 122, 255, 0.4)' : 'rgba(0, 122, 255, 0.3)',
        }
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons 
        name="checkmark-circle-outline" 
        size={24} 
        color="#007AFF" 
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  addTaskButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
});


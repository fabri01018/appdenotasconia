import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

/**
 * Button component for adding a new toggle block
 */
export default function AddToggleButton({ onPress }) {
  const colorScheme = useColorScheme();

  return (
    <TouchableOpacity
      style={[
        styles.addButton,
        {
          backgroundColor: colorScheme === 'dark' ? '#333' : '#34C759',
        }
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons
        name="chevron-forward"
        size={20}
        color="#fff"
      />
      <Text style={styles.addButtonText}>Add Toggle</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});


import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

export default function SettingsButton({ onPress }) {
  const colorScheme = useColorScheme();

  return (
    <TouchableOpacity 
      style={[
        styles.settingsButton,
        { 
          backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'
        }
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons 
        name="settings-outline" 
        size={24} 
        color={colorScheme === 'dark' ? '#fff' : '#000'} 
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});


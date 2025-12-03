import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedText } from './themed-text';

export default function PullButton({ onPress, disabled }) {
  const colorScheme = useColorScheme();

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { 
          backgroundColor: colorScheme === 'dark' ? '#333' : '#fff',
          opacity: disabled ? 0.5 : 1
        }
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={disabled}
    >
      {disabled ? (
        <ActivityIndicator size="small" color={colorScheme === 'dark' ? '#fff' : '#000'} />
      ) : (
        <Ionicons
          name="arrow-down-circle-outline"
          size={20}
          color={colorScheme === 'dark' ? '#fff' : '#000'}
        />
      )}
      <ThemedText style={styles.buttonText}>{disabled ? 'Pulling...' : 'Pull'}</ThemedText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.2)',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

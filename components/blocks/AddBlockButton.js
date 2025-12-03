import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';

/**
 * Button component for adding a new block - subtle Notion-style design
 */
export default function AddBlockButton({ onPress }) {
  const colorScheme = useColorScheme();
  const [isHovered, setIsHovered] = useState(false);

  const iconColor = colorScheme === 'dark'
    ? 'rgba(255,255,255,0.4)'
    : 'rgba(55,53,47,0.4)';
  const textColor = colorScheme === 'dark'
    ? 'rgba(255,255,255,0.5)'
    : 'rgba(55,53,47,0.5)';
  const hoverBackground = colorScheme === 'dark'
    ? 'rgba(255,255,255,0.05)'
    : 'rgba(55,53,47,0.08)';

  return (
    <Pressable
      style={({ pressed, hovered }) => [
        styles.addButton,
        (hovered || pressed) && {
          backgroundColor: hoverBackground,
        },
      ]}
      onPress={onPress}
      onHoverIn={() => Platform.OS === 'web' && setIsHovered(true)}
      onHoverOut={() => Platform.OS === 'web' && setIsHovered(false)}
    >
      <Ionicons
        name="add"
        size={18}
        color={iconColor}
      />
      <ThemedText style={[styles.addButtonText, { color: textColor }]}>
        Add block
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRadius: 4,
    gap: 8,
    marginTop: 2,
    transition: 'background-color 150ms ease',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '400',
  },
});


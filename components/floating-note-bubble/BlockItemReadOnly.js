import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

/**
 * Read-only version of BlockItem for displaying blocks in floating note bubble
 */
export default function BlockItemReadOnly({
  block,
  path,
  depth = 0,
  onToggle,
  onCheckToggle,
}) {
  const colorScheme = useColorScheme();
  
  if (block.type !== "block" && block.type !== "toggle" && block.type !== "check") return null;
  
  const isToggle = block.type === "toggle";
  const isCheck = block.type === "check";
  const isOpen = block.isOpen || false;
  const isChecked = isCheck && (block.checked || false);
  const children = (block.children || []).filter(child => child && (child.type === 'block' || child.type === 'toggle' || child.type === 'check'));
  const pathArray = Array.isArray(path) ? path : [path];

  // Get theme-aware colors
  const iconColor = colorScheme === 'dark' 
    ? 'rgba(255,255,255,0.6)' 
    : 'rgba(55,53,47,0.6)';

  return (
    <View style={[styles.blockWrapper, { paddingLeft: depth * 16 }]}>
      <View style={styles.blockContainer}>
        {isToggle && (
          <TouchableOpacity
            style={styles.toggleIcon}
            onPress={() => onToggle && onToggle(pathArray)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isOpen ? "chevron-down" : "chevron-forward"}
              size={18}
              color={iconColor}
            />
          </TouchableOpacity>
        )}
        {isCheck && (
          <TouchableOpacity
            style={styles.checkboxIcon}
            onPress={() => onCheckToggle && onCheckToggle(pathArray)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isChecked ? "checkbox" : "checkbox-outline"}
              size={20}
              color={iconColor}
            />
          </TouchableOpacity>
        )}
        <View style={styles.blockLine}>
          <ThemedText 
            style={[
              styles.blockContent,
              isCheck && isChecked && styles.checkedText
            ]}
          >
            {block.content || ''}
          </ThemedText>
        </View>
      </View>
      
      {/* Render children if toggle is expanded */}
      {isToggle && isOpen && (
        <View style={styles.childrenContainer}>
          {children.map((child, childIndex) => {
            const childPath = [...pathArray, childIndex];
            return (
              <BlockItemReadOnly
                key={childIndex}
                block={child}
                path={childPath}
                depth={depth + 1}
                onToggle={onToggle}
                onCheckToggle={onCheckToggle}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  blockWrapper: {
    marginBottom: 0,
  },
  blockContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 4,
    paddingVertical: 0,
    paddingHorizontal: 4,
  },
  toggleIcon: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -4,
    marginTop: 2,
  },
  checkboxIcon: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -4,
    marginTop: 2,
  },
  blockLine: {
    flex: 1,
    paddingVertical: 2,
    paddingHorizontal: 0,
    minHeight: 24,
  },
  blockContent: {
    fontSize: 16,
    lineHeight: 24,
  },
  placeholderText: {
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.5,
    fontStyle: 'italic',
  },
  checkedText: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  childrenContainer: {
    marginTop: 2,
    marginLeft: 8,
  },
});


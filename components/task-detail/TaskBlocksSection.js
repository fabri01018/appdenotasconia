import AddBlockButton from '@/components/blocks/AddBlockButton';
import BlockItem from '@/components/blocks/BlockItem';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import React, { useRef } from 'react';
import { ActivityIndicator, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from './task-detail-styles';

export default function TaskBlocksSection({ 
  loading,
  blocks,
  editingIndex,
  editValue,
  saveStatus,
  onEdit,
  onSave,
  onAddBlock,
  onAddToggleBlock,
  onAddCheckBlock,
  onDeleteBlock,
  onEnterPress,
  onTextChange,
  onToggle,
  onAddChildBlock,
  onAddChildToggle,
  onBackspaceOnEmpty,
  onCheckToggle,
  headerComponent,
  children,
}) {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const inputRefs = useRef({});
  const scrollViewRef = useRef(null);
  const TOOLBAR_HEIGHT = 32; // Height of the editing toolbar
  const KEYBOARD_OFFSET = 20; // Extra offset to ensure input is visible above keyboard

  // Handle keyboard events
  const handleKeyPress = (e, path) => {
    const key = e.nativeEvent.key;
    
    if (key === 'Enter' && Platform.OS === 'web') {
      onEnterPress(path);
    }
    
    // Handle backspace/delete when content is empty (second backspace deletes block)
    if ((key === 'Backspace' || key === 'Delete')) {
      if (onBackspaceOnEmpty(path)) {
        // Block was deleted, prevent default behavior
        return;
      }
    }
  };

  // Helper to get input ref key from path
  const getInputRefKey = (path) => {
    const pathArray = Array.isArray(path) ? path : [path];
    return pathArray.join('-');
  };

  // Handle input focus - scroll the input into view when keyboard appears
  const handleInputFocus = (path, inputRef) => {
    if (!scrollViewRef.current || !inputRef) {
      return;
    }

    // Use setTimeout to ensure the keyboard animation has started
    setTimeout(() => {
      if (!scrollViewRef.current || !inputRef) {
        return;
      }

      // Use measure to get page coordinates and calculate relative position
      // This is more reliable than measureLayout across different React Native versions
      if (inputRef.measure) {
        inputRef.measure((x, y, width, height, pageX, pageY) => {
          if (!scrollViewRef.current) return;
          
          // Measure the ScrollView to get its position
          scrollViewRef.current.measure((sx, sy, swidth, sheight, spageX, spageY) => {
            if (!scrollViewRef.current) return;
            
            // Calculate relative Y position within the ScrollView
            const relativeY = pageY - spageY;
            
            // Calculate scroll offset to show the input above keyboard
            // Account for toolbar and safe area
            const scrollOffset = relativeY - KEYBOARD_OFFSET;
            
            // Scroll to show the input with some padding
            scrollViewRef.current.scrollTo({
              y: Math.max(0, scrollOffset),
              animated: true,
            });
          });
        });
      }
    }, Platform.OS === 'ios' ? 100 : 300); // iOS keyboard animates faster
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.descriptionSection}>
        <View style={{ paddingVertical: 20, alignItems: 'center' }}>
          <ActivityIndicator size="small" color={colorScheme === 'dark' ? '#888' : '#666'} />
        </View>
      </View>
    );
  }

  // Padding for the toolbar at the bottom (always visible)
  const bottomPadding = TOOLBAR_HEIGHT + insets.bottom + 20;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView 
        ref={scrollViewRef}
        style={styles.descriptionSection}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
        contentContainerStyle={{ paddingBottom: bottomPadding }}
      >
        <View style={{ paddingVertical: 8 }}>
          {headerComponent}
          
          {/* Blocks Editor */}
          <View>
            {blocks.length === 0 ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ThemedText style={{ fontSize: 14, opacity: 0.6, textAlign: 'center' }}>
                  No blocks yet. Tap the button below to add your first block.
                </ThemedText>
              </View>
            ) : (
              blocks.map((block, index) => (
                <BlockItem
                  key={index}
                  block={block}
                  path={index}
                  depth={0}
                  isEditing={editingIndex}
                  editValue={editValue}
                  onEdit={onEdit}
                  onSave={onSave}
                  onDelete={onDeleteBlock}
                  onTextChange={onTextChange}
                  onKeyPress={handleKeyPress}
                  onEnterPress={onEnterPress}
                  onToggle={onToggle}
                  onAddChildBlock={onAddChildBlock}
                  onAddChildToggle={onAddChildToggle}
                  onBackspaceOnEmpty={onBackspaceOnEmpty}
                  onCheckToggle={onCheckToggle}
                  inputRef={(ref, key) => {
                    const refKey = key || getInputRefKey(index);
                    if (ref) {
                      inputRefs.current[refKey] = ref;
                    } else {
                      delete inputRefs.current[refKey];
                    }
                  }}
                  onFocus={handleInputFocus}
                />
              ))
            )}
            
            {/* Add Block Button - Only show when no blocks exist */}
            {blocks.length === 0 && (
              <View style={{ marginTop: 8 }}>
                <AddBlockButton onPress={() => onAddBlock(null)} />
              </View>
            )}
          </View>
          
          {/* Save Status Indicator */}
          {saveStatus && (
            <View style={[styles.saveStatusIndicator, { top: 12, right: 4 }]}>
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
        
        {children}
      </ScrollView>
    </View>
  );
}


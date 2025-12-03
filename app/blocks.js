import AddBlockButton from '@/components/blocks/AddBlockButton';
import BlockItem from '@/components/blocks/BlockItem';
import BlocksHeader from '@/components/blocks/BlocksHeader';
import { blocksStyles } from '@/components/blocks/blocks-styles';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useBlocks } from '@/hooks/use-blocks';
import React, { useRef } from 'react';
import { ActivityIndicator, Platform, ScrollView, View } from 'react-native';

export default function BlocksScreen() {
  const inputRefs = useRef({});
  
  // Use the custom hook for blocks management
  const {
    task,
    loading,
    blocks,
    editingIndex,
    editValue,
    saveStatus,
    handleEdit,
    handleSave,
    addBlock,
    addToggleBlock,
    deleteBlock,
    handleEnterPress,
    handleTextChange,
    handleToggle,
    addChildBlock,
    addChildToggle,
    handleBackspaceOnEmpty,
    handleCheckToggle,
  } = useBlocks('project', 'test');

  const handleKeyPress = (e, path) => {
    const key = e.nativeEvent.key;
    
    if (key === 'Enter' && Platform.OS === 'web') {
      handleEnterPress(path);
    }
    
    // Handle backspace/delete when content is empty (second backspace deletes block)
    // Note: This is mainly for web. On mobile, deletion is handled in handleTextChange
    if ((key === 'Backspace' || key === 'Delete')) {
      if (handleBackspaceOnEmpty(path)) {
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

  if (loading) {
    return (
      <ThemedView style={blocksStyles.container}>
        <View style={blocksStyles.loadingContainer}>
          <ActivityIndicator size="large" />
          <ThemedText style={blocksStyles.loadingText}>Loading blocks...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (!task) {
    return (
      <ThemedView style={blocksStyles.container}>
        <View style={blocksStyles.errorContainer}>
          <ThemedText style={blocksStyles.errorText}>
            Task "test" not found in project "project"
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={blocksStyles.container}>
      <BlocksHeader task={task} saveStatus={saveStatus} />
      <ScrollView 
        style={blocksStyles.scrollView}
        contentContainerStyle={blocksStyles.scrollContent}
      >
        <View style={blocksStyles.editor}>
          {blocks.length === 0 ? (
            <View style={blocksStyles.emptyContainer}>
              <ThemedText style={blocksStyles.emptyText}>
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
                onEdit={handleEdit}
                onSave={handleSave}
                onDelete={deleteBlock}
                onTextChange={handleTextChange}
                onKeyPress={handleKeyPress}
                onEnterPress={handleEnterPress}
                onToggle={handleToggle}
                onAddChildBlock={addChildBlock}
                onAddChildToggle={addChildToggle}
                onBackspaceOnEmpty={handleBackspaceOnEmpty}
                onCheckToggle={handleCheckToggle}
                inputRef={(ref, key) => {
                  const refKey = key || getInputRefKey(index);
                  if (ref) {
                    inputRefs.current[refKey] = ref;
                  } else {
                    delete inputRefs.current[refKey];
                  }
                }}
              />
            ))
          )}
          <View style={blocksStyles.addButtonsContainer}>
            <AddBlockButton onPress={() => addBlock(null)} />
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

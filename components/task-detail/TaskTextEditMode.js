import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { blocksToDescription } from '@/lib/blocks-utils';
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

export default function TaskTextEditMode({ blocks, onSave, onCancel }) {
  const colorScheme = useColorScheme();
  const [text, setText] = useState('');
  
  // Initialize text from blocks
  useEffect(() => {
    const initialText = blocksToDescription(blocks);
    setText(initialText);
  }, [blocks]);
  
  const handleSave = () => {
    onSave(text);
  };
  
  const textColor = colorScheme === 'dark' ? '#fff' : '#000';
  const placeholderColor = colorScheme === 'dark' ? '#666' : '#999';
  
  return (
    <ThemedView style={styles.container}>
      {/* Header with actions */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} style={styles.headerButton}>
          <ThemedText>Cancel</ThemedText>
        </TouchableOpacity>
        
        <ThemedText type="subtitle">Edit as Text</ThemedText>
        
        <TouchableOpacity onPress={handleSave} style={styles.headerButton}>
          <ThemedText style={styles.saveText}>Done</ThemedText>
        </TouchableOpacity>
      </View>
      
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          <TextInput
            style={[
              styles.input,
              { color: textColor }
            ]}
            multiline
            textAlignVertical="top"
            value={text}
            onChangeText={setText}
            placeholder="Type your task content..."
            placeholderTextColor={placeholderColor}
            autoFocus
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerButton: {
    padding: 8,
  },
  saveText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  input: {
    fontSize: 16,
    lineHeight: 24,
    minHeight: 200,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', // Use monospace for better structure visibility
  },
});


import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Alert,
    Modal,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCreateTag } from '@/hooks/use-tags';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

export default function AddTagModal({ visible, onClose }) {
  const colorScheme = useColorScheme();
  const [tagName, setTagName] = useState('');
  const createTagMutation = useCreateTag();

  const handleSubmit = async () => {
    if (!tagName.trim()) {
      Alert.alert('Error', 'Please enter a tag name');
      return;
    }

    try {
      await createTagMutation.mutateAsync(tagName.trim());
      
      // Reset form
      setTagName('');
      onClose();
      
      Alert.alert('Success', 'Tag created successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to create tag');
      console.error('Error creating tag:', error);
    }
  };

  const handleClose = () => {
    setTagName('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colorScheme === 'dark' ? '#fff' : '#000'} />
          </TouchableOpacity>
          <ThemedText type="title" style={styles.title}>Add Tag</ThemedText>
          <TouchableOpacity 
            onPress={handleSubmit} 
            style={[
              styles.saveButton,
              { backgroundColor: createTagMutation.isPending ? '#ccc' : '#007AFF' }
            ]}
            disabled={createTagMutation.isPending}
          >
            <ThemedText style={styles.saveButtonText}>
              {createTagMutation.isPending ? 'Creating...' : 'Create'}
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Tag Info */}
        <View style={styles.tagInfo}>
          <Ionicons 
            name="pricetag-outline" 
            size={16} 
            color={colorScheme === 'dark' ? '#fff' : '#000'} 
          />
          <ThemedText style={styles.tagInfoText}>Create a new tag</ThemedText>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Tag Name *</ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colorScheme === 'dark' ? '#333' : '#fff',
                  color: colorScheme === 'dark' ? '#fff' : '#000',
                  borderColor: colorScheme === 'dark' ? '#555' : '#ddd',
                }
              ]}
              value={tagName}
              onChangeText={setTagName}
              placeholder="Enter tag name"
              placeholderTextColor={colorScheme === 'dark' ? '#888' : '#999'}
              autoFocus
            />
          </View>

          <View style={styles.helpText}>
            <Ionicons 
              name="information-circle-outline" 
              size={16} 
              color={colorScheme === 'dark' ? '#888' : '#666'} 
            />
            <ThemedText style={styles.helpTextContent}>
              Tags help you organize and categorize your tasks. You can add multiple tags to a task.
            </ThemedText>
          </View>
        </View>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  tagInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,122,255,0.1)',
    gap: 8,
  },
  tagInfoText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
  form: {
    flex: 1,
    padding: 20,
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  helpText: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  },
  helpTextContent: {
    fontSize: 14,
    opacity: 0.7,
    flex: 1,
    lineHeight: 20,
  },
});


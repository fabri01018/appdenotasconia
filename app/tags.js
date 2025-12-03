import AddTagModal from '@/components/add-tag-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useDeleteTag, useTags } from '@/hooks/use-tags';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

export default function TagsScreen() {
  const colorScheme = useColorScheme();
  const { data: tags, isLoading } = useTags();
  const deleteTagMutation = useDeleteTag();
  const [showAddTagModal, setShowAddTagModal] = useState(false);
  const [selectedTag, setSelectedTag] = useState(null);
  const [showTagOptions, setShowTagOptions] = useState(false);

  const openTagOptions = (tag) => {
    setSelectedTag(tag);
    setShowTagOptions(true);
  };

  const closeTagOptions = () => {
    setShowTagOptions(false);
    setSelectedTag(null);
  };

  const handleDeleteTag = () => {
    if (!selectedTag) return;

    Alert.alert(
      'Delete Tag',
      `Are you sure you want to delete "${selectedTag.name}"? This will remove the tag from all tasks.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTagMutation.mutateAsync(selectedTag.id);
              closeTagOptions(); // Close modal on success
            } catch (error) {
              Alert.alert('Error', 'Failed to delete tag');
              console.error('Error deleting tag:', error);
            }
          },
        },
      ]
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.content}>
        <ThemedText style={styles.header}>Tags</ThemedText>
        
        {isLoading ? (
          <ThemedView style={styles.infoContainer}>
            <ThemedText style={styles.infoText}>Loading tags...</ThemedText>
          </ThemedView>
        ) : tags && tags.length > 0 ? (
          <View style={styles.tagsList}>
            {tags.map((tag) => (
              <View key={tag.id} style={styles.tagItem}>
                <View style={styles.tagLeftContent}>
                  <Ionicons 
                    name="pricetag" 
                    size={20} 
                    color="#007AFF" 
                  />
                  <ThemedText style={styles.tagName}>{tag.name}</ThemedText>
                </View>
                <TouchableOpacity
                  onPress={() => openTagOptions(tag)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons 
                    name="ellipsis-horizontal" 
                    size={20} 
                    color={colorScheme === 'dark' ? '#999' : '#666'} 
                  />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <ThemedView style={styles.infoContainer}>
            <Ionicons 
              name="pricetag-outline" 
              size={48} 
              color={colorScheme === 'dark' ? '#999' : '#666'} 
            />
            <ThemedText style={styles.infoText}>
              No tags yet. Create your first tag!
            </ThemedText>
          </ThemedView>
        )}
      </ScrollView>

      {/* Floating Add Button */}
      <TouchableOpacity
        style={[
          styles.floatingButton,
          { backgroundColor: colorScheme === 'dark' ? '#333' : '#007AFF' }
        ]}
        onPress={() => setShowAddTagModal(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Add Tag Modal */}
      <AddTagModal
        visible={showAddTagModal}
        onClose={() => setShowAddTagModal(false)}
      />

      <Modal
        visible={showTagOptions}
        transparent
        animationType="fade"
        onRequestClose={closeTagOptions}
      >
        <Pressable style={styles.modalOverlay} onPress={closeTagOptions}>
          <View
            style={[
              styles.menuModalContent,
              {
                backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#fff',
              }
            ]}
            onStartShouldSetResponder={() => true}
          >
            <ThemedText style={styles.menuTitle}>
              {selectedTag?.name ?? 'Tag options'}
            </ThemedText>

            <TouchableOpacity
              style={[
                styles.menuItem,
                deleteTagMutation.isPending && styles.menuItemDisabled
              ]}
              onPress={handleDeleteTag}
              activeOpacity={0.7}
              disabled={deleteTagMutation.isPending}
            >
              <Ionicons
                name="trash-outline"
                size={20}
                color={deleteTagMutation.isPending ? '#999' : '#ff3b30'}
                style={styles.menuIcon}
              />
              <ThemedText style={[
                styles.menuItemText,
                { color: deleteTagMutation.isPending ? '#999' : '#ff3b30' }
              ]}>
                {deleteTagMutation.isPending ? 'Deleting...' : 'Delete tag'}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  header: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 40,
  },
  infoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 20,
  },
  infoText: {
    fontSize: 16,
    opacity: 0.6,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  tagsList: {
    gap: 12,
  },
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0,122,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,122,255,0.2)',
  },
  tagLeftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  tagName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  menuModalContent: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  menuIcon: {
    marginRight: 12,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  menuItemDisabled: {
    opacity: 0.5,
  },
});


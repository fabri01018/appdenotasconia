import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, FlatList, Modal, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { styles } from '../task-detail-styles';

export default function TagSelectionModal({
  visible,
  onClose,
  taskTags,
  allTags,
  tagsLoading,
  isAdding,
  onSelectTag,
}) {
  const colorScheme = useColorScheme();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[
          styles.modalOverlay,
          { backgroundColor: colorScheme === 'dark' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)' }
        ]}>
          <TouchableWithoutFeedback>
            <ThemedView style={[
              styles.modalContainer,
              {
                backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
              }
            ]}>
              <ThemedText style={styles.modalTitle}>Add Tags</ThemedText>
              
              {tagsLoading ? (
                <View style={styles.modalLoadingContainer}>
                  <ActivityIndicator size="small" />
                  <ThemedText style={styles.modalLoadingText}>Loading tags...</ThemedText>
                </View>
              ) : allTags.length === 0 ? (
                <View style={styles.modalEmptyContainer}>
                  <ThemedText style={styles.modalEmptyText}>No tags available</ThemedText>
                </View>
              ) : (
                <FlatList
                  data={allTags}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => {
                    const currentTaskTagIds = taskTags.map(t => t.id);
                    const isAlreadyAttached = currentTaskTagIds.includes(item.id);
                    return (
                      <TouchableOpacity
                        style={[
                          styles.tagOption,
                          {
                            backgroundColor: isAlreadyAttached
                              ? (colorScheme === 'dark' ? 'rgba(0, 122, 255, 0.3)' : 'rgba(0, 122, 255, 0.1)')
                              : 'transparent',
                          }
                        ]}
                        onPress={() => !isAlreadyAttached && onSelectTag(item.id)}
                        disabled={isAdding || isAlreadyAttached}
                      >
                        <View style={styles.tagOptionContent}>
                          <Ionicons 
                            name="pricetag" 
                            size={18} 
                            color={isAlreadyAttached ? '#888' : '#007AFF'} 
                          />
                          <ThemedText style={styles.tagOptionText}>{item.name}</ThemedText>
                          {isAlreadyAttached && (
                            <Ionicons 
                              name="checkmark" 
                              size={20} 
                              color="#007AFF" 
                            />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  }}
                  style={styles.modalList}
                />
              )}

              {isAdding && (
                <View style={styles.modalUpdatingContainer}>
                  <ActivityIndicator size="small" />
                  <ThemedText style={styles.modalUpdatingText}>Adding...</ThemedText>
                </View>
              )}
            </ThemedView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}


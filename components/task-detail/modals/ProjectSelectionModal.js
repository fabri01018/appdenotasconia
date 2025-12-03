import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, FlatList, Modal, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { styles } from '../task-detail-styles';

export default function ProjectSelectionModal({
  visible,
  onClose,
  task,
  projects,
  projectsLoading,
  isUpdating,
  onSelectProject,
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
              <ThemedText style={styles.modalTitle}>Select Project</ThemedText>
              
              {projectsLoading ? (
                <View style={styles.modalLoadingContainer}>
                  <ActivityIndicator size="small" />
                  <ThemedText style={styles.modalLoadingText}>Loading projects...</ThemedText>
                </View>
              ) : projects.length === 0 ? (
                <View style={styles.modalEmptyContainer}>
                  <ThemedText style={styles.modalEmptyText}>No projects available</ThemedText>
                </View>
              ) : (
                <FlatList
                  data={projects}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.projectOption,
                        {
                          backgroundColor: item.id === task?.project_id
                            ? (colorScheme === 'dark' ? 'rgba(0, 122, 255, 0.3)' : 'rgba(0, 122, 255, 0.1)')
                            : 'transparent',
                        }
                      ]}
                      onPress={() => onSelectProject(item.id)}
                      disabled={isUpdating}
                    >
                      <View style={styles.projectOptionContent}>
                        <ThemedText style={styles.projectOptionText}>{item.name}</ThemedText>
                        {item.id === task?.project_id && (
                          <Ionicons 
                            name="checkmark" 
                            size={20} 
                            color="#007AFF" 
                          />
                        )}
                      </View>
                    </TouchableOpacity>
                  )}
                  style={styles.modalList}
                />
              )}

              {isUpdating && (
                <View style={styles.modalUpdatingContainer}>
                  <ActivityIndicator size="small" />
                  <ThemedText style={styles.modalUpdatingText}>Updating...</ThemedText>
                </View>
              )}
            </ThemedView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}


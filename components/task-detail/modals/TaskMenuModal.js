import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { Modal, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { styles } from '../task-detail-styles';

export default function TaskMenuModal({ 
  visible, 
  onClose, 
  onChangeSection, 
  onAddTags, 
  onAIFeature,
  onMarkAsTemplate,
  onRemoveTemplate,
  isTemplate,
  onCreateFloatingNote,
  onDeleteFloatingNote,
  isFloatingNoteActive,
  onAddSubtask,
  onConvertToNormalTask,
  onConvertToSubtask,
  isSubtask,
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
        <View style={styles.menuModalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.menuModalWrapper}>
              <ThemedView style={[
                styles.menuModalContainer,
                {
                  backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
                }
              ]}>
                {onAddSubtask && (
                  <TouchableOpacity
                    style={[
                      styles.menuOption,
                      {
                        borderBottomWidth: 1,
                        borderBottomColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                      }
                    ]}
                    onPress={onAddSubtask}
                  >
                    <ThemedText style={styles.menuOptionText}>Add Subtask</ThemedText>
                    <Ionicons 
                      name="add-circle-outline" 
                      size={20} 
                      color={colorScheme === 'dark' ? '#888' : '#666'} 
                    />
                  </TouchableOpacity>
                )}
                {onConvertToNormalTask && isSubtask && (
                  <TouchableOpacity
                    style={[
                      styles.menuOption,
                      {
                        borderBottomWidth: 1,
                        borderBottomColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                      }
                    ]}
                    onPress={onConvertToNormalTask}
                  >
                    <ThemedText style={styles.menuOptionText}>Convert to Task</ThemedText>
                    <Ionicons 
                      name="list-outline" 
                      size={20} 
                      color={colorScheme === 'dark' ? '#888' : '#666'} 
                    />
                  </TouchableOpacity>
                )}
                {onConvertToSubtask && !isSubtask && (
                  <TouchableOpacity
                    style={[
                      styles.menuOption,
                      {
                        borderBottomWidth: 1,
                        borderBottomColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                      }
                    ]}
                    onPress={onConvertToSubtask}
                  >
                    <ThemedText style={styles.menuOptionText}>Convert to Subtask</ThemedText>
                    <Ionicons 
                      name="git-merge-outline" 
                      size={20} 
                      color={colorScheme === 'dark' ? '#888' : '#666'} 
                    />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[
                    styles.menuOption,
                    {
                      borderBottomWidth: 1,
                      borderBottomColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                    }
                  ]}
                  onPress={onChangeSection}
                >
                  <ThemedText style={styles.menuOptionText}>Change Section</ThemedText>
                  <Ionicons 
                    name="chevron-forward" 
                    size={20} 
                    color={colorScheme === 'dark' ? '#888' : '#666'} 
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.menuOption,
                    {
                      borderBottomWidth: 1,
                      borderBottomColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                    }
                  ]}
                  onPress={onAddTags}
                >
                  <ThemedText style={styles.menuOptionText}>Add Tags</ThemedText>
                  <Ionicons 
                    name="chevron-forward" 
                    size={20} 
                    color={colorScheme === 'dark' ? '#888' : '#666'} 
                  />
                </TouchableOpacity>
                {onCreateFloatingNote && (
                  <TouchableOpacity
                    style={[
                      styles.menuOption,
                      {
                        borderBottomWidth: 1,
                        borderBottomColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                      }
                    ]}
                    onPress={onCreateFloatingNote}
                  >
                    <ThemedText style={styles.menuOptionText}>
                      {isFloatingNoteActive ? 'Hide Floating Note' : 'Create Floating Note'}
                    </ThemedText>
                    <Ionicons 
                      name={isFloatingNoteActive ? "eye-off-outline" : "document-text-outline"} 
                      size={20} 
                      color={colorScheme === 'dark' ? '#888' : '#666'} 
                    />
                  </TouchableOpacity>
                )}
                {onDeleteFloatingNote && isFloatingNoteActive && (
                  <TouchableOpacity
                    style={[
                      styles.menuOption,
                      {
                        borderBottomWidth: 1,
                        borderBottomColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                      }
                    ]}
                    onPress={onDeleteFloatingNote}
                  >
                    <ThemedText style={[styles.menuOptionText, { color: colorScheme === 'dark' ? '#ff3b30' : '#ff3b30' }]}>
                      Delete Floating Note
                    </ThemedText>
                    <Ionicons 
                      name="trash-outline" 
                      size={20} 
                      color="#ff3b30" 
                    />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[
                    styles.menuOption,
                    {
                      borderBottomWidth: 1,
                      borderBottomColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                    }
                  ]}
                  onPress={onAIFeature}
                >
                  <ThemedText style={styles.menuOptionText}>AI Feature</ThemedText>
                  <Ionicons 
                    name="chevron-forward" 
                    size={20} 
                    color={colorScheme === 'dark' ? '#888' : '#666'} 
                  />
                </TouchableOpacity>
                {isTemplate ? (
                  <TouchableOpacity
                    style={styles.menuOption}
                    onPress={onRemoveTemplate}
                  >
                    <ThemedText style={styles.menuOptionText}>Remove Template</ThemedText>
                    <Ionicons 
                      name="chevron-forward" 
                      size={20} 
                      color={colorScheme === 'dark' ? '#888' : '#666'} 
                    />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.menuOption}
                    onPress={onMarkAsTemplate}
                  >
                    <ThemedText style={styles.menuOptionText}>Mark as Template</ThemedText>
                    <Ionicons 
                      name="chevron-forward" 
                      size={20} 
                      color={colorScheme === 'dark' ? '#888' : '#666'} 
                    />
                  </TouchableOpacity>
                )}
              </ThemedView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}


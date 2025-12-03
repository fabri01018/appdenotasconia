import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ActivityIndicator, Modal, View } from 'react-native';
import { styles } from '../task-detail-styles';

export default function AIProcessingModal({ visible }) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
    >
      <View style={[styles.modalOverlay, { justifyContent: 'center', alignItems: 'center' }]}>
        <ThemedView style={[styles.modalContainer, { alignItems: 'center', gap: 16 }]}>
          <ActivityIndicator size="large" />
          <ThemedText style={styles.modalTitle}>Processing with AI...</ThemedText>
          <ThemedText style={styles.modalLoadingText}>Please wait</ThemedText>
        </ThemedView>
      </View>
    </Modal>
  );
}


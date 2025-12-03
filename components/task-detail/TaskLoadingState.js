import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ActivityIndicator } from 'react-native';
import { styles } from './task-detail-styles';

export default function TaskLoadingState({ loading, task }) {
  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <ThemedText>Loading task...</ThemedText>
      </ThemedView>
    );
  }

  if (!task) {
    return (
      <ThemedView style={styles.errorContainer}>
        <ThemedText style={styles.errorText}>Task not found</ThemedText>
      </ThemedView>
    );
  }

  return null;
}


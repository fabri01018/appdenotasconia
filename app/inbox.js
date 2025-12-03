import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet } from 'react-native';

import ProjectDetailView from '@/components/ProjectDetailView';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useDatabase } from '@/hooks/use-database';
import { getInboxProject } from '@/repositories/projects';

export default function InboxScreen() {
  const { isInitialized, isInitializing, error: dbError } = useDatabase();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProjectData = async () => {
      try {
        setLoading(true);
        
        // Only load project data when database is initialized
        if (isInitialized) {
          const projectData = await getInboxProject();
          if (!projectData) {
            console.error('Inbox project not found in database');
            Alert.alert('Error', 'Inbox project not found. Please restart the app to recreate it.');
            return;
          }
          setProject(projectData);
        }
        
      } catch (err) {
        console.error('Failed to load inbox:', err);
        Alert.alert('Error', 'Failed to load inbox');
      } finally {
        setLoading(false);
      }
    };

    loadProjectData();
  }, [isInitialized]);

  if (isInitializing) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <ThemedText>Initializing database...</ThemedText>
      </ThemedView>
    );
  }

  if (dbError) {
    return (
      <ThemedView style={styles.errorContainer}>
        <ThemedText style={styles.errorText}>Database Error: {dbError}</ThemedText>
      </ThemedView>
    );
  }

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <ThemedText>Loading inbox...</ThemedText>
      </ThemedView>
    );
  }

  if (!project) {
    return (
      <ThemedView style={styles.errorContainer}>
        <ThemedText style={styles.errorText}>Inbox not found</ThemedText>
      </ThemedView>
    );
  }

  return <ProjectDetailView projectId={project.id} />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    fontSize: 18,
  },
});

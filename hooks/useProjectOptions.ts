import { useDeleteProject } from '@/hooks/use-projects';
import { useState } from 'react';
import { Alert } from 'react-native';

type Project = {
  id: number;
  name: string;
  created_at?: string;
  deleted_at?: string | null;
};

type ProjectOption = 'Edit' | 'Archive' | 'Delete';

export function useProjectOptions() {
  const deleteProjectMutation = useDeleteProject();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const handleProjectOptions = (project: Project) => {
    setSelectedProject(project);
    setShowOptions(true);
  };

  const handleOptionSelect = (option: ProjectOption) => {
    if (option === 'Delete') {
      if (!selectedProject) return;
      
      Alert.alert(
        'Delete Project',
        `Are you sure you want to delete "${selectedProject.name}"? This will also delete all tasks in this project.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteProjectMutation.mutateAsync(selectedProject.id);
                Alert.alert('Success', 'Project deleted successfully!');
                closeOptions();
              } catch (error) {
                Alert.alert('Error', 'Failed to delete project');
                console.error('Error deleting project:', error);
              }
            },
          },
        ]
      );
    } else if (option === 'Edit') {
      // Close the options popup but keep the selected project for editing
      setShowOptions(false);
      setShowEditModal(true);
    } else {
      // Archive or other options
      if (selectedProject) {
        console.log(`Selected option "${option}" for project:`, selectedProject.name);
      }
      // TODO: Implement the actual functionality for Archive option
      closeOptions();
    }
  };

  const closeOptions = () => {
    setShowOptions(false);
    setSelectedProject(null);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedProject(null);
  };

  return {
    selectedProject,
    showOptions,
    showEditModal,
    handleProjectOptions,
    handleOptionSelect,
    closeOptions,
    closeEditModal,
  };
}

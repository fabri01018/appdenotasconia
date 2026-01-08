import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createProject, deleteProject, getAllProjects, getProjectById, updateProject } from '../repositories/projects.js';
import { useDatabase } from './use-database';

export function useProjects() {
  const { isInitialized } = useDatabase();
  
  return useQuery({
    queryKey: ['projects'],
    queryFn: getAllProjects,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: isInitialized, // Only run when database is initialized
  });
}

/**
 * Get a single project by id.
 *
 * Uses cached `['projects']` list as initial data to avoid extra loading
 * when navigating between projects.
 */
export function useProject(projectId?: number | null) {
  const { isInitialized } = useDatabase();
  const queryClient = useQueryClient();

  const enabled = isInitialized && typeof projectId === 'number' && !Number.isNaN(projectId);

  return useQuery({
    queryKey: ['projects', projectId],
    queryFn: () => getProjectById(projectId as number),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled,
    initialData: () => {
      if (!enabled) return undefined;
      const projects = queryClient.getQueryData<any[]>(['projects']);
      return Array.isArray(projects) ? projects.find((p) => p?.id === projectId) : undefined;
    },
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      // Invalidate and refetch projects after creating a new one
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      // Invalidate and refetch projects after deleting one
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, name, defaultSectionId }) => updateProject(id, name, defaultSectionId),
    onSuccess: () => {
      // Invalidate and refetch projects after updating one
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

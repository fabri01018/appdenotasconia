import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createSection, deleteSection, getAllSections, getSectionsByProjectId, updateSection } from '../repositories/sections.js';
import { useDatabase } from './use-database';

export function useSections() {
  const { isInitialized } = useDatabase();
  
  return useQuery({
    queryKey: ['sections'],
    queryFn: getAllSections,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: isInitialized, // Only run when database is initialized
  });
}

export function useSectionsByProject(projectId) {
  const { isInitialized } = useDatabase();
  
  return useQuery({
    queryKey: ['sections', projectId],
    queryFn: () => getSectionsByProjectId(projectId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: isInitialized && !!projectId, // Only run when database is initialized and projectId exists
  });
}

export function useCreateSection() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ projectId, name }) => createSection(projectId, name),
    onSuccess: (newSection) => {
      // Invalidate and refetch sections after creating a new one
      queryClient.invalidateQueries({ queryKey: ['sections'] });
      queryClient.invalidateQueries({ queryKey: ['sections', newSection.project_id] });
    },
  });
}

export function useDeleteSection() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (sectionId) => deleteSection(sectionId),
    onSuccess: () => {
      // Invalidate and refetch sections after deleting one
      queryClient.invalidateQueries({ queryKey: ['sections'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useUpdateSection() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, name }) => updateSection(id, name),
    onSuccess: () => {
      // Invalidate and refetch sections after updating one
      queryClient.invalidateQueries({ queryKey: ['sections'] });
    },
  });
}


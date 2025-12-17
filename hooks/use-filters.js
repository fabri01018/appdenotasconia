import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    addProjectToFilter,
    addTagToFilter,
    createFilter,
    deleteFilter,
    getAllFilters,
    getFilterProjects,
    getFilterTags,
    getFilterWithDetails,
    getTasksByFilter,
    removeProjectFromFilter,
    removeTagFromFilter,
    updateFilter
} from '../repositories/filters.js';
import { useDatabase } from './use-database';

/**
 * Get all filters
 */
export function useFilters() {
  const { isInitialized } = useDatabase();
  
  return useQuery({
    queryKey: ['filters'],
    queryFn: getAllFilters,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: isInitialized,
  });
}

/**
 * Get a specific filter with full details (tags, projects)
 */
export function useFilter(filterId) {
  const { isInitialized } = useDatabase();
  
  return useQuery({
    queryKey: ['filters', filterId],
    queryFn: () => getFilterWithDetails(filterId),
    staleTime: 5 * 60 * 1000,
    enabled: isInitialized && !!filterId,
  });
}

/**
 * Get tasks for a specific filter
 */
export function useFilterTasks(filterId) {
  const { isInitialized } = useDatabase();
  
  return useQuery({
    queryKey: ['filter-tasks', filterId],
    queryFn: () => getTasksByFilter(filterId),
    staleTime: 1 * 60 * 1000, // 1 minute (shorter for task lists)
    enabled: isInitialized && !!filterId,
  });
}

/**
 * Create a new filter
 */
export function useCreateFilter() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ name, icon, color, tagIds, projectIds }) => {
      return createFilter(name, icon, color).then(async (filter) => {
        // Add tag associations
        if (tagIds && tagIds.length > 0) {
          for (const tagId of tagIds) {
            await addTagToFilter(filter.id, tagId);
          }
        }
        
        // Add project associations
        if (projectIds && projectIds.length > 0) {
          for (const projectId of projectIds) {
            await addProjectToFilter(filter.id, projectId);
          }
        }
        
        return filter;
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['filters'] });
    },
  });
}

/**
 * Delete a filter
 */
export function useDeleteFilter() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteFilter,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['filters'] });
      queryClient.invalidateQueries({ queryKey: ['filter-tasks'] });
    },
  });
}

/**
 * Update a filter
 */
export function useUpdateFilter() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ filterId, name, icon, color, tagIds, projectIds }) => {
      // 1. Update filter basic info
      await updateFilter(filterId, { name, icon, color });
      
      // 2. Get current associations
      const currentTags = await getFilterTags(filterId);
      const currentProjects = await getFilterProjects(filterId);
      
      // 3. Remove all existing tag associations
      for (const tag of currentTags) {
        await removeTagFromFilter(filterId, tag.id);
      }
      
      // 4. Add new tag associations
      if (tagIds && tagIds.length > 0) {
        for (const tagId of tagIds) {
          await addTagToFilter(filterId, tagId);
        }
      }
      
      // 5. Remove all existing project associations
      for (const project of currentProjects) {
        await removeProjectFromFilter(filterId, project.id);
      }
      
      // 6. Add new project associations
      if (projectIds && projectIds.length > 0) {
        for (const projectId of projectIds) {
          await addProjectToFilter(filterId, projectId);
        }
      }
      
      return { filterId, name, icon, color };
    },
    onSuccess: (data) => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['filters'] });
      queryClient.invalidateQueries({ queryKey: ['filters', data.filterId] });
      queryClient.invalidateQueries({ queryKey: ['filter-tasks', data.filterId] });
    },
  });
}


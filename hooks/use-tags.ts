import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createTag, deleteTag, getAllTags } from '../repositories/tags.js';
import { useDatabase } from './use-database';

export function useTags() {
  const { isInitialized } = useDatabase();
  
  return useQuery({
    queryKey: ['tags'],
    queryFn: getAllTags,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: isInitialized, // Only run when database is initialized
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createTag,
    onSuccess: () => {
      // Invalidate and refetch tags after creating a new one
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteTag,
    onSuccess: () => {
      // Invalidate and refetch tags after deleting one
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
}


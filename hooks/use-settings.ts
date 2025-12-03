import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSetting, saveSetting } from '../repositories/settings';
import { useDatabase } from './use-database';

export function useSetting(key: string) {
  const { isInitialized } = useDatabase();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['settings', key],
    queryFn: () => getSetting(key),
    enabled: isInitialized,
  });

  const mutation = useMutation({
    mutationFn: (value: string | null) => saveSetting({ key, value }),
    onSuccess: (newValue) => {
      queryClient.setQueryData(['settings', key], newValue);
      queryClient.invalidateQueries({ queryKey: ['settings', key] });
    },
  });

  return {
    value: query.data,
    setValue: mutation.mutate,
    isLoading: query.isLoading,
    isSetting: mutation.isPending
  };
}


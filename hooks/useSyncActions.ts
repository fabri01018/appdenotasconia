import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert } from 'react-native';
import { pushAllLocalChanges } from '../lib/sync/@sync_fabrizio';
import { pullAllFromSupabase } from '../lib/sync/syncpull/syncpull';

export function useSyncActions() {
  const queryClient = useQueryClient();
  const [isPulling, setIsPulling] = useState(false);
  const [isPushing, setIsPushing] = useState(false);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['projects'] });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    queryClient.invalidateQueries({ queryKey: ['tags'] });
    queryClient.invalidateQueries({ queryKey: ['sections'] });
  };

  const handlePull = async () => {
    if (isPulling) return;
    setIsPulling(true);
    try {
      const result = await pullAllFromSupabase();
      if (result.success) {
        invalidateAll();
        Alert.alert('Pull Successful', `Pulled ${result.totalSynced} records`);
      } else {
        Alert.alert('Pull Failed', result.error || 'Unknown error');
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error occurred';
      Alert.alert('Pull Error', errorMessage);
    } finally {
      setIsPulling(false);
    }
  };

  const handlePush = async () => {
    if (isPushing) return;
    setIsPushing(true);
    try {
      const result = await pushAllLocalChanges();
      if (result.success) {
        invalidateAll();
        Alert.alert('Push Successful', `Pushed ${result.synced} records`);
      } else {
        Alert.alert('Push Failed', result.error || 'Unknown error');
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error occurred';
      Alert.alert('Push Error', errorMessage);
    } finally {
      setIsPushing(false);
    }
  };

  return { isPulling, isPushing, handlePull, handlePush };
}

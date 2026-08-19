import AIView from '@/components/AIView';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';

export default function AIScreen() {
  const { taskId } = useLocalSearchParams();
  return <AIView taskId={taskId} />;
}

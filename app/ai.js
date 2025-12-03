import AIView from '@/components/AIView';
import { SYSTEM_PROMPTS } from '@/constants/ai-prompts';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';

export default function AIScreen() {
  const { taskId } = useLocalSearchParams();
  return <AIView taskId={taskId} initialSystemPrompt={SYSTEM_PROMPTS.DEFAULT} />;
}

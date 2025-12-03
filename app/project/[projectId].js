import ProjectDetailView from '@/components/ProjectDetailView';
import { useLocalSearchParams } from 'expo-router';

export default function ProjectDetailScreen() {
  const { projectId } = useLocalSearchParams();
  return <ProjectDetailView projectId={projectId} />;
}

import FilterDetailView from '@/components/FilterDetailView';
import { useLocalSearchParams } from 'expo-router';

export default function FilterDetailScreen() {
  const { filterId } = useLocalSearchParams();
  return <FilterDetailView filterId={filterId} />;
}


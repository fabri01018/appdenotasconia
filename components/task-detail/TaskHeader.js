import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from './task-detail-styles';

export default function TaskHeader({ task, onChangeProject, onOpenMenu, onTogglePin, isPinned }) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const paddingTop = Math.max(insets.top, 10) + 6;

  return (
    <View
      style={[
        styles.header,
        {
          paddingTop,
          paddingBottom: 10,
        },
      ]}
    >
      <TouchableOpacity 
        onPress={() => router.back()} 
        style={styles.backButton}
      >
        <Ionicons 
          name="arrow-back" 
          size={22} 
          color={colorScheme === 'dark' ? '#fff' : '#000'} 
        />
      </TouchableOpacity>
      <View style={styles.headerCenter}>
        <ThemedText type="title" style={styles.projectName}>
          {task.project_name}
        </ThemedText>
        <TouchableOpacity 
          onPress={onChangeProject}
          style={styles.chevronButton}
          activeOpacity={0.7}
        >
          <Ionicons 
            name="chevron-down" 
            size={14} 
            color={colorScheme === 'dark' ? '#888' : '#666'} 
          />
        </TouchableOpacity>
      </View>
      {onTogglePin && (
        <TouchableOpacity 
          onPress={onTogglePin} 
          style={styles.pinButton}
        >
          <Ionicons 
            name={isPinned ? "pin" : "pin-outline"} 
            size={22} 
            color={colorScheme === 'dark' ? '#fff' : '#000'} 
          />
        </TouchableOpacity>
      )}
      <TouchableOpacity 
        onPress={onOpenMenu} 
        style={styles.moreButton}
      >
        <Ionicons 
          name="ellipsis-vertical" 
          size={22} 
          color={colorScheme === 'dark' ? '#fff' : '#000'} 
        />
      </TouchableOpacity>
    </View>
  );
}


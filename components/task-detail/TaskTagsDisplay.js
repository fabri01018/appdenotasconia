import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, View } from 'react-native';
import { styles } from './task-detail-styles';

export default function TaskTagsDisplay({ tags, onRemoveTag }) {
  const colorScheme = useColorScheme();

  if (!tags || tags.length === 0) {
    return null;
  }

  return (
    <View style={styles.tagsSection}>
      <View style={styles.tagsContainer}>
        {tags.map((tag) => (
          <View key={tag.id} style={[
            styles.tagItem,
            {
              backgroundColor: colorScheme === 'dark' ? 'rgba(0,122,255,0.2)' : 'rgba(0,122,255,0.1)',
              borderColor: colorScheme === 'dark' ? 'rgba(0,122,255,0.3)' : 'rgba(0,122,255,0.3)',
            }
          ]}>
            <Ionicons 
              name="pricetag" 
              size={14} 
              color="#007AFF" 
            />
            <ThemedText style={styles.tagText}>{tag.name}</ThemedText>
            {onRemoveTag && (
              <TouchableOpacity
                style={styles.tagDeleteButton}
                onPress={() => onRemoveTag(tag.id)}
                activeOpacity={0.7}
                accessibilityLabel={`Remove ${tag.name} tag`}
              >
                <Ionicons
                  name="close-circle"
                  size={14}
                  color="#007AFF"
                />
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}


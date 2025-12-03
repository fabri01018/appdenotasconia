import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import { ScrollView, View } from 'react-native';
import BlockItemReadOnly from './BlockItemReadOnly';
import { styles } from './floating-note-bubble-styles';

/**
 * Component for rendering the content inside the floating note bubble
 */
export default function FloatingNoteBubbleContent({ taskData, onToggleBlock, onCheckToggle }) {
  const colorScheme = useColorScheme();
  const blocks = taskData?.blocks || [];

  if (!taskData) {
    return (
      <View style={styles.contentContainer}>
        <ThemedText style={styles.emptyText}>No task data</ThemedText>
      </View>
    );
  }

  if (blocks.length === 0) {
    return (
      <View style={styles.contentContainer}>
        <ThemedText style={styles.emptyText}>Empty note</ThemedText>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.contentScrollView}
      contentContainerStyle={styles.contentScrollViewContent}
      showsVerticalScrollIndicator={true}
      nestedScrollEnabled={true}
    >
      <View style={styles.blocksContainer}>
        {blocks.map((block, index) => (
          <BlockItemReadOnly
            key={index}
            block={block}
            path={index}
            depth={0}
            onToggle={onToggleBlock}
            onCheckToggle={onCheckToggle}
          />
        ))}
      </View>
    </ScrollView>
  );
}


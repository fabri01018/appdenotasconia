import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { FlatList, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

function matches(snippet, q) {
  if (!q) return true;
  const query = q.toLowerCase();
  return (
    snippet.slash?.toLowerCase().includes(query) ||
    snippet.title?.toLowerCase().includes(query)
  );
}

export default function SnippetPickerModal({ visible, query, snippets, onClose, onSelect }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filtered = useMemo(() => {
    const list = (snippets || []).filter((s) => matches(s, query));
    return list;
  }, [snippets, query]);

  const handleSelect = (snippet) => {
    if (!snippet) return;
    onSelect(snippet);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={isDark ? '#fff' : '#000'} />
          </TouchableOpacity>
          <ThemedText type="title" style={styles.title}>Insert Snippet</ThemedText>
          <View style={styles.closeButton} />
        </View>

        <ThemedView style={styles.meta}>
          <ThemedText style={{ opacity: 0.7 }}>
            Type <ThemedText style={{ fontWeight: '700' }}>/</ThemedText> to search. Current: <ThemedText style={{ fontWeight: '700' }}>{`/${query || ''}`}</ThemedText>
          </ThemedText>
        </ThemedView>

        {filtered.length === 0 ? (
          <ThemedView style={styles.empty}>
            <Ionicons name="flash-outline" size={42} color={isDark ? '#888' : '#666'} />
            <ThemedText style={styles.emptyTitle}>No snippets found</ThemedText>
            <ThemedText style={styles.emptySub}>
              Create snippets in Settings → Snippets.
            </ThemedText>
          </ThemedView>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item, index }) => {
              const isSelected = index === selectedIndex;
              return (
                <TouchableOpacity
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.7}
                  style={[
                    styles.item,
                    {
                      backgroundColor: isSelected
                        ? (isDark ? 'rgba(0,122,255,0.25)' : 'rgba(0,122,255,0.12)')
                        : (isDark ? '#333' : '#f3f3f3'),
                      borderColor: isSelected ? '#007AFF' : (isDark ? '#444' : '#e5e5e5'),
                    },
                  ]}
                >
                  <View style={{ flex: 1, gap: 4 }}>
                    <ThemedText style={styles.itemTitle}>
                      {`/${item.slash}`} <ThemedText style={{ opacity: 0.7, fontWeight: '400' }}>— {item.title}</ThemedText>
                    </ThemedText>
                    {!!item.content && (
                      <ThemedText style={styles.preview} numberOfLines={2}>
                        {item.content.split('\n').slice(0, 2).join(' · ')}
                      </ThemedText>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={isDark ? '#888' : '#666'} />
                </TouchableOpacity>
              );
            }}
          />
        )}
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  closeButton: { width: 40, padding: 8 },
  title: { fontSize: 20, fontWeight: 'bold' },
  meta: { paddingHorizontal: 16, paddingVertical: 12 },
  listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    gap: 10,
  },
  itemTitle: { fontSize: 16, fontWeight: '700' },
  preview: { fontSize: 13, opacity: 0.7, lineHeight: 18 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '600', textAlign: 'center' },
  emptySub: { fontSize: 14, opacity: 0.7, textAlign: 'center', lineHeight: 20 },
});


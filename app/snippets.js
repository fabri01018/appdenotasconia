import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import SnippetEditorModal from '@/components/snippets/SnippetEditorModal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSnippets } from '@/hooks/useSnippets';

export default function SnippetsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { snippets, upsertSnippet, deleteSnippet, duplicateSnippet, isLoading } = useSnippets();

  const [showEditor, setShowEditor] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState(null);
  const [showOptions, setShowOptions] = useState(false);
  const [selectedSnippet, setSelectedSnippet] = useState(null);

  const openCreate = () => {
    setEditingSnippet(null);
    setShowEditor(true);
  };

  const openEdit = (snippet) => {
    setEditingSnippet(snippet);
    setShowEditor(true);
  };

  const openOptions = (snippet) => {
    setSelectedSnippet(snippet);
    setShowOptions(true);
  };

  const closeOptions = () => {
    setShowOptions(false);
    setSelectedSnippet(null);
  };

  const handleSave = (snippetInput) => {
    upsertSnippet(snippetInput);
  };

  const handleDelete = () => {
    if (!selectedSnippet) return;
    Alert.alert(
      'Delete Snippet',
      `Delete /${selectedSnippet.slash}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteSnippet(selectedSnippet.id);
            closeOptions();
          },
        },
      ]
    );
  };

  const handleDuplicate = () => {
    if (!selectedSnippet) return;
    duplicateSnippet(selectedSnippet.id);
    closeOptions();
  };

  const previewFor = (content) => {
    if (!content) return '';
    const lines = content.split('\n').filter((l) => l.trim() !== '').slice(0, 2);
    return lines.join(' · ');
  };

  const hasSnippets = useMemo(() => (snippets?.length || 0) > 0, [snippets]);

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.content}>
        <ThemedText style={styles.header}>Snippets</ThemedText>

        {isLoading ? (
          <ThemedView style={styles.infoContainer}>
            <ThemedText style={styles.infoText}>Loading snippets...</ThemedText>
          </ThemedView>
        ) : hasSnippets ? (
          <View style={styles.list}>
            {snippets.map((s) => (
              <View key={s.id} style={styles.item}>
                <View style={styles.itemLeft}>
                  <Ionicons name="code-slash-outline" size={20} color="#007AFF" />
                  <View style={{ flex: 1, gap: 2 }}>
                    <ThemedText style={styles.itemTitle}>{`/${s.slash}`}</ThemedText>
                    <ThemedText style={styles.itemSub} numberOfLines={1}>
                      {s.title}
                    </ThemedText>
                    {!!s.content && (
                      <ThemedText style={styles.itemPreview} numberOfLines={2}>
                        {previewFor(s.content)}
                      </ThemedText>
                    )}
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => openOptions(s)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name="ellipsis-horizontal"
                    size={20}
                    color={isDark ? '#999' : '#666'}
                  />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <ThemedView style={styles.infoContainer}>
            <Ionicons name="flash-outline" size={48} color={isDark ? '#999' : '#666'} />
            <ThemedText style={styles.infoText}>
              No snippets yet. Create your first one, then type "/" in a task description.
            </ThemedText>
          </ThemedView>
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.floatingButton, { backgroundColor: isDark ? '#333' : '#007AFF' }]}
        onPress={openCreate}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <SnippetEditorModal
        visible={showEditor}
        onClose={() => setShowEditor(false)}
        onSave={handleSave}
        initialSnippet={editingSnippet}
      />

      <Modal
        visible={showOptions}
        transparent
        animationType="fade"
        onRequestClose={closeOptions}
      >
        <Pressable style={styles.modalOverlay} onPress={closeOptions}>
          <View
            style={[
              styles.menuModalContent,
              { backgroundColor: isDark ? '#2c2c2e' : '#fff' },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <ThemedText style={styles.menuTitle}>
              {selectedSnippet ? `/${selectedSnippet.slash}` : 'Snippet'}
            </ThemedText>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                const s = selectedSnippet;
                closeOptions();
                if (s) openEdit(s);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={20} color="#007AFF" style={styles.menuIcon} />
              <ThemedText style={styles.menuItemText}>Edit</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleDuplicate}
              activeOpacity={0.7}
            >
              <Ionicons name="copy-outline" size={20} color="#007AFF" style={styles.menuIcon} />
              <ThemedText style={styles.menuItemText}>Duplicate</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleDelete}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={20} color="#ff3b30" style={styles.menuIcon} />
              <ThemedText style={[styles.menuItemText, { color: '#ff3b30' }]}>Delete</ThemedText>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingTop: 60, paddingHorizontal: 20 },
  header: { fontSize: 32, fontWeight: 'bold', marginBottom: 40 },
  infoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 20,
  },
  infoText: {
    fontSize: 16,
    opacity: 0.6,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 22,
  },
  list: { gap: 12 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0,122,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,122,255,0.2)',
    gap: 12,
  },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  itemTitle: { fontSize: 16, fontWeight: '700', color: '#007AFF' },
  itemSub: { fontSize: 14, fontWeight: '500', opacity: 0.8 },
  itemPreview: { fontSize: 13, opacity: 0.7, lineHeight: 18 },
  floatingButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  menuModalContent: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  menuTitle: { fontSize: 18, fontWeight: '600' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  menuIcon: { marginRight: 12 },
  menuItemText: { fontSize: 16, fontWeight: '500' },
});


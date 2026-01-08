import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const SLASH_RE = /^[a-z0-9][a-z0-9_-]*$/;

function normalizeSlash(s) {
  return (s || '').trim().replace(/^\//, '').toLowerCase();
}

export default function SnippetEditorModal({ visible, onClose, onSave, initialSnippet }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const isEdit = !!initialSnippet?.id;
  const [slash, setSlash] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    if (!visible) return;
    setSlash(initialSnippet?.slash || '');
    setTitle(initialSnippet?.title || '');
    setContent(initialSnippet?.content || '');
  }, [visible, initialSnippet]);

  const slashPreview = useMemo(() => `/${normalizeSlash(slash)}`, [slash]);

  const handleSave = () => {
    const normalizedSlash = normalizeSlash(slash);
    if (!normalizedSlash) {
      Alert.alert('Missing slash command', 'Please enter a slash command like "kickoff".');
      return;
    }
    if (!SLASH_RE.test(normalizedSlash)) {
      Alert.alert(
        'Invalid slash command',
        'Use only lowercase letters, numbers, "-" or "_". Example: "kickoff" or "meeting_notes".'
      );
      return;
    }
    onSave({
      id: initialSnippet?.id,
      slash: normalizedSlash,
      title: title.trim() || normalizedSlash,
      content: content || '',
    });
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
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Ionicons name="close" size={24} color={isDark ? '#fff' : '#000'} />
          </TouchableOpacity>
          <ThemedText type="title" style={styles.title}>
            {isEdit ? 'Edit Snippet' : 'New Snippet'}
          </ThemedText>
          <TouchableOpacity onPress={handleSave} style={styles.headerButton}>
            <ThemedText style={styles.saveText}>Save</ThemedText>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.form} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Slash command</ThemedText>
            <ThemedText style={styles.helper}>Type {slashPreview} in a description to insert this snippet.</ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: isDark ? '#333' : '#fff',
                  color: isDark ? '#fff' : '#000',
                  borderColor: isDark ? '#555' : '#ddd',
                },
              ]}
              value={slash}
              onChangeText={setSlash}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="kickoff"
              placeholderTextColor={isDark ? '#888' : '#999'}
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Title</ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: isDark ? '#333' : '#fff',
                  color: isDark ? '#fff' : '#000',
                  borderColor: isDark ? '#555' : '#ddd',
                },
              ]}
              value={title}
              onChangeText={setTitle}
              placeholder="Kickoff checklist"
              placeholderTextColor={isDark ? '#888' : '#999'}
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Content</ThemedText>
            <ThemedText style={styles.helper}>
              Use your block text format (new lines, &gt; toggles, - [ ] checks, # headers, indentation).
            </ThemedText>
            <TextInput
              style={[
                styles.textArea,
                {
                  backgroundColor: isDark ? '#333' : '#fff',
                  color: isDark ? '#fff' : '#000',
                  borderColor: isDark ? '#555' : '#ddd',
                },
              ]}
              value={content}
              onChangeText={setContent}
              placeholder={'> Kickoff\n  - [ ] Goals\n  - [ ] Timeline\n\n## Notes\n- '}
              placeholderTextColor={isDark ? '#888' : '#999'}
              multiline
              textAlignVertical="top"
            />
          </View>
        </ScrollView>
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
  headerButton: { width: 60, padding: 8, alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold' },
  saveText: { color: '#007AFF', fontWeight: '600' },
  form: { flex: 1, padding: 16 },
  inputGroup: { gap: 8, marginBottom: 18 },
  label: { fontSize: 16, fontWeight: '600' },
  helper: { fontSize: 13, opacity: 0.7, lineHeight: 18 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    minHeight: 180,
  },
});


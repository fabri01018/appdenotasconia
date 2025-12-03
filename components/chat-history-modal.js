import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { deleteChatSession, getChatSessions } from '@/repositories/chat';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';

export default function ChatHistoryModal({ visible, onClose, onSelectSession, currentSessionId }) {
  const colorScheme = useColorScheme();
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadSessions = async () => {
    setIsLoading(true);
    try {
      const data = await getChatSessions();
      setSessions(data);
    } catch (error) {
      console.error('Error loading chat sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadSessions();
    }
  }, [visible]);

  const handleDeleteSession = (id, e) => {
    e.stopPropagation();
    Alert.alert(
      'Delete Chat',
      'Are you sure you want to delete this chat history?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteChatSession(id);
              loadSessions();
              if (currentSessionId === id) {
                  // If we deleted the current session, we might want to notify the parent
                  // But for now, just let the user stay on the empty screen or they will pick another
              }
            } catch (error) {
              console.error('Error deleting session:', error);
            }
          }
        }
      ]
    );
  };

  const groupSessionsByDate = (sessions) => {
    const groups = {
      'Today': [],
      'Yesterday': [],
      'Previous 7 Days': [],
      'Older': []
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    sessions.forEach(session => {
      const date = new Date(session.updated_at); // Use updated_at for sorting
      if (date >= today) {
        groups['Today'].push(session);
      } else if (date >= yesterday) {
        groups['Yesterday'].push(session);
      } else if (date >= lastWeek) {
        groups['Previous 7 Days'].push(session);
      } else {
        groups['Older'].push(session);
      }
    });

    return groups;
  };

  const groupedSessions = groupSessionsByDate(sessions);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <ThemedView style={styles.modalContent}>
          <View style={styles.header}>
            <ThemedText type="subtitle">Chat History</ThemedText>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colorScheme === 'dark' ? '#ECEDEE' : '#11181C'} />
            </TouchableOpacity>
          </View>

          <View style={styles.newChatContainer}>
             <TouchableOpacity 
                style={[styles.newChatButton, { backgroundColor: '#0a7ea4' }]}
                onPress={() => {
                    onSelectSession(null); // Null means new chat
                    onClose();
                }}
             >
                <Ionicons name="add" size={20} color="#FFF" />
                <ThemedText style={styles.newChatText}>New Chat</ThemedText>
             </TouchableOpacity>
          </View>

          <ScrollView style={styles.listContainer}>
            {Object.entries(groupedSessions).map(([groupName, groupSessions]) => (
              groupSessions.length > 0 && (
                <View key={groupName} style={styles.groupContainer}>
                  <ThemedText style={styles.groupTitle}>{groupName}</ThemedText>
                  {groupSessions.map(session => (
                    <TouchableOpacity
                      key={session.id}
                      style={[
                        styles.sessionItem,
                        session.id === currentSessionId && styles.activeSessionItem,
                        { borderColor: colorScheme === 'dark' ? '#3A3A3A' : '#E0E0E0' }
                      ]}
                      onPress={() => {
                        onSelectSession(session);
                        onClose();
                      }}
                    >
                      <View style={styles.sessionInfo}>
                        <ThemedText numberOfLines={1} style={styles.sessionTitle}>
                          {session.title || 'New Chat'}
                        </ThemedText>
                        <ThemedText style={styles.sessionDate}>
                          {formatDistanceToNow(new Date(session.updated_at), { addSuffix: true })}
                        </ThemedText>
                      </View>
                      
                      <TouchableOpacity 
                        style={styles.deleteButton}
                        onPress={(e) => handleDeleteSession(session.id, e)}
                      >
                        <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </View>
              )
            ))}
            {sessions.length === 0 && !isLoading && (
                <View style={styles.emptyContainer}>
                    <ThemedText style={styles.emptyText}>No chat history yet</ThemedText>
                </View>
            )}
          </ScrollView>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingTop: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  closeButton: {
    padding: 4,
  },
  newChatContainer: {
    marginBottom: 16,
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  newChatText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  listContainer: {
    flex: 1,
  },
  groupContainer: {
    marginBottom: 20,
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    opacity: 0.6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  activeSessionItem: {
    backgroundColor: 'rgba(10, 126, 164, 0.1)',
    borderColor: '#0a7ea4',
  },
  sessionInfo: {
    flex: 1,
    marginRight: 8,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  sessionDate: {
    fontSize: 12,
    opacity: 0.6,
  },
  deleteButton: {
    padding: 8,
  },
  emptyContainer: {
      padding: 20,
      alignItems: 'center',
  },
  emptyText: {
      opacity: 0.5,
  }
});


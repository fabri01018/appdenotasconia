import { getSubTasks, getTaskById } from '@/repositories/tasks';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HierarchyNavigationModal({ visible, onClose, currentTaskId, onNavigate }) {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible && currentTaskId) {
      loadHierarchy();
    }
  }, [visible, currentTaskId]);

  const loadHierarchy = async () => {
    setLoading(true);
    try {
      const treeNodes = [];
      
      // 1. Get Current Task
      const currentTask = await getTaskById(currentTaskId);
      if (!currentTask) {
          setLoading(false);
          return;
      }

      // 2. Determine Root (Parent or Self)
      let parentId = currentTask.parent_id;
      let rootId = parentId || currentTaskId;
      
      if (parentId) {
          // We have a parent, fetch it
          const parent = await getTaskById(parentId);
          if (parent) {
              treeNodes.push({ ...parent, level: 0 });
              
              // Fetch Siblings (children of parent)
              const siblings = await getSubTasks(parentId);
              
              // Process siblings
              for (const sibling of siblings) {
                  treeNodes.push({ ...sibling, level: 1 });
                  
                  // If this sibling is the current task, fetch ITS children
                  if (sibling.id === currentTaskId) {
                      const children = await getSubTasks(currentTaskId);
                      children.forEach(child => {
                          treeNodes.push({ ...child, level: 2 });
                      });
                  }
              }
          }
      } else {
          // No parent, current task is root
          treeNodes.push({ ...currentTask, level: 0 });
          
          // Fetch children
          const children = await getSubTasks(currentTaskId);
          children.forEach(child => {
              treeNodes.push({ ...child, level: 1 });
          });
      }
      
      setNodes(treeNodes);
    } catch (error) {
      console.error('Error loading hierarchy:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Navigate</Text>
            </View>

            <ScrollView 
                style={styles.listContainer} 
                contentContainerStyle={styles.listContent}
                bounces={false} 
                showsVerticalScrollIndicator={false}
            >
                {loading ? (
                    <View style={styles.centerState}>
                        <Text style={styles.loadingText}>Loading...</Text>
                    </View>
                ) : nodes.length === 0 ? (
                    <View style={styles.centerState}>
                         <Text style={styles.emptyStateText}>No hierarchy found</Text>
                    </View>
                ) : (
                    nodes.map((node) => {
                        const isCurrent = node.id === currentTaskId;
                        const paddingLeft = 16 + (node.level * 20); 
                        
                        return (
                            <TouchableOpacity 
                                key={node.id} 
                                style={[
                                    styles.nodeItem, 
                                    { paddingLeft },
                                    isCurrent && styles.currentNodeItem
                                ]}
                                onPress={() => onNavigate(node.id)}
                                disabled={isCurrent}
                            >
                                {node.level > 0 && (
                                    <View style={[styles.treeLine, { left: paddingLeft - 14 }]} />
                                )}

                                <View style={[
                                    styles.bullet,
                                    isCurrent ? styles.currentBullet : styles.normalBullet
                                ]} />
                                
                                <Text 
                                    style={[
                                        styles.nodeText,
                                        isCurrent && styles.currentNodeText,
                                        node.level === 0 && styles.rootNodeText
                                    ]} 
                                    numberOfLines={1}
                                >
                                    {node.title}
                                </Text>
                                
                                {isCurrent && (
                                    <View style={styles.indicatorBadge}>
                                        <Text style={styles.indicatorText}>Current</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })
                )}
            </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 24,
    width: '100%',
    maxWidth: 340, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
    padding: 8,
    paddingBottom: 20,
    maxHeight: '60%',
  },
  modalHeader: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(0,0,0,0.03)',
      marginBottom: 8,
  },
  modalTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: '#999',
      textTransform: 'uppercase',
      letterSpacing: 1,
  },
  listContainer: {
      flexGrow: 0,
  },
  listContent: {
      paddingBottom: 10,
  },
  nodeItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingRight: 16,
      borderRadius: 8,
  },
  currentNodeItem: {
      backgroundColor: 'rgba(10, 126, 164, 0.05)',
  },
  treeLine: {
      position: 'absolute',
      width: 1,
      height: '100%',
      backgroundColor: '#eee',
      top: -12, 
  },
  bullet: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginRight: 10,
  },
  normalBullet: {
      backgroundColor: '#ccc',
  },
  currentBullet: {
      backgroundColor: '#0a7ea4',
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 8,
  },
  nodeText: {
      fontSize: 15,
      color: '#555',
      flex: 1,
  },
  rootNodeText: {
      fontWeight: '600',
      color: '#333',
  },
  currentNodeText: {
      color: '#0a7ea4',
      fontWeight: '500',
  },
  indicatorBadge: {
      backgroundColor: '#0a7ea4',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      marginLeft: 8,
  },
  indicatorText: {
      color: 'white',
      fontSize: 10,
      fontWeight: 'bold',
  },
  centerState: {
      padding: 20,
      alignItems: 'center',
  },
  loadingText: {
      color: '#888',
      fontSize: 13,
  },
  emptyStateText: {
      color: '#AAA',
      fontStyle: 'italic',
      fontSize: 13,
  },
});


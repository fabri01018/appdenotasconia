/**
 * ToggleBlock Component
 * 
 * Renders Notion/Obsidian-style collapsible toggle blocks from markdown syntax.
 * 
 * Syntax: Use "> Header Text" followed by content on subsequent lines.
 * Also supports legacy ">toggle" syntax for backwards compatibility.
 * 
 * Example:
 * > My Section
 * Content goes here
 * 
 * To remove this feature:
 * 1. Delete this file: components/toggle-block.js
 * 2. Remove the import in app/task/[taskId].js: import ToggleBlockRenderer from '@/components/toggle-block';
 * 3. Replace ToggleBlockRenderer usage with simple ThemedText display of task.description
 * 4. Remove toggle-related styles (saveButton, editHint, etc.)
 */

import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

/**
 * Parses markdown-style toggles from text
 * Syntax: > Header Text\nContent here\n> Next Toggle\n...
 * Supports nesting with indentation
 * Also supports legacy >toggle syntax for backwards compatibility
 */
function parseToggles(text) {
  if (!text || typeof text !== 'string') return [];
  
  const lines = text.split('\n');
  const toggles = [];
  let currentToggle = null;
  let contentLines = [];
  let depth = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match both new syntax (> ) and legacy (>toggle )
    const toggleMatch = line.match(/^(\s*)(?:>toggle\s+|>\s+)(.+)$/);
    
    if (toggleMatch) {
      // Save previous toggle if exists
      if (currentToggle !== null) {
        toggles.push({
          ...currentToggle,
          content: contentLines.join('\n').trim(),
          depth,
        });
      }
      
      // Start new toggle
      const indent = toggleMatch[1];
      depth = Math.floor(indent.length / 2); // Assuming 2 spaces per level
      currentToggle = {
        header: toggleMatch[2],
        startLine: i,
        depth,
      };
      contentLines = [];
    } else if (currentToggle !== null) {
      // Check if next toggle starts (at same or less depth)
      const nextToggleMatch = line.match(/^(\s*)(?:>toggle\s+|>\s+)/);
      if (nextToggleMatch) {
        const nextDepth = Math.floor(nextToggleMatch[1].length / 2);
        if (nextDepth <= depth) {
          // Save current toggle
          toggles.push({
            ...currentToggle,
            content: contentLines.join('\n').trim(),
            depth,
          });
          // Process this line as new toggle
          i--; // Reprocess this line
          currentToggle = null;
          continue;
        }
      }
      
      // Add to content
      contentLines.push(line);
    } else {
      // Regular text line (not part of any toggle)
      // This becomes "plain text" between toggles
    }
  }
  
  // Save last toggle if exists
  if (currentToggle !== null) {
    toggles.push({
      ...currentToggle,
      content: contentLines.join('\n').trim(),
      depth,
    });
  }
  
  return toggles;
}

/**
 * Extracts plain text parts and toggle parts from markdown
 */
function parseTextWithToggles(text) {
  if (!text || typeof text !== 'string') return [{ type: 'text', content: text || '' }];
  
  const toggles = parseToggles(text);
  if (toggles.length === 0) {
    return [{ type: 'text', content: text }];
  }
  
  const parts = [];
  let lastIndex = 0;
  
  // Reconstruct parts by finding toggle positions
  const lines = text.split('\n');
  let toggleIndex = 0;
  let currentLine = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match both new syntax (> ) and legacy (>toggle )
    const toggleMatch = line.match(/^(\s*)(?:>toggle\s+|>\s+)(.+)$/);
    
    if (toggleMatch && toggleIndex < toggles.length) {
      const toggle = toggles[toggleIndex];
      
      // Add text before this toggle
      if (currentLine < i) {
        const textBefore = lines.slice(currentLine, i).join('\n');
        if (textBefore.trim()) {
          parts.push({ type: 'text', content: textBefore });
        }
      }
      
      // Add toggle
      parts.push({
        type: 'toggle',
        header: toggle.header,
        content: toggle.content,
        depth: toggle.depth,
      });
      
      // Find where toggle content ends (before next toggle at same or less depth)
      let contentEnd = i + 1;
      const toggleDepth = Math.floor(toggleMatch[1].length / 2);
      
      while (contentEnd < lines.length) {
        const nextToggleMatch = lines[contentEnd].match(/^(\s*)(?:>toggle\s+|>\s+)/);
        if (nextToggleMatch) {
          const nextDepth = Math.floor(nextToggleMatch[1].length / 2);
          if (nextDepth <= toggleDepth) {
            break;
          }
        }
        contentEnd++;
      }
      
      // Skip toggle header and content lines
      i = contentEnd - 1;
      currentLine = contentEnd;
      toggleIndex++;
    }
  }
  
  // Add remaining text after last toggle
  if (currentLine < lines.length) {
    const remainingText = lines.slice(currentLine).join('\n');
    if (remainingText.trim()) {
      parts.push({ type: 'text', content: remainingText });
    }
  }
  
  return parts;
}

function ToggleBlock({ header, content, depth = 0, isExpanded, onToggle, onEditHeader, onEditContent }) {
  const colorScheme = useColorScheme();
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [editedHeader, setEditedHeader] = useState(header);
  const [editedContent, setEditedContent] = useState(content);
  const [animationValue] = useState(new Animated.Value(isExpanded ? 1 : 0));
  
  // Update animation when expanded state changes
  useEffect(() => {
    Animated.timing(animationValue, {
      toValue: isExpanded ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isExpanded]);
  
  // Update edited values when props change
  useEffect(() => {
    setEditedHeader(header);
    setEditedContent(content);
  }, [header, content]);
  
  const handleHeaderPress = () => {
    if (!isEditingHeader && !isEditingContent) {
      onToggle();
    }
  };
  
  const handleHeaderLongPress = () => {
    setIsEditingHeader(true);
  };
  
  const handleSaveHeader = () => {
    if (editedHeader.trim() !== header) {
      onEditHeader(editedHeader.trim());
    }
    setIsEditingHeader(false);
  };
  
  const handleSaveContent = () => {
    if (editedContent !== content && onEditContent) {
      onEditContent(editedContent);
    }
    setIsEditingContent(false);
    setEditedContent(content); // Reset to current content if save failed
  };
  
  const renderContent = () => {
    if (!isExpanded) return null;
    
    if (isEditingContent && onEditContent) {
      return (
        <TextInput
          style={[
            styles.toggleContentInput,
            {
              backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#F5F5F5',
              color: colorScheme === 'dark' ? '#fff' : '#000',
              borderColor: colorScheme === 'dark' ? '#444' : '#ddd',
            }
          ]}
          value={editedContent}
          onChangeText={setEditedContent}
          onBlur={handleSaveContent}
          onEndEditing={handleSaveContent}
          multiline
          textAlignVertical="top"
          autoFocus
        />
      );
    }
    
    // Parse nested toggles in content
    const contentParts = parseTextWithToggles(content);
    
    return (
      <Animated.View
        style={[
          styles.toggleContent,
          {
            opacity: animationValue,
            maxHeight: animationValue.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 1000],
            }),
          }
        ]}
      >
        {contentParts.map((part, index) => {
          if (part.type === 'toggle') {
            // Render nested toggles as read-only for now (edit via main editor)
            return (
              <ToggleBlock
                key={index}
                header={part.header}
                content={part.content}
                depth={part.depth + 1}
                isExpanded={false} // Nested toggles start collapsed
                onToggle={() => {}} // Nested toggle expansion can be added later
                onEditHeader={onEditContent ? (newHeader) => {
                  // Update nested toggle header in content (support both syntaxes)
                  const updatedContent = content.replace(
                    new RegExp(`(\\s*)(?:>toggle\\s+|>\\s+)${part.header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
                    `$1> ${newHeader}`
                  );
                  onEditContent(updatedContent);
                } : undefined}
                onEditContent={undefined} // Nested content editing disabled - use main editor
              />
            );
          }
          return (
            <ThemedText key={index} style={styles.toggleTextContent}>
              {part.content}
            </ThemedText>
          );
        })}
        
        {!isEditingContent && onEditContent && (
          <TouchableOpacity
            onPress={() => setIsEditingContent(true)}
            style={styles.editButton}
          >
            <Ionicons
              name="create-outline"
              size={16}
              color={colorScheme === 'dark' ? '#888' : '#666'}
            />
          </TouchableOpacity>
        )}
      </Animated.View>
    );
  };
  
  return (
    <View style={[styles.toggleBlock, { marginLeft: depth * 16 }]}>
      <TouchableOpacity
        style={styles.toggleHeader}
        onPress={handleHeaderPress}
        onLongPress={handleHeaderLongPress}
        activeOpacity={0.7}
      >
        <Ionicons
          name={isExpanded ? 'chevron-down' : 'chevron-forward'}
          size={18}
          color={colorScheme === 'dark' ? '#888' : '#666'}
          style={styles.chevron}
        />
        
        {isEditingHeader && onEditHeader ? (
          <TextInput
            style={[
              styles.toggleHeaderInput,
              {
                backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#F5F5F5',
                color: colorScheme === 'dark' ? '#fff' : '#000',
              }
            ]}
            value={editedHeader}
            onChangeText={setEditedHeader}
            onBlur={handleSaveHeader}
            onEndEditing={handleSaveHeader}
            autoFocus
          />
        ) : (
          <ThemedText style={styles.toggleHeaderText}>{header}</ThemedText>
        )}
      </TouchableOpacity>
      
      {renderContent()}
    </View>
  );
}

export default function ToggleBlockRenderer({ text, onTextChange }) {
  const colorScheme = useColorScheme();
  const [expandedToggles, setExpandedToggles] = useState(new Set());
  
  if (!text || !text.trim()) {
    return null;
  }
  
  const parts = parseTextWithToggles(text);
  
  const toggleIds = [];
  let toggleIndex = 0;
  
  const handleToggle = (index) => {
    const newExpanded = new Set(expandedToggles);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedToggles(newExpanded);
  };
  
  const updateToggleInText = (oldText, toggleIndex, newHeader, newContent) => {
    const toggles = parseToggles(oldText);
    if (toggleIndex >= toggles.length) return oldText;
    
    const toggle = toggles[toggleIndex];
    const lines = oldText.split('\n');
    let toggleStartLine = -1;
    let toggleEndLine = -1;
    let currentDepth = 0;
    let foundCount = 0;
    
    // Find the toggle in the text (support both syntaxes)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/^(\s*)(?:>toggle\s+|>\s+)(.+)$/);
      if (match) {
        const depth = Math.floor(match[1].length / 2);
        if (match[2] === toggle.header && foundCount === toggleIndex) {
          toggleStartLine = i;
          currentDepth = depth;
          // Find end of this toggle
          for (let j = i + 1; j < lines.length; j++) {
            const nextMatch = lines[j].match(/^(\s*)(?:>toggle\s+|>\s+)/);
            if (nextMatch) {
              const nextDepth = Math.floor(nextMatch[1].length / 2);
              if (nextDepth <= currentDepth) {
                toggleEndLine = j - 1;
                break;
              }
            }
          }
          if (toggleEndLine === -1) toggleEndLine = lines.length - 1;
          break;
        } else if (match[2] === toggle.header) {
          foundCount++;
        }
      }
    }
    
    if (toggleStartLine === -1) return oldText;
    
    // Reconstruct text with updated toggle (use new syntax)
    const indent = '  '.repeat(currentDepth);
    const before = lines.slice(0, toggleStartLine).join('\n');
    const after = lines.slice(toggleEndLine + 1).join('\n');
    const updatedToggle = `${indent}> ${newHeader || toggle.header}\n${newContent || toggle.content}`;
    
    let result = before;
    if (before && after) result += '\n';
    result += updatedToggle;
    if (after) result += '\n' + after;
    
    return result;
  };
  
  if (parts.length === 0 || (parts.length === 1 && parts[0].type === 'text' && !parts[0].content.trim())) {
    return null;
  }
  
  return (
    <View style={styles.container}>
      {parts.map((part, index) => {
        if (part.type === 'text') {
          return (
            <ThemedText key={`text-${index}`} style={styles.plainText}>
              {part.content}
            </ThemedText>
          );
        }
        
        if (part.type === 'toggle') {
          const toggleId = toggleIndex++;
          toggleIds.push(toggleId);
          
          return (
            <ToggleBlock
              key={`toggle-${index}`}
              header={part.header}
              content={part.content}
              depth={part.depth || 0}
              isExpanded={expandedToggles.has(toggleId)}
              onToggle={() => handleToggle(toggleId)}
              onEditHeader={(newHeader) => {
                if (onTextChange) {
                  const toggles = parseToggles(text);
                  const toggle = toggles[toggleIds.indexOf(toggleId)];
                  if (toggle) {
                    // Replace both old and new syntax with new syntax
                    const updatedText = text.replace(
                      new RegExp(`(\\s*)(?:>toggle\\s+|>\\s+)${toggle.header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
                      `$1> ${newHeader}`
                    );
                    onTextChange(updatedText);
                  }
                }
              }}
              onEditContent={(newContent) => {
                if (onTextChange) {
                  const updatedText = updateToggleInText(text, toggleIds.indexOf(toggleId), part.header, newContent);
                  onTextChange(updatedText);
                }
              }}
            />
          );
        }
        return null;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  plainText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
  },
  toggleBlock: {
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  toggleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    minHeight: 44,
  },
  chevron: {
    marginRight: 8,
  },
  toggleHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  toggleHeaderInput: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    padding: 4,
    borderRadius: 4,
  },
  toggleContent: {
    paddingLeft: 26, // Align with header text
    paddingRight: 12,
    paddingBottom: 12,
    overflow: 'hidden',
  },
  toggleTextContent: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
    opacity: 0.9,
  },
  toggleContentInput: {
    fontSize: 15,
    lineHeight: 22,
    borderWidth: 1,
    borderRadius: 6,
    padding: 8,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  editButton: {
    position: 'absolute',
    top: 8,
    right: 12,
    padding: 4,
  },
});

import AddBlockButton from '@/components/blocks/AddBlockButton';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

/**
 * Component for rendering a single block item (supports nested children)
 * @param {Object} block - Block object
 * @param {Array|number} path - Path to this block (e.g., [0, 1] or 0)
 * @param {number} depth - Nesting depth (0 = top level)
 * @param {boolean} isEditing - Whether this block is being edited
 * @param {string} editValue - Current edit value
 * @param {Function} onEdit - Callback when editing starts
 * @param {Function} onSave - Callback when editing ends
 * @param {Function} onDelete - Callback when deleting
 * @param {Function} onTextChange - Callback when text changes
 * @param {Function} onKeyPress - Callback for key press
 * @param {Function} onEnterPress - Callback for Enter key
 * @param {Function} onToggle - Callback for toggle expand/collapse
 * @param {Function} onAddChildBlock - Callback to add child block
 * @param {Function} onAddChildToggle - Callback to add child toggle
 * @param {Function} onBackspaceOnEmpty - Callback for backspace when content is empty
 * @param {Function} onCheckToggle - Callback to toggle check block checked state
 * @param {Object} inputRef - Ref for TextInput
 * @param {Function} onFocus - Callback when input is focused
 */
export default function BlockItem({
  block,
  path,
  depth = 0,
  isEditing,
  editValue,
  onEdit,
  onSave,
  onDelete,
  onTextChange,
  onKeyPress,
  onEnterPress,
  onToggle,
  onAddChildBlock,
  onAddChildToggle,
  onBackspaceOnEmpty,
  onCheckToggle,
  inputRef,
  onFocus,
}) {
  const colorScheme = useColorScheme();
  const [isHovered, setIsHovered] = useState(false);
  const inputRefInternal = useRef(null);

  if (block.type !== "block" && block.type !== "toggle" && block.type !== "check") return null;
  
  const isToggle = block.type === "toggle";
  const isCheck = block.type === "check";
  const isOpen = block.isOpen || false;
  const isChecked = isCheck && (block.checked || false);
  const children = (block.children || []).filter(child => child && (child.type === 'block' || child.type === 'toggle' || child.type === 'check'));
  const pathArray = Array.isArray(path) ? path : [path];

  // Check if this block is currently being edited
  const isCurrentlyEditing = isEditing && 
    Array.isArray(isEditing) && 
    isEditing.length === pathArray.length &&
    isEditing.every((val, idx) => val === pathArray[idx]);

  // Show delete button on hover (web) or after long-press (mobile)
  const showDeleteButton = !isCurrentlyEditing && isHovered;

  // Get theme-aware colors
  const iconColor = colorScheme === 'dark' 
    ? 'rgba(255,255,255,0.6)' 
    : 'rgba(55,53,47,0.6)';
  const deleteIconColor = colorScheme === 'dark'
    ? 'rgba(255,255,255,0.4)'
    : 'rgba(55,53,47,0.4)';
  const hoverBackground = colorScheme === 'dark'
    ? 'rgba(255,255,255,0.05)'
    : 'rgba(55,53,47,0.08)';

  return (
    <View style={[styles.blockWrapper, { paddingLeft: depth * 16 }]}>
      <Pressable
        style={({ pressed, hovered }) => [
          styles.blockContainer,
          (hovered || pressed) && !isCurrentlyEditing && {
            backgroundColor: hoverBackground,
          },
        ]}
        onHoverIn={() => Platform.OS === 'web' && setIsHovered(true)}
        onHoverOut={() => Platform.OS === 'web' && setIsHovered(false)}
        onLongPress={() => {
          if (Platform.OS !== 'web' && !isCurrentlyEditing) {
            setIsHovered(true);
            // Auto-hide after 3 seconds on mobile
            setTimeout(() => setIsHovered(false), 3000);
          }
        }}
      >
        {isToggle && !isCurrentlyEditing && (
          <TouchableOpacity
            style={styles.toggleIcon}
            onPress={() => onToggle && onToggle(pathArray)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isOpen ? "chevron-down" : "chevron-forward"}
              size={18}
              color={iconColor}
            />
          </TouchableOpacity>
        )}
        {isCheck && !isCurrentlyEditing && (
          <TouchableOpacity
            style={styles.checkboxIcon}
            onPress={() => onCheckToggle && onCheckToggle(pathArray)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isChecked ? "checkbox" : "checkbox-outline"}
              size={20}
              color={iconColor}
            />
          </TouchableOpacity>
        )}
        <Pressable
          style={styles.blockLine}
          onPress={() => !isCurrentlyEditing && onEdit && onEdit(pathArray)}
          disabled={isCurrentlyEditing}
        >
          {isCurrentlyEditing ? (
            <TextInput
              ref={(ref) => {
                inputRefInternal.current = ref;
                if (inputRef) {
                  if (typeof inputRef === 'function') {
                    const key = pathArray.join('-');
                    inputRef(ref, key);
                  } else {
                    inputRef(ref);
                  }
                }
              }}
              style={[
                styles.blockInput,
                {
                  color: colorScheme === 'dark' ? '#fff' : '#000',
                }
              ]}
              value={editValue}
              onChangeText={(text) => {
                // Handle text change (includes deletion detection for second backspace)
                if (onTextChange) {
                  onTextChange(text, pathArray);
                }
              }}
              onKeyPress={(e) => {
                // Handle backspace/delete key press
                // This detects the SECOND backspace when content is already empty
                const key = e.nativeEvent.key;
                console.log('[BlockItem] onKeyPress:', key, 'path:', pathArray);
                if ((key === 'Backspace' || key === 'Delete')) {
                  // Check if content is empty - if so, this is the second backspace
                  if (editValue.trim() === '') {
                    console.log('[BlockItem] Backspace on empty detected');
                    // Force trigger deletion for Android via direct call since onChangeText might not fire
                    if (onBackspaceOnEmpty && onBackspaceOnEmpty(pathArray)) {
                      console.log('[BlockItem] onBackspaceOnEmpty handled deletion');
                      // Block was deleted, don't process the key press further
                      e.preventDefault?.();
                      return;
                    }
                  }
                }
                if (onKeyPress) {
                  onKeyPress(e, pathArray);
                }
              }}
              onSelectionChange={(e) => {
                // Workaround for Android backspace on empty: 
                // If selection is at 0 and text is empty, it might be a backspace attempt
                // We can't rely solely on this, but it helps trace behavior
                if (Platform.OS === 'android' && editValue === '' && e.nativeEvent.selection.start === 0) {
                   // Optional: could trigger deletion logic here if all else fails
                }
              }}
              onFocus={() => {
                if (onFocus && inputRefInternal.current) {
                  onFocus(pathArray, inputRefInternal.current);
                }
              }}
              onBlur={() => {
                console.log('[Blocks] TextInput blur for', pathArray);
                onSave && onSave(pathArray);
              }}
              onSubmitEditing={() => onEnterPress && onEnterPress(pathArray)}
              autoFocus
              multiline
              blurOnSubmit={false}
            />
          ) : (
            <ThemedText 
              style={[
                styles.blockContent,
                isCheck && isChecked && styles.checkedText
              ]}
            >
              {block.content || ''}
            </ThemedText>
          )}
        </Pressable>
        {showDeleteButton && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => {
              onDelete && onDelete(pathArray);
              setIsHovered(false);
            }}
            onPressOut={() => Platform.OS !== 'web' && setTimeout(() => setIsHovered(false), 2000)}
            activeOpacity={0.7}
          >
            <Ionicons
              name="close-circle"
              size={18}
              color={deleteIconColor}
            />
          </TouchableOpacity>
        )}
      </Pressable>
      
      {/* Render children if toggle is expanded */}
      {isToggle && isOpen && (
        <View style={styles.childrenContainer}>
          {children.map((child, childIndex) => {
            const childPath = [...pathArray, childIndex];
            return (
              <BlockItem
                key={childIndex}
                block={child}
                path={childPath}
                depth={depth + 1}
                isEditing={isEditing}
                editValue={editValue}
                onEdit={onEdit}
                onSave={onSave}
                onDelete={onDelete}
                onTextChange={onTextChange}
                onKeyPress={onKeyPress}
                onEnterPress={onEnterPress}
                onToggle={onToggle}
                onAddChildBlock={onAddChildBlock}
                onAddChildToggle={onAddChildToggle}
                onBackspaceOnEmpty={onBackspaceOnEmpty}
                onCheckToggle={onCheckToggle}
                inputRef={inputRef}
                onFocus={onFocus}
              />
            );
          })}
          
          {/* Add Block button inside expanded toggle */}
          <View style={styles.addButtonsContainer}>
            {onAddChildBlock && (
              <AddBlockButton onPress={() => onAddChildBlock(pathArray)} />
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  blockWrapper: {
    marginBottom: 0,
  },
  blockContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 4,
    paddingVertical: 0,
    paddingHorizontal: 4,
    transition: 'background-color 150ms ease',
  },
  toggleIcon: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -4,
    marginTop: 2,
  },
  checkboxIcon: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -4,
    marginTop: 2,
  },
  blockLine: {
    flex: 1,
    paddingVertical: 2,
    paddingHorizontal: 0,
    minHeight: 24,
  },
  blockContent: {
    fontSize: 16,
    lineHeight: 24, // Tighter line height for continuous flow
  },
  placeholderText: {
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.5,
    fontStyle: 'italic',
  },
  checkedText: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  blockInput: {
    fontSize: 16,
    lineHeight: 24,
    minHeight: 24,
    flex: 1,
    paddingVertical: 0,
  },
  deleteButton: {
    padding: 4,
    marginRight: -4,
  },
  childrenContainer: {
    marginTop: 2,
    marginLeft: 8,
  },
  addButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    marginLeft: 0,
  },
});


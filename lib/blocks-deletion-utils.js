/**
 * Utilities for handling block deletion via keyboard (backspace/delete)
 * Provides two-step deletion: first backspace clears content, second deletes block
 */

/**
 * Determines if a block should enter empty state (ready for deletion)
 * @param {string} previousValue - Previous text value
 * @param {string} currentValue - Current text value
 * @returns {boolean} True if content just became empty
 */
export function shouldEnterEmptyState(previousValue, currentValue) {
  const wasNotEmpty = previousValue.trim().length > 0;
  const isNowEmpty = currentValue.trim().length === 0;
  return wasNotEmpty && isNowEmpty;
}

/**
 * Determines if a block should exit empty state (content was added)
 * @param {string} currentValue - Current text value
 * @returns {boolean} True if content is no longer empty
 */
export function shouldExitEmptyState(currentValue) {
  return currentValue.trim().length > 0;
}

/**
 * Checks if a block should be deleted when backspace/delete is pressed
 * @param {boolean} isEmptyState - Whether block is in empty state
 * @param {string} editValue - Current edit value
 * @param {boolean} isCurrentlyEditing - Whether this block is being edited
 * @returns {boolean} True if block should be deleted
 */
export function shouldDeleteOnBackspace(isEmptyState, editValue, isCurrentlyEditing) {
  return (
    isCurrentlyEditing &&
    isEmptyState &&
    editValue.trim() === ''
  );
}

/**
 * Checks if a path matches the currently editing index
 * @param {Array|number} editingIndex - Current editing index (path)
 * @param {Array|number} blockPath - Block's path to check
 * @returns {boolean} True if paths match
 */
export function isEditingBlock(editingIndex, blockPath) {
  if (!editingIndex || !blockPath) return false;
  
  const editingPath = Array.isArray(editingIndex) ? editingIndex : [editingIndex];
  const checkPath = Array.isArray(blockPath) ? blockPath : [blockPath];
  
  if (editingPath.length !== checkPath.length) return false;
  
  return editingPath.every((val, idx) => val === checkPath[idx]);
}


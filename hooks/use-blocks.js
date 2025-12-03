import { useDebouncedAutoSave } from '@/hooks/task-detail/useDebouncedAutoSave';
import { useDatabase } from '@/hooks/use-database';
import {
    isEditingBlock,
    shouldDeleteOnBackspace,
    shouldEnterEmptyState,
    shouldExitEmptyState,
} from '@/lib/blocks-deletion-utils';
import { blocksToDescription, descriptionToBlocks } from '@/lib/blocks-utils';
import { createTask, getTaskByProjectAndTaskName, updateTask } from '@/repositories/tasks';
import { useEffect, useRef, useState } from 'react';

/**
 * Custom hook for managing blocks from a task's description
 * @param {string} projectName - Name of the project
 * @param {string} taskName - Name of the task
 * @returns {object} Blocks state and operations
 */
export function useBlocks(projectName, taskName) {
  const { isInitialized } = useDatabase();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [blocks, setBlocks] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [isEmptyState, setIsEmptyState] = useState(false); // Track if block is in empty state (ready for deletion)
  const prevEditValueRef = useRef(''); // Track previous edit value to detect backspace on empty
  const isDeletingRef = useRef(false); // Track if a block is currently being deleted
  const isSavingBlocksRef = useRef(false); // Track whether saveBlocks is running

  // Helper function to recursively set isOpen: false for all toggle blocks
  const resetToggleStates = (blocks) => {
    return blocks.map(block => {
      if (block.type === 'toggle') {
        return {
          ...block,
          isOpen: false,
          children: block.children ? resetToggleStates(block.children) : []
        };
      }
      return block;
    });
  };

  // Helper function to find block by path (array of indices: [0, 1] = first block's second child)
  const findBlockByPath = (blocks, path) => {
    if (!path || path.length === 0) return null;
    let current = blocks;
    for (let i = 0; i < path.length; i++) {
      const index = path[i];
      if (!current || !Array.isArray(current) || index >= current.length) {
        return null;
      }
      if (i === path.length - 1) {
        return current[index];
      }
      current = current[index].children || [];
    }
    return null;
  };

  // Helper function to get parent array for a path
  const getParentArray = (blocks, path) => {
    if (!path || path.length === 0) return blocks;
    if (path.length === 1) return blocks;
    let current = blocks;
    for (let i = 0; i < path.length - 1; i++) {
      const index = path[i];
      if (!current || !Array.isArray(current) || index >= current.length) {
        return null;
      }
      const block = current[index];
      if (block.type === 'toggle') {
        current = block.children || (block.children = []);
      } else {
        return null; // Regular blocks can't have children
      }
    }
    return current;
  };

  // Helper function to create a deep copy of blocks
  const deepCopyBlocks = (blocks) => {
    return blocks.map(block => {
      if (block.type === 'toggle') {
        return {
          ...block,
          children: block.children ? deepCopyBlocks(block.children) : []
        };
      }
      return { ...block };
    });
  };

  // Load or create task
  useEffect(() => {
    const loadOrCreateTask = async () => {
      if (!isInitialized) return;
      
      try {
        setLoading(true);
        
        // First, try to get the task
        let taskData = await getTaskByProjectAndTaskName(projectName, taskName);
        
        // If task doesn't exist, create it
        if (!taskData) {
          console.log(`Task "${taskName}" not found in project "${projectName}". Creating...`);
          
          // Get or create the project
          const { getDb } = await import('@/lib/database');
          const db = getDb();
          
          // Check if project exists
          let project = await db.getFirstAsync(
            'SELECT * FROM projects WHERE name = ? AND deleted_at IS NULL',
            [projectName]
          );
          
          // Create project if it doesn't exist
          if (!project) {
            console.log(`Project "${projectName}" not found. Creating...`);
            const { createProject } = await import('@/repositories/projects');
            project = await createProject(projectName);
          }
          
          // Create the task
          await createTask(project.id, taskName, '', null);
          console.log(`✅ Created task "${taskName}" in project "${projectName}"`);
          
          // Reload the task to get full data including project_name
          taskData = await getTaskByProjectAndTaskName(projectName, taskName);
        }
        
        // Set task and parse blocks
        setTask(taskData);
        const parsedBlocks = descriptionToBlocks(taskData.description || '');
        // Ensure all toggle blocks have isOpen: false and children arrays when loading
        const blocksWithToggleState = resetToggleStates(parsedBlocks);
        setBlocks(blocksWithToggleState.length > 0 ? blocksWithToggleState : []);
      } catch (error) {
        console.error('Error loading/creating task:', error);
        setBlocks([]);
      } finally {
        setLoading(false);
      }
    };

    if (projectName && taskName && isInitialized) {
      loadOrCreateTask();
    }
  }, [projectName, taskName, isInitialized]);

  // Sync blocks when task description changes externally (e.g., from AI processing)
  // This effect handles cases where the task description is updated outside of blocks editing
  useEffect(() => {
    if (!task || !isInitialized) return;
    
    if (isSavingBlocksRef.current) {
      return;
    }

    // Don't sync if we're currently deleting a block
    if (isDeletingRef.current) {
      return;
    }
    
    // Don't sync if we're currently editing - let the user finish their edit
    if (editingIndex !== null) return;
    
    const currentDescription = blocksToDescription(blocks);
    const taskDescription = task.description || '';
    
    // Only update if task description changed externally and doesn't match current blocks
    // This prevents re-parsing when we save our own changes (which would match)
    if (currentDescription === taskDescription) {
      return;
    }

    if (currentDescription !== taskDescription) {
      const parsedBlocks = descriptionToBlocks(taskDescription);
      const blocksWithToggleState = resetToggleStates(parsedBlocks);
      const normalizedBlocks = blocksWithToggleState.length > 0 ? blocksWithToggleState : [];
      setBlocks(normalizedBlocks);
    }
    // Note: blocks is intentionally not in dependencies to avoid circular updates
    // This effect should only run when task.description changes externally
  }, [task?.description, isInitialized, editingIndex]); // React to task description and editing state changes

  // Save blocks to task description
  const saveBlocks = async (blocksToSave) => {
    if (!task) return;
    
    const description = blocksToDescription(blocksToSave);
    isSavingBlocksRef.current = true;
    try {
      await updateTask(task.id, {
        project_id: task.project_id,
        section_id: task.section_id,
        title: task.title,
        description: description,
      });
      
      // Reload task to get updated data
      const updatedTask = await getTaskByProjectAndTaskName(projectName, taskName);
      if (updatedTask) {
        setTask(updatedTask);
      }
    } finally {
      // Small delay before releasing lock to ensure all effects have processed
      setTimeout(() => {
        isSavingBlocksRef.current = false;
      }, 100);
    }
  };

  // Get current saved blocks for comparison
  const savedBlocks = task ? descriptionToBlocks(task.description || '') : [];
  
  // Convert blocks array to string for comparison
  const blocksKey = JSON.stringify(blocks);
  const savedBlocksKey = JSON.stringify(savedBlocks);

  // Auto-save blocks when they change
  const saveStatus = useDebouncedAutoSave(
    blocksKey,
    savedBlocksKey,
    async () => {
      await saveBlocks(blocks);
    },
    1500
  );

  // Block operations
  // Path can be a number (for top-level) or array (for nested) like [0, 1]
  const handleEdit = (path) => {
    const pathArray = Array.isArray(path) ? path : [path];
    
    // If we're already editing a different block, save it first
    if (editingIndex !== null && 
        (!Array.isArray(editingIndex) || 
         editingIndex.length !== pathArray.length || 
         !editingIndex.every((val, idx) => val === pathArray[idx]))) {
      handleSave(editingIndex);
    }
    
    // Now start editing the new block
    // Use setTimeout to ensure the save state update has been processed
    // But use a very short delay (0ms) to let React process the state update
    setTimeout(() => {
      const block = findBlockByPath(blocks, pathArray);
      if (block) {
        setEditingIndex(pathArray);
        setEditValue(block.content);
        prevEditValueRef.current = block.content; // Initialize previous value
        // Reset empty state when starting to edit
        setIsEmptyState(false);
      }
    }, 0);
  };

  const handleSave = (path) => {
    if (isDeletingRef.current) return;
    const pathArray = Array.isArray(path) ? path : [path];
    const updatedBlocks = deepCopyBlocks(blocks);
    const block = findBlockByPath(updatedBlocks, pathArray);
    
    if (!block) return;
    
    let contentToSave = editValue;
    
    // Check if user manually typed "> " prefix (for converting regular blocks to toggles)
    if (contentToSave.startsWith('> ')) {
      // Strip the prefix from content
      contentToSave = contentToSave.substring(2);
      
      // Convert to toggle block if it's currently a regular block
      if (block.type === 'block') {
        // Replace the block with a toggle
        const parentArray = getParentArray(updatedBlocks, pathArray);
        const index = pathArray[pathArray.length - 1];
        if (parentArray) {
          parentArray[index] = {
            type: 'toggle',
            content: contentToSave,
            isOpen: false,
            children: []
          };
        }
      } else {
        // It's already a toggle, just update content
        block.content = contentToSave;
      }
    } else {
      // No prefix, just update content
      block.content = contentToSave;
    }
    
    setBlocks(updatedBlocks);
    setEditingIndex(null);
    setIsEmptyState(false); // Reset empty state after saving
  };

  const addBlock = (parentPath = null) => {
    const updatedBlocks = deepCopyBlocks(blocks);
    
    if (parentPath === null) {
      // Add to top level
      const newBlock = { type: "block", content: "" };
      updatedBlocks.push(newBlock);
      setBlocks(updatedBlocks);
      setEditingIndex([updatedBlocks.length - 1]);
      setEditValue("");
    } else {
      // Add as child of parent toggle
      const pathArray = Array.isArray(parentPath) ? parentPath : [parentPath];
      const parentBlock = findBlockByPath(updatedBlocks, pathArray);
      
      if (parentBlock && parentBlock.type === 'toggle') {
        if (!parentBlock.children) {
          parentBlock.children = [];
        }
        const newBlock = { type: "block", content: "" };
        parentBlock.children.push(newBlock);
        setBlocks(updatedBlocks);
        setEditingIndex([...pathArray, parentBlock.children.length - 1]);
        setEditValue("");
      }
    }
  };

  const addToggleBlock = (parentPath = null) => {
    const updatedBlocks = deepCopyBlocks(blocks);
    
    if (parentPath === null) {
      // Add to top level
      const newBlock = { type: "toggle", content: "", isOpen: false, children: [] };
      updatedBlocks.push(newBlock);
      setBlocks(updatedBlocks);
      setEditingIndex([updatedBlocks.length - 1]);
      setEditValue("");
    } else {
      // Add as child of parent toggle
      const pathArray = Array.isArray(parentPath) ? parentPath : [parentPath];
      const parentBlock = findBlockByPath(updatedBlocks, pathArray);
      
      if (parentBlock && parentBlock.type === 'toggle') {
        if (!parentBlock.children) {
          parentBlock.children = [];
        }
        const newBlock = { type: "toggle", content: "", isOpen: false, children: [] };
        parentBlock.children.push(newBlock);
        setBlocks(updatedBlocks);
        setEditingIndex([...pathArray, parentBlock.children.length - 1]);
        setEditValue("");
      }
    }
  };

  const deleteBlock = (path) => {
    isDeletingRef.current = true;
    const pathArray = Array.isArray(path) ? path : [path];
    const updatedBlocks = deepCopyBlocks(blocks);
    
    if (pathArray.length === 1) {
      // Top-level block
      updatedBlocks.splice(pathArray[0], 1);
    } else {
      // Nested block
      const parentArray = getParentArray(updatedBlocks, pathArray);
      if (parentArray) {
        const index = pathArray[pathArray.length - 1];
        parentArray.splice(index, 1);
      }
    }
    
    setBlocks(updatedBlocks);
    setEditingIndex(null);
    setEditValue("");

    // Reset deleting flag
    setTimeout(() => {
      isDeletingRef.current = false;
    }, 200);
  };

  const handleEnterPress = (path) => {
    const pathArray = Array.isArray(path) ? path : [path];
    const updatedBlocks = deepCopyBlocks(blocks);
    const block = findBlockByPath(updatedBlocks, pathArray);
    
    if (!block) return;
    
    block.content = editValue;
    const parentArray = getParentArray(updatedBlocks, pathArray);
    
    if (!parentArray) return;
    
    const newBlock = { type: "block", content: "" };
    const index = pathArray[pathArray.length - 1];
    parentArray.splice(index + 1, 0, newBlock);
    
    setBlocks(updatedBlocks);
    const newPath = [...pathArray];
    newPath[newPath.length - 1] = index + 1;
    setEditingIndex(newPath);
    setEditValue("");
  };

  const handleTextChange = (text, path) => {
    // Check if Enter was pressed (newline added at the end)
    if (text.endsWith('\n') && editValue !== text) {
      const textWithoutNewline = text.replace(/\n$/, '');
      setEditValue(textWithoutNewline);
      prevEditValueRef.current = textWithoutNewline;
      setIsEmptyState(false); // Reset empty state on Enter
      handleEnterPress(path);
      return;
    }

    const pathArray = Array.isArray(path) ? path : [path];
    const currentBlock = findBlockByPath(blocks, pathArray);
    
    // Check if we're editing this block
    const isCurrentlyEditing = isEditingBlock(editingIndex, pathArray);
    
    if (!currentBlock) {
      setEditValue(text);
      prevEditValueRef.current = text;
      setIsEmptyState(text.trim() === '');
      return;
    }

    // Detect when content becomes empty (first backspace that clears all text)
    const previousValue = prevEditValueRef.current;
    
    // If content just became empty (was not empty before, now is empty)
    // This is the FIRST backspace that clears all content
    if (shouldEnterEmptyState(previousValue, text)) {
      setIsEmptyState(true);
      setEditValue(text);
      prevEditValueRef.current = text;
      return;
    }
    
    // Handle second backspace on mobile: if already in empty state and text is still empty, delete block
    // This works on mobile where onKeyPress may not fire reliably
    if (isEmptyState && text.trim() === '' && isCurrentlyEditing) {
      if (shouldDeleteOnBackspace(isEmptyState, text, isCurrentlyEditing)) {
        deleteBlock(pathArray);
        return;
      }
    }
    
    // If content becomes non-empty again, reset empty state
    if (shouldExitEmptyState(text)) {
      setIsEmptyState(false);
    }
    
    // Update previous value ref
    prevEditValueRef.current = text;

    // Check if text starts with "> " (at the very start, no leading whitespace)
    // Only convert regular blocks to toggles, not the reverse
    const startsWithTogglePrefix = text.startsWith('> ');
    
    // Ensure we have a valid current block before checking type
    const isCurrentlyBlock = currentBlock ? currentBlock.type === 'block' : false;

    // Convert block to toggle if "> " is typed at start
    if (startsWithTogglePrefix && isCurrentlyBlock) {
      // Remove "> " prefix from editValue
      const contentWithoutPrefix = text.substring(2);
      setEditValue(contentWithoutPrefix);
      prevEditValueRef.current = contentWithoutPrefix;
      setIsEmptyState(false); // Reset empty state when converting
      
      // Update block type in blocks array immediately
      const updatedBlocks = deepCopyBlocks(blocks);
      const block = findBlockByPath(updatedBlocks, pathArray);
      const parentArray = getParentArray(updatedBlocks, pathArray);
      
      if (block && parentArray) {
        const index = pathArray[pathArray.length - 1];
        parentArray[index] = {
          type: 'toggle',
          content: contentWithoutPrefix,
          isOpen: false,
          children: block.children || []
        };
        setBlocks(updatedBlocks);
      }
      return;
    }

    // Check if text starts with "- [ ]" or "- [x]" (check block prefix)
    // Only convert regular blocks to check blocks
    const checkMatch = text.match(/^-\s*\[([\sx])\]\s*(.*)$/);
    if (checkMatch && isCurrentlyBlock) {
      const checked = checkMatch[1].toLowerCase() === 'x';
      const checkContent = checkMatch[2] || '';
      
      // Create check block
      const updatedBlocks = deepCopyBlocks(blocks);
      const block = findBlockByPath(updatedBlocks, pathArray);
      const parentArray = getParentArray(updatedBlocks, pathArray);
      
      if (block && parentArray) {
        const index = pathArray[pathArray.length - 1];
        parentArray[index] = {
          type: 'check',
          content: checkContent, // Content without prefix
          checked: checked
        };
        setBlocks(updatedBlocks);
        
        // Update edit value to show content (without prefix)
        setEditValue(checkContent);
        prevEditValueRef.current = checkContent;
        setIsEmptyState(false);
      }
      return;
    }

    // Normal text change - no conversion needed
    setEditValue(text);
    
    // Update blocks state to match editValue (sync source of truth)
    // This prevents stale state from overriding editValue on re-renders
    const updatedBlocks = deepCopyBlocks(blocks);
    const blockToUpdate = findBlockByPath(updatedBlocks, pathArray);
    if (blockToUpdate) {
      blockToUpdate.content = text;
      setBlocks(updatedBlocks);
    }
  };

  const handleToggle = (path) => {
    const pathArray = Array.isArray(path) ? path : [path];
    const updatedBlocks = deepCopyBlocks(blocks);
    const block = findBlockByPath(updatedBlocks, pathArray);
    
    if (block && block.type === 'toggle') {
      block.isOpen = !block.isOpen;
      setBlocks(updatedBlocks);
    }
  };

  // Handle backspace/delete key when content is empty (second backspace)
  // This is mainly for web platform where onKeyPress fires before onChangeText
  const handleBackspaceOnEmpty = (path) => {
    const pathArray = Array.isArray(path) ? path : [path];
    
    // Check if we're editing this block and it's in empty state
    const isCurrentlyEditing = isEditingBlock(editingIndex, pathArray);
    
    if (shouldDeleteOnBackspace(isEmptyState, editValue, isCurrentlyEditing)) {
      // Delete the block
      deleteBlock(pathArray);
      return true; // Indicate that deletion was handled
    }
    
    return false; // No deletion occurred
  };

  // Add child block inside a toggle
  const addChildBlock = (parentPath) => {
    addBlock(parentPath);
  };

  // Add child toggle inside a toggle
  const addChildToggle = (parentPath) => {
    addToggleBlock(parentPath);
  };

  // Check block operations
  const handleCheckToggle = (path) => {
    const pathArray = Array.isArray(path) ? path : [path];
    const updatedBlocks = deepCopyBlocks(blocks);
    const checkBlock = findBlockByPath(updatedBlocks, pathArray);
    
    if (checkBlock && checkBlock.type === 'check') {
      checkBlock.checked = !checkBlock.checked;
      setBlocks(updatedBlocks);
    }
  };

  return {
    // State
    task,
    loading,
    blocks,
    editingIndex,
    editValue,
    saveStatus,
    isEmptyState,
    
    // Actions
    setBlocks,
    setEditValue,
    handleEdit,
    handleSave,
    addBlock,
    addToggleBlock,
    deleteBlock,
    handleEnterPress,
    handleTextChange,
    handleToggle,
    addChildBlock,
    addChildToggle,
    handleBackspaceOnEmpty,
    // Check block operations
    handleCheckToggle,
    // Helper functions
    findBlockByPath,
    getParentArray,
  };
}

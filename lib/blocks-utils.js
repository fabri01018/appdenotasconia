/**
 * Utility functions for working with blocks stored in task descriptions
 */

/**
 * Parse task.description (newline-separated text format) to blocks array
 * @param {string|null|undefined} description - The task description (newline-separated text)
 * @returns {Array} Array of block objects
 */
export function descriptionToBlocks(description) {
  if (!description || description.trim() === '') return [];
  
  // Use customTextToJson to parse newline-separated format
  return customTextToJson(description);
}

/**
 * Convert blocks array to newline-separated text format for storage in task.description
 * @param {Array} blocks - Array of block objects (can be nested)
 * @returns {string} Text with newlines separating blocks (or empty string if no blocks)
 */
export function blocksToDescription(blocks) {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return ''; // Empty string for no blocks
  }
  
  // Recursively convert blocks to lines with indentation
  function blocksToLines(blocks, indentLevel = 0) {
    const indent = '  '.repeat(indentLevel);
    const lines = [];
    
    for (const block of blocks) {
      // Validate block structure
      if (!block || typeof block !== 'object') {
        continue;
      }
      
      if (block.type === 'toggle') {
        // Validate toggle block
        if (typeof block.content !== 'string') continue;
        // Toggle header with indentation
        lines.push(`${indent}> ${block.content}`);
        // Recursively process children
        if (block.children && Array.isArray(block.children) && block.children.length > 0) {
          lines.push(...blocksToLines(block.children, indentLevel + 1));
        }
      } else if (block.type === 'check') {
        // Check block
        if (typeof block.content !== 'string') continue;
        const checkbox = block.checked ? '[x]' : '[ ]';
        lines.push(`${indent}- ${checkbox} ${block.content}`);
      } else if (block.type === 'block') {
        // Regular block with indentation
        if (typeof block.content !== 'string') continue;
        lines.push(`${indent}${block.content}`);
      }
    }
    
    return lines;
  }
  
  const lines = blocksToLines(blocks);
  return lines.join('\n');
}

/**
 * Convert description to text format (for editing as text)
 * @param {string} description - Newline-separated format from task.description
 * @returns {string} Text with newlines (same format, just returns as-is)
 */
export function descriptionToText(description) {
  // Description is already in newline-separated format, just return it
  return description || '';
}

/**
 * Parse text with newline delimiters into blocks array
 * Supports nested blocks via indentation (2 spaces per level)
 * @param {string} text - Text to parse (newline-separated with optional indentation)
 * @returns {Array} Array of block objects (can be nested)
 */
export function customTextToJson(text) {
  // Verify that input is a string
  if (typeof text !== 'string') return [];

  // Split by newlines (preserve trailing spaces for indentation calculation)
  const lines = text.split('\n');
  const result = [];
  const stack = []; // Stack of {block, indentLevel}
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Calculate indentation (count leading spaces)
    const indentMatch = line.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1].length : 0;
    const indentLevel = Math.floor(indent / 2);
    
    // Trim the line but preserve the original for content extraction
    const trimmed = line.trim();
    
    // Pop from stack until we find the correct parent level
    while (stack.length > 0 && stack[stack.length - 1].indentLevel >= indentLevel) {
      stack.pop();
    }
    
    // Determine parent and target array
    const parent = stack.length > 0 ? stack[stack.length - 1].block : null;
    const targetArray = parent ? (parent.children || (parent.children = [])) : result;
    
    // Handle empty lines - preserve them as empty blocks
    if (trimmed.length === 0) {
      // Create an empty block at the current indentation level
      const emptyBlock = {
        type: 'block',
        content: ''
      };
      
      targetArray.push(emptyBlock);
      continue;
    }
    
    // Check if it's a toggle block (starts with "> " after trimming)
    const isToggle = trimmed.startsWith('> ');
    
    // Check if it's a check block (starts with "- [ ]" or "- [x]" after trimming)
    const checkMatch = trimmed.match(/^-\s*\[([\sx])\]\s*(.*)$/);
    const isCheck = !!checkMatch;
    
    if (isToggle) {
      // Extract toggle content (remove "> " prefix)
      const toggleContent = trimmed.substring(2).trim();
      
      // Create toggle block
      const toggleBlock = {
        type: 'toggle',
        content: toggleContent,
        isOpen: false, // Default to closed state
        children: [] // Initialize children array
      };
      
      targetArray.push(toggleBlock);
      
      // Push to stack for potential children
      stack.push({ block: toggleBlock, indentLevel: indentLevel });
    } else if (isCheck) {
      // This is a check block
      const checked = checkMatch[1].toLowerCase() === 'x';
      const checkContent = checkMatch[2] || '';
      
      // Create check block (single line item, not a container)
      const checkBlock = {
        type: 'check',
        content: checkContent,
        checked: checked
      };
      
      targetArray.push(checkBlock);
    } else {
      // Regular block - use trimmed content
      const block = {
        type: 'block',
        content: trimmed
      };
      
      targetArray.push(block);
    }
  }
  
  return result;
}


/**
 * Update Tag Tool
 * 
 * Tool definition for updating a tag's name.
 */

import { updateTag } from '../../../repositories/tags.js';

/**
 * Creates and returns the update_tag tool definition
 * @returns {Object} Tool definition object
 */
export function getUpdateTagTool() {
  return {
    name: 'update_tag',
    description: 'Updates a tag\'s name. Use this when the user wants to rename a tag.',
    input_schema: {
      type: 'object',
      properties: {
        tag_id: {
          type: 'number',
          description: 'The ID of the tag to update.',
        },
        name: {
          type: 'string',
          description: 'The new name for the tag.',
        },
      },
      required: ['tag_id', 'name'],
    },
    handler: async (parameters) => {
      const { tag_id, name } = parameters;
      
      if (!tag_id || typeof tag_id !== 'number') {
        throw new Error('tag_id must be a valid number');
      }

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        throw new Error('name must be a non-empty string');
      }

      const updatedTag = await updateTag(tag_id, name.trim());
      
      return {
        success: true,
        tag: updatedTag,
        message: `Tag renamed to "${updatedTag.name}"`,
      };
    },
  };
}


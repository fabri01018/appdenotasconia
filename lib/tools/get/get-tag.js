/**
 * Get Tag Tool
 * 
 * Tool definition for retrieving a specific tag by ID.
 */

import { getTagById } from '../../../repositories/tags.js';

/**
 * Creates and returns the get_tag tool definition
 * @returns {Object} Tool definition object
 */
export function getGetTagTool() {
  return {
    name: 'get_tag',
    description: 'Retrieves detailed information about a specific tag by its ID.',
    input_schema: {
      type: 'object',
      properties: {
        tag_id: {
          type: 'number',
          description: 'The ID of the tag to retrieve.',
        },
      },
      required: ['tag_id'],
    },
    handler: async (parameters) => {
      const { tag_id } = parameters;
      
      if (!tag_id || typeof tag_id !== 'number') {
        throw new Error('tag_id must be a valid number');
      }
      
      const tag = await getTagById(tag_id);
      
      if (!tag) {
        throw new Error(`Tag with ID ${tag_id} not found`);
      }
      
      return {
        success: true,
        tag: {
          id: tag.id,
          name: tag.name,
          created_at: tag.created_at,
          updated_at: tag.updated_at,
        },
      };
    },
  };
}


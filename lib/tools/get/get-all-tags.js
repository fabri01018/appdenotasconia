/**
 * Get All Tags Tool
 * 
 * Tool definition for retrieving all tags.
 */

import { getAllTags } from '../../../repositories/tags.js';

/**
 * Creates and returns the get_all_tags tool definition
 * @returns {Object} Tool definition object
 */
export function getGetAllTagsTool() {
  return {
    name: 'get_all_tags',
    description: 'Retrieves all tags. Use this when you need to find a tag by name or show all available tags.',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
    handler: async (parameters) => {
      const tags = await getAllTags();
      
      return {
        success: true,
        tags: tags.map(t => ({
          id: t.id,
          name: t.name,
          created_at: t.created_at,
          updated_at: t.updated_at,
        })),
        count: tags.length,
      };
    },
  };
}


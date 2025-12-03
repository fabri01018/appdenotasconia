/**
 * Get Section Tool
 * 
 * Tool definition for retrieving a specific section by ID.
 */

import { getSectionById } from '../../../repositories/sections.js';

/**
 * Creates and returns the get_section tool definition
 * @returns {Object} Tool definition object
 */
export function getGetSectionTool() {
  return {
    name: 'get_section',
    description: 'Retrieves detailed information about a specific section by its ID.',
    input_schema: {
      type: 'object',
      properties: {
        section_id: {
          type: 'number',
          description: 'The ID of the section to retrieve.',
        },
      },
      required: ['section_id'],
    },
    handler: async (parameters) => {
      const { section_id } = parameters;
      
      if (!section_id || typeof section_id !== 'number') {
        throw new Error('section_id must be a valid number');
      }
      
      const section = await getSectionById(section_id);
      
      if (!section) {
        throw new Error(`Section with ID ${section_id} not found`);
      }
      
      return {
        success: true,
        section: {
          id: section.id,
          project_id: section.project_id,
          name: section.name,
          created_at: section.created_at,
          updated_at: section.updated_at,
        },
      };
    },
  };
}


/**
 * Update Section Tool
 * 
 * Tool definition for updating a section's name.
 */

import { updateSection } from '../../../repositories/sections.js';

/**
 * Creates and returns the update_section tool definition
 * @returns {Object} Tool definition object
 */
export function getUpdateSectionTool() {
  return {
    name: 'update_section',
    description: 'Updates a section\'s name. Use this when the user wants to rename a section.',
    input_schema: {
      type: 'object',
      properties: {
        section_id: {
          type: 'number',
          description: 'The ID of the section to update.',
        },
        name: {
          type: 'string',
          description: 'The new name for the section.',
        },
      },
      required: ['section_id', 'name'],
    },
    handler: async (parameters) => {
      const { section_id, name } = parameters;
      
      if (!section_id || typeof section_id !== 'number') {
        throw new Error('section_id must be a valid number');
      }

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        throw new Error('name must be a non-empty string');
      }

      const updatedSection = await updateSection(section_id, name.trim());
      
      return {
        success: true,
        section: updatedSection,
        message: `Section renamed to "${updatedSection.name}"`,
      };
    },
  };
}


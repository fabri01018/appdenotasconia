/**
 * Get All Sections Tool
 * 
 * Tool definition for retrieving all sections from all projects.
 */

import { getAllSections } from '../../../repositories/sections.js';

/**
 * Creates and returns the get_all_sections tool definition
 * @returns {Object} Tool definition object
 */
export function getGetAllSectionsTool() {
  return {
    name: 'get_all_sections',
    description: 'Retrieves all sections from all projects.',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
    handler: async (parameters) => {
      const sections = await getAllSections();
      
      return {
        success: true,
        sections: sections.map(s => ({
          id: s.id,
          project_id: s.project_id,
          name: s.name,
          created_at: s.created_at,
          updated_at: s.updated_at,
        })),
        count: sections.length,
      };
    },
  };
}


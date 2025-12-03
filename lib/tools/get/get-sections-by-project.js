/**
 * Get Sections by Project Tool
 * 
 * Tool definition for retrieving sections in a specific project.
 */

import { getSectionsByProjectId } from '../../../repositories/sections.js';

/**
 * Creates and returns the get_sections_by_project tool definition
 * @returns {Object} Tool definition object
 */
export function getGetSectionsByProjectTool() {
  return {
    name: 'get_sections_by_project',
    description: 'Retrieves all sections in a specific project.',
    input_schema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'number',
          description: 'The ID of the project to get sections from.',
        },
      },
      required: ['project_id'],
    },
    handler: async (parameters) => {
      const { project_id } = parameters;
      
      if (!project_id || typeof project_id !== 'number') {
        throw new Error('project_id must be a valid number');
      }
      
      const sections = await getSectionsByProjectId(project_id);
      
      return {
        success: true,
        project_id,
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


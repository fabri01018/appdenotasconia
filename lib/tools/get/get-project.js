/**
 * Get Project Tool
 * 
 * Tool definition for retrieving a specific project by ID.
 */

import { getProjectById } from '../../../repositories/projects.js';

/**
 * Creates and returns the get_project tool definition
 * @returns {Object} Tool definition object
 */
export function getGetProjectTool() {
  return {
    name: 'get_project',
    description: 'Retrieves detailed information about a specific project by its ID.',
    input_schema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'number',
          description: 'The ID of the project to retrieve.',
        },
      },
      required: ['project_id'],
    },
    handler: async (parameters) => {
      const { project_id } = parameters;
      
      if (!project_id || typeof project_id !== 'number') {
        throw new Error('project_id must be a valid number');
      }
      
      const project = await getProjectById(project_id);
      
      if (!project) {
        throw new Error(`Project with ID ${project_id} not found`);
      }
      
      return {
        success: true,
        project: {
          id: project.id,
          name: project.name,
          created_at: project.created_at,
          updated_at: project.updated_at,
        },
      };
    },
  };
}


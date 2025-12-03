/**
 * Update Project Tool
 * 
 * Tool definition for updating a project's name.
 */

import { updateProject } from '../../../repositories/projects.js';

/**
 * Creates and returns the update_project tool definition
 * @returns {Object} Tool definition object
 */
export function getUpdateProjectTool() {
  return {
    name: 'update_project',
    description: 'Updates a project\'s name. Use this when the user wants to rename a project.',
    input_schema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'number',
          description: 'The ID of the project to update.',
        },
        name: {
          type: 'string',
          description: 'The new name for the project.',
        },
      },
      required: ['project_id', 'name'],
    },
    handler: async (parameters) => {
      const { project_id, name } = parameters;
      
      if (!project_id || typeof project_id !== 'number') {
        throw new Error('project_id must be a valid number');
      }

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        throw new Error('name must be a non-empty string');
      }

      const updatedProject = await updateProject(project_id, name.trim());
      
      return {
        success: true,
        project: updatedProject,
        message: `Project renamed to "${updatedProject.name}"`,
      };
    },
  };
}


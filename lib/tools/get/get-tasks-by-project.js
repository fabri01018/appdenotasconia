/**
 * Get Tasks by Project Tool
 * 
 * Tool definition for retrieving tasks in a specific project.
 */

import { getTasksByProjectId } from '../../../repositories/tasks.js';

/**
 * Creates and returns the get_tasks_by_project tool definition
 * @returns {Object} Tool definition object
 */
export function getGetTasksByProjectTool() {
  return {
    name: 'get_tasks_by_project',
    description: 'Retrieves all tasks in a specific project. Use this when the user wants to see tasks in a particular project.',
    input_schema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'number',
          description: 'The ID of the project to get tasks from.',
        },
      },
      required: ['project_id'],
    },
    handler: async (parameters) => {
      const { project_id } = parameters;
      
      if (!project_id || typeof project_id !== 'number') {
        throw new Error('project_id must be a valid number');
      }
      
      const tasks = await getTasksByProjectId(project_id);
      
      return {
        success: true,
        project_id,
        tasks: tasks.map(t => ({
          id: t.id,
          project_id: t.project_id,
          section_id: t.section_id,
          parent_id: t.parent_id,
          title: t.title,
          description: t.description,
          completed: t.completed === 1,
          created_at: t.created_at,
          updated_at: t.updated_at,
        })),
        count: tasks.length,
      };
    },
  };
}


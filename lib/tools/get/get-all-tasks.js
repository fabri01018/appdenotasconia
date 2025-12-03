/**
 * Get All Tasks Tool
 * 
 * Tool definition for retrieving all tasks from all projects.
 */

import { getAllTasks } from '../../../repositories/tasks.js';

/**
 * Creates and returns the get_all_tasks tool definition
 * @returns {Object} Tool definition object
 */
export function getGetAllTasksTool() {
  return {
    name: 'get_all_tasks',
    description: 'Retrieves all tasks from all projects. Returns tasks with their project names included. Use this when the user wants to see all their tasks across all projects.',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
    handler: async (parameters) => {
      const tasks = await getAllTasks();
      
      return {
        success: true,
        tasks: tasks.map(t => ({
          id: t.id,
          project_id: t.project_id,
          project_name: t.project_name,
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


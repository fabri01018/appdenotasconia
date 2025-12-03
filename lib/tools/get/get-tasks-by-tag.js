/**
 * Get Tasks by Tag Tool
 * 
 * Tool definition for retrieving tasks filtered by a specific tag.
 */

import { getTasksByTagId } from '../../../repositories/tasks.js';

/**
 * Creates and returns the get_tasks_by_tag tool definition
 * @returns {Object} Tool definition object
 */
export function getGetTasksByTagTool() {
  return {
    name: 'get_tasks_by_tag',
    description: 'Retrieves all tasks that have a specific tag. Use this when the user wants to see tasks filtered by a particular tag.',
    input_schema: {
      type: 'object',
      properties: {
        tag_id: {
          type: 'number',
          description: 'The ID of the tag to filter tasks by.',
        },
      },
      required: ['tag_id'],
    },
    handler: async (parameters) => {
      const { tag_id } = parameters;
      
      if (!tag_id || typeof tag_id !== 'number') {
        throw new Error('tag_id must be a valid number');
      }
      
      const tasks = await getTasksByTagId(tag_id);
      
      return {
        success: true,
        tag_id,
        tasks: tasks.map(t => ({
          id: t.id,
          project_id: t.project_id,
          project_name: t.project_name,
          section_id: t.section_id,
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


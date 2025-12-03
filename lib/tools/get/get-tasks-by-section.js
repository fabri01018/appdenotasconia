/**
 * Get Tasks by Section Tool
 * 
 * Tool definition for retrieving tasks in a specific section.
 */

import { getTasksBySectionId } from '../../../repositories/tasks.js';

/**
 * Creates and returns the get_tasks_by_section tool definition
 * @returns {Object} Tool definition object
 */
export function getGetTasksBySectionTool() {
  return {
    name: 'get_tasks_by_section',
    description: 'Retrieves all tasks in a specific section. Use this when the user wants to see tasks in a particular section of a project.',
    input_schema: {
      type: 'object',
      properties: {
        section_id: {
          type: 'number',
          description: 'The ID of the section to get tasks from.',
        },
      },
      required: ['section_id'],
    },
    handler: async (parameters) => {
      const { section_id } = parameters;
      
      if (!section_id || typeof section_id !== 'number') {
        throw new Error('section_id must be a valid number');
      }
      
      const tasks = await getTasksBySectionId(section_id);
      
      return {
        success: true,
        section_id,
        tasks: tasks.map(t => ({
          id: t.id,
          project_id: t.project_id,
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


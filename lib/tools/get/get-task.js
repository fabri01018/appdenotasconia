/**
 * Get Task Tool
 * 
 * Tool definition for retrieving a specific task by ID.
 */

import { getSubTasks, getTaskById, getTaskTags } from '../../../repositories/tasks.js';

/**
 * Creates and returns the get_task tool definition
 * @returns {Object} Tool definition object
 */
export function getGetTaskTool() {
  return {
    name: 'get_task',
    description: 'Retrieves detailed information about a specific task by its ID, including the project name, any associated tags, and subtasks.',
    input_schema: {
      type: 'object',
      properties: {
        task_id: {
          type: 'number',
          description: 'The ID of the task to retrieve.',
        },
      },
      required: ['task_id'],
    },
    handler: async (parameters) => {
      const { task_id } = parameters;
      
      if (!task_id || typeof task_id !== 'number') {
        throw new Error('task_id must be a valid number');
      }
      
      const task = await getTaskById(task_id);
      
      if (!task) {
        throw new Error(`Task with ID ${task_id} not found`);
      }
      
      // Get tags for this task
      const tags = await getTaskTags(task_id);

      // Get subtasks for this task
      const subtasks = await getSubTasks(task_id);
      
      return {
        success: true,
        task: {
          id: task.id,
          project_id: task.project_id,
          project_name: task.project_name,
          section_id: task.section_id,
          parent_id: task.parent_id,
          title: task.title,
          description: task.description,
          completed: task.completed === 1,
          created_at: task.created_at,
          updated_at: task.updated_at,
          tags: tags.map(t => ({
            id: t.id,
            name: t.name,
          })),
          subtasks: subtasks.map(s => ({
            id: s.id,
            title: s.title,
            completed: s.completed === 1,
          })),
        },
      };
    },
  };
}


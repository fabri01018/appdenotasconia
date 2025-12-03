/**
 * Uncomplete Task Tool
 * 
 * Tool definition for marking a task as incomplete.
 */

import { getDb } from '../../../lib/database.js';
import { getTaskById } from '../../../repositories/tasks.js';

/**
 * Creates and returns the uncomplete_task tool definition
 * @returns {Object} Tool definition object
 */
export function getUncompleteTaskTool() {
  return {
    name: 'uncomplete_task',
    description: 'Marks a task as incomplete/not completed. Use this when the user wants to unmark a completed task.',
    input_schema: {
      type: 'object',
      properties: {
        task_id: {
          type: 'number',
          description: 'The ID of the task to mark as incomplete.',
        },
      },
      required: ['task_id'],
    },
    handler: async (parameters) => {
      const { task_id } = parameters;
      
      if (!task_id || typeof task_id !== 'number') {
        throw new Error('task_id must be a valid number');
      }

      // Get current task
      const currentTask = await getTaskById(task_id);
      if (!currentTask) {
        throw new Error(`Task with ID ${task_id} not found`);
      }

      // Update completed status directly in database
      const db = getDb();
      const now = new Date().toISOString();
      const result = await db.runAsync(
        'UPDATE tasks SET completed = 0, updated_at = ?, sync_status = ? WHERE id = ?',
        [now, 'pending', task_id]
      );

      if (result.changes === 0) {
        throw new Error(`Task with ID ${task_id} not found`);
      }

      return {
        success: true,
        task_id,
        completed: false,
        message: `Task "${currentTask.title}" marked as incomplete`,
      };
    },
  };
}


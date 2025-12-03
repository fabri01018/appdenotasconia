/**
 * Complete Task Tool
 * 
 * Tool definition for marking a task as completed.
 */

import { PIN_TAG_NAME } from '../../../constants/pin.js';
import { getDb } from '../../../lib/database.js';
import { getTaskById, getTaskTags, removeTagFromTask } from '../../../repositories/tasks.js';

/**
 * Creates and returns the complete_task tool definition
 * @returns {Object} Tool definition object
 */
export function getCompleteTaskTool() {
  return {
    name: 'complete_task',
    description: 'Marks a task as completed. Use this when the user wants to mark a task as done or finished.',
    input_schema: {
      type: 'object',
      properties: {
        task_id: {
          type: 'number',
          description: 'The ID of the task to mark as completed.',
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
        'UPDATE tasks SET completed = 1, updated_at = ?, sync_status = ? WHERE id = ?',
        [now, 'pending', task_id]
      );

      if (result.changes === 0) {
        throw new Error(`Task with ID ${task_id} not found`);
      }

      // Auto-unpin: Remove Pinned tag if task is pinned
      try {
        const taskTags = await getTaskTags(task_id);
        const pinnedTag = taskTags.find(tag => tag.name === PIN_TAG_NAME);
        if (pinnedTag) {
          await removeTagFromTask(task_id, pinnedTag.id);
        }
      } catch (error) {
        console.error('Error auto-unpinning task on completion:', error);
        // Don't throw - completion should succeed even if unpin fails
      }

      return {
        success: true,
        task_id,
        completed: true,
        message: `Task "${currentTask.title}" marked as completed`,
      };
    },
  };
}


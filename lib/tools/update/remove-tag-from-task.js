/**
 * Remove Tag from Task Tool
 * 
 * Tool definition for removing a tag from a task.
 */

import { getTagById } from '../../../repositories/tags.js';
import { getTaskById, removeTagFromTask } from '../../../repositories/tasks.js';

/**
 * Creates and returns the remove_tag_from_task tool definition
 * @returns {Object} Tool definition object
 */
export function getRemoveTagFromTaskTool() {
  return {
    name: 'remove_tag_from_task',
    description: 'Removes a tag from a task. Use this when the user wants to remove a tag from a task.',
    input_schema: {
      type: 'object',
      properties: {
        task_id: {
          type: 'number',
          description: 'The ID of the task to remove the tag from.',
        },
        tag_id: {
          type: 'number',
          description: 'The ID of the tag to remove from the task.',
        },
      },
      required: ['task_id', 'tag_id'],
    },
    handler: async (parameters) => {
      const { task_id, tag_id } = parameters;
      
      if (!task_id || typeof task_id !== 'number') {
        throw new Error('task_id must be a valid number');
      }

      if (!tag_id || typeof tag_id !== 'number') {
        throw new Error('tag_id must be a valid number');
      }

      // Verify task exists
      const task = await getTaskById(task_id);
      if (!task) {
        throw new Error(`Task with ID ${task_id} not found`);
      }

      // Verify tag exists
      const tag = await getTagById(tag_id);
      if (!tag) {
        throw new Error(`Tag with ID ${tag_id} not found`);
      }

      await removeTagFromTask(task_id, tag_id);
      
      return {
        success: true,
        task_id,
        tag_id,
        message: `Tag "${tag.name}" removed from task "${task.title}"`,
      };
    },
  };
}


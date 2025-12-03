/**
 * Add Tag to Task Tool
 * 
 * Tool definition for adding a tag to a task.
 */

import { getTagById } from '../../../repositories/tags.js';
import { addTagToTask, getTaskById } from '../../../repositories/tasks.js';

/**
 * Creates and returns the add_tag_to_task tool definition
 * @returns {Object} Tool definition object
 */
export function getAddTagToTaskTool() {
  return {
    name: 'add_tag_to_task',
    description: 'Adds a tag to a task. Use this when the user wants to tag a task with a specific tag.',
    input_schema: {
      type: 'object',
      properties: {
        task_id: {
          type: 'number',
          description: 'The ID of the task to add the tag to.',
        },
        tag_id: {
          type: 'number',
          description: 'The ID of the tag to add to the task.',
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

      await addTagToTask(task_id, tag_id);
      
      return {
        success: true,
        task_id,
        tag_id,
        message: `Tag "${tag.name}" added to task "${task.title}"`,
      };
    },
  };
}


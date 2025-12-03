/**
 * Update Task Tool
 * 
 * Tool definition for updating task properties.
 */

import { getTaskById, updateTask } from '../../../repositories/tasks.js';

/**
 * Creates and returns the update_task tool definition
 * @returns {Object} Tool definition object
 */
export function getUpdateTaskTool() {
  return {
    name: 'update_task',
    description: 'Updates a task\'s properties including title, description, project_id, section_id, and parent_id. Use this when the user wants to modify an existing task.',
    input_schema: {
      type: 'object',
      properties: {
        task_id: {
          type: 'number',
          description: 'The ID of the task to update.',
        },
        title: {
          type: 'string',
          description: 'New title for the task (optional).',
        },
        description: {
          type: 'string',
          description: 'New description for the task (optional).',
        },
        project_id: {
          type: 'number',
          description: 'Move the task to a different project by providing a new project_id (optional).',
        },
        section_id: {
          type: 'number',
          description: 'Move the task to a different section within the project (optional). Use null to remove from a section.',
        },
        parent_id: {
          type: 'number',
          description: 'Make this task a subtask of another task (optional). Use null to remove from parent.',
        },
      },
      required: ['task_id'],
    },
    handler: async (parameters) => {
      const { task_id, title, description, project_id, section_id, parent_id } = parameters;
      
      if (!task_id || typeof task_id !== 'number') {
        throw new Error('task_id must be a valid number');
      }

      // Get current task to preserve fields that aren't being updated
      const currentTask = await getTaskById(task_id);
      if (!currentTask) {
        throw new Error(`Task with ID ${task_id} not found`);
      }

      // Build updates object with only provided fields
      const updates = {};
      if (title !== undefined) {
        if (typeof title !== 'string' || title.trim().length === 0) {
          throw new Error('title must be a non-empty string');
        }
        updates.title = title.trim();
      } else {
        updates.title = currentTask.title;
      }

      if (description !== undefined) {
        updates.description = description !== null && description.trim().length > 0 ? description.trim() : null;
      } else {
        updates.description = currentTask.description;
      }

      if (project_id !== undefined) {
        if (typeof project_id !== 'number') {
          throw new Error('project_id must be a valid number');
        }
        updates.project_id = project_id;
      } else {
        updates.project_id = currentTask.project_id;
      }

      if (section_id !== undefined) {
        updates.section_id = section_id !== null && section_id !== undefined ? section_id : null;
      } else {
        updates.section_id = currentTask.section_id;
      }

      if (parent_id !== undefined) {
        updates.parent_id = parent_id !== null && parent_id !== undefined ? parent_id : null;
      } else {
        updates.parent_id = currentTask.parent_id;
      }

      const updatedTask = await updateTask(task_id, updates);
      
      return {
        success: true,
        task: updatedTask,
        message: `Task "${updatedTask.title}" updated successfully`,
      };
    },
  };
}


/**
 * Create Task Tool
 * 
 * Tool definition for creating new tasks in projects.
 */

import { createTask } from '../../repositories/tasks.js';

/**
 * Creates and returns the create_task tool definition
 * @returns {Object} Tool definition object
 */
export function getCreateTaskTool() {
  return {
    name: 'create_task',
    description: 'Creates a new task in a project. Use this when the user wants to add a task to their project. You can optionally specify a section_id to add the task to a specific section within the project. If no project_id is provided, you can use get_projects first to find the appropriate project. You can also specify a parent_id to create a subtask.',
    input_schema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'number',
          description: 'The ID of the project where the task should be created. This is required.',
        },
        title: {
          type: 'string',
          description: 'The title of the task. This is required.',
        },
        description: {
          type: 'string',
          description: 'Optional description or details about the task.',
        },
        section_id: {
          type: 'number',
          description: 'Optional section ID if the task should be placed in a specific section within the project.',
        },
        parent_id: {
          type: 'number',
          description: 'Optional parent task ID if this is a subtask.',
        },
      },
      required: ['project_id', 'title'],
    },
    handler: async (parameters) => {
      const { project_id, title, description, section_id, parent_id } = parameters;
      
      // Validate project_id
      if (!project_id || typeof project_id !== 'number') {
        throw new Error('project_id must be a valid number');
      }
      
      // Validate title
      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        throw new Error('title must be a non-empty string');
      }
      
      // Create the task
      const task = await createTask(
        project_id,
        title.trim(),
        description ? description.trim() : null,
        section_id || null,
        parent_id || null
      );
      
      return {
        success: true,
        task: {
          id: task.id,
          project_id: task.project_id,
          section_id: task.section_id,
          parent_id: task.parent_id,
          title: task.title,
          description: task.description,
        },
        message: `Task "${title.trim()}" created successfully in project ${project_id}${section_id ? `, section ${section_id}` : ''}${parent_id ? `, as subtask of ${parent_id}` : ''}`,
      };
    },
  };
}


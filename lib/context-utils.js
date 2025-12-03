/**
 * Context Utilities
 * 
 * Functions for formatting task context to be sent to AI
 */

import { getTaskTags } from '../repositories/tasks.js';

/**
 * Formats a task as a context string for AI
 * @param {Object} task - Task object with id, title, description, project_name, completed, updated_at
 * @returns {Promise<string>} Formatted context string
 */
export async function formatTaskContext(task) {
  if (!task) {
    return '';
  }

  try {
    // Get tags for the task
    const tags = await getTaskTags(task.id);
    const tagNames = tags && tags.length > 0 
      ? tags.map(t => t.name).join(', ') 
      : null;
    
    // Format the context
    const lines = [
      '=== Task Context ===',
      `ID: ${task.id}`,
      `Title: ${task.title || 'Untitled Task'}`,
      task.project_name ? `Project: ${task.project_name}` : null,
      '',
      task.description ? 'Description:' : null,
      task.description || '(No description)',
      '',
      tagNames ? `Tags: ${tagNames}` : null,
      `Status: ${task.completed === 1 ? 'Completed' : 'Incomplete'}`,
      task.updated_at ? `Last Updated: ${new Date(task.updated_at).toLocaleString()}` : null,
    ].filter(Boolean); // Remove null/undefined lines
    
    return lines.join('\n');
  } catch (error) {
    console.error('Error formatting task context:', error);
    // Return basic context even if tag fetching fails
    const lines = [
      '=== Task Context ===',
      `ID: ${task.id}`,
      `Title: ${task.title || 'Untitled Task'}`,
      task.project_name ? `Project: ${task.project_name}` : null,
      '',
      task.description ? 'Description:' : null,
      task.description || '(No description)',
      '',
      `Status: ${task.completed === 1 ? 'Completed' : 'Incomplete'}`,
    ].filter(Boolean);
    
    return lines.join('\n');
  }
}


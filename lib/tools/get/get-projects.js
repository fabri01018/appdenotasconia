/**
 * Get Projects Tool
 * 
 * Tool definition for retrieving all projects.
 */

import { getAllProjects, getInboxProject } from '../../../repositories/projects.js';

/**
 * Creates and returns the get_projects tool definition
 * @returns {Object} Tool definition object
 */
export function getGetProjectsTool() {
  return {
    name: 'get_projects',
    description: 'Retrieves a list of all available projects. Use this when you need to find a project by name or when the user wants to create a task but hasn\'t specified which project. The Inbox project is typically used as a default for tasks.',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
    handler: async (parameters) => {
      const projects = await getAllProjects();
      
      // Also get the Inbox project specifically
      const inboxProject = await getInboxProject();
      
      return {
        success: true,
        projects: projects.map(p => ({
          id: p.id,
          name: p.name,
          isInbox: p.name === 'Inbox',
        })),
        inboxProjectId: inboxProject?.id || null,
        message: `Found ${projects.length} project(s)`,
      };
    },
  };
}


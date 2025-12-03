/**
 * AI Tools Management System
 * 
 * This module handles the registration, management, and execution of tools
 * that can be used by the Claude AI assistant. Tools are functions that
 * Claude can call to interact with the application.
 */

// Import create tools
import { getCreateTaskTool } from './tools/create-task.js';

// Import get tools
import { getGetAllSectionsTool } from './tools/get/get-all-sections.js';
import { getGetAllTagsTool } from './tools/get/get-all-tags.js';
import { getGetAllTasksTool } from './tools/get/get-all-tasks.js';
import { getGetProjectTool } from './tools/get/get-project.js';
import { getGetProjectsTool } from './tools/get/get-projects.js';
import { getGetSectionTool } from './tools/get/get-section.js';
import { getGetSectionsByProjectTool } from './tools/get/get-sections-by-project.js';
import { getGetTagTool } from './tools/get/get-tag.js';
import { getGetTaskTool } from './tools/get/get-task.js';
import { getGetTasksByProjectTool } from './tools/get/get-tasks-by-project.js';
import { getGetTasksBySectionTool } from './tools/get/get-tasks-by-section.js';
import { getGetTasksByTagTool } from './tools/get/get-tasks-by-tag.js';

// Import update tools
import { getAddTagToTaskTool } from './tools/update/add-tag-to-task.js';
import { getCompleteTaskTool } from './tools/update/complete-task.js';
import { getRemoveTagFromTaskTool } from './tools/update/remove-tag-from-task.js';
import { getUncompleteTaskTool } from './tools/update/uncomplete-task.js';
import { getUpdateProjectTool } from './tools/update/update-project.js';
import { getUpdateSectionTool } from './tools/update/update-section.js';
import { getUpdateTagTool } from './tools/update/update-tag.js';
import { getUpdateTaskTool } from './tools/update/update-task.js';

/**
 * Tool Definition Schema
 * @typedef {Object} ToolDefinition
 * @property {string} name - Unique identifier for the tool
 * @property {string} description - Human-readable description of what the tool does
 * @property {Object} input_schema - JSON Schema defining the tool's parameters
 * @property {Function} handler - Function that executes when the tool is called
 */

/**
 * Registry of all available tools
 * @type {Map<string, ToolDefinition>}
 */
const toolRegistry = new Map();

/**
 * Registers a new tool for use by Claude AI
 * @param {ToolDefinition} toolDefinition - The tool definition object
 * @throws {Error} If tool name is already registered
 */
export function registerTool(toolDefinition) {
  const { name, description, input_schema, handler } = toolDefinition;

  // Validate required fields
  if (!name || !description || !input_schema || !handler) {
    throw new Error('Tool definition must include: name, description, input_schema, and handler');
  }

  // Check for duplicate names
  if (toolRegistry.has(name)) {
    throw new Error(`Tool with name "${name}" is already registered`);
  }

  // Validate handler is a function
  if (typeof handler !== 'function') {
    throw new Error('Tool handler must be a function');
  }

  // Register the tool
  toolRegistry.set(name, {
    name,
    description,
    input_schema,
    handler,
  });

  console.log(`✅ Tool registered: ${name}`);
}

/**
 * Unregisters a tool from the registry
 * @param {string} toolName - Name of the tool to unregister
 * @returns {boolean} True if tool was removed, false if it didn't exist
 */
export function unregisterTool(toolName) {
  const removed = toolRegistry.delete(toolName);
  if (removed) {
    console.log(`🗑️ Tool unregistered: ${toolName}`);
  }
  return removed;
}

/**
 * Gets a tool by name
 * @param {string} toolName - Name of the tool to retrieve
 * @returns {ToolDefinition|undefined} The tool definition or undefined if not found
 */
export function getTool(toolName) {
  return toolRegistry.get(toolName);
}

/**
 * Gets all registered tools
 * @returns {Array<ToolDefinition>} Array of all registered tools
 */
export function getAllTools() {
  return Array.from(toolRegistry.values());
}

/**
 * Gets the count of registered tools
 * @returns {number} Number of registered tools
 */
export function getToolCount() {
  return toolRegistry.size;
}

/**
 * Converts all registered tools to Claude API format
 * Claude's tools format requires:
 * - name: string
 * - description: string
 * - input_schema: JSON Schema object
 * @returns {Array<Object>} Array of tools in Claude API format
 */
export function getToolsForClaude() {
  return Array.from(toolRegistry.values()).map(tool => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.input_schema,
  }));
}

/**
 * Executes a tool call
 * @param {string} toolName - Name of the tool to execute
 * @param {Object} parameters - Parameters to pass to the tool handler
 * @returns {Promise<Object>} Result of the tool execution
 * @throws {Error} If tool is not found or execution fails
 */
export async function executeTool(toolName, parameters = {}) {
  const tool = toolRegistry.get(toolName);

  if (!tool) {
    throw new Error(`Tool "${toolName}" is not registered`);
  }

  try {
    console.log(`🔧 Executing tool: ${toolName} with parameters:`, parameters);
    const result = await tool.handler(parameters);
    console.log(`✅ Tool "${toolName}" executed successfully`);
    return {
      success: true,
      result,
      toolName,
    };
  } catch (error) {
    console.error(`❌ Tool "${toolName}" execution failed:`, error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred',
      toolName,
    };
  }
}

/**
 * Validates tool parameters against the tool's input schema
 * Basic validation - can be extended with a JSON Schema validator library
 * @param {string} toolName - Name of the tool to validate parameters for
 * @param {Object} parameters - Parameters to validate
 * @returns {{valid: boolean, errors: Array<string>}} Validation result
 */
export function validateToolParameters(toolName, parameters) {
  const tool = toolRegistry.get(toolName);

  if (!tool) {
    return { valid: false, errors: [`Tool "${toolName}" is not registered`] };
  }

  const errors = [];
  const schema = tool.input_schema;

  // Validate required properties
  if (schema.required && Array.isArray(schema.required)) {
    for (const requiredProp of schema.required) {
      if (!(requiredProp in parameters)) {
        errors.push(`Required parameter "${requiredProp}" is missing`);
      }
    }
  }

  // Validate properties exist in schema
  if (schema.properties) {
    for (const paramKey in parameters) {
      if (!schema.properties[paramKey]) {
        errors.push(`Unknown parameter "${paramKey}" is not defined in schema`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Clears all registered tools (useful for testing/reset)
 */
export function clearAllTools() {
  const count = toolRegistry.size;
  toolRegistry.clear();
  console.log(`🧹 Cleared ${count} tool(s) from registry`);
}

/**
 * Tool Categories
 * Useful for organizing tools by functionality
 */
export const ToolCategories = {
  DATABASE: 'database',
  TASKS: 'tasks',
  PROJECTS: 'projects',
  SECTIONS: 'sections',
  TAGS: 'tags',
  SEARCH: 'search',
  ANALYSIS: 'analysis',
  UTILITY: 'utility',
};

// Example tool structure (commented out - not registered):
/*
registerTool({
  name: 'example_tool',
  description: 'An example tool that demonstrates the structure',
  input_schema: {
    type: 'object',
    properties: {
      param1: {
        type: 'string',
        description: 'Description of param1',
      },
      param2: {
        type: 'number',
        description: 'Description of param2',
      },
    },
    required: ['param1'],
  },
  handler: async (parameters) => {
    const { param1, param2 } = parameters;
    // Tool logic here
    return { result: 'success', data: { param1, param2 } };
  },
});
*/

/**
 * Initialize tools system
 * This can be called on app startup to register default tools
 */
export function initializeTools() {
  console.log('🔧 Initializing AI Tools System...');
  
  // Register: Create Task Tool
  registerTool(getCreateTaskTool());

  // Register: Get Tools
  registerTool(getGetProjectsTool());
  registerTool(getGetProjectTool());
  registerTool(getGetAllTasksTool());
  registerTool(getGetTasksByProjectTool());
  registerTool(getGetTasksBySectionTool());
  registerTool(getGetTaskTool());
  registerTool(getGetTasksByTagTool());
  registerTool(getGetAllSectionsTool());
  registerTool(getGetSectionsByProjectTool());
  registerTool(getGetSectionTool());
  registerTool(getGetAllTagsTool());
  registerTool(getGetTagTool());

  // Register: Update Tools
  registerTool(getUpdateTaskTool());
  registerTool(getCompleteTaskTool());
  registerTool(getUncompleteTaskTool());
  registerTool(getUpdateProjectTool());
  registerTool(getUpdateSectionTool());
  registerTool(getUpdateTagTool());
  registerTool(getAddTagToTaskTool());
  registerTool(getRemoveTagFromTaskTool());

  console.log(`✅ Tools System initialized. ${toolRegistry.size} tool(s) registered.`);
}

// Auto-initialize on module load
initializeTools();


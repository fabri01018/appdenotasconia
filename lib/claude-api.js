import Constants from 'expo-constants';
import { executeTool, getToolsForClaude } from './tools.js';

// Claude API configuration
const claudeApiKey = Constants.expoConfig?.extra?.claudeApiKey || process.env.EXPO_PUBLIC_CLAUDE_API_KEY;

if (!claudeApiKey) {
  console.warn('⚠️ Claude API key not found in configuration');
  console.warn('📋 Please add claudeApiKey to app.json extra section or set EXPO_PUBLIC_CLAUDE_API_KEY environment variable');
}

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const MAX_TOOL_ITERATIONS = 5; // Prevent infinite loops

/**
 * Masks an API key for safe logging
 * Shows first 4 and last 4 characters, masks the middle
 * @param {string} apiKey - The API key to mask
 * @returns {string} Masked API key
 */
function maskApiKey(apiKey) {
  if (!apiKey || apiKey.length < 8) return '***';
  const start = apiKey.substring(0, 4);
  const end = apiKey.substring(apiKey.length - 4);
  return `${start}***${end}`;
}

/**
 * Sends a message to Claude API and returns the response
 * Handles tool use by executing tools and sending results back
 * @param {string} message - The user's message
 * @param {Array} conversationHistory - Previous messages in the conversation
 * @param {string} systemMessage - Optional system message to send to Claude
 * @param {boolean} toolsDisabled - If true, disables tool usage for this request
 * @param {function} onToolUpdate - Optional callback for tool usage updates (name, status)
 * @returns {Promise<{text: string, error?: string}>}
 */
export async function sendMessageToClaude(message, conversationHistory = [], systemMessage = null, toolsDisabled = false, onToolUpdate = null) {
  if (!claudeApiKey) {
    return { text: '', error: 'Claude API key is not configured. Please add it to app.json.' };
  }

  try {
    // Get available tools
    const tools = getToolsForClaude();
    
    // Build messages array for Claude API
    // Claude Messages API expects content as an array of text blocks
    const messages = conversationHistory.map(msg => ({
      role: msg.isUser ? 'user' : 'assistant',
      content: msg.content || [{ type: 'text', text: msg.text }],
    }));

    // Add the current user message
    messages.push({
      role: 'user',
      content: [{ type: 'text', text: message }],
    });

    // Handle tool use in a loop (Claude may need multiple rounds)
    let iterations = 0;
    let finalResponse = null;

    while (iterations < MAX_TOOL_ITERATIONS) {
      iterations++;

      // Make API request
      const requestBody = {
        model: 'claude-sonnet-4-5',
        max_tokens: 1024,
        messages: messages,
      };

      // Add system message if provided
      if (systemMessage) {
        requestBody.system = systemMessage;
      }

      // Only add tools if we have any AND tools are not disabled
      if (tools.length > 0 && !toolsDisabled) {
        requestBody.tools = tools;
      }

      // Log request details before sending
      const maskedHeaders = {
        'Content-Type': 'application/json',
        'x-api-key': maskApiKey(claudeApiKey),
        'anthropic-version': '2023-06-01',
      };

      // Simplify tool logging for better readability
      const toolsLog = tools.length > 0 
        ? tools.map(t => t.name).join(', ') 
        : 'None';

      const requestBodyLog = {
        ...requestBody,
        // Replace full tools array with simplified names if present
        ...(requestBody.tools ? { tools: `[${requestBody.tools.map(t => t.name).join(', ')}] (${requestBody.tools.length} tools)` } : {})
      };

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📤 Claude API Request');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Iteration: ${iterations}${iterations === 1 ? ' (Initial)' : ' (Tool Follow-up)'}`);
      console.log(`URL: ${CLAUDE_API_URL}`);
      console.log(`Method: POST`);
      console.log('Headers:', maskedHeaders);
      console.log('Request Body:', JSON.stringify(requestBodyLog, null, 2));
      console.log(`Context: ${tools.length} tools available [${toolsLog}], ${toolsDisabled ? 'disabled' : 'enabled'}, ${messages.length} messages in conversation`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      const response = await fetch(CLAUDE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': claudeApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Claude API Error:', errorData);
        
        if (response.status === 401) {
          return { text: '', error: 'Invalid API key. Please check your Claude API key.' };
        } else if (response.status === 429) {
          return { text: '', error: 'Rate limit exceeded. Please try again later.' };
        } else {
          return { text: '', error: `API Error: ${errorData.error?.message || response.statusText}` };
        }
      }

      const data = await response.json();
      
      // Check if Claude wants to use tools
      const toolUseBlocks = data.content?.filter(item => item.type === 'tool_use') || [];
      const textContent = data.content?.find(item => item.type === 'text');

      // If there are tool uses, execute them and continue the conversation
      if (toolUseBlocks.length > 0) {
        console.log(`🔧 Claude requested ${toolUseBlocks.length} tool(s)`);
        
        // Add assistant's message with tool use requests
        messages.push({
          role: 'assistant',
          content: data.content,
        });

        // Execute all requested tools
        const toolResults = [];
        for (const toolUse of toolUseBlocks) {
          try {
            if (onToolUpdate) {
              onToolUpdate(toolUse.name, 'running', toolUse.id);
            }

            const result = await executeTool(toolUse.name, toolUse.input);
            
            if (onToolUpdate) {
              onToolUpdate(toolUse.name, 'completed', toolUse.id);
            }

            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: JSON.stringify(result),
            });
          } catch (error) {
            console.error(`Error executing tool ${toolUse.name}:`, error);
            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              is_error: true,
              content: JSON.stringify({ error: error.message }),
            });
          }
        }

        // Add tool results as user message (following Claude's API pattern)
        messages.push({
          role: 'user',
          content: toolResults,
        });

        // Continue the loop to get Claude's response after tool execution
        continue;
      }

      // No tool use - we have the final response
      finalResponse = textContent?.text || 'No response generated.';
      break;
    }

    if (iterations >= MAX_TOOL_ITERATIONS) {
      console.warn('⚠️ Maximum tool iterations reached');
    }

    return { text: finalResponse || 'No response generated.', error: null };
  } catch (error) {
    console.error('Error calling Claude API:', error);
    return { 
      text: '', 
      error: error.message || 'Failed to connect to Claude API. Please check your internet connection.' 
    };
  }
}


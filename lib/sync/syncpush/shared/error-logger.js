import Constants from 'expo-constants';
import { logger } from './logger.js';

/**
 * Log detailed Supabase error information for debugging
 * @param {Object} error - The Supabase error object
 * @param {string} operation - Description of the operation (e.g., "pulling tasks", "pushing project")
 * @param {string} tableName - The table name being accessed
 * @param {Object} context - Additional context (query details, record ID, etc.)
 */
export function logSupabaseError(error, operation, tableName, context = {}) {
  logger.error(`❌ Supabase Error - ${operation} (table: ${tableName})`);
  
  // Log Supabase configuration (masked for security)
  const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  
  logger.error('Supabase Configuration:', {
    url: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'NOT SET',
    anonKeySet: !!supabaseAnonKey,
    anonKeyPrefix: supabaseAnonKey ? supabaseAnonKey.substring(0, 20) + '...' : 'NOT SET',
  });
  
  // Log basic error properties
  if (error) {
    // Try to get all properties (including non-enumerable ones)
    const allProps = [];
    try {
      allProps.push(...Object.keys(error));
      allProps.push(...Object.getOwnPropertyNames(error));
    } catch (e) {
      logger.error('Could not enumerate error properties:', e.message);
    }

    logger.error('Error Object:', {
      message: error.message || 'No message',
      code: error.code || 'No code',
      details: error.details || 'No details',
      hint: error.hint || 'No hint',
      status: error.status || 'No status',
      statusCode: error.statusCode || 'No statusCode',
      response: error.response ? 'Has response object' : 'No response',
      request: error.request ? 'Has request object' : 'No request',
    });

    // Try to access nested properties that Supabase might use
    if (error.response) {
      logger.error('Error Response Object:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: error.response.headers ? Object.keys(error.response.headers) : 'No headers',
      });
    }

    // Try to access PostgrestError properties if it's a PostgrestError
    if (error.name === 'PostgrestError' || error.constructor?.name === 'PostgrestError') {
      logger.error('PostgrestError detected - checking for additional properties');
    }

    // Log full error object structure with replacer to handle circular refs
    try {
      const seen = new WeakSet();
      const stringified = JSON.stringify(error, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular]';
          }
          seen.add(value);
        }
        // Try to stringify functions, errors, etc.
        if (typeof value === 'function') {
          return `[Function: ${value.name || 'anonymous'}]`;
        }
        if (value instanceof Error) {
          return {
            name: value.name,
            message: value.message,
            stack: value.stack,
          };
        }
        return value;
      }, 2);
      logger.error('Full Error Object:', stringified);
    } catch (e) {
      logger.error('Could not stringify error object:', e.message);
      logger.error('Stringify error:', e);
      // Try to log it as-is
      logger.error('Error object (raw):', error);
    }
    
    // Log all property names (including non-enumerable)
    logger.error('All Error Properties:', {
      enumerable: Object.keys(error),
      all: allProps,
      unique: [...new Set(allProps)],
    });
    
    // Log error object prototype chain
    if (error.constructor) {
      logger.error('Error Constructor Info:', {
        name: error.constructor.name,
        prototype: Object.getOwnPropertyNames(error.constructor.prototype || {}),
      });
    }

    // Check for common Supabase error patterns
    if (error.message && error.message.includes('paused')) {
      logger.error('⚠️ PAUSED PROJECT DETECTED - This suggests:');
      logger.error('  1. The Supabase project might actually be paused');
      logger.error('  2. The URL might be pointing to a paused project');
      logger.error('  3. There might be a network/proxy issue returning cached error');
      logger.error('  4. The anon key might be from a different (paused) project');
    }
    
    // Log error stack if available
    if (error.stack) {
      logger.error('Error Stack:', error.stack);
    }

    // Try to access any internal properties
    try {
      const internalProps = ['_message', '_code', '_details', '_hint', '_status', 'originalError'];
      const foundInternal = {};
      for (const prop of internalProps) {
        if (prop in error) {
          foundInternal[prop] = error[prop];
        }
      }
      if (Object.keys(foundInternal).length > 0) {
        logger.error('Internal Error Properties:', foundInternal);
      }
    } catch (e) {
      // Ignore errors accessing internal properties
    }
  } else {
    logger.error('Error is null or undefined');
  }

  // Log context information
  if (Object.keys(context).length > 0) {
    logger.error('Context:', context);
  }

  // Log additional diagnostic information
  logger.error('Diagnostic Info:', {
    timestamp: new Date().toISOString(),
    table: tableName,
    operation: operation,
    errorType: error?.constructor?.name || typeof error,
  });
}


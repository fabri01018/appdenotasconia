/**
 * Error handling utilities for Deepgram WebSocket client
 * Normalizes different error types into a consistent format
 */

/**
 * Get human-readable message for WebSocket close codes
 */
function getCloseCodeMessage(code) {
  const closeCodeMessages = {
    1000: 'Normal closure',
    1001: 'Going away',
    1002: 'Protocol error',
    1003: 'Unsupported data',
    1006: 'Abnormal closure',
    1007: 'Invalid frame payload data',
    1008: 'Policy violation',
    1009: 'Message too big',
    1010: 'Mandatory extension',
    1011: 'Internal server error',
    4000: 'Authentication failed',
    4001: 'Invalid API key',
    4002: 'Account suspended',
    4003: 'Rate limit exceeded',
  };
  return closeCodeMessages[code] || null;
}

/**
 * Normalize different error types into a consistent format
 * @param {*} error - Error object, Event object, CloseEvent, string, or other
 * @param {Object} context - Additional context about the error
 * @returns {Object} Normalized error object
 */
export function normalizeError(error, context = {}) {
  const normalized = {
    message: 'An unknown error occurred',
    code: null,
    type: 'unknown',
    context: context,
    timestamp: Date.now(),
  };

  // Handle Error objects
  if (error instanceof Error) {
    normalized.message = error.message;
    normalized.type = 'error';
    normalized.code = error.code;
  }
  // Handle WebSocket Event objects (React Native compatible)
  // Check for event-like objects by properties rather than instanceof
  // React Native doesn't have Event constructor, so we detect by structure
  else if (
    error && 
    typeof error === 'object' && 
    (error.target !== undefined || error.type !== undefined) &&
    !(error instanceof Error) &&
    error.code === undefined // CloseEvent has code, regular Event doesn't
  ) {
    normalized.type = 'websocket_event';
    normalized.message = 'WebSocket connection error';
    // Try to extract more info from the event target
    if (error.target && error.target.readyState !== undefined) {
      normalized.context.readyState = error.target.readyState;
      normalized.context.url = error.target.url;
    }
    // Extract event type if available
    if (error.type) {
      normalized.context.eventType = error.type;
    }
  }
  // Handle CloseEvent objects
  else if (error && typeof error === 'object' && error.code !== undefined && (error.reason !== undefined || error.wasClean !== undefined)) {
    normalized.type = 'websocket_close';
    normalized.code = error.code;
    
    // Check if reason contains HTTP error codes for better error messages
    const reason = error.reason || '';
    if (reason.includes('400 Bad Request') || reason.includes('401') || reason.includes('403')) {
      // Likely authentication/authorization issue
      normalized.code = normalized.code || 4001; // Default to invalid API key
      normalized.message = 'Authentication failed. Please check your Deepgram API key.';
    } else if (reason.includes('429')) {
      // Rate limiting
      normalized.code = normalized.code || 4003;
      normalized.message = 'Rate limit exceeded. Please try again later.';
    } else {
      const closeMessage = getCloseCodeMessage(error.code);
      normalized.message = closeMessage || reason || 'Connection closed';
    }
    
    if (error.reason) {
      normalized.context.reason = error.reason;
    }
    if (error.wasClean !== undefined) {
      normalized.context.wasClean = error.wasClean;
    }
  }
  // Handle string errors
  else if (typeof error === 'string') {
    normalized.message = error;
    normalized.type = 'string';
  }
  // Handle objects with message property
  else if (error && typeof error === 'object' && error.message) {
    normalized.message = error.message;
    normalized.code = error.code || null;
    normalized.type = error.type || 'object';
    // Preserve existing context if present
    if (error.context) {
      normalized.context = { ...normalized.context, ...error.context };
    }
  }
  // Handle normalized error objects (pass through)
  else if (error && typeof error === 'object' && error.type && error.message) {
    // Already normalized, just merge context
    return {
      ...error,
      context: { ...error.context, ...context },
    };
  }

  return normalized;
}

/**
 * Get user-friendly error message
 * @param {Object} error - Normalized error object
 * @returns {string} User-friendly error message
 */
export function getUserFriendlyMessage(error) {
  if (!error) return null;

  // Check for specific error codes
  if (error.code >= 4000 && error.code <= 4003) {
    return 'Authentication failed. Please check your Deepgram API key in settings.';
  }

  if (error.code === 1006) {
    return 'Connection lost. Please check your internet connection and try again.';
  }

  if (error.code === 1002 || error.code === 1003) {
    return 'Connection error. Please try again.';
  }

  if (error.code === 1011) {
    return 'Server error. Please try again in a moment.';
  }

  // Check error type
  if (error.type === 'websocket_event') {
    return 'Connection error. Please check your internet connection.';
  }

  // Use the normalized message as fallback
  return error.message || 'An error occurred. Please try again.';
}

/**
 * Determine if an error is recoverable (should trigger retry)
 * @param {Object} error - Normalized error object
 * @returns {boolean} True if error is recoverable
 */
export function isRecoverableError(error) {
  if (!error || !error.code) return true; // Default to recoverable if unknown

  // Don't retry for authentication errors
  if (error.code >= 4000 && error.code <= 4003) {
    return false;
  }

  // Don't retry for protocol errors (likely client bug)
  if (error.code === 1002 || error.code === 1003) {
    return false;
  }

  // Retry for network errors and server errors
  return true;
}

/**
 * Log error with context
 * @param {Object} error - Normalized error object
 * @param {Object} additionalContext - Additional context to log
 */
export function logError(error, additionalContext = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    error: {
      message: error.message,
      code: error.code,
      type: error.type,
    },
    context: {
      ...error.context,
      ...additionalContext,
    },
  };

  if (__DEV__) {
    // Detailed logging in development
    console.error('Deepgram Error:', logEntry);
  } else {
    // Minimal logging in production
    console.error('Deepgram Error:', error.message);
    // Could send to error reporting service here
  }
}


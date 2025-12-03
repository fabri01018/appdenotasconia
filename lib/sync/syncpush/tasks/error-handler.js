import { logSupabaseError } from '../shared/error-logger.js';
import { logger } from '../shared/logger.js';
import { SYNC_MESSAGES } from './constants.js';

// Tasks error handling utilities
export const errorHandler = {
  /**
   * Handle sync operation errors
   */
  handleSyncError(error, operation = 'sync operation') {
    // Check if it's a Supabase error
    if (error && (error.code || error.message || error.details)) {
      logSupabaseError(error, operation, 'tasks', {
        operationType: 'error-handler'
      });
    } else {
      logger.error(`${SYNC_MESSAGES.ERROR_IN_PUSH}`, error);
    }
    return { 
      success: false, 
      error: error.message,
      operation 
    };
  },

  /**
   * Create success response
   */
  createSuccessResponse(syncedCount) {
    return { 
      success: true, 
      synced: syncedCount 
    };
  }
};

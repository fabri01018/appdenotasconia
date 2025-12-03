import { logger } from '../shared/logger.js';
import { SYNC_MESSAGES } from './constants.js';

// Sections error handling utilities
export const errorHandler = {
  /**
   * Handle sync operation errors
   */
  handleSyncError(error, operation = 'sync operation') {
    logger.error(`${SYNC_MESSAGES.ERROR_IN_PUSH}`, error);
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


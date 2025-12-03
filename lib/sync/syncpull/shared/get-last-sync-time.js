import { logger } from '../../syncpush/shared/logger.js';

/**
 * Get the latest updated_at timestamp from the local database for a specific table
 */
export async function getLastSyncTime(db, tableName) {
  try {
    // First check if the updated_at column exists
    const result = await db.getFirstAsync(`SELECT MAX(updated_at) as last_sync FROM ${tableName}`);
    return result?.last_sync || '1970-01-01T00:00:00Z';
  } catch (error) {
    // If updated_at doesn't exist, just return default and pull everything
    if (error.message.includes('no such column: updated_at')) {
      logger.info(`Column updated_at not found in ${tableName}, pulling all records`);
    } else {
      logger.warn(`Error getting last sync time for ${tableName}:`, error.message);
    }
    return '1970-01-01T00:00:00Z';
  }
}


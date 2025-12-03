import { logger } from '../shared/logger.js';
import { DATABASE_ERRORS, SYNC_MESSAGES, SYNC_STATUS } from './constants.js';

// Projects database utility functions
export const databaseUtils = {
  /**
   * Get pending projects that need to be synced
   */
  async getPendingProjects(db) {
    try {
      return await db.getAllAsync(
        `SELECT * FROM projects WHERE sync_status != "${SYNC_STATUS.SYNCED}"`
      );
    } catch (columnError) {
      if (columnError.message.includes(DATABASE_ERRORS.NO_SYNC_STATUS_COLUMN)) {
        logger.info(SYNC_MESSAGES.COLUMN_NOT_FOUND);
        return await db.getAllAsync('SELECT * FROM projects');
      }
      throw columnError;
    }
  },

  /**
   * Update project sync status to synced
   */
  async updateSyncStatus(db, projectId, projectName) {
    try {
      await db.runAsync(
        `UPDATE projects SET sync_status = "${SYNC_STATUS.SYNCED}" WHERE id = ?`,
        [projectId]
      );
    } catch (updateError) {
      if (updateError.message.includes(DATABASE_ERRORS.NO_SYNC_STATUS_COLUMN)) {
        logger.info(`Project ${projectName} ${SYNC_MESSAGES.PROJECT_SYNCED_NO_STATUS}`);
      } else {
        throw updateError;
      }
    }
  }
};

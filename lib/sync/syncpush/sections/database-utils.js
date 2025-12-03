import { logger } from '../shared/logger.js';
import { DATABASE_ERRORS, SYNC_MESSAGES, SYNC_STATUS } from './constants.js';

// Sections database utility functions
export const databaseUtils = {
  /**
   * Get pending sections that need to be synced
   */
  async getPendingSections(db) {
    try {
      return await db.getAllAsync(
        `SELECT * FROM sections WHERE sync_status != "${SYNC_STATUS.SYNCED}"`
      );
    } catch (columnError) {
      if (columnError.message.includes(DATABASE_ERRORS.NO_SYNC_STATUS_COLUMN)) {
        logger.info(SYNC_MESSAGES.COLUMN_NOT_FOUND);
        return await db.getAllAsync('SELECT * FROM sections');
      }
      throw columnError;
    }
  },

  /**
   * Update section sync status to synced
   */
  async updateSyncStatus(db, sectionId, sectionName) {
    try {
      await db.runAsync(
        `UPDATE sections SET sync_status = "${SYNC_STATUS.SYNCED}" WHERE id = ?`,
        [sectionId]
      );
    } catch (updateError) {
      if (updateError.message.includes(DATABASE_ERRORS.NO_SYNC_STATUS_COLUMN)) {
        logger.info(`Section ${sectionName} ${SYNC_MESSAGES.SECTION_SYNCED_NO_STATUS}`);
      } else {
        throw updateError;
      }
    }
  }
};


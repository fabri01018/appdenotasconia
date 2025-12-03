import { logger } from '../shared/logger.js';
import { DATABASE_ERRORS, SYNC_MESSAGES, SYNC_STATUS } from './constants.js';

// Tasks database utility functions
export const databaseUtils = {
  /**
   * Get pending tasks that need to be synced
   */
  async getPendingTasks(db) {
    try {
      const tasks = await db.getAllAsync(
        `SELECT * FROM tasks WHERE sync_status != "${SYNC_STATUS.SYNCED}"`
      );

      // Fetch tags for each task
      for (const task of tasks) {
        task.tags = await db.getAllAsync(`
          SELECT t.id, t.name 
          FROM tags t 
          INNER JOIN task_tags tt ON t.id = tt.tag_id 
          WHERE tt.task_id = ?
        `, [task.id]);
      }

      return tasks;
    } catch (columnError) {
      if (columnError.message.includes(DATABASE_ERRORS.NO_SYNC_STATUS_COLUMN)) {
        logger.info(SYNC_MESSAGES.COLUMN_NOT_FOUND);
        return await db.getAllAsync('SELECT * FROM tasks');
      }
      throw columnError;
    }
  },

  /**
   * Update task sync status to synced
   */
  async updateSyncStatus(db, taskId, taskName) {
    try {
      await db.runAsync(
        `UPDATE tasks SET sync_status = "${SYNC_STATUS.SYNCED}" WHERE id = ?`,
        [taskId]
      );
    } catch (updateError) {
      if (updateError.message.includes(DATABASE_ERRORS.NO_SYNC_STATUS_COLUMN)) {
        logger.info(`Task ${taskName} ${SYNC_MESSAGES.TASK_SYNCED_NO_STATUS}`);
      } else {
        throw updateError;
      }
    }
  }
};

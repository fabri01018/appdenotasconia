// Tasks sync operation constants
export const SYNC_STATUS = {
  SYNCED: 'synced',
  PENDING: 'pending',
  PENDING_DELETE: 'pending_delete',
  FAILED: 'failed'
};

export const SYNC_MESSAGES = {
  COLUMN_NOT_FOUND: 'sync_status column not found, syncing all tasks...',
  TASK_SYNCED: 'Successfully synced task:',
  TASK_SYNCED_NO_STATUS: 'synced (sync_status column not available)',
  FAILED_TO_SYNC: 'Failed to sync task',
  ERROR_IN_PUSH: 'Error in pushLocalTaskChanges:'
};

export const DATABASE_ERRORS = {
  NO_SYNC_STATUS_COLUMN: 'no such column: sync_status'
};

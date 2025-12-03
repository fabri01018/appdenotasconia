// Projects sync operation constants
export const SYNC_STATUS = {
  SYNCED: 'synced',
  PENDING: 'pending',
  PENDING_DELETE: 'pending_delete',
  FAILED: 'failed'
};

export const SYNC_MESSAGES = {
  COLUMN_NOT_FOUND: 'sync_status column not found, syncing all projects...',
  PROJECT_SYNCED: 'Successfully synced project:',
  PROJECT_SYNCED_NO_STATUS: 'synced (sync_status column not available)',
  FAILED_TO_SYNC: 'Failed to sync project',
  ERROR_IN_PUSH: 'Error in pushLocalChanges:'
};

export const DATABASE_ERRORS = {
  NO_SYNC_STATUS_COLUMN: 'no such column: sync_status'
};

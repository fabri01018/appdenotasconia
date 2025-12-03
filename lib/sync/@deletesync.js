import { getDb, initDatabase } from '../database';
import { supabase } from '../supabase';
import { logSupabaseError } from './syncpush/shared/error-logger.js';

/**
 * Handle delete conflicts and sync deletions from local SQLite to Supabase
 * @description
 *  - Only runs one-way (local → Supabase)
 *  - Uses deleted_at and updated_at to resolve conflicts ("latest wins")
 *  - Deletes remotely only if local deletion is newer
 *  - Handles projects, tasks, and tags
 */
export async function handleDeleteConflicts() {
  try {
    await initDatabase();
    const db = getDb();

    console.log('🔄 Starting delete sync...');

    // Handle projects deletions
    await handleTableDeletions(db, 'projects');
    
    // Handle tasks deletions
    await handleTableDeletions(db, 'tasks');
    
    // Handle tags deletions
    await handleTableDeletions(db, 'tags');
    
    // Handle sections deletions
    await handleTableDeletions(db, 'sections');

    console.log('✅ Delete sync completed.');
  } catch (err) {
    console.error('❌ Delete conflict handler failed:', err);
    throw err;
  }
}

/**
 * Handle deletions for a specific table
 */
async function handleTableDeletions(db, tableName) {
  try {
    // Fetch locally deleted records
    const localDeletes = await db.getAllAsync(
      `SELECT * FROM ${tableName} WHERE deleted_at IS NOT NULL AND sync_status = 'pending_delete'`
    );

    if (localDeletes.length === 0) {
      console.log(`No pending deletions for ${tableName}`);
      return;
    }

    console.log(`Found ${localDeletes.length} pending deletions for ${tableName}`);

    for (const record of localDeletes) {
      // Check remote record timestamp
      const { data: remoteData, error: fetchErr } = await supabase
        .from(tableName)
        .select('id, updated_at')
        .eq('id', record.id)
        .maybeSingle();

      if (fetchErr) {
        logSupabaseError(fetchErr, `fetching remote ${tableName} for deletion`, tableName, {
          recordId: record.id,
          operation: 'select',
          query: `SELECT id, updated_at FROM ${tableName} WHERE id = ?`
        });
        continue;
      }

      // Compare timestamps (latest wins)
      const localDeletedAt = new Date(record.deleted_at);
      const remoteUpdatedAt = remoteData ? new Date(remoteData.updated_at) : null;

      // If remote is newer → restore locally
      if (remoteUpdatedAt && remoteUpdatedAt > localDeletedAt) {
        console.log(`Remote ${tableName} ${record.id} is newer, restoring locally`);
        await restoreLocalRecord(db, tableName, record);
        continue;
      }

      // Otherwise delete remotely
      console.log(`Deleting remote ${tableName} ${record.id}`);
      const { error: deleteErr } = await supabase
        .from(tableName)
        .delete()
        .eq('id', record.id);

      if (deleteErr) {
        logSupabaseError(deleteErr, `deleting remote ${tableName}`, tableName, {
          recordId: record.id,
          operation: 'delete',
          query: `DELETE FROM ${tableName} WHERE id = ?`
        });
        continue;
      }

      // Mark as synced locally (remove the record)
      await markAsSynced(db, tableName, record.id);
      console.log(`✅ Successfully synced deletion of ${tableName} ${record.id}`);
    }
  } catch (err) {
    console.error(`Error handling ${tableName} deletions:`, err);
  }
}

/**
 * Helper: mark local record as synced (delete it permanently)
 */
async function markAsSynced(db, tableName, id) {
  await db.runAsync(
    `DELETE FROM ${tableName} WHERE id = ?`,
    [id]
  );
}

/**
 * Helper: restore a deleted local record if remote is newer
 */
async function restoreLocalRecord(db, tableName, record) {
  await db.runAsync(
    `UPDATE ${tableName} SET deleted_at = NULL, sync_status = 'synced' WHERE id = ?`,
    [record.id]
  );
}

import { getDb, initDatabase } from '../database';
import { supabase } from '../supabase';
import { logSupabaseError } from './syncpush/shared/error-logger.js';

/**
 * Handle update conflicts and sync updates from local SQLite to Supabase
 * @description
 *  - Only runs one-way (local → Supabase)
 *  - Uses updated_at to resolve conflicts ("latest wins")
 *  - Updates remotely only if local version is newer or equal
 *  - Handles projects, sections, tags, and tasks (in dependency order)
 *  - Sync order: projects → sections → tags → tasks (respects FK constraints)
 */
export async function handleUpdateConflicts() {
  try {
    await initDatabase();
    const db = getDb();

    console.log('🔄 Starting update sync...');

    // Handle projects updates (no dependencies)
    await handleTableUpdates(db, 'projects');
    
    // Handle sections updates (depends on projects - already synced)
    await handleTableUpdates(db, 'sections');
    
    // Handle tags updates (no dependencies)
    await handleTableUpdates(db, 'tags');
    
    // Handle tasks updates (depends on projects and sections - both already synced)
    await handleTableUpdates(db, 'tasks');

    console.log('✅ Update sync completed.');
  } catch (err) {
    console.error('❌ Update conflict handler failed:', err);
    throw err;
  }
}

/**
 * Handle updates for a specific table
 */
async function handleTableUpdates(db, tableName) {
  try {
    // Fetch locally modified records that are pending sync
    const localUpdates = await db.getAllAsync(
      `SELECT * FROM ${tableName} WHERE deleted_at IS NULL AND sync_status = 'pending'`
    );

    if (localUpdates.length === 0) {
      console.log(`No pending updates for ${tableName}`);
      return;
    }

    console.log(`Found ${localUpdates.length} pending updates for ${tableName}`);

    for (const record of localUpdates) {
      try {
        // Check if remote record exists and get its timestamp
        const { data: remoteData, error: fetchErr } = await supabase
          .from(tableName)
          .select('id, updated_at')
          .eq('id', record.id)
          .maybeSingle();

        if (fetchErr) {
          logSupabaseError(fetchErr, `fetching remote ${tableName}`, tableName, {
            recordId: record.id,
            operation: 'select',
            query: `SELECT id, updated_at FROM ${tableName} WHERE id = ?`
          });
          continue;
        }

        // Compare timestamps (latest wins)
        const localUpdatedAt = new Date(record.updated_at || record.deleted_at);
        const remoteUpdatedAt = remoteData ? new Date(remoteData.updated_at) : null;

        // If remote is newer → update local with remote data
        if (remoteUpdatedAt && remoteUpdatedAt > localUpdatedAt) {
          console.log(`Remote ${tableName} ${record.id} is newer, pulling remote version...`);
          await updateLocalRecord(db, tableName, record.id);
          continue;
        }

        // Local is newer or same → push local changes to remote
        console.log(`Pushing local ${tableName} ${record.id} to remote`);
        await pushLocalUpdate(db, tableName, record);

      } catch (err) {
        console.error(`Error handling ${tableName} update for ${record.id}:`, err);
      }
    }
  } catch (err) {
    console.error(`Error handling ${tableName} updates:`, err);
  }
}

/**
 * Push local update to Supabase
 */
async function pushLocalUpdate(db, tableName, record) {
  try {
    // Build the update data based on table type
    const updateData = buildUpdateData(tableName, record);

    const { data, error } = await supabase
      .from(tableName)
      .upsert(updateData)
      .select();

    if (error) {
      logSupabaseError(error, `pushing ${tableName} update`, tableName, {
        recordId: record.id,
        updateData,
        operation: 'upsert'
      });
      await markSyncStatus(db, tableName, record.id, 'failed');
      return;
    }

    // Mark as synced
    await markSyncStatus(db, tableName, record.id, 'synced');
    console.log(`✅ Successfully synced update of ${tableName} ${record.id}`);

    // Post-sync hooks (e.g., for syncing task tags)
    if (tableName === 'tasks') {
      await syncTaskTags(db, record.id);
    }
  } catch (err) {
    console.error(`Error in pushLocalUpdate for ${tableName} ${record.id}:`, err);
    await markSyncStatus(db, tableName, record.id, 'failed');
  }
}

/**
 * Sync tags for a task
 */
async function syncTaskTags(db, taskId) {
  try {
    // Fetch tags for the task
    const tags = await db.getAllAsync(`
      SELECT t.id, t.name 
      FROM tags t 
      INNER JOIN task_tags tt ON t.id = tt.tag_id 
      WHERE tt.task_id = ?
    `, [taskId]);

    if (!tags || tags.length === 0) {
      // Clear remote tags if no local tags
      await supabase.from('task_tags').delete().eq('task_id', taskId);
      return;
    }

    console.log(`🏷️ Syncing ${tags.length} tags for task ${taskId} in update sync`);

    const tagNames = tags.map(t => t.name).filter(Boolean);
    
    // Upsert tags to Supabase to get their IDs
    const { data: upsertedTags, error: tagUpsertError } = await supabase
      .from('tags')
      .upsert(
        tagNames.map(name => ({ name })), 
        { onConflict: 'name' }
      )
      .select('id');

    if (tagUpsertError) {
      console.error('❌ Error upserting tags in update sync:', tagUpsertError);
      return;
    }

    const supabaseTagIds = upsertedTags.map(t => t.id);

    // Update task_tags relationship
    const { error: deleteError } = await supabase
      .from('task_tags')
      .delete()
      .eq('task_id', taskId);

    if (deleteError) {
      console.error('❌ Error clearing task_tags in update sync:', deleteError);
      return;
    }

    if (supabaseTagIds.length > 0) {
      const taskTagsData = supabaseTagIds.map(tagId => ({
        task_id: taskId,
        tag_id: tagId
      }));

      const { error: insertError } = await supabase
        .from('task_tags')
        .insert(taskTagsData);

      if (insertError) {
        console.error('❌ Error inserting task_tags in update sync:', insertError);
      } else {
        console.log(`✅ Successfully synced tags for task ${taskId}`);
      }
    }
  } catch (error) {
    console.error(`❌ Error syncing task tags for task ${taskId}:`, error);
  }
}

/**
 * Pull remote update to local database
 */
async function updateLocalRecord(db, tableName, id) {
  try {
    // Fetch full record from Supabase
    const { data: remoteRecord, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !remoteRecord) {
      if (error) {
        logSupabaseError(error, `fetching remote ${tableName} record`, tableName, {
          recordId: id,
          operation: 'select',
          query: `SELECT * FROM ${tableName} WHERE id = ?`
        });
      }
      await markSyncStatus(db, tableName, id, 'failed');
      return;
    }

    // Update local record with remote data
    await updateLocalRecordWithRemote(db, tableName, remoteRecord);
    
    console.log(`✅ Updated local ${tableName} ${id} with remote version`);
  } catch (err) {
    console.error(`Error in updateLocalRecord for ${tableName} ${id}:`, err);
    await markSyncStatus(db, tableName, id, 'failed');
  }
}

/**
 * Update local record with remote data
 */
async function updateLocalRecordWithRemote(db, tableName, remoteRecord) {
  const columns = Object.keys(remoteRecord).filter(key => key !== 'id');
  const values = columns.map(col => remoteRecord[col]);
  const setClause = columns.map(col => `${col} = ?`).join(', ');

  await db.runAsync(
    `UPDATE ${tableName} SET ${setClause}, sync_status = 'synced' WHERE id = ?`,
    [...values, remoteRecord.id]
  );
}

/**
 * Build update data based on table type
 */
function buildUpdateData(tableName, record) {
  const baseData = {
    id: record.id,
    updated_at: record.updated_at || new Date().toISOString()
  };

  switch (tableName) {
    case 'projects':
      return {
        ...baseData,
        name: record.name
      };
    
    case 'tasks':
      return {
        ...baseData,
        project_id: record.project_id,
        section_id: record.section_id || null,
        parent_id: record.parent_id || null,
        title: record.title,
        description: record.description || null,
        completed: record.completed ? true : false,
        is_expanded: record.is_expanded ? true : false
      };
    
    case 'tags':
      return {
        ...baseData,
        name: record.name
      };
    
    case 'sections':
      return {
        ...baseData,
        project_id: record.project_id,
        name: record.name
      };
    
    default:
      return baseData;
  }
}

/**
 * Helper: update sync status
 */
async function markSyncStatus(db, tableName, id, status) {
  try {
    await db.runAsync(
      `UPDATE ${tableName} SET sync_status = ? WHERE id = ?`,
      [status, id]
    );
  } catch (err) {
    console.error(`Error updating sync status for ${tableName} ${id}:`, err);
  }
}

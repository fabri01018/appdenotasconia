import { getDb, initDatabase } from '../../database.js';
import { supabase } from '../../supabase.js';
import { logSupabaseError } from '../syncpush/shared/error-logger.js';
import { logger } from '../syncpush/shared/logger.js';
import { getLastSyncTime } from './shared/get-last-sync-time.js';

/**
 * Pull tags from Supabase and sync to local database
 */
export async function pullTagsFromSupabase() {
  try {
    await initDatabase();
    const db = getDb();
    
    logger.info('📥 Starting pull sync for tags...');

    const lastUpdatedAt = await getLastSyncTime(db, 'tags');
    logger.info(`Last local update: ${lastUpdatedAt}`);

    // Fetch rows from Supabase updated after last local timestamp
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .gt('updated_at', lastUpdatedAt)
      .order('updated_at', { ascending: true });

    if (error) {
      logSupabaseError(error, 'pulling tags', 'tags', {
        lastUpdatedAt,
        query: 'SELECT * FROM tags WHERE updated_at > ? ORDER BY updated_at ASC'
      });
      throw error;
    }

    if (data && data.length > 0) {
      logger.info(`Fetched ${data.length} updated tags from Supabase`);
      
      // Insert or update tags
      for (const tag of data) {
        try {
          await db.runAsync(
            `INSERT OR REPLACE INTO tags (id, name, created_at, updated_at, sync_status, deleted_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [tag.id, tag.name, tag.created_at || null, tag.updated_at, 'synced', tag.deleted_at || null]
          );
        } catch (error) {
          logger.error(`❌ Failed to insert tag ${tag.id}:`, error.message);
          logSupabaseError(error, 'inserting tag', 'tags', {
            tagId: tag.id,
            tagData: tag
          });
        }
      }
      
      logger.info(`✅ Synced ${data.length} tags`);
    } else {
      logger.info('No new tag updates from Supabase');
    }

    return { 
      success: true, 
      count: data?.length || 0,
      items: data?.map(t => ({ name: t.name, id: t.id, deleted: !!t.deleted_at })) || []
    };
  } catch (error) {
    logSupabaseError(error, 'pulling tags', 'tags', {
      lastUpdatedAt: await getLastSyncTime(getDb(), 'tags').catch(() => 'unknown')
    });
    return { success: false, error: error.message };
  }
}


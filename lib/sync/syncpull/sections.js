import { getDb, initDatabase } from '../../database.js';
import { supabase } from '../../supabase.js';
import { logSupabaseError } from '../syncpush/shared/error-logger.js';
import { logger } from '../syncpush/shared/logger.js';
import { getLastSyncTime } from './shared/get-last-sync-time.js';

/**
 * Pull sections from Supabase and sync to local database
 */
export async function pullSectionsFromSupabase() {
  try {
    await initDatabase();
    const db = getDb();
    
    logger.info('📥 Starting pull sync for sections...');

    const lastUpdatedAt = await getLastSyncTime(db, 'sections');
    logger.info(`Last local update: ${lastUpdatedAt}`);

    // Fetch rows from Supabase updated after last local timestamp
    const { data, error } = await supabase
      .from('sections')
      .select('*')
      .gt('updated_at', lastUpdatedAt)
      .order('updated_at', { ascending: true });

    if (error) {
      logSupabaseError(error, 'pulling sections', 'sections', {
        lastUpdatedAt,
        query: 'SELECT * FROM sections WHERE updated_at > ? ORDER BY updated_at ASC'
      });
      throw error;
    }

    if (data && data.length > 0) {
      logger.info(`Fetched ${data.length} updated sections from Supabase`);
      
      // Insert or update sections
      for (const section of data) {
        try {
          // Try full insert first
          await db.runAsync(
            `INSERT OR REPLACE INTO sections (id, project_id, name, updated_at, sync_status)
             VALUES (?, ?, ?, ?, ?)`,
            [section.id, section.project_id, section.name, section.updated_at, 'synced']
          );
        } catch (insertError) {
          // If columns don't exist, try with just basic columns
          if (insertError.message.includes('no such column')) {
            try {
              await db.runAsync(
                `INSERT OR REPLACE INTO sections (id, project_id, name)
                 VALUES (?, ?, ?)`,
                [section.id, section.project_id, section.name]
              );
            } catch (error2) {
              logger.error(`Failed to insert section ${section.id}:`, error2.message);
            }
          } else {
            throw insertError;
          }
        }
      }
      
      logger.info(`✅ Synced ${data.length} sections`);
    } else {
      logger.info('No new section updates from Supabase');
    }

    return { success: true, count: data?.length || 0 };
  } catch (error) {
    logSupabaseError(error, 'pulling sections', 'sections', {
      lastUpdatedAt: await getLastSyncTime(getDb(), 'sections').catch(() => 'unknown')
    });
    return { success: false, error: error.message };
  }
}


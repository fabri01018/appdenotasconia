import { getDb, initDatabase } from '../../database.js';
import { supabase } from '../../supabase.js';
import { logSupabaseError } from '../syncpush/shared/error-logger.js';
import { logger } from '../syncpush/shared/logger.js';
import { getLastSyncTime } from './shared/get-last-sync-time.js';

/**
 * Pull projects from Supabase and sync to local database
 */
export async function pullProjectsFromSupabase() {
  try {
    await initDatabase();
    const db = getDb();
    
    logger.info('📥 Starting pull sync for projects...');

    const lastUpdatedAt = await getLastSyncTime(db, 'projects');
    logger.info(`Last local update: ${lastUpdatedAt}`);

    // Fetch rows from Supabase updated after last local timestamp
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .gt('updated_at', lastUpdatedAt)
      .order('updated_at', { ascending: true });

    if (error) {
      logSupabaseError(error, 'pulling projects', 'projects', {
        lastUpdatedAt,
        query: 'SELECT * FROM projects WHERE updated_at > ? ORDER BY updated_at ASC'
      });
      throw error;
    }

    if (data && data.length > 0) {
      logger.info(`Fetched ${data.length} updated projects from Supabase`);
      
      // Insert or update projects
      for (const project of data) {
        try {
          // Try full insert first
          await db.runAsync(
            `INSERT OR REPLACE INTO projects (id, name, updated_at, sync_status)
             VALUES (?, ?, ?, ?)`,
            [project.id, project.name, project.updated_at, 'synced']
          );
        } catch (insertError) {
          // If columns don't exist, try with just basic columns
          if (insertError.message.includes('no such column')) {
            try {
              await db.runAsync(
                `INSERT OR REPLACE INTO projects (id, name)
                 VALUES (?, ?)`,
                [project.id, project.name]
              );
            } catch (error2) {
              logger.error(`Failed to insert project ${project.id}:`, error2.message);
            }
          } else {
            throw insertError;
          }
        }
      }
      
      logger.info(`✅ Synced ${data.length} projects`);
    } else {
      logger.info('No new project updates from Supabase');
    }

    return { success: true, count: data?.length || 0 };
  } catch (error) {
    logSupabaseError(error, 'pulling projects', 'projects', {
      lastUpdatedAt: await getLastSyncTime(getDb(), 'projects').catch(() => 'unknown')
    });
    return { success: false, error: error.message };
  }
}


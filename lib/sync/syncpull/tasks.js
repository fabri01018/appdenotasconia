import { getDb, initDatabase } from '../../database.js';
import { supabase } from '../../supabase.js';
import { logSupabaseError } from '../syncpush/shared/error-logger.js';
import { logger } from '../syncpush/shared/logger.js';
import { getLastSyncTime } from './shared/get-last-sync-time.js';

/**
 * Pull tasks from Supabase and sync to local database
 */
export async function pullTasksFromSupabase() {
  try {
    await initDatabase();
    const db = getDb();
    
    logger.info('📥 Starting pull sync for tasks...');

    const lastUpdatedAt = await getLastSyncTime(db, 'tasks');
    logger.info(`Last local update: ${lastUpdatedAt}`);

    // Fetch rows from Supabase updated after last local timestamp
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .gt('updated_at', lastUpdatedAt)
      .order('updated_at', { ascending: true });

    if (error) {
      logSupabaseError(error, 'pulling tasks', 'tasks', {
        lastUpdatedAt,
        query: 'SELECT * FROM tasks WHERE updated_at > ? ORDER BY updated_at ASC'
      });
      throw error;
    }

    if (data && data.length > 0) {
      logger.info(`Fetched ${data.length} updated tasks from Supabase`);
      
      // Sort tasks by ID to help satisfy parent_id foreign key constraints during fresh sync
      // This helps ensure parents are inserted before children
      data.sort((a, b) => a.id - b.id);
      
      // Insert or update tasks
      for (const task of data) {
        try {
          // Try full insert first
          await db.runAsync(
            `INSERT OR REPLACE INTO tasks (id, project_id, section_id, parent_id, title, description, completed, is_expanded, updated_at, sync_status, deleted_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              task.id,
              task.project_id,
              task.section_id || null,
              task.parent_id || null,
              task.title,
              task.description || null,
              task.completed ? 1 : 0,
              task.is_expanded ? 1 : 0,
              task.updated_at,
              'synced',
              task.deleted_at || null
            ]
          );
        } catch (insertError) {
          // If columns don't exist, try with fewer columns
          if (insertError.message.includes('no such column')) {
            try {
              // Try without sync_status first
              try {
                await db.runAsync(
                  `INSERT OR REPLACE INTO tasks (id, project_id, section_id, title, description, completed, updated_at, deleted_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    task.id,
                    task.project_id,
                    task.section_id || null,
                    task.title,
                    task.description || null,
                    task.completed ? 1 : 0,
                    task.updated_at,
                    task.deleted_at || null
                  ]
                );
              } catch (error2) {
                // If that fails, try without completed
                await db.runAsync(
                  `INSERT OR REPLACE INTO tasks (id, project_id, section_id, title, description, updated_at, deleted_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?)`,
                  [
                    task.id,
                    task.project_id,
                    task.section_id || null,
                    task.title,
                    task.description || null,
                    task.updated_at,
                    task.deleted_at || null
                  ]
                );
              }
            } catch (error3) {
              logger.error(`❌ Failed to insert task ${task.id}:`, error3.message);
              logSupabaseError(error3, 'inserting task', 'tasks', {
                taskId: task.id,
                taskData: task
              });
            }
          } else {
            logger.error(`❌ Failed to insert task ${task.id}:`, insertError.message);
            logSupabaseError(insertError, 'inserting task', 'tasks', {
              taskId: task.id,
              taskData: task
            });
            // Continue with next task instead of throwing
          }
        }
      }
      
      logger.info(`✅ Synced ${data.length} tasks`);
    } else {
      logger.info('No new task updates from Supabase');
    }

    return { 
      success: true, 
      count: data?.length || 0,
      items: data?.map(t => ({ 
        name: t.title, 
        id: t.id, 
        deleted: !!t.deleted_at,
        completed: !!t.completed 
      })) || []
    };
  } catch (error) {
    logSupabaseError(error, 'pulling tasks', 'tasks', {
      lastUpdatedAt: await getLastSyncTime(getDb(), 'tasks').catch(() => 'unknown')
    });
    return { success: false, error: error.message };
  }
}

/**
 * Pull task_tags relationships from Supabase and sync to local database
 */
export async function pullTaskTagsFromSupabase() {
  try {
    await initDatabase();
    const db = getDb();
    
    logger.info('📥 Starting pull sync for task_tags...');

    // Fetch all relationships from Supabase
    const { data, error } = await supabase
      .from('task_tags')
      .select('*')
      .order('updated_at', { ascending: true });

    if (error) {
      logSupabaseError(error, 'pulling task_tags', 'task_tags', {
        query: 'SELECT * FROM task_tags ORDER BY updated_at ASC'
      });
      throw error;
    }

    if (data && data.length > 0) {
      logger.info(`Fetched ${data.length} task-tag relationships from Supabase`);
      
      // Clear local task_tags to resync completely (many-to-many relationships)
      await db.runAsync('DELETE FROM task_tags');
      
      var enrichedItems = [];
      // Insert all relationships
      for (const relationship of data) {
        try {
          await db.runAsync(
            `INSERT INTO task_tags (task_id, tag_id)
             VALUES (?, ?)`,
            [relationship.task_id, relationship.tag_id]
          );

          // Look up names for logging
          try {
            const task = await db.getFirstAsync('SELECT title FROM tasks WHERE id = ?', [relationship.task_id]);
            const tag = await db.getFirstAsync('SELECT name FROM tags WHERE id = ?', [relationship.tag_id]);
            if (task && tag) {
              enrichedItems.push({ 
                taskName: task.title, 
                tagName: tag.name 
              });
            }
          } catch (e) {
            // Skip enrichment if lookup fails
          }
        } catch (insertError) {
          logger.error(`❌ Failed to insert task_tag relationship (task: ${relationship.task_id}, tag: ${relationship.tag_id}):`, insertError.message);
          logSupabaseError(insertError, 'inserting task_tag', 'task_tags', {
            taskId: relationship.task_id,
            tagId: relationship.tag_id
          });
          // Continue with next relationship
        }
      }
      
      logger.info(`✅ Synced ${data.length} task-tag relationships`);
    } else {
      logger.info('No task-tag relationships from Supabase');
    }

    return { 
      success: true, 
      count: data?.length || 0,
      items: enrichedItems || []
    };
  } catch (error) {
    logSupabaseError(error, 'pulling task_tags', 'task_tags', {
      query: 'SELECT * FROM task_tags ORDER BY updated_at ASC'
    });
    return { success: false, error: error.message };
  }
}


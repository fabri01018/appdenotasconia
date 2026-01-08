import { getDb, initDatabase } from '../database.js';

/**
 * Check if there are any pending changes that need to be synced
 * Returns true if any table has records with sync_status != 'synced'
 */
export async function hasPendingChanges() {
  try {
    await initDatabase();
    const db = getDb();

    // Check each table for pending changes
    const tables = ['projects', 'tasks', 'sections', 'tags'];
    
    for (const table of tables) {
      try {
        const pending = await db.getFirstAsync(
          `SELECT COUNT(*) as count FROM ${table} 
           WHERE sync_status != 'synced' 
           AND deleted_at IS NULL`
        );
        
        if (pending && pending.count > 0) {
          console.log(`[AutoSync] Found ${pending.count} pending ${table}`);
          return true;
        }
      } catch (error) {
        // Table might not have sync_status column, skip it
        console.log(`[AutoSync] Could not check ${table}:`, error.message);
      }
    }

    // Also check for pending deletes
    for (const table of tables) {
      try {
        const pendingDeletes = await db.getFirstAsync(
          `SELECT COUNT(*) as count FROM ${table} 
           WHERE sync_status = 'pending_delete' 
           AND deleted_at IS NOT NULL`
        );
        
        if (pendingDeletes && pendingDeletes.count > 0) {
          console.log(`[AutoSync] Found ${pendingDeletes.count} pending deletes in ${table}`);
          return true;
        }
      } catch (error) {
        // Skip if error
      }
    }

    return false;
  } catch (error) {
    console.error('[AutoSync] Error checking pending changes:', error);
    return false;
  }
}

/**
 * Get counts of pending changes per table (for debugging/UI)
 */
export async function getPendingCounts() {
  try {
    await initDatabase();
    const db = getDb();

    const counts = {
      projects: 0,
      tasks: 0,
      sections: 0,
      tags: 0,
      deletes: 0,
      total: 0
    };

    const tables = ['projects', 'tasks', 'sections', 'tags'];
    
    for (const table of tables) {
      try {
        const pending = await db.getFirstAsync(
          `SELECT COUNT(*) as count FROM ${table} 
           WHERE sync_status != 'synced' 
           AND deleted_at IS NULL`
        );
        counts[table] = pending?.count || 0;
        counts.total += counts[table];
      } catch (error) {
        // Skip
      }
    }

    // Count deletes
    for (const table of tables) {
      try {
        const pendingDeletes = await db.getFirstAsync(
          `SELECT COUNT(*) as count FROM ${table} 
           WHERE sync_status = 'pending_delete'`
        );
        counts.deletes += pendingDeletes?.count || 0;
        counts.total += pendingDeletes?.count || 0;
      } catch (error) {
        // Skip
      }
    }

    return counts;
  } catch (error) {
    console.error('[AutoSync] Error getting pending counts:', error);
    return { projects: 0, tasks: 0, sections: 0, tags: 0, deletes: 0, total: 0 };
  }
}

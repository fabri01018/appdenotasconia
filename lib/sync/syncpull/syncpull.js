import { logger } from '../syncpush/shared/logger.js';
import { pullProjectsFromSupabase } from './projects.js';
import { pullSectionsFromSupabase } from './sections.js';
import { pullTagsFromSupabase } from './tags.js';
import { pullTasksFromSupabase, pullTaskTagsFromSupabase } from './tasks.js';

/**
 * Pull all changes from Supabase to local database
 */
export async function pullAllFromSupabase() {
  try {
    logger.info('🔄 Starting full pull sync from Supabase...');
    
    const results = {
      projects: await pullProjectsFromSupabase(),
      sections: await pullSectionsFromSupabase(),
      tags: await pullTagsFromSupabase(),
      tasks: await pullTasksFromSupabase(),
      task_tags: await pullTaskTagsFromSupabase()
    };
    
    const totalSynced = 
      (results.projects.count || 0) + 
      (results.tasks.count || 0) + 
      (results.tags.count || 0) + 
      (results.sections.count || 0) +
      (results.task_tags.count || 0);
    
    logger.info(`✅ Pull sync complete. Total records synced: ${totalSynced}`);
    
    return {
      success: true,
      totalSynced,
      results
    };
  } catch (error) {
    logger.error('❌ Error in pullAllFromSupabase:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Re-export individual functions for convenience
export { pullProjectsFromSupabase } from './projects.js';
export { pullSectionsFromSupabase } from './sections.js';
export { pullTagsFromSupabase } from './tags.js';
export { pullTasksFromSupabase, pullTaskTagsFromSupabase } from './tasks.js';


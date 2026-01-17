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
    
    if (totalSynced > 0) {
      logger.info('📥 Detailed Pull Results:');
      
      if (results.projects.count > 0) {
        logger.info('  📂 Projects:');
        results.projects.items.forEach(item => {
          logger.info(`    ${item.deleted ? '-' : '+'} "${item.name}"`);
        });
      }
      
      if (results.sections.count > 0) {
        logger.info('  📁 Sections:');
        results.sections.items.forEach(item => {
          logger.info(`    ${item.deleted ? '-' : '+'} "${item.name}"`);
        });
      }
      
      if (results.tags.count > 0) {
        logger.info('  🏷️ Tags:');
        results.tags.items.forEach(item => {
          logger.info(`    ${item.deleted ? '-' : '+'} "${item.name}"`);
        });
      }
      
      if (results.tasks.count > 0) {
        logger.info('  📝 Tasks:');
        results.tasks.items.forEach(item => {
          const status = item.deleted ? '-' : (item.completed ? '✓' : '+');
          logger.info(`    ${status} "${item.name}"`);
        });
      }

      if (results.task_tags.count > 0) {
        logger.info('  🔗 Task-Tag Relationships:');
        results.task_tags.items.forEach(item => {
          logger.info(`    + "${item.taskName}" → #${item.tagName}`);
        });
        if (results.task_tags.items.length < results.task_tags.count) {
          logger.info(`    + ...and ${results.task_tags.count - results.task_tags.items.length} more`);
        }
      }
    }

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


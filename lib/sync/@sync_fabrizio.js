import { getDb, initDatabase } from '../database';
import { SYNC_MESSAGES } from './syncpush/projects/constants.js';
import { databaseUtils } from './syncpush/projects/database-utils.js';
import { errorHandler } from './syncpush/projects/error-handler.js';
import { supabaseUtils } from './syncpush/projects/supabase-utils.js';
import { logger } from './syncpush/shared/logger.js';
// Task-related imports
import { SYNC_MESSAGES as TASK_SYNC_MESSAGES } from './syncpush/tasks/constants.js';
import { databaseUtils as taskDatabaseUtils } from './syncpush/tasks/database-utils.js';
import { errorHandler as taskErrorHandler } from './syncpush/tasks/error-handler.js';
import { supabaseUtils as taskSupabaseUtils } from './syncpush/tasks/supabase-utils.js';
// Delete sync imports
import { handleDeleteConflicts } from './@deletesync.js';
// Update sync imports
import { handleUpdateConflicts } from './updatesync.js';

/**
 * Push local changes to Supabase
 */
export async function pushLocalChanges(skipDeleteSync = false, skipUpdateSync = false) {
  try {
    await initDatabase();
    const db = getDb();
    
    // Sync project deletions first (if not skipped)
    if (!skipDeleteSync) {
      logger.info('Syncing project deletions...');
      try {
        await handleDeleteConflicts('projects');
      } catch (deleteError) {
        logger.error('Error during project delete sync:', deleteError);
      }
    }
    
    // Sync project updates with conflict resolution
    if (!skipUpdateSync) {
      logger.info('Syncing project updates with conflict resolution...');
      try {
        await handleUpdateConflicts('projects');
      } catch (updateError) {
        logger.error('Error during project update sync:', updateError);
      }
    }
    
    const pending = await databaseUtils.getPendingProjects(db);
    logger.info(`Found ${pending.length} projects to sync`);

    for (const project of pending) {
      const syncResult = await supabaseUtils.syncProject(project);
      
      if (syncResult.success) {
        await databaseUtils.updateSyncStatus(db, project.id, project.name);
        logger.info(`${SYNC_MESSAGES.PROJECT_SYNCED} ${project.name}`);
      } else {
        logger.error(`${SYNC_MESSAGES.FAILED_TO_SYNC} ${project.name}:`, syncResult.error);
      }
    }

    return errorHandler.createSuccessResponse(pending.length);
  } catch (error) {
    return errorHandler.handleSyncError(error, 'pushLocalChanges');
  }
}

/**
 * Push local task changes to Supabase
 */
export async function pushLocalTaskChanges(skipDeleteSync = false, skipUpdateSync = false) {
  try {
    await initDatabase();
    const db = getDb();
    
    // Sync task deletions first (if not skipped)
    if (!skipDeleteSync) {
      logger.info('Syncing task deletions...');
      try {
        await handleDeleteConflicts('tasks');
      } catch (deleteError) {
        logger.error('Error during task delete sync:', deleteError);
      }
    }
    
    // Sync task updates with conflict resolution
    if (!skipUpdateSync) {
      logger.info('Syncing task updates with conflict resolution...');
      try {
        await handleUpdateConflicts('tasks');
      } catch (updateError) {
        logger.error('Error during task update sync:', updateError);
      }
    }
    
    const pending = await taskDatabaseUtils.getPendingTasks(db);
    logger.info(`Found ${pending.length} tasks to sync`);

    for (const task of pending) {
      const syncResult = await taskSupabaseUtils.syncTask(task);
      
      if (syncResult.success) {
        await taskDatabaseUtils.updateSyncStatus(db, task.id, task.title);
        logger.info(`${TASK_SYNC_MESSAGES.TASK_SYNCED} ${task.title}`);
      } else {
        logger.error(`${TASK_SYNC_MESSAGES.FAILED_TO_SYNC} ${task.title}:`, syncResult.error);
      }
    }

    return taskErrorHandler.createSuccessResponse(pending.length);
  } catch (error) {
    return taskErrorHandler.handleSyncError(error, 'pushLocalTaskChanges');
  }
}

/**
 * Push all local changes (projects and tasks) to Supabase
 */
export async function pushAllLocalChanges() {
  try {
    logger.info('Starting sync of all local changes...');
    
    // 1. Sync all deletions first
    logger.info('Syncing deletions...');
    try {
      await handleDeleteConflicts();
    } catch (deleteError) {
      logger.error('Error during delete sync:', deleteError);
    }
    
    // 2. Sync all updates with conflict resolution (projects -> sections -> tags -> tasks)
    logger.info('Syncing all updates with conflict resolution...');
    try {
      await handleUpdateConflicts();
    } catch (updateError) {
      logger.error('Error during update sync:', updateError);
    }
    
    // 3. Sync projects (skip conflict handlers as we just ran them for all tables)
    logger.info('Finalizing project sync...');
    const projectResult = await pushLocalChanges(true, true);
    logger.info(`Project sync completed: ${projectResult.success ? 'success' : 'failed'}`);
    
    // 4. Sync tasks (skip conflict handlers as we just ran them for all tables)
    logger.info('Finalizing task sync...');
    const taskResult = await pushLocalTaskChanges(true, true);
    logger.info(`Task sync completed: ${taskResult.success ? 'success' : 'failed'}`);
    
    // Return combined result
    const totalSynced = (projectResult.synced || 0) + (taskResult.synced || 0);
    const allSuccessful = projectResult.success && taskResult.success;
    
    return {
      success: allSuccessful,
      synced: totalSynced,
      projects: projectResult,
      tasks: taskResult
    };
  } catch (error) {
    logger.error('Error in pushAllLocalChanges:', error);
    return {
      success: false,
      error: error.message,
      synced: 0
    };
  }
}

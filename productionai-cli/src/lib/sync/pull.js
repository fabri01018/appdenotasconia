const { supabase, isSupabaseConfigured } = require('../supabase');
const { getDb } = require('../../adapters/db');

/**
 * Get the last updated_at timestamp for a table in local database
 */
async function getLastSyncTime(tableName) {
  const db = getDb();
  try {
    const result = await db.getFirstAsync(
      `SELECT MAX(updated_at) as last_updated FROM ${tableName}`
    );
    return result?.last_updated || '1970-01-01T00:00:00.000Z';
  } catch (error) {
    return '1970-01-01T00:00:00.000Z';
  }
}

/**
 * Pull projects from Supabase to local database
 */
async function pullProjects() {
  const db = getDb();
  const lastUpdatedAt = await getLastSyncTime('projects');
  
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .gt('updated_at', lastUpdatedAt)
    .order('updated_at', { ascending: true });

  if (error) throw error;

  if (data && data.length > 0) {
    for (const project of data) {
      await db.runAsync(
        `INSERT OR REPLACE INTO projects (id, name, default_section_id, updated_at, sync_status, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          project.id,
          project.name,
          project.default_section_id || null,
          project.updated_at,
          'synced',
          project.deleted_at || null
        ]
      );
    }
  }

  return data?.length || 0;
}

/**
 * Pull sections from Supabase to local database
 */
async function pullSections() {
  const db = getDb();
  const lastUpdatedAt = await getLastSyncTime('sections');
  
  const { data, error } = await supabase
    .from('sections')
    .select('*')
    .gt('updated_at', lastUpdatedAt)
    .order('updated_at', { ascending: true });

  if (error) throw error;

  let synced = 0;
  if (data && data.length > 0) {
    for (const section of data) {
      try {
        // Check if parent project exists
        const projectExists = await db.getFirstAsync(
          'SELECT id FROM projects WHERE id = ?',
          [section.project_id]
        );

        if (!projectExists) {
          console.log(`  ⚠️  Skipping section "${section.name}" - project ${section.project_id} not found locally`);
          continue;
        }

        await db.runAsync(
          `INSERT OR REPLACE INTO sections (id, project_id, name, updated_at, sync_status, deleted_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            section.id,
            section.project_id,
            section.name,
            section.updated_at,
            'synced',
            section.deleted_at || null
          ]
        );
        synced++;
      } catch (err) {
        console.log(`  ⚠️  Error syncing section "${section.name}":`, err.message);
      }
    }
  }

  return synced;
}

/**
 * Pull tags from Supabase to local database
 */
async function pullTags() {
  const db = getDb();
  const lastUpdatedAt = await getLastSyncTime('tags');
  
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .gt('updated_at', lastUpdatedAt)
    .order('updated_at', { ascending: true });

  if (error) throw error;

  if (data && data.length > 0) {
    for (const tag of data) {
      await db.runAsync(
        `INSERT OR REPLACE INTO tags (id, name, created_at, updated_at, sync_status, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          tag.id,
          tag.name,
          tag.created_at || null,
          tag.updated_at,
          'synced',
          tag.deleted_at || null
        ]
      );
    }
  }

  return data?.length || 0;
}

/**
 * Pull tasks from Supabase to local database
 */
async function pullTasks() {
  const db = getDb();
  const lastUpdatedAt = await getLastSyncTime('tasks');
  
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .gt('updated_at', lastUpdatedAt)
    .order('updated_at', { ascending: true });

  if (error) throw error;

  let synced = 0;
  if (data && data.length > 0) {
    // Sort by ID to ensure parents are inserted before children
    data.sort((a, b) => a.id - b.id);
    
    for (const task of data) {
      try {
        // Check if parent project exists
        const projectExists = await db.getFirstAsync(
          'SELECT id FROM projects WHERE id = ?',
          [task.project_id]
        );

        if (!projectExists) {
          console.log(`  ⚠️  Skipping task "${task.title}" - project ${task.project_id} not found locally`);
          continue;
        }

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
        synced++;
      } catch (err) {
        console.log(`  ⚠️  Error syncing task "${task.title}":`, err.message);
      }
    }
  }

  return synced;
}

/**
 * Pull task_tags relationships from Supabase to local database
 */
async function pullTaskTags() {
  const db = getDb();
  
  const { data, error } = await supabase
    .from('task_tags')
    .select('*');

  if (error) throw error;

  if (data && data.length > 0) {
    // Clear and resync all task_tags (simpler for many-to-many)
    await db.runAsync('DELETE FROM task_tags');
    
    for (const relationship of data) {
      await db.runAsync(
        `INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)`,
        [relationship.task_id, relationship.tag_id]
      );
    }
  }

  return data?.length || 0;
}

/**
 * Pull all data from Supabase (full sync)
 */
async function pullAll() {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured. Check your .env file.');
  }

  console.log('📥 Pulling changes from Supabase...\n');

  const results = {
    projects: 0,
    sections: 0,
    tags: 0,
    tasks: 0,
    task_tags: 0
  };

  const db = getDb();

  try {
    // Temporarily disable foreign key constraints during sync
    await db.execAsync('PRAGMA foreign_keys = OFF');

    results.projects = await pullProjects();
    console.log(`  ✅ Projects: ${results.projects} updated`);

    results.sections = await pullSections();
    console.log(`  ✅ Sections: ${results.sections} updated`);

    results.tags = await pullTags();
    console.log(`  ✅ Tags: ${results.tags} updated`);

    results.tasks = await pullTasks();
    console.log(`  ✅ Tasks: ${results.tasks} updated`);

    results.task_tags = await pullTaskTags();
    console.log(`  ✅ Task-Tags: ${results.task_tags} relationships synced`);

    // Re-enable foreign key constraints
    await db.execAsync('PRAGMA foreign_keys = ON');

    const total = Object.values(results).reduce((sum, count) => sum + count, 0);
    console.log(`\n✅ Pull complete. ${total} records synced.`);

    return { success: true, results, total };
  } catch (error) {
    // Re-enable foreign keys even if there's an error
    try {
      await db.execAsync('PRAGMA foreign_keys = ON');
    } catch (pragmaError) {
      console.error('Warning: Could not re-enable foreign keys');
    }
    
    console.error('\n❌ Pull failed:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  pullAll,
  pullProjects,
  pullSections,
  pullTags,
  pullTasks,
  pullTaskTags
};


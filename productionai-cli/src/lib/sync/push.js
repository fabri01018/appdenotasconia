const { supabase, isSupabaseConfigured } = require('../supabase');
const { getDb } = require('../../adapters/db');

/**
 * Get all projects with pending sync status
 */
async function getPendingProjects() {
  const db = getDb();
  return await db.getAllAsync(
    `SELECT * FROM projects WHERE sync_status = 'pending' AND deleted_at IS NULL`
  );
}

/**
 * Get all sections with pending sync status
 */
async function getPendingSections() {
  const db = getDb();
  return await db.getAllAsync(
    `SELECT * FROM sections WHERE sync_status = 'pending' AND deleted_at IS NULL`
  );
}

/**
 * Get all tags with pending sync status
 */
async function getPendingTags() {
  const db = getDb();
  return await db.getAllAsync(
    `SELECT * FROM tags WHERE sync_status = 'pending' AND deleted_at IS NULL`
  );
}

/**
 * Get all tasks with pending sync status
 */
async function getPendingTasks() {
  const db = getDb();
  return await db.getAllAsync(
    `SELECT * FROM tasks WHERE sync_status = 'pending' AND deleted_at IS NULL`
  );
}

/**
 * Get all items marked for deletion
 */
async function getPendingDeletes() {
  const db = getDb();
  
  const projects = await db.getAllAsync(
    `SELECT 'projects' as table_name, id FROM projects WHERE sync_status = 'pending_delete' AND deleted_at IS NOT NULL`
  );
  
  const sections = await db.getAllAsync(
    `SELECT 'sections' as table_name, id FROM sections WHERE sync_status = 'pending_delete' AND deleted_at IS NOT NULL`
  );
  
  const tags = await db.getAllAsync(
    `SELECT 'tags' as table_name, id FROM tags WHERE sync_status = 'pending_delete' AND deleted_at IS NOT NULL`
  );
  
  const tasks = await db.getAllAsync(
    `SELECT 'tasks' as table_name, id FROM tasks WHERE sync_status = 'pending_delete' AND deleted_at IS NOT NULL`
  );
  
  return {
    projects,
    sections,
    tags,
    tasks
  };
}

/**
 * Push projects to Supabase
 */
async function pushProjects() {
  const db = getDb();
  const projects = await getPendingProjects();
  
  for (const project of projects) {
    const { error } = await supabase
      .from('projects')
      .upsert({
        id: project.id,
        name: project.name,
        default_section_id: project.default_section_id || null,
        updated_at: project.updated_at || new Date().toISOString()
      });

    if (error) {
      console.error(`  ❌ Failed to sync project "${project.name}":`, error.message);
      continue;
    }

    // Mark as synced
    await db.runAsync(
      `UPDATE projects SET sync_status = 'synced' WHERE id = ?`,
      [project.id]
    );
  }

  return projects.length;
}

/**
 * Push sections to Supabase
 */
async function pushSections() {
  const db = getDb();
  const sections = await getPendingSections();
  
  for (const section of sections) {
    const { error } = await supabase
      .from('sections')
      .upsert({
        id: section.id,
        project_id: section.project_id,
        name: section.name,
        updated_at: section.updated_at || new Date().toISOString()
      });

    if (error) {
      console.error(`  ❌ Failed to sync section "${section.name}":`, error.message);
      continue;
    }

    await db.runAsync(
      `UPDATE sections SET sync_status = 'synced' WHERE id = ?`,
      [section.id]
    );
  }

  return sections.length;
}

/**
 * Push tags to Supabase
 */
async function pushTags() {
  const db = getDb();
  const tags = await getPendingTags();
  
  for (const tag of tags) {
    const { error } = await supabase
      .from('tags')
      .upsert({
        id: tag.id,
        name: tag.name,
        created_at: tag.created_at || new Date().toISOString(),
        updated_at: tag.updated_at || new Date().toISOString()
      });

    if (error) {
      console.error(`  ❌ Failed to sync tag "${tag.name}":`, error.message);
      continue;
    }

    await db.runAsync(
      `UPDATE tags SET sync_status = 'synced' WHERE id = ?`,
      [tag.id]
    );
  }

  return tags.length;
}

/**
 * Push tasks to Supabase
 */
async function pushTasks() {
  const db = getDb();
  const tasks = await getPendingTasks();
  
  for (const task of tasks) {
    const { error } = await supabase
      .from('tasks')
      .upsert({
        id: task.id,
        project_id: task.project_id,
        section_id: task.section_id || null,
        parent_id: task.parent_id || null,
        title: task.title,
        description: task.description || null,
        completed: task.completed ? true : false,
        is_expanded: task.is_expanded ? true : false,
        updated_at: task.updated_at || new Date().toISOString()
      });

    if (error) {
      console.error(`  ❌ Failed to sync task "${task.title}":`, error.message);
      continue;
    }

    await db.runAsync(
      `UPDATE tasks SET sync_status = 'synced' WHERE id = ?`,
      [task.id]
    );
  }

  return tasks.length;
}

/**
 * Push task_tags relationships to Supabase
 */
async function pushTaskTags() {
  const db = getDb();
  
  // Get all local task_tags
  const local = await db.getAllAsync('SELECT * FROM task_tags');
  
  // Get all remote task_tags
  const { data: remote, error } = await supabase
    .from('task_tags')
    .select('*');

  if (error) {
    console.error('  ❌ Failed to fetch task_tags from Supabase:', error.message);
    return 0;
  }

  // Find differences and sync
  let count = 0;
  
  for (const rel of local) {
    const exists = remote?.find(r => r.task_id === rel.task_id && r.tag_id === rel.tag_id);
    if (!exists) {
      await supabase
        .from('task_tags')
        .insert({
          task_id: rel.task_id,
          tag_id: rel.tag_id
        });
      count++;
    }
  }

  return count;
}

/**
 * Handle deletions (push deleted items to Supabase)
 */
async function pushDeletes() {
  const db = getDb();
  const deletes = await getPendingDeletes();
  let count = 0;

  // Delete projects
  for (const item of deletes.projects) {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', item.id);

    if (!error) {
      await db.runAsync(`DELETE FROM projects WHERE id = ?`, [item.id]);
      count++;
    }
  }

  // Delete sections
  for (const item of deletes.sections) {
    const { error } = await supabase
      .from('sections')
      .delete()
      .eq('id', item.id);

    if (!error) {
      await db.runAsync(`DELETE FROM sections WHERE id = ?`, [item.id]);
      count++;
    }
  }

  // Delete tags
  for (const item of deletes.tags) {
    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('id', item.id);

    if (!error) {
      await db.runAsync(`DELETE FROM tags WHERE id = ?`, [item.id]);
      count++;
    }
  }

  // Delete tasks
  for (const item of deletes.tasks) {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', item.id);

    if (!error) {
      await db.runAsync(`DELETE FROM tasks WHERE id = ?`, [item.id]);
      count++;
    }
  }

  return count;
}

/**
 * Push all local changes to Supabase
 */
async function pushAll() {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured. Check your .env file.');
  }

  console.log('📤 Pushing local changes to Supabase...\n');

  const results = {
    projects: 0,
    sections: 0,
    tags: 0,
    tasks: 0,
    task_tags: 0,
    deletes: 0
  };

  try {
    results.projects = await pushProjects();
    console.log(`  ✅ Projects: ${results.projects} pushed`);

    results.sections = await pushSections();
    console.log(`  ✅ Sections: ${results.sections} pushed`);

    results.tags = await pushTags();
    console.log(`  ✅ Tags: ${results.tags} pushed`);

    results.tasks = await pushTasks();
    console.log(`  ✅ Tasks: ${results.tasks} pushed`);

    results.task_tags = await pushTaskTags();
    console.log(`  ✅ Task-Tags: ${results.task_tags} pushed`);

    results.deletes = await pushDeletes();
    console.log(`  ✅ Deletions: ${results.deletes} processed`);

    const total = Object.values(results).reduce((sum, count) => sum + count, 0);
    console.log(`\n✅ Push complete. ${total} changes synced.`);

    return { success: true, results, total };
  } catch (error) {
    console.error('\n❌ Push failed:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  pushAll,
  pushProjects,
  pushSections,
  pushTags,
  pushTasks,
  pushTaskTags,
  pushDeletes
};


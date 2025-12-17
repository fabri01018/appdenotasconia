const chalk = require('chalk');
const { supabase, isSupabaseConfigured } = require('../lib/supabase');
const { getDb } = require('../adapters/db');

/**
 * Force a full sync from Supabase (ignores timestamps, pulls everything)
 */
async function syncFullCommand() {
  try {
    if (!isSupabaseConfigured()) {
      console.log(chalk.red('\n❌ Supabase not configured!\n'));
      console.log(chalk.yellow('See QUICK_SETUP.md for setup instructions.'));
      process.exit(1);
    }

    console.log(chalk.bold('\n🔄 Starting FULL sync from Supabase...\n'));
    console.log(chalk.dim('This will pull ALL data, ignoring local timestamps.\n'));

    const db = getDb();
    
    // Disable foreign keys temporarily
    await db.execAsync('PRAGMA foreign_keys = OFF');

    const results = {
      projects: 0,
      sections: 0,
      tags: 0,
      tasks: 0,
      task_tags: 0
    };

    // Pull ALL projects
    console.log('📥 Pulling all projects...');
    const { data: projects, error: projError } = await supabase
      .from('projects')
      .select('*')
      .order('id', { ascending: true });

    if (projError) throw projError;

    if (projects && projects.length > 0) {
      for (const project of projects) {
        await db.runAsync(
          `INSERT OR REPLACE INTO projects (id, name, default_section_id, updated_at, sync_status, deleted_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            project.id,
            project.name,
            project.default_section_id || null,
            project.updated_at || new Date().toISOString(),
            'synced',
            project.deleted_at || null
          ]
        );
      }
      results.projects = projects.length;
    }
    console.log(chalk.green(`  ✅ Projects: ${results.projects} synced`));

    // Pull ALL sections
    console.log('📥 Pulling all sections...');
    const { data: sections, error: sectError } = await supabase
      .from('sections')
      .select('*')
      .order('id', { ascending: true });

    if (sectError) throw sectError;

    if (sections && sections.length > 0) {
      for (const section of sections) {
        try {
          await db.runAsync(
            `INSERT OR REPLACE INTO sections (id, project_id, name, updated_at, sync_status, deleted_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              section.id,
              section.project_id,
              section.name,
              section.updated_at || new Date().toISOString(),
              'synced',
              section.deleted_at || null
            ]
          );
          results.sections++;
        } catch (err) {
          console.log(chalk.yellow(`  ⚠️  Skipped section: ${err.message}`));
        }
      }
    }
    console.log(chalk.green(`  ✅ Sections: ${results.sections} synced`));

    // Pull ALL tags
    console.log('📥 Pulling all tags...');
    const { data: tags, error: tagError } = await supabase
      .from('tags')
      .select('*')
      .order('id', { ascending: true });

    if (tagError) throw tagError;

    if (tags && tags.length > 0) {
      for (const tag of tags) {
        await db.runAsync(
          `INSERT OR REPLACE INTO tags (id, name, created_at, updated_at, sync_status, deleted_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            tag.id,
            tag.name,
            tag.created_at || new Date().toISOString(),
            tag.updated_at || new Date().toISOString(),
            'synced',
            tag.deleted_at || null
          ]
        );
      }
      results.tags = tags.length;
    }
    console.log(chalk.green(`  ✅ Tags: ${results.tags} synced`));

    // Pull ALL tasks (sorted by ID to handle parent_id dependencies)
    console.log('📥 Pulling all tasks...');
    const { data: tasks, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .order('id', { ascending: true });

    if (taskError) throw taskError;

    if (tasks && tasks.length > 0) {
      for (const task of tasks) {
        try {
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
              task.updated_at || new Date().toISOString(),
              'synced',
              task.deleted_at || null
            ]
          );
          results.tasks++;
        } catch (err) {
          console.log(chalk.yellow(`  ⚠️  Skipped task "${task.title}": ${err.message}`));
        }
      }
    }
    console.log(chalk.green(`  ✅ Tasks: ${results.tasks} synced`));

    // Pull ALL task_tags
    console.log('📥 Pulling all task-tag relationships...');
    const { data: taskTags, error: ttError } = await supabase
      .from('task_tags')
      .select('*');

    if (ttError) throw ttError;

    if (taskTags && taskTags.length > 0) {
      // Clear and resync
      await db.runAsync('DELETE FROM task_tags');
      
      for (const rel of taskTags) {
        try {
          await db.runAsync(
            `INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)`,
            [rel.task_id, rel.tag_id]
          );
          results.task_tags++;
        } catch (err) {
          // Skip invalid relationships silently
        }
      }
    }
    console.log(chalk.green(`  ✅ Task-Tags: ${results.task_tags} synced`));

    // Re-enable foreign keys
    await db.execAsync('PRAGMA foreign_keys = ON');

    const total = Object.values(results).reduce((sum, count) => sum + count, 0);
    console.log(chalk.bold.green(`\n✨ Full sync complete! ${total} total records synced.\n`));

  } catch (error) {
    console.error(chalk.red('❌ Full sync failed:'), error.message);
    
    // Try to re-enable foreign keys
    try {
      const db = getDb();
      await db.execAsync('PRAGMA foreign_keys = ON');
    } catch (e) {
      // Ignore
    }
    
    process.exit(1);
  }
}

module.exports = syncFullCommand;


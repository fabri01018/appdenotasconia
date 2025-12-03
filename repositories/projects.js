import { getDb, withRetry } from '../lib/database.js';

export async function getAllProjects() {
  return await withRetry(async () => {
    const db = getDb();
    const projects = await db.getAllAsync('SELECT * FROM projects WHERE deleted_at IS NULL ORDER BY id');
    return projects;
  });
}

export async function getProjectById(id) {
  return await withRetry(async () => {
    const db = getDb();
    const project = await db.getFirstAsync('SELECT * FROM projects WHERE id = ? AND deleted_at IS NULL', [id]);
    return project;
  });
}

export async function getInboxProject() {
  return await withRetry(async () => {
    const db = getDb();
    const project = await db.getFirstAsync('SELECT * FROM projects WHERE name = ? AND deleted_at IS NULL', ['Inbox']);
    return project;
  });
}

export async function getPromptsProject() {
  return await withRetry(async () => {
    const db = getDb();
    const project = await db.getFirstAsync('SELECT * FROM projects WHERE name = ? AND deleted_at IS NULL', ['prompts']);
    return project;
  });
}

export async function createProject(name) {
  console.log(`📝 Creating new project: "${name}"`);
  return await withRetry(async () => {
    const db = getDb();
    const result = await db.runAsync(
      'INSERT INTO projects (name, sync_status) VALUES (?, ?)',
      [name, 'pending']
    );
    const projectId = result.lastInsertRowId;
    
    console.log(`✅ Project created locally with ID: ${projectId}`);
    
    return { id: projectId, name };
  });
}

export async function updateProject(id, name, defaultSectionId = undefined) {
  console.log(`📝 Updating project ${id} to: "${name}"${defaultSectionId !== undefined ? `, default_section_id: ${defaultSectionId}` : ''}`);
  return await withRetry(async () => {
    const db = getDb();
    const now = new Date().toISOString();
    
    let query = 'UPDATE projects SET name = ?, updated_at = ?, sync_status = ?';
    const params = [name, now, 'pending'];
    
    if (defaultSectionId !== undefined) {
      query += ', default_section_id = ?';
      params.push(defaultSectionId);
    }
    
    query += ' WHERE id = ?';
    params.push(id);
    
    const result = await db.runAsync(query, params);
    
    if (result.changes === 0) {
      console.error(`❌ Project ${id} not found for update`);
      throw new Error('Project not found');
    }
    
    console.log(`✅ Project ${id} updated locally`);
    
    return { id, name, default_section_id: defaultSectionId };
  });
}

export async function deleteProject(id) {
  console.log(`🗑️ Soft deleting project ${id}`);
  return await withRetry(async () => {
    const db = getDb();
    const now = new Date().toISOString();
    
    // Soft delete all tasks in this project
    const tasksResult = await db.runAsync(
      'UPDATE tasks SET deleted_at = ?, sync_status = ? WHERE project_id = ? AND deleted_at IS NULL',
      [now, 'pending_delete', id]
    );
    console.log(`🗑️ Soft deleted ${tasksResult.changes} tasks from project ${id}`);
    
    // Soft delete the project
    const result = await db.runAsync(
      'UPDATE projects SET deleted_at = ?, sync_status = ? WHERE id = ?',
      [now, 'pending_delete', id]
    );
    
    if (result.changes === 0) {
      console.error(`❌ Project ${id} not found for deletion`);
      throw new Error('Project not found');
    }
    
    console.log(`✅ Project ${id} soft deleted locally (will sync to Supabase)`);
    
    return { id };
  });
}

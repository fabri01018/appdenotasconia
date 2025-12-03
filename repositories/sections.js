import { getDb, withRetry } from '../lib/database.js';

export async function getAllSections() {
  return await withRetry(async () => {
    const db = getDb();
    const sections = await db.getAllAsync('SELECT * FROM sections WHERE deleted_at IS NULL ORDER BY id');
    return sections;
  });
}

export async function getSectionsByProjectId(projectId) {
  return await withRetry(async () => {
    const db = getDb();
    const sections = await db.getAllAsync(
      'SELECT * FROM sections WHERE project_id = ? AND deleted_at IS NULL ORDER BY id',
      [projectId]
    );
    return sections;
  });
}

export async function getSectionById(id) {
  return await withRetry(async () => {
    const db = getDb();
    const section = await db.getFirstAsync('SELECT * FROM sections WHERE id = ? AND deleted_at IS NULL', [id]);
    return section;
  });
}

export async function createSection(projectId, name) {
  console.log(`📝 Creating new section: "${name}" in project ${projectId}`);
  return await withRetry(async () => {
    const db = getDb();
    const result = await db.runAsync(
      'INSERT INTO sections (project_id, name, sync_status) VALUES (?, ?, ?)',
      [projectId, name, 'pending']
    );
    const sectionId = result.lastInsertRowId;
    
    console.log(`✅ Section created locally with ID: ${sectionId}`);
    
    return { id: sectionId, project_id: projectId, name };
  });
}

export async function updateSection(id, name) {
  console.log(`📝 Updating section ${id} to: "${name}"`);
  return await withRetry(async () => {
    const db = getDb();
    const now = new Date().toISOString();
    const result = await db.runAsync(
      'UPDATE sections SET name = ?, updated_at = ?, sync_status = ? WHERE id = ?',
      [name, now, 'pending', id]
    );
    
    if (result.changes === 0) {
      console.error(`❌ Section ${id} not found for update`);
      throw new Error('Section not found');
    }
    
    console.log(`✅ Section ${id} updated locally`);
    
    return { id, name };
  });
}

export async function deleteSection(id) {
  console.log(`🗑️ Soft deleting section ${id}`);
  return await withRetry(async () => {
    const db = getDb();
    const now = new Date().toISOString();
    
    // Soft delete all tasks in this section by removing their section_id reference
    // This ensures tasks remain in the project but are no longer in a section
    const tasksResult = await db.runAsync(
      'UPDATE tasks SET section_id = NULL, updated_at = ?, sync_status = ? WHERE section_id = ? AND deleted_at IS NULL',
      [now, 'pending', id]
    );
    console.log(`🔄 Removed section reference from ${tasksResult.changes} tasks in section ${id}`);
    
    // Soft delete the section
    const result = await db.runAsync(
      'UPDATE sections SET deleted_at = ?, sync_status = ? WHERE id = ?',
      [now, 'pending_delete', id]
    );
    
    if (result.changes === 0) {
      console.error(`❌ Section ${id} not found for deletion`);
      throw new Error('Section not found');
    }
    
    console.log(`✅ Section ${id} soft deleted locally (will sync to Supabase)`);
    
    return { id };
  });
}


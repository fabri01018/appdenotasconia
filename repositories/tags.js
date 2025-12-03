import { getDb, withRetry } from '../lib/database.js';

export async function getAllTags() {
  return await withRetry(async () => {
    const db = getDb();
    const tags = await db.getAllAsync('SELECT * FROM tags WHERE deleted_at IS NULL ORDER BY name');
    return tags;
  });
}

export async function getTagById(id) {
  return await withRetry(async () => {
    const db = getDb();
    const tag = await db.getFirstAsync('SELECT * FROM tags WHERE id = ?', [id]);
    return tag;
  });
}

export async function createTag(name) {
  return await withRetry(async () => {
    const db = getDb();
    // Explicitly set timestamps since ALTER TABLE might have added columns without defaults
    const now = new Date().toISOString();
    const result = await db.runAsync(
      'INSERT INTO tags (name, sync_status, created_at, updated_at) VALUES (?, ?, ?, ?)', 
      [name, 'pending', now, now]
    );
    const tagId = result.lastInsertRowId;
    
    return { id: tagId, name, created_at: now, updated_at: now };
  });
}

export async function updateTag(id, name) {
  return await withRetry(async () => {
    const db = getDb();
    const now = new Date().toISOString();
    const result = await db.runAsync(
      'UPDATE tags SET name = ?, updated_at = ?, sync_status = ? WHERE id = ?',
      [name, now, 'pending', id]
    );
    
    if (result.changes === 0) {
      throw new Error('Tag not found');
    }
    
    return { id, name };
  });
}

export async function deleteTag(id) {
  return await withRetry(async () => {
    const db = getDb();
    const now = new Date().toISOString();
    
    // Delete task_tags relationships (hard delete is fine for junction table)
    await db.runAsync('DELETE FROM task_tags WHERE tag_id = ?', [id]);
    
    // Soft delete the tag
    const result = await db.runAsync(
      'UPDATE tags SET deleted_at = ?, sync_status = ? WHERE id = ?',
      [now, 'pending_delete', id]
    );
    
    if (result.changes === 0) {
      throw new Error('Tag not found');
    }
    
    return { id };
  });
}

export async function getTasksByTagId(tagId) {
  return await withRetry(async () => {
    const db = getDb();
    const tasks = await db.getAllAsync(`
      SELECT t.*, p.name as project_name 
      FROM tasks t 
      INNER JOIN task_tags tt ON t.id = tt.task_id 
      LEFT JOIN projects p ON t.project_id = p.id 
      WHERE tt.tag_id = ?
      ORDER BY t.id
    `, [tagId]);
    return tasks;
  });
}

/**
 * Get a tag by name, or create it if it doesn't exist
 * @param {string} name - The tag name
 * @returns {Promise<Object>} The tag object with id and name
 */
export async function getOrCreateTag(name) {
  return await withRetry(async () => {
    const db = getDb();
    
    // Try to find existing tag
    let tag = await db.getFirstAsync(
      'SELECT * FROM tags WHERE name = ? AND deleted_at IS NULL',
      [name]
    );
    
    // If tag doesn't exist, create it
    if (!tag) {
      const result = await db.runAsync(
        'INSERT INTO tags (name, sync_status) VALUES (?, ?)',
        [name, 'pending']
      );
      const tagId = result.lastInsertRowId;
      tag = { id: tagId, name };
    }
    
    return tag;
  });
}

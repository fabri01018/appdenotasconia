const { getDb, withRetry } = require('../adapters/db');

async function getAllTags() {
  return await withRetry(async () => {
    const db = getDb();
    const tags = await db.getAllAsync('SELECT * FROM tags WHERE deleted_at IS NULL ORDER BY name');
    return tags;
  });
}

async function getTagById(id) {
  return await withRetry(async () => {
    const db = getDb();
    const tag = await db.getFirstAsync('SELECT * FROM tags WHERE id = ?', [id]);
    return tag;
  });
}

async function createTag(name) {
  return await withRetry(async () => {
    const db = getDb();
    const now = new Date().toISOString();
    const result = await db.runAsync(
      'INSERT INTO tags (name, sync_status, created_at, updated_at) VALUES (?, ?, ?, ?)', 
      [name, 'pending', now, now]
    );
    const tagId = result.lastInsertRowId;
    
    return { id: tagId, name, created_at: now, updated_at: now };
  });
}

async function updateTag(id, name) {
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

async function deleteTag(id) {
  return await withRetry(async () => {
    const db = getDb();
    const now = new Date().toISOString();
    
    // Delete task_tags relationships
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

async function getOrCreateTag(name) {
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

module.exports = {
  getAllTags,
  getTagById,
  createTag,
  updateTag,
  deleteTag,
  getOrCreateTag
};


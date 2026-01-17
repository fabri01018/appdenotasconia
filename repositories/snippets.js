import { getDb, withRetry } from '../lib/database.js';

/**
 * Get all snippets (non-deleted only)
 */
export async function getAllSnippets() {
  return await withRetry(async () => {
    const db = getDb();
    const snippets = await db.getAllAsync(
      'SELECT * FROM snippets WHERE deleted_at IS NULL ORDER BY updated_at DESC'
    );
    return snippets.map(s => ({
      ...s,
      updatedAt: s.updated_at // Map snake_case to camelCase for the hook
    }));
  });
}

/**
 * Create or update a snippet
 */
export async function upsertSnippet(snippet) {
  const { id, slash, title, content, updatedAt } = snippet;
  console.log(`📝 Upserting snippet: "${slash}" (ID: ${id})`);
  
  return await withRetry(async () => {
    const db = getDb();
    
    await db.runAsync(
      `INSERT INTO snippets (id, slash, title, content, updated_at, sync_status) 
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET 
         slash = excluded.slash,
         title = excluded.title,
         content = excluded.content,
         updated_at = excluded.updated_at,
         sync_status = 'pending'
       ON CONFLICT(slash) DO UPDATE SET 
         title = excluded.title,
         content = excluded.content,
         updated_at = excluded.updated_at,
         sync_status = 'pending'`,
      [id, slash, title, content, updatedAt, 'pending']
    );
    
    console.log(`✅ Snippet ${slash} upserted locally`);
    return snippet;
  });
}

/**
 * Delete a snippet (soft delete)
 */
export async function deleteSnippet(id) {
  console.log(`🗑️ Soft deleting snippet ${id}`);
  return await withRetry(async () => {
    const db = getDb();
    const now = new Date().toISOString();
    
    const result = await db.runAsync(
      'UPDATE snippets SET deleted_at = ?, sync_status = ? WHERE id = ?',
      [now, 'pending_delete', id]
    );
    
    if (result.changes === 0) {
      console.error(`❌ Snippet ${id} not found for deletion`);
      throw new Error('Snippet not found');
    }
    
    console.log(`✅ Snippet ${id} soft deleted locally`);
    return { id };
  });
}

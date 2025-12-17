import { getDb, withRetry } from '../lib/database.js';

/**
 * Get all filters (non-deleted only)
 */
export async function getAllFilters() {
  return await withRetry(async () => {
    const db = getDb();
    const filters = await db.getAllAsync(
      'SELECT * FROM filters WHERE deleted_at IS NULL ORDER BY created_at DESC'
    );
    return filters;
  });
}

/**
 * Get a specific filter by ID
 */
export async function getFilterById(id) {
  return await withRetry(async () => {
    const db = getDb();
    const filter = await db.getFirstAsync(
      'SELECT * FROM filters WHERE id = ? AND deleted_at IS NULL',
      [id]
    );
    return filter;
  });
}

/**
 * Create a new filter
 */
export async function createFilter(name, icon = 'filter-outline', color = null) {
  console.log(`📝 Creating new filter: "${name}"`);
  return await withRetry(async () => {
    const db = getDb();
    const now = new Date().toISOString();
    
    const result = await db.runAsync(
      'INSERT INTO filters (name, icon, color, created_at, updated_at, sync_status) VALUES (?, ?, ?, ?, ?, ?)',
      [name, icon, color, now, now, 'pending']
    );
    const filterId = result.lastInsertRowId;
    
    console.log(`✅ Filter created locally with ID: ${filterId}`);
    
    return { id: filterId, name, icon, color };
  });
}

/**
 * Update an existing filter
 */
export async function updateFilter(id, updates) {
  console.log(`📝 Updating filter ${id}:`, updates);
  return await withRetry(async () => {
    const db = getDb();
    const now = new Date().toISOString();
    
    const setClauses = [];
    const params = [];
    
    if (updates.name !== undefined) {
      setClauses.push('name = ?');
      params.push(updates.name);
    }
    if (updates.icon !== undefined) {
      setClauses.push('icon = ?');
      params.push(updates.icon);
    }
    if (updates.color !== undefined) {
      setClauses.push('color = ?');
      params.push(updates.color);
    }
    
    // Always update timestamp and sync status
    setClauses.push('updated_at = ?');
    setClauses.push('sync_status = ?');
    params.push(now, 'pending');
    
    // Add filter ID at the end
    params.push(id);
    
    const query = `UPDATE filters SET ${setClauses.join(', ')} WHERE id = ?`;
    const result = await db.runAsync(query, params);
    
    if (result.changes === 0) {
      console.error(`❌ Filter ${id} not found for update`);
      throw new Error('Filter not found');
    }
    
    console.log(`✅ Filter ${id} updated locally`);
    
    return { id, ...updates };
  });
}

/**
 * Delete a filter (soft delete)
 */
export async function deleteFilter(id) {
  console.log(`🗑️ Soft deleting filter ${id}`);
  return await withRetry(async () => {
    const db = getDb();
    const now = new Date().toISOString();
    
    // Soft delete the filter
    const result = await db.runAsync(
      'UPDATE filters SET deleted_at = ?, sync_status = ? WHERE id = ?',
      [now, 'pending_delete', id]
    );
    
    if (result.changes === 0) {
      console.error(`❌ Filter ${id} not found for deletion`);
      throw new Error('Filter not found');
    }
    
    console.log(`✅ Filter ${id} soft deleted locally (will sync to Supabase)`);
    
    return { id };
  });
}

// ============================================================================
// Filter-Tag Relationship Methods
// ============================================================================

/**
 * Add a tag to a filter
 */
export async function addTagToFilter(filterId, tagId) {
  console.log(`🔗 Adding tag ${tagId} to filter ${filterId}`);
  return await withRetry(async () => {
    const db = getDb();
    
    try {
      await db.runAsync(
        'INSERT INTO filter_tags (filter_id, tag_id) VALUES (?, ?)',
        [filterId, tagId]
      );
      console.log(`✅ Tag ${tagId} added to filter ${filterId}`);
      return { filterId, tagId };
    } catch (error) {
      // If it's a unique constraint violation, it's already associated
      if (error.message.includes('UNIQUE constraint failed')) {
        console.log(`ℹ️ Tag ${tagId} already associated with filter ${filterId}`);
        return { filterId, tagId };
      }
      throw error;
    }
  });
}

/**
 * Remove a tag from a filter
 */
export async function removeTagFromFilter(filterId, tagId) {
  console.log(`🔗 Removing tag ${tagId} from filter ${filterId}`);
  return await withRetry(async () => {
    const db = getDb();
    
    const result = await db.runAsync(
      'DELETE FROM filter_tags WHERE filter_id = ? AND tag_id = ?',
      [filterId, tagId]
    );
    
    console.log(`✅ Tag ${tagId} removed from filter ${filterId} (${result.changes} rows affected)`);
    
    return { filterId, tagId };
  });
}

/**
 * Get all tags associated with a filter
 */
export async function getFilterTags(filterId) {
  return await withRetry(async () => {
    const db = getDb();
    
    const tags = await db.getAllAsync(
      `SELECT t.* 
       FROM tags t
       INNER JOIN filter_tags ft ON ft.tag_id = t.id
       WHERE ft.filter_id = ? AND t.deleted_at IS NULL
       ORDER BY t.name`,
      [filterId]
    );
    
    return tags;
  });
}

// ============================================================================
// Filter-Project Relationship Methods
// ============================================================================

/**
 * Add a project to a filter
 */
export async function addProjectToFilter(filterId, projectId) {
  console.log(`🔗 Adding project ${projectId} to filter ${filterId}`);
  return await withRetry(async () => {
    const db = getDb();
    
    try {
      await db.runAsync(
        'INSERT INTO filter_projects (filter_id, project_id) VALUES (?, ?)',
        [filterId, projectId]
      );
      console.log(`✅ Project ${projectId} added to filter ${filterId}`);
      return { filterId, projectId };
    } catch (error) {
      // If it's a unique constraint violation, it's already associated
      if (error.message.includes('UNIQUE constraint failed')) {
        console.log(`ℹ️ Project ${projectId} already associated with filter ${filterId}`);
        return { filterId, projectId };
      }
      throw error;
    }
  });
}

/**
 * Remove a project from a filter
 */
export async function removeProjectFromFilter(filterId, projectId) {
  console.log(`🔗 Removing project ${projectId} from filter ${filterId}`);
  return await withRetry(async () => {
    const db = getDb();
    
    const result = await db.runAsync(
      'DELETE FROM filter_projects WHERE filter_id = ? AND project_id = ?',
      [filterId, projectId]
    );
    
    console.log(`✅ Project ${projectId} removed from filter ${filterId} (${result.changes} rows affected)`);
    
    return { filterId, projectId };
  });
}

/**
 * Get all projects associated with a filter
 */
export async function getFilterProjects(filterId) {
  return await withRetry(async () => {
    const db = getDb();
    
    const projects = await db.getAllAsync(
      `SELECT p.* 
       FROM projects p
       INNER JOIN filter_projects fp ON fp.project_id = p.id
       WHERE fp.filter_id = ? AND p.deleted_at IS NULL
       ORDER BY p.name`,
      [filterId]
    );
    
    return projects;
  });
}

// ============================================================================
// Task Filtering Logic
// ============================================================================

/**
 * Get all tasks that match a filter's criteria
 * Uses OR logic: tasks match if they have ANY of the filter's tags OR are in ANY of the filter's projects
 * Excludes completed tasks
 */
export async function getTasksByFilter(filterId) {
  return await withRetry(async () => {
    const db = getDb();
    
    // First, get the filter's tags and projects
    const filterTags = await getFilterTags(filterId);
    const filterProjects = await getFilterProjects(filterId);
    
    // If no criteria, return empty array
    if (filterTags.length === 0 && filterProjects.length === 0) {
      console.log(`ℹ️ Filter ${filterId} has no criteria, returning empty task list`);
      return [];
    }
    
    const tagIds = filterTags.map(t => t.id);
    const projectIds = filterProjects.map(p => p.id);
    
    // Build the query dynamically based on what criteria exist
    let query = `
      SELECT DISTINCT t.*, p.name as project_name
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.deleted_at IS NULL 
        AND t.completed = 0
        AND (
    `;
    
    const conditions = [];
    const params = [];
    
    // Add tag condition if there are tags
    if (tagIds.length > 0) {
      const tagPlaceholders = tagIds.map(() => '?').join(', ');
      conditions.push(`
        t.id IN (
          SELECT task_id FROM task_tags WHERE tag_id IN (${tagPlaceholders})
        )
      `);
      params.push(...tagIds);
    }
    
    // Add project condition if there are projects
    if (projectIds.length > 0) {
      const projectPlaceholders = projectIds.map(() => '?').join(', ');
      conditions.push(`t.project_id IN (${projectPlaceholders})`);
      params.push(...projectIds);
    }
    
    query += conditions.join(' OR ');
    query += `) ORDER BY t.id DESC`;
    
    const tasks = await db.getAllAsync(query, params);
    
    console.log(`✅ Filter ${filterId} returned ${tasks.length} tasks`);
    
    return tasks;
  });
}

/**
 * Get a filter with all its details (tags, projects) in one call
 */
export async function getFilterWithDetails(filterId) {
  return await withRetry(async () => {
    // Get the base filter
    const filter = await getFilterById(filterId);
    
    if (!filter) {
      return null;
    }
    
    // Get associated tags and projects
    const tags = await getFilterTags(filterId);
    const projects = await getFilterProjects(filterId);
    
    // Return complete filter object
    return {
      ...filter,
      tags,
      projects
    };
  });
}


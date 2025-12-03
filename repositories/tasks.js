import { getDb, withRetry } from '../lib/database.js';

export async function getAllTasks() {
  return await withRetry(async () => {
    const db = getDb();
    const tasks = await db.getAllAsync(`
      SELECT t.*, p.name as project_name 
      FROM tasks t 
      LEFT JOIN projects p ON t.project_id = p.id 
      WHERE t.deleted_at IS NULL
      ORDER BY t.id DESC
    `);
    return tasks;
  });
}

export async function getTasksByProjectId(projectId) {
  return await withRetry(async () => {
    const db = getDb();
    const tasks = await db.getAllAsync(
      'SELECT * FROM tasks WHERE project_id = ? AND deleted_at IS NULL ORDER BY id DESC',
      [projectId]
    );
    return tasks;
  });
}

export async function getTasksBySectionId(sectionId) {
  return await withRetry(async () => {
    const db = getDb();
    const tasks = await db.getAllAsync(
      'SELECT * FROM tasks WHERE section_id = ? AND deleted_at IS NULL ORDER BY id DESC',
      [sectionId]
    );
    return tasks;
  });
}

export async function getTaskById(id) {
  return await withRetry(async () => {
    const db = getDb();
    const task = await db.getFirstAsync(`
      SELECT t.*, p.name as project_name 
      FROM tasks t 
      LEFT JOIN projects p ON t.project_id = p.id 
      WHERE t.id = ? AND t.deleted_at IS NULL
    `, [id]);
    return task;
  });
}

export async function createTask(projectId, title, description = null, sectionId = null, parentId = null) {
  console.log(`📝 Creating new task: "${title}" in project ${projectId}${sectionId ? `, section ${sectionId}` : ''}${parentId ? `, parent ${parentId}` : ''}`);
  return await withRetry(async () => {
    const db = getDb();
    const result = await db.runAsync(
      'INSERT INTO tasks (project_id, section_id, parent_id, title, description, sync_status) VALUES (?, ?, ?, ?, ?, ?)',
      [projectId, sectionId, parentId, title, description, 'pending']
    );
    const taskId = result.lastInsertRowId;
    
    console.log(`✅ Task created locally with ID: ${taskId}`);
    
    return { id: taskId, project_id: projectId, section_id: sectionId, parent_id: parentId, title, description };
  });
}

export async function updateTask(id, updates) {
  console.log(`📝 Updating task ${id}:`, updates);
  return await withRetry(async () => {
    const db = getDb();
    const now = new Date().toISOString();
    const { project_id, section_id, parent_id, title, description, is_expanded, completed } = updates;
    
    // Build the query dynamically based on provided updates
    const fields = [];
    const values = [];
    
    if (project_id !== undefined) { fields.push('project_id = ?'); values.push(project_id); }
    if (section_id !== undefined) { fields.push('section_id = ?'); values.push(section_id || null); }
    if (parent_id !== undefined) { fields.push('parent_id = ?'); values.push(parent_id); }
    if (title !== undefined) { fields.push('title = ?'); values.push(title); }
    if (description !== undefined) { fields.push('description = ?'); values.push(description); }
    if (is_expanded !== undefined) { fields.push('is_expanded = ?'); values.push(is_expanded ? 1 : 0); }
    if (completed !== undefined) { fields.push('completed = ?'); values.push(completed ? 1 : 0); }
    
    fields.push('updated_at = ?'); values.push(now);
    fields.push('sync_status = ?'); values.push('pending');
    values.push(id);

    if (fields.length <= 2) { // Only updated_at and sync_status
        return { id, ...updates };
    }

    const result = await db.runAsync(
      `UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    
    if (result.changes === 0) {
      console.error(`❌ Task ${id} not found for update`);
      throw new Error('Task not found');
    }
    
    console.log(`✅ Task ${id} updated locally`);
    
    return { id, ...updates };
  });
}

export async function deleteTask(id) {
  console.log(`🗑️ Soft deleting task ${id}`);
  return await withRetry(async () => {
    const db = getDb();
    const now = new Date().toISOString();
    
    // Delete task_tags relationships
    await db.runAsync('DELETE FROM task_tags WHERE task_id = ?', [id]);
    
    // Soft delete the task
    const result = await db.runAsync(
      'UPDATE tasks SET deleted_at = ?, sync_status = ? WHERE id = ?',
      [now, 'pending_delete', id]
    );

    // Soft delete all sub-tasks
    await db.runAsync(
      'UPDATE tasks SET deleted_at = ?, sync_status = ? WHERE parent_id = ?',
      [now, 'pending_delete', id]
    );
    
    if (result.changes === 0) {
      console.error(`❌ Task ${id} not found for deletion`);
      throw new Error('Task not found');
    }
    
    console.log(`✅ Task ${id} and its subtasks soft deleted locally`);
    
    return { id };
  });
}

export async function getSubTasks(parentId) {
  return await withRetry(async () => {
    const db = getDb();
    const tasks = await db.getAllAsync(
      'SELECT * FROM tasks WHERE parent_id = ? AND deleted_at IS NULL ORDER BY completed ASC, id ASC',
      [parentId]
    );
    return tasks;
  });
}

export async function toggleTaskExpansion(id, isExpanded) {
    return await updateTask(id, { is_expanded: isExpanded });
}

export async function getTaskTags(taskId) {
  return await withRetry(async () => {
    const db = getDb();
    const tags = await db.getAllAsync(`
      SELECT t.* 
      FROM tags t 
      INNER JOIN task_tags tt ON t.id = tt.tag_id 
      WHERE tt.task_id = ?
    `, [taskId]);
    return tags;
  });
}

export async function getTagsForTasks(taskIds) {
  if (!taskIds || taskIds.length === 0) {
    return {};
  }
  return await withRetry(async () => {
    const db = getDb();
    // Create a comma-separated list of placeholders
    const placeholders = taskIds.map(() => '?').join(',');
    const tags = await db.getAllAsync(`
      SELECT tt.task_id, t.* 
      FROM tags t 
      INNER JOIN task_tags tt ON t.id = tt.tag_id 
      WHERE tt.task_id IN (${placeholders})
      ORDER BY tt.task_id, t.name
    `, taskIds);
    
    // Group tags by task_id
    const tagsByTaskId = {};
    tags.forEach(tag => {
      if (!tagsByTaskId[tag.task_id]) {
        tagsByTaskId[tag.task_id] = [];
      }
      tagsByTaskId[tag.task_id].push({
        id: tag.id,
        name: tag.name,
      });
    });
    
    return tagsByTaskId;
  });
}

export async function addTagToTask(taskId, tagId) {
  return await withRetry(async () => {
    const db = getDb();
    await db.runAsync(
      'INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)',
      [taskId, tagId]
    );
    
    // Mark task as pending sync
    const now = new Date().toISOString();
    await db.runAsync(
      'UPDATE tasks SET updated_at = ?, sync_status = ? WHERE id = ?',
      [now, 'pending', taskId]
    );

    return { task_id: taskId, tag_id: tagId };
  });
}

export async function removeTagFromTask(taskId, tagId) {
  return await withRetry(async () => {
    const db = getDb();
    const result = await db.runAsync(
      'DELETE FROM task_tags WHERE task_id = ? AND tag_id = ?',
      [taskId, tagId]
    );
    
    // Mark task as pending sync
    const now = new Date().toISOString();
    await db.runAsync(
      'UPDATE tasks SET updated_at = ?, sync_status = ? WHERE id = ?',
      [now, 'pending', taskId]
    );

    return { task_id: taskId, tag_id: tagId };
  });
}

export async function assignAllTasksToSection(projectId, sectionId) {
  console.log(`📝 Assigning all tasks in project ${projectId} to section ${sectionId}`);
  return await withRetry(async () => {
    const db = getDb();
    const now = new Date().toISOString();
    const result = await db.runAsync(
      'UPDATE tasks SET section_id = ?, updated_at = ?, sync_status = ? WHERE project_id = ? AND deleted_at IS NULL AND section_id IS NULL',
      [sectionId, now, 'pending', projectId]
    );
    
    console.log(`✅ Assigned ${result.changes} tasks to section ${sectionId}`);
    
    return { count: result.changes };
  });
}

export async function getTaskByProjectAndTaskName(projectName, taskName) {
  return await withRetry(async () => {
    const db = getDb();
    const task = await db.getFirstAsync(`
      SELECT t.*, p.name as project_name 
      FROM tasks t 
      INNER JOIN projects p ON t.project_id = p.id 
      WHERE p.name = ? AND t.title = ? AND t.deleted_at IS NULL AND p.deleted_at IS NULL
      LIMIT 1
    `, [projectName, taskName]);
    return task;
  });
}

/**
 * Get all tasks that have a specific tag name
 * @param {string} tagName - The tag name to filter by
 * @returns {Promise<Array>} Array of tasks with the specified tag
 */
export async function getTasksByTagName(tagName) {
  return await withRetry(async () => {
    const db = getDb();
    const tasks = await db.getAllAsync(`
      SELECT DISTINCT t.*
      FROM tasks t
      INNER JOIN task_tags tt ON t.id = tt.task_id
      INNER JOIN tags ON tt.tag_id = tags.id
      WHERE tags.name = ?
        AND t.deleted_at IS NULL
        AND tags.deleted_at IS NULL
      ORDER BY t.updated_at DESC
    `, [tagName]);
    return tasks;
  });
}
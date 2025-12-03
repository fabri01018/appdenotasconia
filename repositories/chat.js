import { getDb } from '@/lib/database';

// Chat Sessions

export async function createChatSession(title = 'New Chat', contextTaskId = null) {
  const db = getDb();
  const result = await db.runAsync(
    'INSERT INTO chat_sessions (title, context_task_id) VALUES (?, ?)',
    [title, contextTaskId]
  );
  return result.lastInsertRowId;
}

export async function getChatSessions() {
  const db = getDb();
  return await db.getAllAsync(
    'SELECT * FROM chat_sessions ORDER BY updated_at DESC'
  );
}

export async function getChatSessionById(id) {
  const db = getDb();
  return await db.getFirstAsync(
    'SELECT * FROM chat_sessions WHERE id = ?',
    [id]
  );
}

export async function updateChatSessionTitle(id, title) {
  const db = getDb();
  await db.runAsync(
    'UPDATE chat_sessions SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [title, id]
  );
}

export async function deleteChatSession(id) {
  const db = getDb();
  await db.runAsync('DELETE FROM chat_sessions WHERE id = ?', [id]);
}

export async function getLatestSessionForTask(taskId) {
  const db = getDb();
  return await db.getFirstAsync(
    'SELECT * FROM chat_sessions WHERE context_task_id = ? ORDER BY updated_at DESC LIMIT 1',
    [taskId]
  );
}

// Chat Messages

export async function addChatMessage(sessionId, role, content, isError = false) {
  const db = getDb();
  const result = await db.runAsync(
    'INSERT INTO chat_messages (session_id, role, content, is_error) VALUES (?, ?, ?, ?)',
    [sessionId, role, content, isError ? 1 : 0]
  );
  
  // Update session updated_at
  await db.runAsync(
    'UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [sessionId]
  );
  
  return result.lastInsertRowId;
}

export async function getChatMessages(sessionId) {
  const db = getDb();
  return await db.getAllAsync(
    'SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC',
    [sessionId]
  );
}

export async function deleteChatMessage(id) {
    const db = getDb();
    await db.runAsync('DELETE FROM chat_messages WHERE id = ?', [id]);
}


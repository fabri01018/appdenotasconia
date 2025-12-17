const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(process.cwd(), 'projects.db');

let rawDb = null;

function getRawDb() {
  if (!rawDb) {
    rawDb = new Database(DB_PATH);
    rawDb.pragma('journal_mode = WAL');
    rawDb.pragma('foreign_keys = ON');
    initSchema(rawDb);
  }
  return rawDb;
}

function initSchema(db) {
  const schema = `
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      default_section_id INTEGER,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      sync_status TEXT DEFAULT 'pending',
      deleted_at DATETIME,
      FOREIGN KEY (default_section_id) REFERENCES sections(id)
    );

    CREATE TABLE IF NOT EXISTS sections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      sync_status TEXT DEFAULT 'pending',
      deleted_at DATETIME,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      section_id INTEGER,
      parent_id INTEGER,
      title TEXT NOT NULL,
      description TEXT,
      completed INTEGER DEFAULT 0,
      is_expanded INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      sync_status TEXT DEFAULT 'pending',
      deleted_at DATETIME,
      FOREIGN KEY (project_id) REFERENCES projects(id),
      FOREIGN KEY (section_id) REFERENCES sections(id),
      FOREIGN KEY (parent_id) REFERENCES tasks(id)
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at DATETIME,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      sync_status TEXT DEFAULT 'pending',
      deleted_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS task_tags (
      task_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (task_id, tag_id),
      FOREIGN KEY (task_id) REFERENCES tasks(id),
      FOREIGN KEY (tag_id) REFERENCES tags(id)
    );
  `;
  
  db.exec(schema);

  // Ensure Inbox project exists
  const inbox = db.prepare('SELECT id FROM projects WHERE name = ?').get('Inbox');
  if (!inbox) {
    db.prepare('INSERT INTO projects (name) VALUES (?)').run('Inbox');
  }
}

// Wrapper to match Expo SQLite interface
const dbAdapter = {
  runAsync: async (sql, params = []) => {
    const db = getRawDb();
    const stmt = db.prepare(sql);
    const result = stmt.run(...params);
    return {
      lastInsertRowId: result.lastInsertRowid,
      changes: result.changes
    };
  },
  getAllAsync: async (sql, params = []) => {
    const db = getRawDb();
    const stmt = db.prepare(sql);
    return stmt.all(...params);
  },
  getFirstAsync: async (sql, params = []) => {
    const db = getRawDb();
    const stmt = db.prepare(sql);
    return stmt.get(...params);
  },
  execAsync: async (sql) => {
    const db = getRawDb();
    db.exec(sql);
  }
};

async function withRetry(operation) {
  try {
    return await operation();
  } catch (error) {
    console.error('DB Operation failed:', error);
    throw error;
  }
}

module.exports = {
  getDb: () => dbAdapter,
  withRetry
};

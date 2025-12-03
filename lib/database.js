import * as FileSystem from 'expo-file-system/legacy';
import * as SQLite from 'expo-sqlite';

let db;
let initPromise = null;

/**
 * Delete the database file to start fresh with new schema
 * WARNING: This will delete all local data!
 */
export async function resetDatabase() {
  try {
    console.log('🗑️ Deleting database...');
    
    // Close existing connection if any
    if (db) {
      await db.closeAsync();
      db = null;
    }
    
    // Delete the database file
    const dbPath = `${FileSystem.documentDirectory}SQLite/projects.db`;
    await FileSystem.deleteAsync(dbPath);
    console.log('✅ Database deleted successfully');
    
    // Reset the init promise
    initPromise = null;
    
    // Re-initialize the database with fresh schema
    console.log('🔄 Reinitializing database...');
    await initDatabase();
    
    return true;
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    throw error;
  }
}

export async function initDatabase() {
  if (db) return;
  if (initPromise) return initPromise;

  initPromise = _initDatabase();

  try {
    await initPromise;
  } finally {
    initPromise = null;
  }
}

/**
 * Helper function to check if a column exists in a table
 */
async function columnExists(db, tableName, columnName) {
  try {
    await db.getFirstAsync(`SELECT ${columnName} FROM ${tableName} LIMIT 1`);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Helper function to add missing columns to existing tables
 */
async function addMissingColumns(db, tableName, columns) {
  for (const column of columns) {
    try {
      // Check if column already exists before trying to add it
      const exists = await columnExists(db, tableName, column.name);
      
      if (!exists) {
        await db.runAsync(
          `ALTER TABLE ${tableName} ADD COLUMN ${column.name} ${column.type}`
        );
        console.log(`✅ Added column ${column.name} to ${tableName}`);
      } else {
        console.log(`ℹ️ Column ${column.name} already exists in ${tableName}`);
      }
    } catch (error) {
      console.log(`⚠️ Could not add column ${column.name} to ${tableName}:`, error.message);
    }
  }
}

async function _initDatabase() {
  try {
    console.log('Starting database initialization...');

    if (db) {
      try {
        await db.closeAsync();
      } catch (closeError) {
        console.log('Error closing existing database:', closeError.message);
      }
      db = null;
    }

    db = await SQLite.openDatabaseAsync('projects.db');
    console.log('Database opened successfully');

    // Enable foreign key constraints
    await db.execAsync('PRAGMA foreign_keys = ON;');

    // Create projects table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        default_section_id INTEGER,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        sync_status TEXT DEFAULT 'pending',
        deleted_at DATETIME,
        FOREIGN KEY (default_section_id) REFERENCES sections(id)
      );
    `);
    
    // Try to add missing columns to projects table for existing databases
    await addMissingColumns(db, 'projects', [
      { name: 'updated_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
      { name: 'sync_status', type: 'TEXT DEFAULT "pending"' },
      { name: 'deleted_at', type: 'DATETIME' },
      { name: 'default_section_id', type: 'INTEGER' }
    ]);

    // Create sections table (before tasks, since tasks references sections)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS sections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        sync_status TEXT DEFAULT 'pending',
        deleted_at DATETIME,
        FOREIGN KEY (project_id) REFERENCES projects(id)
      );
    `);
    
    // Try to add missing columns to sections table for existing databases
    await addMissingColumns(db, 'sections', [
      { name: 'updated_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
      { name: 'sync_status', type: 'TEXT DEFAULT "pending"' },
      { name: 'deleted_at', type: 'DATETIME' }
    ]);

    // Create tasks table
    await db.execAsync(`
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
    `);
    
    // Try to add missing columns to tasks table for existing databases
    await addMissingColumns(db, 'tasks', [
      { name: 'completed', type: 'INTEGER DEFAULT 0' },
      { name: 'updated_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
      { name: 'sync_status', type: 'TEXT DEFAULT "pending"' },
      { name: 'deleted_at', type: 'DATETIME' },
      { name: 'section_id', type: 'INTEGER' },
      { name: 'parent_id', type: 'INTEGER' },
      { name: 'is_expanded', type: 'INTEGER DEFAULT 0' }
    ]);

    // Create tags table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        sync_status TEXT DEFAULT 'pending',
        deleted_at DATETIME
      );
    `);
    
    // Try to add missing columns to tags table for existing databases
    // Note: We cannot use DEFAULT CURRENT_TIMESTAMP with ALTER TABLE in some SQLite versions
    await addMissingColumns(db, 'tags', [
      { name: 'created_at', type: 'DATETIME' },
      { name: 'updated_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
      { name: 'sync_status', type: 'TEXT DEFAULT "pending"' },
      { name: 'deleted_at', type: 'DATETIME' }
    ]);

    // Create settings table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create task_tags table (many-to-many)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS task_tags (
        task_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        PRIMARY KEY (task_id, tag_id),
        FOREIGN KEY (task_id) REFERENCES tasks(id),
        FOREIGN KEY (tag_id) REFERENCES tags(id)
      );
    `);

    // Create sync metadata tables
    try {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS sync_metadata (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          table_name TEXT NOT NULL,
          record_id INTEGER NOT NULL,
          last_modified DATETIME DEFAULT CURRENT_TIMESTAMP,
          sync_status TEXT DEFAULT 'pending',
          supabase_id TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(table_name, record_id)
        )
      `);

      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS sync_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sync_type TEXT NOT NULL,
          status TEXT NOT NULL,
          message TEXT,
          records_synced INTEGER DEFAULT 0,
          error_details TEXT,
          started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          completed_at DATETIME
        )
      `);
    } catch (syncTableError) {
      console.error('Error creating sync tables:', syncTableError);
      // Continue without sync tables for now
    }

    // Create chat tables
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        context_task_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (context_task_id) REFERENCES tasks(id)
      );
    `);

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        is_error INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
      );
    `);

    // Ensure Inbox project exists (required for app functionality)
    // But don't create any sample data - start with a blank slate
    const inboxExists = await db.getFirstAsync('SELECT COUNT(*) AS count FROM projects WHERE name = ?', ['Inbox']);
    if (inboxExists.count === 0) {
      console.log('Creating Inbox project...');
      await db.runAsync('INSERT INTO projects (name) VALUES (?)', ['Inbox']);
      console.log('Inbox project created');
    }

    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    db = null;
    throw error;
  }
}

async function addSampleData() {
  try {
    console.log('Adding sample data...');
    
    // Add Inbox project first (main project)
    const inboxIdResult = await db.runAsync(
      'INSERT INTO projects (name) VALUES (?)',
      ['Inbox']
    );
    const inboxId = inboxIdResult.lastInsertRowId;
    console.log('Inbox project created with ID:', inboxId);

    // Add a sample project
    const projectIdResult = await db.runAsync(
      'INSERT INTO projects (name) VALUES (?)',
      ['My First Project']
    );
    const projectId = projectIdResult.lastInsertRowId;
    console.log('Project created with ID:', projectId);

    if (!projectId || !inboxId) {
      throw new Error('Failed to get project ID from insert result');
    }

    // Add sample tasks to inbox
    const inboxTask1 = await db.runAsync(
      'INSERT INTO tasks (project_id, title, description, completed) VALUES (?, ?, ?, ?)',
      [inboxId, 'Welcome to Inbox', 'This is your main workspace for quick tasks', 0]
    );

    // Add sample tasks to regular project
    const task1 = await db.runAsync(
      'INSERT INTO tasks (project_id, title, description, completed) VALUES (?, ?, ?, ?)',
      [projectId, 'Design UI', 'Create wireframes', 0]
    );
    const task2 = await db.runAsync(
      'INSERT INTO tasks (project_id, title, description, completed) VALUES (?, ?, ?, ?)',
      [projectId, 'Build API', 'Set up backend endpoints', 0]
    );

    console.log('Tasks created with IDs:', inboxTask1.lastInsertRowId, task1.lastInsertRowId, task2.lastInsertRowId);

    // Add sample tags
    const tag1 = await db.runAsync(
      'INSERT INTO tags (name) VALUES (?)',
      ['UI']
    );
    const tag2 = await db.runAsync(
      'INSERT INTO tags (name) VALUES (?)',
      ['Backend']
    );

    console.log('Tags created with IDs:', tag1.lastInsertRowId, tag2.lastInsertRowId);

    // Link tasks with tags
    await db.runAsync('INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)', [task1.lastInsertRowId, tag1.lastInsertRowId]);
    await db.runAsync('INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)', [task2.lastInsertRowId, tag2.lastInsertRowId]);

    console.log('Sample data added successfully');
  } catch (error) {
    console.error('Error adding sample data:', error);
    throw error;
  }
}

// Accessor for database
export function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
  return db;
}

// Helper: execute with retry
export async function withRetry(operation, maxRetries = 3) {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      await initDatabase();
      return await operation();
    } catch (error) {
      lastError = error;
      console.log(`Retry ${i + 1}/${maxRetries} failed: ${error.message}`);
      db = null;
      initPromise = null;
      await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)));
    }
  }
  throw lastError;
}

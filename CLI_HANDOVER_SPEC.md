# CLI Handover Specification

This document contains all the necessary information to rebuild the **ProductionAI** application as a CLI-first tool.

## 1. Project Overview
*   **Goal:** Create a high-performance CLI task manager based on the "Blocks" data model.
*   **Key Philosophy:** "Everything is a block" (Outliner paradigm).
*   **Target User:** Developers who prefer terminal-based workflows over GUI apps.
*   **Tech Stack:** Node.js, `better-sqlite3`, `commander`, `inquirer`, `chalk`.

## 2. Database Schema (SQLite)
The CLI must use the same schema as the original app to ensure data compatibility.

```sql
PRAGMA foreign_keys = ON;

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
  description TEXT, -- Stores the Blocks structure as text
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
```

## 3. Data Model: Blocks
The `tasks.description` field stores the block structure in a custom text format.

### Format Specification
*   **Regular Block:** Just text (e.g., `Buy milk`)
*   **Toggle Block:** Starts with `> ` (e.g., `> Groceries`)
*   **Check Block:** Starts with `- [ ]` or `- [x]` (e.g., `- [ ] Apples`)
*   **Nesting:** 2 spaces indentation per level.

### Example
```text
> Project Alpha
  - [ ] Research
  - [x] Design
  > Development
    Backend API
```

## 4. Architecture Plan

### Directory Structure
```
productionai-cli/
├── bin/
│   └── prod.js          # Entry point (#!/usr/bin/env node)
├── src/
│   ├── adapters/
│   │   └── db.js        # better-sqlite3 wrapper (implements runAsync/getAllAsync)
│   ├── commands/
│   │   ├── add.js
│   │   ├── list.js
│   │   ├── view.js
│   │   ├── edit.js
│   │   └── sync.js
│   ├── lib/
│   │   └── blocks.js    # Ported from lib/blocks-utils.js
│   └── repositories/    # Ported from existing repositories/*.js
└── package.json
```

## 5. Key Logic to Port
1.  **Block Parsing:** The function `customTextToJson` from `lib/blocks-utils.js` must be ported to `src/lib/blocks.js`.
2.  **Repo Logic:** `repositories/tasks.js` contains the core SQL queries. These can be copied almost verbatim, provided the `db` adapter matches the interface.

## 6. Command Wishlist

| Command | Description | Implementation Strategy |
| :--- | :--- | :--- |
| `prod ls` | List projects/tasks | Query `projects` & `tasks` tables. Simple console.log output. |
| `prod add <text>` | Add to Inbox | Insert into `tasks` (project_id = Inbox). |
| `prod view <name>` | Render task blocks | Fetch `description`, parse blocks, pretty-print tree with ASCII. |
| `prod edit <name>` | Open in $EDITOR | 1. Fetch `description` <br> 2. Write to `/tmp/task.txt` <br> 3. `spawn($EDITOR, path)` <br> 4. Read file, Update DB. |
| `prod check <id>` | Toggle checkbox | Parse description -> Toggle state in memory -> Serialize -> Save. |

## 7. Immediate Next Steps for New Session
1.  Initialize a new Node.js project: `npm init -y`.
2.  Install dependencies: `npm install better-sqlite3 commander chalk inquirer`.
3.  Create `src/adapters/db.js` to connect to `production.db`.
4.  Copy the SQL schema above to initialize the DB if missing.
5.  Implement `bin/prod.js` with a simple `hello` command.


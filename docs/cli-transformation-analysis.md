# Analysis: Transforming ProductionAI App to CLI

This document analyzes the technical requirements and strategy for transforming the ProductionAI React Native app into a Command Line Interface (CLI) application.

## 1. Executive Summary

The ProductionAI app's core logic (Task Management, AI Tools, Sync Engine) is well-structured and largely separated from the UI. This makes a CLI transformation highly feasible. The primary challenge lies in replacing the Expo-specific Data Layer (SQLite) and managing the runtime environment (Node.js vs. Expo).

**Estimated Effort:** Moderate (Logic reuse is high, but infrastructure replacement is required).

## 2. Technical Architecture

### 2.1. Runtime Environment
*   **Current:** Expo / React Native (Mobile/Web context).
*   **Target:** Node.js (v18+).
*   **Implication:** Mobile-specific APIs (`expo-*` packages) must be replaced with Node.js equivalents.

### 2.2. Data Layer (Critical Path)
*   **Current:** `expo-sqlite` via `lib/database.js`.
*   **Target:** `better-sqlite3` or `sqlite3`.
*   **Strategy:**
    *   Create a `DatabaseAdapter` interface that mimics the `expo-sqlite` API (`runAsync`, `getAllAsync`, `getFirstAsync`).
    *   Implement this adapter using `better-sqlite3`.
    *   Refactor `lib/database.js` to conditionally load the correct driver or inject the database instance into Repositories and Tools.

### 2.3. Authentication
*   **Current:** Supabase Auth via standard JS client (likely implicitly handling storage).
*   **Target:** Supabase Auth for Node.js.
*   **Strategy:**
    *   CLI cannot use OAuth redirects easily.
    *   **Phase 1:** Implement Email/Password login via interactive prompt (`inquirer` or `prompts`).
    *   **Token Storage:** Use a secure local storage solution (e.g., `conf` or system keychain via `keytar`) to persist session tokens between CLI runs.

### 2.4. File Structure & Code Sharing

Existing business logic in `repositories/`, `lib/tools.js`, and `lib/sync/` can be reused with minimal changes if dependencies are managed correctly.

```
/
├── bin/              # CLI entry points
│   └── ai-cli.js
├── src/
│   ├── adapters/     # Adapters for DB and FS
│   ├── commands/     # CLI Command implementations (Task, Project, AI)
│   └── utils/        # CLI-specific utilities (formatting, prompts)
├── lib/              # Shared logic (symlinked or imported from existing app)
└── package.json      # Updated with CLI dependencies
```

## 3. Feature Transformation Plan

### 3.1. Task Management
*   **Commands:**
    *   `ai task list` (Lists tasks, supports filtering by project/tag)
    *   `ai task create <title>`
    *   `ai task done <id>`
*   **Implementation:** Wrap functions from `repositories/tasks.js`. The SQL queries are compatible.

### 3.2. AI Integration
*   **Commands:**
    *   `ai chat "How do I..."`
    *   `ai ask "Create a task for..."`
*   **Implementation:** Reuse `lib/claude-api.js` and `lib/tools.js`.
*   **UI:** Stream responses to `stdout`.

### 3.3. Sync Engine
*   **Commands:**
    *   `ai sync` (Manual trigger)
    *   `ai sync --watch` (Daemon mode - optional/advanced)
*   **Implementation:** The sync logic in `lib/sync/` is modular.
    *   **Challenge:** `syncpush` uses `database-utils.js` which likely expects an `expo-sqlite` compatible object.
    *   **Solution:** Pass the `better-sqlite3` adapter instance to these sync functions.

### 3.4. Voice Input (Deepgram)
*   **Status:** High Difficulty.
*   **Current:** `expo-av`, `react-native-live-audio-stream`.
*   **Target:** `sox` or `mic` module for Node.js.
*   **Recommendation:** Postpone for Phase 2. Focus on text-based interaction first.

## 4. Implementation Steps

1.  **Setup CLI Project:**
    *   Initialize `package.json` for CLI (or adding scripts to current one).
    *   Install `commander` (argument parsing), `chalk` (coloring), `inquirer` (interactive prompts), `better-sqlite3`.

2.  **Database Abstraction Layer:**
    *   Create `lib/database-adapter.js`.
    *   Ensure `getDb()` returns a compatible interface regardless of environment.

3.  **Port Repositories:**
    *   Verify `repositories/*.js` work with the new DB adapter.

4.  **Auth Implementation:**
    *   Create `auth login` command.
    *   Setup token persistence.

5.  **Command Implementation:**
    *   Implement CRUD commands using existing repositories.
    *   Implement AI commands using `lib/tools.js`.

6.  **Sync Adaptation:**
    *   Refactor `lib/sync/` to accept a database instance or use the global adapter.

## 5. Proposed CLI Command Structure

```bash
productionai [command] [options]

Commands:
  login              Authenticate with Supabase
  sync               Sync local data with cloud
  
  task               Manage tasks
    list [options]   List tasks (flags: --project, --tag, --today)
    add <title>      Create a new task
    done <id>        Complete a task
    
  project            Manage projects
    list             List projects
    add <name>       Create project
    
  ask <query>        Natural language command (uses AI tools)
                     e.g. "Create a project called Work and add a task to email Bob"
```

## 6. Recommendations

*   **Monorepo Approach:** Consider moving core logic (`lib/`, `repositories/`) into a shared package if you plan to maintain both App and CLI long-term. For now, direct imports are fine.
*   **Interactive Mode:** Use libraries like `ink` (React for CLI) if you want a rich TUI (Text User Interface) that mimics the app's dashboard, or stick to standard standard output for scriptability.
*   **Database Location:** Store the SQLite DB in `~/.productionai/production.db` (or XDG compatible path) to ensure it persists outside the project folder.


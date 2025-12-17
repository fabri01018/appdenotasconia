# ProductionAI CLI

A high-performance, terminal-based task manager built on the "Blocks" data model (outliner paradigm). Everything is a block: toggles, checkboxes, and nested content.

## Features

- 🚀 **Blazing Fast**: Built with `better-sqlite3`, operations complete in milliseconds
- 📝 **Blocks-First**: Tasks are outlines with toggles, checkboxes, and nested content
- 💻 **Terminal Native**: Edit tasks in your favorite editor ($EDITOR)
- 🔄 **Data Compatible**: Uses the same SQLite schema as the main ProductionAI app

## Installation

### Local Development

```bash
cd productionai-cli
npm install
npm link
```

### From NPM (when published)

```bash
npm install -g productionai-cli
```

## Setup

### Installation (see above)

### Supabase Sync (Optional)

To enable sync with Supabase:

1. Create a `.env` file in the `productionai-cli` directory
2. Add your credentials:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key-here
   ```
3. See **ENV_SETUP.md** for detailed instructions

The CLI works perfectly offline without Supabase. Sync is only needed if you want to:
- Share tasks across devices
- Sync with the main ProductionAI mobile app
- Backup your data to the cloud

## Usage

### Quick Capture

```bash
# Add a task to Inbox
prod add "Buy milk"
```

### List Tasks

```bash
# List all tasks
prod ls

# List tasks by project
prod ls --project "Backend"

# JSON output (for scripting)
prod ls --json
```

### View Tasks for a Project

```bash
# View all tasks in a specific project/folder
prod tasks "Backend"

# JSON output (for scripting)
prod tasks "Backend" --json
```

This command shows a clean overview of tasks grouped by completion status (Todo/Done).

### View Task Details

```bash
# View task with blocks rendered as tree
prod view 1
prod cat 1  # alias
```

### Edit Task

```bash
# Open task in $EDITOR (vim, nano, notepad, etc.)
prod edit 1
```

The task description opens in your default editor. You can use the blocks format:

```
> Project Planning
  - [ ] Research competitors
  - [x] Define MVP features
  > Technical Stack
    Node.js backend
    React frontend
```

### Toggle Completion

```bash
# Mark task as complete/incomplete
prod check 1
prod do 1  # alias
```

### List Projects

```bash
# List all projects
prod projects
prod proj  # alias
```

### Sync with Supabase

```bash
# Full sync (push + pull)
prod sync

# Only push local changes
prod sync --push

# Only pull remote changes
prod sync --pull
```

**What gets synced:**
- Projects
- Sections
- Tasks (with all blocks)
- Tags
- Task-tag relationships
- Deletions

## Data Format: Blocks

Tasks use a simple text format for blocks:

- **Regular Block**: Plain text
- **Toggle Block**: Starts with `> ` (can have nested children)
- **Check Block**: Starts with `- [ ]` or `- [x]`
- **Nesting**: 2 spaces per indentation level

### Example

```
> Frontend Tasks
  - [ ] Design homepage
  - [x] Setup routing
  > Components
    Button component
    Modal component
```

## Database

The CLI uses `projects.db` in the current working directory. This is the same database used by the main ProductionAI app, ensuring full compatibility.

### Schema

- `projects`: Top-level containers
- `sections`: Kanban-style columns within projects
- `tasks`: Items with title and description (blocks)
- `tags`: Labels for categorization
- `task_tags`: Many-to-many relationship

## Philosophy

**"Everything is a block"** - The CLI treats tasks as documents, not just list items. Each task is an outline/canvas where you can:

- Organize thoughts hierarchically
- Toggle sections to collapse/expand
- Check off items as you complete them

**Speed** - Operations are instant. No React rendering, no layout calculations, just raw terminal output.

**Unix Philosophy** - Text in, text out. Pipe commands, script workflows, integrate with other tools.

## Roadmap

- [ ] Tag management commands
- [ ] Section management (move tasks between sections)
- [ ] Advanced filtering (by tags, completion status)
- [ ] TUI mode (interactive outliner with keyboard shortcuts)
- [ ] Sync support (push/pull to Supabase)
- [ ] AI commands (`prod ai subtasks`, `prod ai clean`)

## Contributing

This CLI is designed to be exported as a standalone package. Keep dependencies minimal and maintain CommonJS compatibility.

## License

ISC


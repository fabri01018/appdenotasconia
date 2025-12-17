# Testing Guide for ProductionAI CLI

## Quick Start Testing

### 1. View Help

```bash
prod --help
```

This shows all available commands.

### 2. List Projects

```bash
prod projects
```

Should show at least the "Inbox" project.

### 3. Add Tasks

```bash
# Add simple tasks
prod add "Buy groceries"
prod add "Write documentation"
prod add "Deploy to production"
```

Each command will show the task ID created.

### 4. List All Tasks

```bash
prod ls
```

Shows a formatted table with:
- Task ID
- Project name
- Title
- Completion status (✓ if completed)

### 5. View Task Details with Blocks

```bash
prod view 2
```

This displays the task with its block structure rendered as a tree. You should see:
- Toggle blocks with ▶ or ▼ symbols
- Check blocks with [ ] or [✓]
- Regular blocks as plain text
- Proper indentation for nested items

### 6. Toggle Task Completion

```bash
prod check 1
```

Marks task #1 as complete (or incomplete if already complete). When you run `prod ls` again, completed tasks appear with strikethrough and a ✓.

### 7. Edit Task in Your Editor

```bash
prod edit 2
```

This opens task #2 in your default text editor. You can use the blocks format:

```
> Project Planning
  - [ ] Research competitors
  - [x] Define MVP features
  > Technical Stack
    Node.js backend
    React frontend
- [ ] Create timeline
```

Save and close the editor to update the task.

## Testing the Blocks Format

### Format Rules:
- **Toggle**: Start line with `> ` (can have children)
- **Checkbox**: Start line with `- [ ]` (unchecked) or `- [x]` (checked)
- **Regular block**: Just plain text
- **Nesting**: 2 spaces per indentation level

### Example Test Content:

```bash
# Create a task to test with
prod add "Complex Project Plan"

# Get the task ID (let's say it's 3), then edit it
prod edit 3
```

Add this content in your editor:

```
> Phase 1: Planning
  - [x] Define requirements
  - [ ] Create mockups
  > Research
    Competitor analysis
    User surveys
  - [ ] Budget approval

> Phase 2: Development
  - [ ] Setup environment
  - [ ] Backend API
    > Authentication
      JWT implementation
      OAuth providers
    > Database
      PostgreSQL setup
      Migrations
  - [ ] Frontend
    - [ ] Component library
    - [ ] Routing

Final notes and reminders
```

Then view it:

```bash
prod view 3
```

## Testing JSON Output (for scripting)

```bash
prod ls --json
```

Returns tasks as JSON array for piping to other tools like `jq`.

## Testing Project Filtering

First, create a new project by inserting directly into the database, or use the existing projects:

```bash
prod ls --project "Inbox"
```

## Advanced Testing Scenarios

### Test 1: Rapid Capture Workflow
```bash
prod add "Call dentist"
prod add "Review pull request #42"
prod add "Prepare meeting notes"
prod ls
```

### Test 2: Task Management
```bash
# View task
prod view 1

# Mark complete
prod check 1

# Verify status changed
prod ls
```

### Test 3: Block Editing
```bash
# Edit task 2
prod edit 2

# Add some nested content with toggles and checkboxes
# Save and exit

# View the result
prod view 2
```

### Test 4: Database Persistence
```bash
# Add tasks
prod add "Test persistence"

# Close terminal

# Open new terminal
prod ls

# Your task should still be there!
```

## Verifying Database Location

The CLI creates/uses `projects.db` in your current working directory. To verify:

```bash
# Windows
dir projects.db

# Unix/Mac
ls -lh projects.db
```

You can also connect to it with any SQLite browser to inspect the data directly.

## Common Issues & Fixes

### "Database not initialized" error
The database should auto-initialize on first run. If you see this error:
```bash
cd productionai-cli
node -e "require('./src/adapters/db').getDb()"
```

### Editor doesn't open
Set your preferred editor:
```bash
# Windows
set EDITOR=notepad

# Unix/Mac
export EDITOR=vim
```

### Command not found: prod
If `prod` command isn't found, re-run:
```bash
cd productionai-cli
npm link
```

## Performance Testing

The CLI should be **instant**. Test with timing:

```bash
# Windows PowerShell
Measure-Command { prod ls }

# Unix/Mac
time prod ls
```

Operations should complete in < 50ms even with hundreds of tasks.

## Testing Supabase Sync

### Setup

1. Create a `.env` file in `productionai-cli/`:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key-here
   ```

2. See `ENV_SETUP.md` for detailed instructions on getting your credentials.

### Test Sync Commands

```bash
# Check if sync is available
prod sync

# If not configured, you'll see:
# ⚠️  Supabase not configured. Sync commands will not work.

# Once configured:
prod sync              # Full sync (push + pull)
prod sync --push       # Only push local changes
prod sync --pull       # Only pull remote changes
```

### Full Sync Workflow Test

```bash
# 1. Add some tasks locally
prod add "Task from CLI 1"
prod add "Task from CLI 2"

# 2. Push to Supabase
prod sync --push

# Expected output:
# 📤 Pushing local changes to Supabase...
#   ✅ Projects: 0 pushed
#   ✅ Tasks: 2 pushed
#   ...

# 3. Pull from Supabase (to verify)
prod sync --pull

# 4. Open the main app - tasks should appear there too!
```

### Cross-Device Testing

1. **Device A (CLI)**: Add tasks, run `prod sync`
2. **Device B (Mobile App)**: Open app, pull sync
3. Verify tasks appear on both devices
4. Edit a task on Device B
5. **Device A**: Run `prod sync --pull`
6. Verify changes appear in CLI

## Next Steps

Once basic testing is complete, try:
1. Creating multiple projects (via the main app or direct SQL)
2. Moving tasks between projects
3. Using tags (via main app, CLI tag commands coming soon)
4. Full bidirectional sync workflow (CLI ↔ Supabase ↔ Mobile App)

## Compatibility Testing

Since this CLI shares the database with the main app:

1. Add tasks via CLI: `prod add "CLI task"`
2. Open the main ProductionAI app
3. Verify the task appears
4. Edit it in the app (add blocks, tags, etc.)
5. View it via CLI: `prod view <id>`
6. Verify blocks render correctly

This ensures full data compatibility between CLI and GUI.


# ProductionAI CLI - Usage Examples

## Viewing Tasks by Project

The `prod tasks` command provides a clean way to view all tasks in a specific project/folder.

### Basic Usage

```bash
# View tasks in a project
prod tasks "Backend"
```

**Output:**
```
📁 Backend
   5 tasks

  Todo:

  ☐ Set up API endpoints (#12)
  ☐ Configure database (#15)
  ☐ Add authentication (#18)

  Done:

  ✓ Initialize project (#10)
  ✓ Install dependencies (#11)
```

### JSON Output

Perfect for scripting and automation:

```bash
prod tasks "Backend" --json
```

### Compare with List Command

**Old way (filter with flag):**
```bash
prod ls --project "Backend"
```

**New way (dedicated command):**
```bash
prod tasks "Backend"
```

Both work, but `prod tasks` provides:
- Cleaner output with better grouping
- Shows project name as a header
- Groups by completion status (Todo/Done)
- More intuitive syntax

## Common Workflows

### 1. Review Project Tasks

```bash
# List all projects
prod projects

# View tasks in specific project
prod tasks "Marketing Campaign"
```

### 2. Check What's Left to Do

```bash
# View incomplete tasks in a project
prod tasks "Q4 Goals"
```

The incomplete tasks appear first under "Todo:", making it easy to see what needs attention.

### 3. Scripting and Automation

```bash
# Export project tasks as JSON
prod tasks "Backend" --json > backend-tasks.json

# Count incomplete tasks
prod tasks "Backend" --json | jq '[.[] | select(.completed == 0)] | length'

# Get task IDs for processing
prod tasks "Backend" --json | jq -r '.[].id'
```

## Error Handling

If you try to view a non-existent project, you'll get helpful feedback:

```bash
prod tasks "NonExistent"
```

**Output:**
```
❌ Project "NonExistent" not found.

Available projects:
  • Inbox
  • Backend
  • Frontend
  • Marketing Campaign
```

## Related Commands

- `prod projects` - List all projects
- `prod ls` - List all tasks (across all projects)
- `prod ls --project "Name"` - Filter tasks by project (alternative to `prod tasks`)
- `prod view <id>` - View detailed task with blocks
- `prod edit <id>` - Edit a task in your editor
- `prod check <id>` - Toggle task completion

## Tips

1. **Project names are case-sensitive**: Use exact names as they appear in `prod projects`
2. **Use quotes for multi-word names**: `prod tasks "My Project"` not `prod tasks My Project`
3. **Subtasks are indented**: Tasks with a parent_id show with extra indentation
4. **Task IDs are shown**: Use the `#ID` to view or edit specific tasks

## Next Steps

After viewing tasks, you might want to:

```bash
# View detailed blocks for a task
prod view 12

# Edit a task
prod edit 12

# Complete a task
prod check 12

# Add a new task to the project (requires knowing project ID)
# Note: Currently uses Inbox, project-specific add coming soon
prod add "New task"
```


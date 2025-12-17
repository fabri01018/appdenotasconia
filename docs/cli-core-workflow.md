# Core CLI Workflow (Task-First Design)

This document outlines the workflow for the CLI as a robust, deterministic task manager ("TaskWarrior-lite"), treating AI as a strictly optional plugin rather than the primary interface.

## 1. Philosophy: Structure & Speed
The app is a relational task manager. The CLI should expose this structure (Projects > Sections > Tasks > Subtasks) with zero latency.

*   **Deterministic:** `cmd add "Task"` always does exactly that. No AI guessing.
*   **Explicit:** You define the organization.
*   **Unix-Philosophy:** Text in, text out.

## 2. Command Structure

We'll use `prod` (or `p`) as the binary name.

### 2.1. Rapid Capture (The "Inbox" Flow)
Capture works without context switching.

```bash
# Add to inbox
$ prod add "Buy milk" 

# Add with inline parsing (Todo.txt style or flags)
$ prod add "Fix API bug" --project "Backend" --tag "urgent"
# OR
$ prod add "Fix API bug +Backend @urgent"
```

### 2.2. Viewing Tasks (The "List" Flow)
Flexible filtering is the superpower of a CLI.

```bash
# Default view (Today / Inbox)
$ prod ls

# Filter by project
$ prod ls +Backend

# Filter by multiple tags
$ prod ls @urgent @v1.0

# Tree view for subtasks
$ prod tree +Backend
```

**Output format:**
```text
ID   AGE   PROJECT     TITLE
1    2h    [Inbox]     Buy milk
2    1d    [Backend]   Fix API bug  @urgent
```

### 2.3. Management & Organization
Moving items around effectively.

```bash
# Move task 2 to a section
$ prod mv 2 "In Progress"

# Complete tasks
$ prod do 2

# Edit details (opens $EDITOR)
$ prod edit 1
```

## 3. Advanced Core Features

### 3.1. Project & Section Management
Since your app has `sections` (kanban-style columns), the CLI needs to handle them explicitly.

```bash
# Create a project structure
$ prod project add "Marketing Website"
$ prod section add "Design" --project "Marketing Website"
$ prod section add "Dev" --project "Marketing Website"

# Move task to section
$ prod mv <task_id> "Marketing Website/Design"
```

### 3.2. Sync (The Backbone)
The sync engine ensures your terminal matches your (hypothetical) mobile state.

```bash
$ prod sync
> Pulling changes... 3 tasks updated.
> Pushing changes... 1 task created.
```

### 3.3. Scripting & Piping
Because the output is deterministic, you can chain commands.

```bash
# Count tasks in "Inbox"
$ prod ls +Inbox --json | jq length

# Import from a file
$ cat todo_list.txt | xargs -I {} prod add {}
```

## 4. Where AI Fits (Optional Layer)
AI becomes a utility command, not the driver.

*   `prod ai clean` -> Suggests organization for messy Inbox.
*   `prod ai subtasks <id>` -> Generates checklist for a big task.

## 5. Implementation Priorities (Revised)

1.  **Database Adapter**: Connect `better-sqlite3` to your existing `projects.db`.
2.  **CRUD Commands**: Implement `add`, `ls`, `do`, `rm` directly calling your `repositories/*.js`.
3.  **Arg Parsing**: Robust parsing for flags (`--project`) vs natural language.
4.  **TUI (Optional)**: A simple `ncurses` style view for browsing large lists.


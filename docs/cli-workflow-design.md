# CLI-First Workflow Design

This document envisions the workflow for **ProductionAI** rebuilt specifically as a CLI tool. It focuses on the user experience, interaction patterns, and daily usage loop, assuming the constraints and advantages of a terminal environment.

## 1. The Core Philosophy: "Speed & Flow"

A CLI-first Task AI app should optimize for:
1.  **Zero Friction Capture:** Adding a thought should be as fast as typing `git commit`.
2.  **Keyboard-Driven Navigation:** No mouse usage required.
3.  **Pipeline Integration:** The ability to pipe content into and out of the AI (e.g., `cat logs.txt | ai analyze`).

## 2. The Daily Workflow

### Phase 1: The Morning Briefing
Instead of opening a dashboard, the user runs a single command to get their bearings.

**Command:** `ai start` or `ai morning`

**Output:**
```text
🌞 Good Morning, Fabrizio.

📅 Tuesday, Dec 9
---------------------------
🔥 High Priority (3)
   [ ] Deploy production fix (due 2pm)
   [ ] Review pull requests (#102, #103)
   [ ] Email stakeholders

🧠 AI Suggestion:
   "You have 4 tasks in 'Backlog' tagged #urgent that haven't been touched in 3 days. 
    Should I move them to today or reschedule?" 
   [Y/n]
```

### Phase 2: Quick Capture (Throughout the Day)
As you work in other terminal windows, thoughts occur. You shouldn't leave the terminal to record them.

**Command:** `ai add "Remember to update the documentation for the new API"`

*   **AI Processing:** The system automatically detects context.
    *   *Auto-tagging:* Adds `#docs` `#api`.
    *   *Auto-project:* Places it in the `ProductionAI` project based on keywords.
    *   *Response:* `✅ Added to 'ProductionAI' with tags #docs #api`

### Phase 3: The "Deep Work" Mode (Interactive TUI)
When you need to organize or focus, you enter an interactive Text User Interface (TUI).

**Command:** `ai ui` or `ai focus`

**Interface Layout:**
```text
┌── Projects ────────┐ ┌── Task Details ──────────────────────┐
│ > Inbox            │ │ Title: Update Documentation          │
│   ProductionAI     │ │                                      │
│   Home             │ │ [x] Draft initial changes            │
│                    │ │ [ ] Review with team                 │
│                    │ │                                      │
└────────────────────┘ │ 🤖 AI: "I found 3 files that might   │
                       │ needs updates based on recent commits" │
                       │                                      │
┌── Context ─────────┤ └──────────────────────────────────────┘
│ Tag: #docs         │
│ Status: In Progress│
└────────────────────┘
[j/k: nav] [space: toggle] [a: ai-assist] [q: quit]
```

### Phase 4: AI as a Pair Programmer
The CLI allows the AI to interact directly with your file system (with permission), making it more than just a chat bot.

**Scenario:** You are debugging.
**Command:** `cat error.log | ai ask "What caused this crash?"`

**Scenario:** You want to generate tasks from a meeting note.
**Command:** `ai process-notes meeting_notes.md`
*   **Result:** AI parses the file, extracts action items, creates tasks in the DB, and prints a summary.

## 3. Command Taxonomy

If rebuilding for CLI, the command structure should be verb-noun or noun-verb consistent.

| Category | Command | Alias | Description |
| :--- | :--- | :--- | :--- |
| **Capture** | `ai add <text>` | `ai a` | Quick add to Inbox |
| **View** | `ai ls` | | List tasks (default: today) |
| **View** | `ai ls --project Work` | | Filter by project |
| **Action** | `ai done <id>` | `ai d` | Mark complete |
| **Action** | `ai edit <id>` | `ai e` | Open task in $EDITOR (vim/nano) |
| **AI** | `ai ask <query>` | `ai ?` | Chat with context of your tasks |
| **AI** | `ai do <instruction>` | | Agentic mode (e.g., "Reschedule all overdue tasks to tomorrow") |
| **Sync** | `ai sync` | | Push/Pull from Supabase |

## 4. Advanced CLI Features

### 4.1. Shell Integration
Add to `.zshrc` or `.bashrc`:
*   **Prompt Status:** Show the number of pending high-priority tasks in your shell prompt.
    `[user@pc (3 tasks)] $`
*   **Aliases:** `t` for `ai task`, `n` for `ai add`.

### 4.2. Pipe-ability
The output should be JSON-compatible if requested, allowing chaining with other tools like `jq`.

`ai ls --json | jq '.[].title'`

### 4.3. "Headless" Mode
Run the AI agent in the background to monitor your work and suggest tasks.
*   *Watcher:* "I noticed you modified `database.js`. Should I add a task to 'Update migration files'?"

## 5. User Journey Example: "The Refactor"

1.  **User:** `ai add "Refactor database module"`
2.  **User:** `ai ask "Break down the database refactor task into subtasks"`
3.  **AI:** Generates subtasks (Create Adapter, Port Queries, Test Connection).
4.  **User:** `ai ui` (Enters interactive mode to prioritize these subtasks).
5.  **User:** (Works on code, closes UI).
6.  **User:** `ai done 42` (Completes the task).
7.  **User:** `git commit -m "..."`
8.  **User:** `ai log` (Generates a standup report based on completed tasks).
    *   *Output:* "- Refactored database module. - Completed 3 subtasks."

## 6. Implementation Notes for a "Rebuild"

If building *just* for CLI, we simplify the architecture:
*   **No React:** Pure Node.js.
*   **UI Library:** `Ink` (React-based CLI rendering) or `Blessed` (low-level Curses).
*   **Database:** Direct SQLite file (no abstraction layer needed for web support).
*   **Auth:** Store API key in `~/.config/productionai/config.json`.
*   **Editor:** Delegate text editing to the system's `$EDITOR` instead of building a complex text input field.


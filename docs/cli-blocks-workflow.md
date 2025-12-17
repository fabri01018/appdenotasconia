# CLI Design: The "Blocks" Workflow (Outliner Paradigm)

This document re-imagines the CLI to align with the app's **Blocks** data model (`> Toggles`, `- [ ] Checks`, indentation). The app is not just a list of tasks; it is a collection of hierarchical documents (outlines).

## 1. The Core Concept: "Everything is a Block"

In this model, a "Task" is really a **Page** or **Canvas**.
The CLI treats the application as a **Tree Editor** for your thought outlines.

### Data Format (The Source of Truth)
The app uses a custom text format compatible with Markdown:
```markdown
Project: Marketing
  > Campaign Ideas
    - [ ] Instagram Ads
    - [x] Email Blast
    > Influencers
      - @techguy
      - @designguru
  > Budget
    $5000 allocated
```

## 2. Workflow: The Terminal Outliner

### 2.1. Navigation (The "Finder")
Instead of listing "tasks", you browse the hierarchy.

```bash
# List top-level Projects (Roots)
$ prod ls
> Inbox
> ProductionAI
> Personal

# List contents of a Project (Pages/Tasks)
$ prod ls ProductionAI
> Fix Database Schema
> Update Documentation
```

### 2.2. Viewing Blocks (The "Render")
Viewing a Page renders the block tree with ASCII structure.

```bash
$ prod view "Fix Database Schema"

Fix Database Schema (Project: ProductionAI)
───────────────────────────────────────────
1. > Migration Strategy
2.   - [ ] Backup prod DB
3.   - [ ] Run test migration on staging
4.   > Rollback Plan
5.     - Keep snapshot ID: snap-123
6. - [ ] Update API endpoints
```

### 2.3. Manipulation (The "Tree Surgeon")
You can manipulate blocks by their line number (shown in `view`).

```bash
# Check a box
$ prod check 2

# Toggle a section (expand/collapse in view)
$ prod toggle 1

# Add a child block (indentation handled automatically)
$ prod add "Verify snapshot integrity" --parent 4

# Move blocks
$ prod mv 3 --parent 4  # Moves "Run test migration" inside "Rollback Plan"
```

### 2.4. The "Power User" Edit (Vim/Nano)
Because the data is essentially text, the ultimate interface is your favorite text editor.

```bash
$ prod edit "Fix Database Schema"
```
*   **Action:** Fetches the description, opens it in `$EDITOR` (e.g., `vim`), waits for save, validates the format, and pushes back to SQLite.
*   **Benefit:** You get full undo/redo, macros, and speed of Vim for free.

## 3. Command Taxonomy (Block-Centric)

| Command | Usage | Description |
| :--- | :--- | :--- |
| `ls [path]` | `prod ls Work` | List projects or pages |
| `cat <page>` | `prod cat "Daily Notes"` | Print raw block text to stdout |
| `view <page>` | `prod view "Daily Notes"` | Render pretty tree with indices |
| `add <text>` | `prod add "Buy milk"` | Append block to Inbox |
| `ins <text>` | `prod ins "Details" -p 5` | Insert child block under line 5 |
| `check <id>` | `prod check 5` | Toggle checkbox state |
| `edit <page>` | `prod edit "Daily Notes"` | Open in $EDITOR |
| `rm <id>` | `prod rm 5` | Delete block (and children) |

## 4. TUI Mode (Interactive Outliner)

For users who want the "Notion-like" experience in the terminal, a TUI (using `ink` or `blessed`) is essential.

**`prod ui`** interface:
```text
[ ProductionAI / Fix Database Schema ]

  ▼ Migration Strategy
    [ ] Backup prod DB
    [ ] Run test migration on staging
    ▼ Rollback Plan
      • Keep snapshot ID: snap-123
  [ ] Update API endpoints

[Enter: Edit] [Space: Toggle/Check] [Tab: Indent] [Shift+Tab: Outdent]
```
This mimics the app's `blocks.js` behavior: `Tab` indents the block, `Enter` creates a new sibling.

## 5. Performance: Why it will be Blazing Fast

You asked, "It would still be fast?" The answer is: **It will likely be instant.**

### 5.1. The "Zero-Lag" Architecture
*   **Database:** We use `better-sqlite3`, which is synchronous. Querying 1,000 tasks takes ~0.5 milliseconds.
*   **No React Overhead:** We don't wait for React Native to mount components, calculate layout (Flexbox), or paint pixels. We just print text bytes to the screen.
*   **Parsing Speed:** Parsing a task description into blocks (even complex ones) takes microseconds. A computer can parse megabytes of text in a blink; your tasks are kilobytes.

### 5.2. Editor Speed
*   Opening a task in `vim` or `nano` via `prod edit` is instant.
*   Saving is just a disk write.
*   **Comparison:** In the app, opening a large task might take 300ms to render all block components. In CLI, it's < 50ms.

## 6. Sync Strategy for Blocks
*   **Conflict Resolution:** Since blocks are stored as a single text blob (`description`), concurrent edits are risky.
*   **Strategy:** The CLI acts as a "client". When you `edit`, it locks the record (optimistically) or merges changes upon save using the timestamp.

## 6. Implementation Roadmap

1.  **Block Parser:** Port `lib/blocks-utils.js` (customTextToJson) to Node.js (shared code).
2.  **Renderer:** Implement a `renderTree(blocks)` function for the CLI output.
3.  **Editor Bridge:** Implement the `edit` command (temp file -> spawn editor -> read file -> save).
4.  **TUI:** Build the interactive navigator.

This design respects the user's preference for **Checkboxes and Toggles** by making them the primary citizens of the CLI, rather than hidden metadata.


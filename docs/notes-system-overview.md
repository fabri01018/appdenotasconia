# Notes System Overview

This document explains how the notes system works in the ProductionAI application, with a focus on the editing experience and underlying architecture.

---

## What Are Notes?

In this application, **notes are the description field of tasks**. Every task has:
- A **title** (short text)
- A **description** (the note content, stored as structured blocks)

The description/note field is where users can create rich, structured content using a block-based system similar to note-taking apps like Notion or Roam Research.

---

## Data Model

### Storage Format

Notes are stored in the `tasks` table in the SQLite database:

```sql
CREATE TABLE tasks (
  id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL,
  section_id INTEGER,
  parent_id INTEGER,
  title TEXT NOT NULL,
  description TEXT,        -- ← This is where notes are stored
  completed INTEGER DEFAULT 0,
  is_expanded INTEGER DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  sync_status TEXT DEFAULT 'pending',
  deleted_at DATETIME,
  ...
);
```

### Text Format

The `description` field stores notes in a **newline-separated text format** with special syntax:

- **Regular blocks**: Plain text on each line
- **Toggle blocks**: Lines starting with `> ` (collapsible sections with children)
- **Check blocks**: Lines with `- [ ]` or `- [x]` syntax (checkboxes)
- **Indentation**: 2 spaces per nesting level for children under toggle blocks

**Example stored description:**
```
This is a regular block
> This is a toggle block
  This is a child of the toggle
  - [ ] Unchecked item
  - [x] Checked item
Another regular block
```

---

## Block-Based System

### What Are Blocks?

The note editor uses a **block-based interface** where each line or section is a distinct "block" that can be:
- **Edited individually** (click to edit one block at a time)
- **Nested** (toggle blocks can contain child blocks)
- **Reordered** (future feature)
- **Transformed** (change block types)

### Block Types

1. **Regular Block** (`type: 'block'`)
   - Plain text content
   - Basic building block of notes
   
2. **Toggle Block** (`type: 'toggle'`)
   - Has a header/title
   - Can be collapsed/expanded
   - Can contain nested child blocks
   - Useful for organizing hierarchical information
   
3. **Check Block** (`type: 'check'`)
   - Checkbox with text
   - Has a `checked` state (true/false)
   - Used for checklists and task items

### Block Data Structure

Internally, blocks are represented as JavaScript objects:

```javascript
// Regular block
{
  type: 'block',
  content: 'Some text'
}

// Toggle block with children
{
  type: 'toggle',
  content: 'Section title',
  isOpen: false,
  children: [
    { type: 'block', content: 'Child content' }
  ]
}

// Check block
{
  type: 'check',
  content: 'Task to complete',
  checked: false
}
```

### Conversion Utilities

Two main utilities handle conversion between storage format and block objects:

- **`descriptionToBlocks(description)`**: Parses text format → block array
- **`blocksToDescription(blocks)`**: Serializes block array → text format

This conversion happens:
- When loading a task (text → blocks for editing)
- When saving changes (blocks → text for storage)

---

## How Editing Works

### Architecture Overview

The editing system has several layers:

```
┌─────────────────────────────────────┐
│   TaskDetailScreen Component        │
│   (app/task/[taskId].js)            │
└──────────────┬──────────────────────┘
               │
        ┌──────┴──────────┐
        ↓                 ↓
┌──────────────┐   ┌────────────────┐
│ useTaskEditing│   │useBlocksForTask│
│ (title/desc)  │   │ (block editor) │
└──────────────┘   └────────────────┘
        ↓                 ↓
    ┌───────────────────────────┐
    │  useDebouncedAutoSave     │
    │  (1.5 second delay)       │
    └───────────────────────────┘
                ↓
        ┌──────────────────┐
        │   updateTask()    │
        │  (save to DB)     │
        └──────────────────┘
```

### The Editing Flow

#### 1. **Loading a Task**
- `useTaskDetail` hook fetches the task by ID
- `useBlocksForTask` receives the task object
- `descriptionToBlocks()` parses the description text into block objects
- Blocks are rendered in the UI with `BlockItem` components

#### 2. **Starting to Edit**
- User taps a block
- `handleEdit(path)` is called with the block's path (e.g., `[0]` or `[2, 1]`)
- The current block being edited is saved first (if any)
- The new block enters edit mode:
  - `editingIndex` state is set to the path
  - `editValue` state is set to the block's content
  - A `TextInput` appears for editing

#### 3. **Making Changes**
- User types in the `TextInput`
- `handleTextChange(path, newValue)` is called
- The `editValue` state updates in real-time
- Local `blocks` state is updated immediately (for responsive UI)

#### 4. **Saving Changes**
- **Triggered by**:
  - User taps another block (auto-save current)
  - User taps away from the editor
  - Debounce timer expires (1.5 seconds of inactivity)
- `handleSave(path)` is called:
  - Validates and updates the block in the `blocks` array
  - Handles special transformations (e.g., typing `> ` converts to toggle block)
  - Clears `editingIndex` (exits edit mode)
  - Marks blocks as dirty for autosave
- `saveBlocks()` eventually runs:
  - Converts blocks array to text with `blocksToDescription()`
  - Calls `updateTask()` to persist to database
  - Refreshes the task and invalidates React Query cache

#### 5. **Autosave Mechanism**
- Uses `useDebouncedAutoSave` hook
- Watches for changes in the blocks array
- Waits 1.5 seconds after the last change
- Automatically saves to prevent data loss
- Shows save status indicator (saving, saved, error)

### Key Editing Features

#### Inline Block Type Conversion
Users can convert blocks by typing special prefixes:
- Type `> ` at the start → converts to toggle block
- Type `- [ ]` at the start → converts to check block
- Remove the prefix → converts back to regular block

#### Double-Backspace Deletion
- First backspace on empty block: enters "empty state" (ready to delete)
- Second backspace: deletes the block entirely
- Safety mechanism to prevent accidental deletions

#### Smart Save Timing
- Changes are debounced (wait 1.5 seconds)
- BUT force immediate save when:
  - Switching to edit another block
  - Converting block types
  - Exiting the editor

#### Race Condition Protection
- Uses `isSavingBlocksRef` flag
- Prevents external updates from overwriting during save
- Ensures no data loss when switching between blocks

---

## Edit Modes

### Block Edit Mode (Default)

The standard editing experience:
- Click individual blocks to edit them
- Each block is a separate `TextInput`
- Rich interactions (toggle expand/collapse, check/uncheck)
- Visual block boundaries

**Best for**: Structured editing, organizing information, working with toggles and checklists

### Text Edit Mode

Alternative "plain text" editing mode:
- Accessed via menu option "Edit as Text"
- Shows entire note as one large text area
- Can edit the raw text format directly
- Converts back to blocks on save

**Best for**: Bulk editing, copy/paste operations, power users who prefer plain text

### Code Flow for Mode Switching

```javascript
// Enter text mode
handleEditAsText() {
  setIsTextMode(true)
  // TaskTextEditMode component shows
}

// Save from text mode
handleSaveText(newText) {
  const newBlocks = descriptionToBlocks(newText)
  blocksApi.updateAllBlocks(newBlocks)
  setIsTextMode(false)
}
```

---

## Floating Note Feature

### What Is It?

A **floating note bubble** that displays a task's note in a draggable overlay. It allows users to:
- Keep a note visible while navigating other screens
- View (read-only) the note content as blocks
- Drag the bubble to reposition it
- Minimize/maximize the view

### How It Works

#### State Management
- Uses React Context (`FloatingNoteProvider`)
- Global state accessible throughout the app
- State includes:
  - `taskId` - which task is displayed
  - `taskData` - the task object with parsed blocks
  - `isVisible` - whether bubble is shown
  - `position` - bubble coordinates

#### Creating a Floating Note
```javascript
floatingNote.createFloatingNote(taskId)
// 1. Sets the taskId in context
// 2. Loads task from database
// 3. Parses description to blocks
// 4. Shows the bubble
```

#### Viewing Content
- `FloatingNoteBubbleContent` component renders blocks
- Uses `BlockItemReadOnly` for each block (no editing)
- Supports toggle expand/collapse
- Supports checking/unchecking checkboxes
- All interactions update the original task in the database

#### Refreshing
- When the underlying task updates, the floating note can refresh
- `refreshTaskData()` reloads from database and reparses blocks
- Keeps floating note in sync with edits made elsewhere

---

## Synchronization & Consistency

### Local-First Architecture

The app follows a local-first approach:
1. **All changes happen locally first** (SQLite database)
2. Changes are marked with `sync_status: 'pending'`
3. Background sync pushes to remote server (if configured)
4. Remote changes are pulled and merged

### React Query Integration

- Task data is cached with React Query
- Cache is invalidated after every save
- Ensures all views see the latest data
- Keys: `['tasks']`, `['tasks', projectId]`

### State Consistency

Multiple sources of truth are kept in sync:

```
┌──────────────┐    invalidate    ┌──────────────┐
│  Local DB    │ ←──────────────→ │ React Query  │
│  (SQLite)    │                   │   Cache      │
└──────────────┘                   └──────────────┘
       ↑                                  ↑
       │                                  │
       │         ┌──────────────┐        │
       └─────────│  Component   │────────┘
                 │    State     │
                 └──────────────┘
```

**After every save**:
1. Update local SQLite database
2. Reload the task object
3. Invalidate React Query cache
4. Update component state
5. Mark for background sync

### Preventing Data Loss

Several mechanisms prevent data loss:

1. **Autosave with debouncing** - saves after 1.5 seconds of inactivity
2. **Force save on block switch** - saves immediately when switching blocks
3. **State mirroring** - separate `editValue` and `savedValue` tracking
4. **Race condition guards** - `isSavingBlocksRef` prevents overwriting
5. **Unsaved changes detection** - refs track if user has pending edits
6. **Error retry** - autosave hook provides retry functionality

---

## Key Hooks & Components

### Hooks

- **`useTaskDetail(taskId)`** - Loads task data and tags
- **`useTaskEditing(taskId, task, setTask)`** - Manages title editing and autosave
- **`useBlocksForTask(taskId, task, setTask)`** - Manages block array, editing, operations
- **`useDebouncedAutoSave(value, savedValue, saveFn, delay)`** - Generic autosave with debouncing
- **`useFloatingNote()`** - Accesses floating note context

### Components

- **`TaskDetailScreen`** - Main screen, orchestrates all hooks
- **`TaskTitleSection`** - Edits the title field
- **`TaskBlocksSection`** - Renders the block editor
- **`BlockItem`** - Individual block component (recursive for nesting)
- **`EditingToolbar`** - Bottom toolbar with shortcuts (add toggle, add check)
- **`TaskTextEditMode`** - Alternative text editing mode
- **`FloatingNoteBubble`** - The draggable floating note overlay
- **`FloatingNoteBubbleContent`** - Renders blocks in floating note
- **`BlockItemReadOnly`** - Read-only block for floating note

---

## Common Patterns & Best Practices

### Adding a New Block Type

To add a new block type (e.g., "quote block"):

1. **Update utilities** (`lib/blocks-utils.js`)
   - Add parsing logic in `customTextToJson()`
   - Add serialization logic in `blocksToDescription()`

2. **Update components** (`components/blocks/BlockItem.js`)
   - Add rendering case for new type
   - Add interaction handlers if needed

3. **Update hooks** (`hooks/task-detail/useBlocksForTask.js`)
   - Add creation helper (e.g., `addQuoteBlock`)
   - Add type conversion logic if using prefix

4. **Update toolbar** (`components/task-detail/EditingToolbar.js`)
   - Add button for inserting new block type

### Debugging Editing Issues

Common issues and where to look:

- **Edits disappear**: Check `isSavingBlocksRef` in `useBlocksForTask`
- **Autosave not working**: Check `useDebouncedAutoSave` hook
- **Block not saving**: Check `handleSave` and `saveBlocks` logic
- **Parse errors**: Check `descriptionToBlocks` and text format
- **Race conditions**: Check sync effect guards in `useBlocksForTask`

### Performance Considerations

- **Block parsing** is done once on load, not on every render
- **Debouncing** reduces database writes (only save after 1.5s)
- **Local state** updates immediately for responsive UI
- **React Query** caches reduce redundant database reads
- **Refs** avoid unnecessary re-renders in autosave logic

---

## Summary

The notes system in ProductionAI is built on these key principles:

1. **Block-based editing** for structured, rich content
2. **Autosave with debouncing** to prevent data loss without being intrusive
3. **Multiple edit modes** to accommodate different user preferences
4. **Local-first architecture** for fast, reliable editing
5. **Floating notes** for multi-tasking and reference viewing
6. **Careful synchronization** between database, cache, and UI state

The system prioritizes **user experience** (responsive, no data loss) while maintaining **data consistency** (all views stay in sync) through thoughtful state management and save timing.


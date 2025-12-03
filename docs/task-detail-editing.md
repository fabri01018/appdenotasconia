# Task Detail Editing System

This document explains how the task detail screen handles inline editing, autosave, and toolbar interactions. Use it when debugging editing issues or onboarding to the flow.

---

## 1. Top-Level Flow (`app/task/[taskId].js`)
- Loads a task via `useTaskDetail`, which exposes `task`, `tags`, setters, and `refreshTask`.
- Initializes complementary data (`useProjects`, `useSectionsByProject`, `useTags`) for modal pickers.
- Composes UI state hooks:
  - `useTaskModals` toggles modal visibility.
  - `useTaskEditing` keeps the title/description fields in sync with the task record and auto-saves text changes.
  - `useBlocksForTask` turns the description into structured blocks and handles block editing.
  - `useTaskActions` orchestrates project/section/tag updates and AI-triggered writes.
- Passes the editing APIs into the visual components:
  - `TaskTitleSection` binds `editing.title` and `editing.setTitle`.
  - `TaskBlocksSection` consumes the entire `blocksApi` returned by `useBlocksForTask`.
  - `EditingToolbar` injects shortcuts (`addToggleBlock`, `addCheckBlock`) that ultimately call the same block API.

---

## 2. Title Editing & Autosave (`useTaskEditing`)
1. **State mirroring**  
   - Local `title`/`description` states mirror the server task fields (`setTitle`, `setDescription`), while `savedTitle` / `savedDescription` track the latest persisted values.
   - Refs (`titleRef`, `savedTitleRef`, etc.) detect if the user already typed unsaved changes. When the task updates externally, the hook only overwrites the local inputs if the user has no pending edits, preventing destructive refreshes.

2. **Autosave**  
   - Both fields register with `useDebouncedAutoSave(value, savedValue, saveFn, 1500)`.  
   - After 1.5 s of inactivity, `saveFn` runs `updateTask` with the latest title/description combo to avoid clobbering the other field (`title` save uses the current `description`, and vice versa).  
   - On success, the hook reloads the task (`getTaskById`) to keep shared state consistent and invalidates React Query caches (`['tasks']`, `['tasks', projectId]`).

3. **Status reporting**  
   - `useDebouncedAutoSave` exposes `{ isSaving, lastSaved, error, retry, forceSave }`.  
   - `TaskTitleSection` renders spinners/checkmarks/errors with this status so users see when their changes persisted.

---

## 3. Description Blocks Editing (`useBlocksForTask`)
1. **Parsing & syncing**  
   - On first load for a given `taskId`, the hook parses `task.description` with `descriptionToBlocks` and stores a normalized blocks tree (toggle blocks are collapsed by default).  
   - It tracks a JSON `savedBlocksKey`. A sync effect watches `task.description` and reparses blocks when it changes externally (AI rewrite, tag action, etc.), but only if:
     - No block is currently being edited (`editingIndex === null`)
     - No save operation is in progress (`isSavingBlocksRef.current === false`)
     - The new description doesn't match what would be generated from the current `blocks` state
   - The `isSavingBlocksRef` guard prevents a race condition: when `handleSave` clears `editingIndex` and triggers an async `saveBlocks`, the sync effect could otherwise reparse before the save completes, overwriting unsaved edits. The flag is set immediately when a save starts and cleared when `saveBlocks` finishes.

2. **Local operations**  
   - The hook exposes CRUD helpers (`addBlock`, `addToggleBlock`, `addCheckBlock`, `deleteBlock`, `addChildBlock`, etc.), editing helpers (`handleEdit`, `handleSave`, `handleTextChange`, `handleEnterPress`, `handleBackspaceOnEmpty`), and toggle/check specific handlers.  
   - `TaskBlocksSection` renders `BlockItem`s recursively and wires their callbacks to these helpers. It also handles keyboard focus management and shows the block-level autosave indicator.

3. **Autosave & persistence**  
   - `blocks` re-serialize through `blocksToDescription` inside `saveBlocks`, which writes via `updateTask`, refreshes the shared `task`, and invalidates React Query caches similar to the title hook.  
   - Block changes are debounced with `useDebouncedAutoSave(JSON.stringify(blocks), savedBlocksKey, () => saveBlocks(blocks), 1500)`.  
   - When the user leaves a block (`handleSave`) and the content actually changed (including block-type conversions like typing `> ` to promote to a toggle), the hook bypasses the debounce and forces an immediate save. Before calling `saveBlocks`, it sets `isSavingBlocksRef.current = true` to prevent the sync effect from reparsing during the async save operation. The flag is cleared in `saveBlocks`'s finally block (or in the error handler if the save fails).

4. **Deletion heuristics**  
   - `blocks-deletion-utils` helpers (`shouldEnterEmptyState`, `shouldDeleteOnBackspace`, etc.) coordinate double-backspace-to-delete behavior.  
   - `handleBackspaceOnEmpty` uses these helpers to remove the active block on the second backspace press while preventing accidental deletions.

---

## 4. Editing Toolbar (`components/task-detail/EditingToolbar.js`)
- Anchored to the bottom of the screen with `Animated.View`; listens to keyboard show/hide events to float just above the keyboard while respecting safe-area insets.
- Exposes two actions today:
  - `onAddCheckBlock` inserts a checklist block at the current level.
  - `onAddToggleBlock` inserts a collapsible toggle block.
- Because the toolbar only calls the same `useBlocksForTask` helpers as other UI pieces, new buttons (e.g., “add plain block”, “indent”) just need to wire additional callbacks without touching persistence logic.

---

## 5. React Query & Consistency
- Every server write ultimately calls `updateTask` in `repositories/tasks.js`.
- After each mutation, hooks refresh the canonical task via `getTaskById` and invalidate React Query keys so list screens, widgets, and caches observe the new data.
- Block and text autosaves share this pattern, so editing either field keeps the entire task object current.

---

## 6. Hierarchy & Data Flow Diagram

```
TaskDetailScreen
├─ Data
│  ├─ useTaskDetail → task, tags, refreshTask
│  ├─ useProjects / useSectionsByProject / useTags
├─ UI State
│  ├─ useTaskModals
│  ├─ useTaskEditing
│  │  └─ useDebouncedAutoSave (title/description)
│  ├─ useBlocksForTask
│  │  └─ useDebouncedAutoSave (blocks JSON)
│  └─ useTaskActions → updateTask, tag add/remove, AI
├─ Components
│  ├─ TaskHeader (project selector, menu)
│  ├─ TaskTitleSection ← title state + saveStatus
│  ├─ TaskBlocksSection ← blocks API
│  │  └─ BlockItem (recursive)
│  ├─ TaskTagsDisplay ← tag actions
│  └─ EditingToolbar → block insert shortcuts
└─ Modals (Project, Section, Tags, Prompts, AI, Menu)
```

---

### Key Takeaways
- Editing state flows downward from hooks; persistence flows upward through shared `setTask` and React Query cache invalidation.
- Title/description and block editing share a unified autosave mechanism; issues in autosave often trace back to `useDebouncedAutoSave` lifecycle or mismatched `saved*` values.
- Toolbar buttons are thin wrappers around `useBlocksForTask` helpers, so debugging block-creation issues should start in the hook, not the toolbar component.
- **Race condition protection**: The `isSavingBlocksRef` flag prevents the sync effect from reparsing blocks while a save is in progress. If edits disappear when switching blocks, check that this flag is being set/cleared correctly in `handleSave` and `saveBlocks`.


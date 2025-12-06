# Subtask UI Redesign Design Document

## 1. Problem Description
Currently, in the Project Detail View, tasks and subtasks have inconsistent UI designs. 
- **Root Tasks**: Have a full-featured card/row style with specific borders, rounded corners (first/middle/last/only logic), styling for checkboxes, and support for metadata like tags and descriptions.
- **Subtasks**: Are rendered as a simplified list within the parent task, using different padding, background colors, and a simplified text style. They lack the visual polish and consistency of the root tasks.

The goal is to unify the UI so that subtasks look visually identical (or very similar) to root tasks, differing primarily by indentation to indicate hierarchy.

## 2. Constraints & Considerations
- **Existing Logic**: The current implementation uses a `FlatList` for root tasks (grouped by sections) and renders subtasks conditionally within the `renderItem` of the parent task.
- **Visual Hierarchy**: We must ensure subtasks are clearly distinguishable as children of the parent task, likely through indentation, while adopting the parent's visual style.
- **Interaction**: Subtasks need to support the same interactions (complete, delete, navigate to detail) as they currently do, but potentially gaining the "standard" interactions of root tasks (like multi-select if desired later, though out of scope for now).
- **Performance**: We should avoid unnecessary re-renders. Extracting the row rendering logic helps with code maintainability and potentially `React.memo` usage if needed.

## 3. Proposed Solution
We will refactor `ProjectDetailView.js` to reuse the task rendering logic. Instead of having two separate rendering paths (one for `renderTask` and one for the subtask mapping inside it), we will extract a single `renderTaskRow` helper (or component) that can render any task given its data and context (indentation level).

### Key Changes:
1.  **Extract `renderTaskRow`**: Create a function that takes a `task` object and rendering context (isFirst, isLast, depth/indentation) and returns the UI.
2.  **Unified Styling**: Apply the existing `styles.taskItem` (and its variants) to subtasks.
3.  **Indentation**: Instead of a flat list for subtasks, they will be rendered with a `paddingLeft` modifier to visually nest them.
4.  **Recursive/Nested Structure**: The `renderTask` function will call `renderTaskRow` for the main task, and then iterate over children calling `renderTaskRow` for each, passing an `isSubtask` flag or indentation value.

## 4. Technical Implementation Plan

### Step 1: Extract `renderTaskRow` Logic
- Move the JSX and styling logic currently inside `renderTask` (for the root task part) into a reusable function `renderTaskRow`.
- Ensure this function accepts parameters for: `task`, `index`, `group`, `isSubtask`, `isStandalone`.
- **Verification**: Replace the current root task rendering with this new function and ensure root tasks look exactly the same.

### Step 2: Implement Subtask Rendering with `renderTaskRow`
- Update the `children.map` loop inside `renderTask` to use `renderTaskRow` instead of the inline JSX.
- Pass `isSubtask: true` to the function.
- **Verification**: Subtasks should now look like root tasks (full rows) but might need styling adjustments (borders, margins).

### Step 3: Style Refinement
- Adjust `renderTaskRow` to handle `isSubtask` specific styling:
    - Apply `paddingLeft` (e.g., 48px) for indentation.
    - Remove or adjust borders for subtasks to ensure they look "connected" or appropriately nested within the parent's expanded state.
    - Handle "First/Last" styling logic for subtasks (e.g., if a subtask is the last in the list, it might need rounded corners if it's visually separate, or match the parent's container style).
- **Verification**: Check visual hierarchy and polish.

### Step 4: Cleanup
- Remove the old inline subtask rendering code.
- Ensure all interactions (checkbox, navigation) work for subtasks in the new UI.

## 5. Questions/Notes
- Do subtasks need to display tags and descriptions like root tasks? (Assuming yes for now to "look like tasks", but can be toggled).
- Should subtasks inherit the selection mode (multi-select)? (Currently, subtasks have `handleDeleteTask` and navigation; we will map these to the new row interactions).


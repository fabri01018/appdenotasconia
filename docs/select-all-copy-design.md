## 1. Problem Definition

**User Story:**
As a user, I want to treat the task content like a standard text document so I can:
1.  Select any text range across multiple blocks/lines.
2.  **Delete** partial content across block boundaries.
3.  Copy/Cut/Paste freely.

**Current State:**
- The Block Editor forces content into separate inputs.
- You cannot drag-select across blocks.
- You cannot delete the end of Block A and the start of Block B in one action.

## 2. Solution: "Edit as Text" Mode (Markdown Editor)

To support full text manipulation (partial delete, cross-block selection), we will introduce a mode that converts the blocks into a single editable text area (Markdown format).

**Concept:**
The user can toggle between "Block View" (interactive, rich) and "Text View" (raw, flexible).

### UX Flow
1.  User opens Task Menu (`...`).
2.  Selects **"Edit as Text"**.
3.  The editor converts all blocks into a single Markdown string (preserving hierarchy, checkboxes, etc.).
4.  The interface swaps to a full-screen `TextInput`.
5.  **User Capabilities:**
    - Select text across lines.
    - **Delete any part** (e.g., delete from middle of line 1 to middle of line 3).
    - Copy/Paste.
    - Type Markdown manually (e.g., type `- [ ] New task`).
6.  User taps **"Done"**.
7.  The system parses the text back into Blocks and updates the task.

## 3. Technical Implementation

### Data Transformation
We will leverage the existing `lib/blocks-utils.js`:
- **Blocks -> Text:** `blocksToDescription(blocks)` (Already exists).
- **Text -> Blocks:** `descriptionToBlocks(text)` (Already exists).

*Note: Switching to Text Mode and back will reset the "Expanded/Collapsed" state of toggles (they will default to closed), as the structure is re-parsed. This is an acceptable trade-off for the "Raw Edit" capability.*

### Components

**1. `TaskTextEditMode` (New Component)**
- **Path:** `components/task-detail/TaskTextEditMode.js`
- **Props:**
    - `blocks`: Initial blocks data.
    - `onSave`: Function called with new blocks array.
    - `onCancel`: Function to revert.
- **State:**
    - `text`: String, initialized from `blocksToDescription(blocks)`.
- **Render:**
    - A `TextInput` that fills the screen.
    - `multiline={true}`, `textAlignVertical="top"`.
    - A "Done" button in the header or floating.

**2. `TaskDetailScreen` Modifications**
- Add state: `isTextMode` (boolean).
- Conditional render:
  ```javascript
  {isTextMode ? (
    <TaskTextEditMode 
      blocks={blocksApi.blocks} 
      onSave={(newBlocks) => {
        blocksApi.setBlocks(newBlocks); // Or use a bulk update method
        setIsTextMode(false);
        // Trigger save to backend
      }}
      onCancel={() => setIsTextMode(false)}
    />
  ) : (
    <TaskBlocksSection ... />
  )}
  ```

**3. `TaskMenuModal` Modifications**
- Add "Edit as Text" option.
- Icon: `text-outline` or `document-text-outline`.

## 4. Implementation Steps (Iterative)

**Step 1: Build the UI Component (`TaskTextEditMode.js`)**
- Create the component that accepts blocks and renders them as text.
- **Verification:** Manually import this component in a test screen or temporarily replace the block view to verify it renders correct text from blocks.

**Step 2: Hook up the Menu Trigger**
- Add the button to `TaskMenuModal`.
- Ensure it toggles the `isTextMode` state in `TaskDetailScreen`.
- **Verification:** Click the menu item, ensure the new empty/placeholder component appears.

**Step 3: Implement Data Parsing (Save Logic)**
- In `TaskTextEditMode`, implement the `onSave` logic that calls `descriptionToBlocks`.
- **Verification:** Edit text, save, and see if the Block View updates correctly with the new structure.

**Step 4: Refinement & Edge Cases**
- Test nesting, toggles, and checkboxes.
- Fix styling (ensure it looks good in dark/light mode).

## 5. Future Improvements
- Try to preserve `isOpen` state by matching content during parsing (optimization).
- Syntax highlighting for the Markdown text.

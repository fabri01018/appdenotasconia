# Tab Button Design

## Overview
Add a tab button to the EditingToolbar (bottom bar) that inserts a tab character into the currently focused text input, similar to pressing Tab on a computer keyboard.

## Location
- **Component**: `EditingToolbar` (bottom toolbar with toggle and checklist buttons)
- **Position**: Add as a new button, likely before or after the existing toggle/checklist buttons

## Visual Design

### Icon
- **Icon Name**: `arrow-forward` (Ionicons)
- **Rationale**: Represents forward movement/indentation, commonly used for tab functionality
- **Size**: 25px (matches existing icons: `ICON_SIZE`)
- **Color**: Same as other icons (theme-aware: white in dark mode, black in light mode)

### Button Styling
- **Size**: 40x40px container (matches `ICON_CONTAINER`)
- **Style**: Same as existing buttons (transparent background, no border)
- **Position**: Same margin/padding as other buttons
- **Press State**: Same opacity reduction (0.6) when pressed

## Functionality

### Behavior
1. When pressed, insert 4 spaces into the currently editing block
2. Insert at the current cursor position (if available) or at the end of the text
3. Only works when a block is actively being edited (has focus)

### Implementation Details

#### Component Changes
1. **EditingToolbar.js**
   - Add new `onInsertTab` prop
   - Add new Pressable button with `arrow-forward` icon
   - Position it appropriately in the toolbar

2. **app/task/[taskId].js**
   - Pass `onInsertTab` handler to EditingToolbar
   - Handler should insert tab into current `editValue` at cursor position

3. **hooks/task-detail/useBlocksForTask.js**
   - Add `handleInsertTab` function
   - Function should:
     - Check if there's an active editing block (`editingIndex` is set)
     - Get current `editValue`
     - Insert 4 spaces at cursor position (or end if cursor position not available)
     - Update `editValue` via `setEditValue`
     - Trigger text change handler to maintain state consistency

#### Cursor Position Handling
- **Option 1 (Simple)**: Insert tab at the end of current text
- **Option 2 (Better UX)**: Track cursor position in TextInput and insert at cursor
  - Use `selection` prop on TextInput
  - Track selection state in BlockItem or pass it up
  - Insert at `selection.start`

### Edge Cases
- If no block is being edited, button should be disabled or do nothing
- If cursor position is not available, insert at end of text
- Spaces are stored as regular characters in block content (consistent with existing indentation)

## User Experience
- Button appears in toolbar alongside toggle and checklist buttons
- Pressing button inserts 4 spaces at cursor position
- Visual feedback on press (opacity change)
- Works seamlessly with existing text editing flow

## Future Enhancements (Optional)
- Track and restore cursor position after tab insertion
- Support for Shift+Tab (unindent) - could be a long-press or separate button
- Configurable tab size (currently 4 spaces)


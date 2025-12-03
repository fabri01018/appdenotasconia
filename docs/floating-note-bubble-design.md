# Floating Mini Note Viewer ("Note Bubble") - Design Document

## Overview
A floating, draggable mini note viewer that displays the complete content of a task/note. The bubble can be created from the task detail screen and toggled on/off. It remains visible across all screens and can be moved anywhere on the screen. Tapping the bubble opens the full task detail view.

---

## 1. Feature Requirements Summary

### 1.1 Core Functionality
- **Display**: Shows the complete note content (title + all blocks)
- **Creation**: Option in task detail screen menu to create/activate the bubble
- **Toggle**: User can show/hide the bubble at will
- **Visibility**: Available on all screens (global overlay)
- **Interaction**: 
  - Tap to open full task detail
  - Drag to reposition anywhere on screen
- **Purpose**: View-only (no editing in bubble, just viewing)

### 1.2 Technical Requirements
- Works with existing task system
- Persists position across app sessions
- Respects theme (dark/light mode)
- Smooth animations for show/hide and drag
- Doesn't interfere with underlying UI interactions

---

## 2. UI/UX Design

### 2.1 Bubble Appearance

**Size & Shape:**
- Width: 280-320px (responsive, max 85% of screen width)
- Height: Auto (based on content, max 60% of screen height)
- Border radius: 16px (rounded corners)
- Shadow: Elevated appearance with subtle shadow

**Position:**
- Default: Bottom-right corner (with safe area insets)
- User can drag to any position
- Snaps to screen edges when near (optional enhancement)
- Minimum distance from edges: 10px

**Styling:**
- Background: Themed (dark: `#1C1C1E`, light: `#FFFFFF`)
- Border: Subtle border (dark: `rgba(255,255,255,0.1)`, light: `rgba(0,0,0,0.1)`)
- Shadow: 
  - Dark: `shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12`
  - Light: `shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8`

### 2.2 Bubble Content Layout

**Header Section:**
- Task title (bold, 18px)
- Project name (smaller, 14px, opacity 0.7)
- Close/Hide button (top-right corner, icon: `close-circle-outline`)

**Content Section:**
- Scrollable view of all blocks
- Same block rendering as task detail (read-only)
- Toggle blocks can be expanded/collapsed
- Check blocks show checked state
- Text blocks display content
- Padding: 16px horizontal, 12px vertical

**Footer (Optional):**
- Subtle indicator showing it's a floating note
- Or minimal "Tap to open" hint

### 2.3 Visual Hierarchy

```
┌─────────────────────────────────┐
│ [Task Title]            [×]    │ ← Header (16px padding)
│ Project Name                    │
├─────────────────────────────────┤
│                                 │
│ [Block content scrollable]      │ ← Content (scrollable)
│ - Block 1                       │
│ - Block 2                       │
│ - Toggle >                      │
│   - Child block                 │
│                                 │
└─────────────────────────────────┘
```

### 2.4 Interaction States

**Normal State:**
- Fully visible, semi-transparent background
- Subtle shadow

**Dragging State:**
- Slightly larger shadow
- Slight scale (1.02x)
- Opacity: 0.95

**Tapped/Pressed State:**
- Brief scale animation (0.98x)
- Opens task detail screen

**Hidden State:**
- Not rendered (or rendered with opacity 0, pointerEvents: 'none')

---

## 3. Task Detail Screen Integration

### 3.1 Menu Option

**Location:** `components/task-detail/modals/TaskMenuModal.js`

**New Menu Item:**
- Text: "Create Floating Note" (when no bubble exists) OR "Toggle Floating Note" (when bubble exists)
- Icon: `document-text-outline` (or `eye-outline` for view)
- Position: After "Add Tags", before "AI Feature"
- Action: Creates/activates the floating note bubble for current task

**Menu Option States:**
- **No bubble active**: "Create Floating Note"
- **Bubble active for this task**: "Hide Floating Note" (or toggle off)
- **Bubble active for different task**: "Replace Floating Note" (or "Switch to This Note")

### 3.2 Menu Option Handler

**File:** `hooks/task-detail/useTaskActions.js` or new hook

**Function:** `handleCreateFloatingNote(taskId)`
- Creates floating note bubble
- Stores task ID in global state/context
- Shows bubble immediately

---

## 4. Technical Architecture

### 4.1 Component Structure

```
components/
  floating-note-bubble/
    FloatingNoteBubble.js          # Main bubble component
    FloatingNoteBubbleContent.js    # Content rendering (blocks)
    floating-note-bubble-styles.js  # Styles
hooks/
  useFloatingNote.js                # State management hook
contexts/
  FloatingNoteContext.js            # Global context provider (optional)
```

### 4.2 State Management

**Global State (Context or Hook):**
```javascript
{
  isVisible: boolean,
  taskId: number | null,
  position: { x: number, y: number },  // Saved position
  taskData: { title, project_name, blocks, ... } | null
}
```

**Persistence:**
- Save position to AsyncStorage
- Save taskId to AsyncStorage
- Restore on app launch

**State Updates:**
- When task is updated, refresh bubble content
- When task is deleted, hide bubble
- When navigating to task detail, update if same task

### 4.3 Component Implementation

**FloatingNoteBubble.js:**
- Uses `PanResponder` or `react-native-gesture-handler` for dragging
- Absolute positioning with `position: 'absolute'`
- Renders at root level (in `_layout.js` or similar)
- Handles tap to navigate
- Handles close/hide action

**FloatingNoteBubbleContent.js:**
- Renders task title
- Renders project name
- Renders blocks (read-only version of BlockItem)
- Scrollable view for long content
- Handles toggle expand/collapse (read-only)

### 4.4 Block Rendering (Read-Only)

**Approach:**
- Reuse `BlockItem` component with read-only props
- OR create simplified `BlockItemReadOnly` component
- Blocks should be interactive for toggles/checks (viewing only, no editing)
- No edit mode, no delete buttons
- Toggle blocks can expand/collapse
- Check blocks show checked state

---

## 5. Integration Points

### 5.1 Root Layout Integration

**File:** `app/_layout.js`

**Changes:**
- Add `FloatingNoteBubble` component at root level
- Wrap in `FloatingNoteProvider` (if using context)
- Ensure it's above all other content (high z-index)

```jsx
<GestureHandlerRootView style={{ flex: 1 }}>
  <SafeAreaProvider>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <DraggableSidebar>
          <Stack>
            {/* ... screens ... */}
          </Stack>
        </DraggableSidebar>
        <FloatingNoteBubble />  {/* ← Add here */}
        <StatusBar style="auto" />
      </ThemeProvider>
    </QueryClientProvider>
  </SafeAreaProvider>
</GestureHandlerRootView>
```

### 5.2 Task Detail Screen Integration

**File:** `app/task/[taskId].js`

**Changes:**
- Add handler for "Create Floating Note" menu option
- Pass to `TaskMenuModal`

**File:** `components/task-detail/modals/TaskMenuModal.js`

**Changes:**
- Add new menu option
- Handle press to create/toggle floating note

### 5.3 Task Updates & Sync

**Real-time Updates:**
- When task is updated (title, blocks, etc.), update bubble content
- Use existing task hooks to listen for changes
- Refresh bubble when task data changes

**Task Deletion:**
- If active task is deleted, hide bubble
- Show notification or silently hide

---

## 6. Styling Details

### 6.1 Bubble Container

```javascript
{
  position: 'absolute',
  width: 280,  // or responsive
  maxWidth: '85%',
  maxHeight: '60%',
  borderRadius: 16,
  backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
  borderWidth: 1,
  borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: colorScheme === 'dark' ? 0.3 : 0.15,
  shadowRadius: 12,
  elevation: 8,  // Android
  zIndex: 9999,
}
```

### 6.2 Header Styles

```javascript
{
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingHorizontal: 16,
  paddingTop: 12,
  paddingBottom: 8,
  borderBottomWidth: 1,
  borderBottomColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
}
```

### 6.3 Content Styles

```javascript
{
  paddingHorizontal: 16,
  paddingVertical: 12,
  maxHeight: 400,  // or calculated based on screen
}
```

---

## 7. Animation & Transitions

### 7.1 Show/Hide Animation

**Show:**
- Fade in: `opacity: 0 → 1` (200ms)
- Scale: `scale: 0.95 → 1` (200ms)
- Easing: `ease-out`

**Hide:**
- Fade out: `opacity: 1 → 0` (150ms)
- Scale: `scale: 1 → 0.95` (150ms)
- Easing: `ease-in`

### 7.2 Drag Animation

- Use `Animated` API or `react-native-reanimated`
- Smooth position updates during drag
- Spring back if dragged off-screen (optional)

### 7.3 Tap Animation

- Brief scale down: `scale: 1 → 0.98` (100ms)
- Scale back: `scale: 0.98 → 1` (100ms)
- Then navigate

---

## 8. Edge Cases & Considerations

### 8.1 Multiple Bubbles
- Only one bubble active at a time
- Creating new bubble replaces existing one
- Show confirmation if replacing? (Optional)

### 8.2 Screen Rotation
- Recalculate position on rotation
- Keep relative position or reset to default

### 8.3 Keyboard Appearance
- Move bubble up when keyboard appears (optional)
- Or keep position (user can drag if needed)

### 8.4 Long Content
- Scrollable content area
- Show scroll indicator
- Max height to prevent full-screen takeover

### 8.5 Empty Tasks
- Show placeholder: "Empty note"
- Or hide bubble if task has no content

### 8.6 Performance
- Lazy load block content
- Memoize block rendering
- Debounce position updates during drag

---

## 9. Implementation Files

### 9.1 New Files to Create

```
components/floating-note-bubble/
  FloatingNoteBubble.js
  FloatingNoteBubbleContent.js
  floating-note-bubble-styles.js

hooks/
  useFloatingNote.js

lib/
  floating-note-storage.js  # AsyncStorage utilities
```

### 9.2 Files to Modify

```
app/_layout.js                                    # Add bubble component
components/task-detail/modals/TaskMenuModal.js    # Add menu option
hooks/task-detail/useTaskActions.js               # Add handler (or new hook)
app/task/[taskId].js                              # Wire up menu option
```

### 9.3 Dependencies

- `react-native-gesture-handler` (already in project) - for drag
- `@react-native-async-storage/async-storage` - for persistence (check if exists)
- `react-native-reanimated` (already in project) - for animations

---

## 10. User Flow

### 10.1 Creating Floating Note

1. User opens task detail screen
2. User taps menu (three dots)
3. User taps "Create Floating Note"
4. Bubble appears with task content
5. User can drag bubble to desired position
6. Position is saved automatically

### 10.2 Using Floating Note

1. Bubble is visible on any screen
2. User can scroll content in bubble
3. User can expand/collapse toggle blocks
4. User taps bubble to open full task detail
5. User can tap close button to hide bubble

### 10.3 Toggling Floating Note

1. User opens task detail (same or different task)
2. User opens menu
3. If bubble exists: Option shows "Hide Floating Note"
4. If bubble for different task: Option shows "Switch to This Note"
5. User toggles visibility or switches task

---

## 11. Future Enhancements (Out of Scope)

- Multiple bubbles (one per task)
- Bubble size adjustment (pinch to resize)
- Bubble transparency slider
- Quick actions in bubble (mark complete, etc.)
- Bubble templates/themes
- Bubble grouping/collapsing
- Keyboard shortcuts (web)

---

## 12. Design Decisions

### 12.1 Why Global Overlay?
- Needs to be visible on all screens
- Root-level component ensures proper z-index
- Simplifies state management

### 12.2 Why Read-Only?
- Prevents accidental edits
- Keeps bubble lightweight
- Full editing available in task detail

### 12.3 Why Single Bubble?
- Simpler UX
- Prevents screen clutter
- Easier state management

### 12.4 Why Persist Position?
- Better UX - user sets position once
- Reduces friction on subsequent uses

---

## 13. Testing Considerations

- Test drag on different screen sizes
- Test with very long content
- Test with many nested blocks
- Test theme switching
- Test on different devices (iOS, Android, Web)
- Test with keyboard visible
- Test screen rotation
- Test with multiple tasks
- Test task deletion while bubble active
- Test navigation while bubble visible

---

## Summary

The Floating Mini Note Viewer is a lightweight, draggable overlay that displays a complete task/note. It's created from the task detail menu, can be toggled on/off, and remains visible across all screens. The bubble is read-only (viewing only) and tapping it opens the full task detail for editing. The design prioritizes simplicity, performance, and user control.


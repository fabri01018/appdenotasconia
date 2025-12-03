# Pin Feature Design Document

## Overview
Implement a pin feature for tasks, similar to TickTick's implementation. Pinned tasks will appear both in a dedicated "Pinned" section at the top of project views AND at the top of their respective sections.

## Requirements Summary
- **Pinnable Items**: Tasks only
- **Display**: Both - separate "Pinned" section AND at top of sections
- **Pin/Unpin Action**: Pin icon button in task detail screen
- **Visual Indicator**: Position at top is sufficient (no special styling)
- **Sorting**: By pin time (most recent first)
- **Limits**: No maximum
- **Persistence**: 
  - Unpin when task is completed
  - Unpin when task is moved to another project
- **Sync**: Should sync via Supabase

---

## 1. Database Schema Changes

### 1.1 Tasks Table
Add new columns to the `tasks` table:

```sql
ALTER TABLE tasks ADD COLUMN pinned INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN pinned_at DATETIME;
```

**Fields:**
- `pinned` (INTEGER): 0 = not pinned, 1 = pinned
- `pinned_at` (DATETIME): Timestamp when task was pinned (NULL if not pinned)

**Migration Strategy:**
- Use `addMissingColumns` utility in `lib/database.js` to add these columns safely
- Default values: `pinned = 0`, `pinned_at = NULL`

---

## 2. UI/UX Design

### 2.1 Task Detail Screen - Pin Icon

**Location**: Task Header (TaskHeader component)
- Add pin icon button next to the menu button (three dots) in the header
- Icon: `pin` (filled when pinned) / `pin-outline` (when not pinned)
- Position: Right side of header, between project name and menu button
- Size: 22px (same as menu button)
- Color: Same as menu button (adapts to color scheme)

**Visual Layout:**
```
[← Back] [Project Name ▼] [📌 Pin] [⋮ Menu]
```

**Interaction:**
- Tap to toggle pin status
- Visual feedback: Icon changes immediately
- No confirmation dialog needed

### 2.2 Project View - Pinned Section

**Location**: Top of task list in `app/project/[projectId].js`

**Structure:**
```
Project View
├── [Pinned Section] (if any pinned tasks exist)
│   ├── "Pinned" header (collapsible like sections)
│   └── Pinned tasks (sorted by pinned_at DESC - most recent first)
│       └── Each task shows its section name as metadata
│
├── [Section 1]
│   ├── Section header
│   ├── Pinned tasks from this section (sorted by pinned_at DESC)
│   └── Unpinned tasks (sorted by id)
│
├── [Section 2]
│   └── ...
│
└── [No Section Tasks]
    ├── Pinned tasks (sorted by pinned_at DESC)
    └── Unpinned tasks (sorted by id)
```

**Pinned Section Header:**
- Text: "Pinned" (or "📌 Pinned" with icon)
- Collapsible: Yes (same behavior as regular sections)
- Style: Same as section headers
- Shows count: "Pinned (3)" if desired

**Pinned Tasks in Pinned Section:**
- Display format: Same as regular tasks
- Show section name: Small text below task title showing which section it belongs to
- Sorting: By `pinned_at` DESC (most recently pinned first)
- Visual: No special styling, just position indicates pinned status

### 2.3 Section View - Pinned Tasks at Top

**Within each section:**
- Pinned tasks appear first (sorted by `pinned_at` DESC)
- Then unpinned tasks (sorted by `id` or `updated_at`)
- No visual separator needed - position indicates priority

**Example:**
```
Section: "To Do"
├── Task C (pinned - most recent)
├── Task A (pinned - older)
├── Task B (unpinned)
└── Task D (unpinned)
```

---

## 3. Data Flow & Logic

### 3.1 Pin/Unpin Action

**Function**: `toggleTaskPin(taskId)`
- If task is not pinned:
  - Set `pinned = 1`
  - Set `pinned_at = CURRENT_TIMESTAMP`
  - Set `sync_status = 'pending'`
- If task is pinned:
  - Set `pinned = 0`
  - Set `pinned_at = NULL`
  - Set `sync_status = 'pending'`

**Location**: `repositories/tasks.js` → `toggleTaskPin(id)`

### 3.2 Task Grouping Logic

**Current Logic** (in `app/project/[projectId].js`):
```javascript
groupedTasks() {
  // Groups by section
  // Returns: { bySection: {}, noSection: [] }
}
```

**New Logic**:
```javascript
groupedTasks() {
  const pinned = [];
  const bySection = {};
  const noSection = { pinned: [], unpinned: [] };
  
  // Separate pinned tasks
  tasks.forEach(task => {
    if (task.pinned === 1) {
      pinned.push(task);
    }
  });
  
  // Group by section (including pinned status)
  sections.forEach(section => {
    bySection[section.id] = {
      section,
      pinned: [],
      unpinned: []
    };
  });
  
  tasks.forEach(task => {
    if (task.section_id && bySection[task.section_id]) {
      if (task.pinned === 1) {
        bySection[task.section_id].pinned.push(task);
      } else {
        bySection[task.section_id].unpinned.push(task);
      }
    } else {
      if (task.pinned === 1) {
        noSection.pinned.push(task);
      } else {
        noSection.unpinned.push(task);
      }
    }
  });
  
  // Sort pinned tasks by pinned_at DESC
  pinned.sort((a, b) => new Date(b.pinned_at) - new Date(a.pinned_at));
  
  // Sort within sections
  Object.values(bySection).forEach(group => {
    group.pinned.sort((a, b) => new Date(b.pinned_at) - new Date(a.pinned_at));
    group.unpinned.sort((a, b) => a.id - b.id); // or by updated_at
  });
  
  noSection.pinned.sort((a, b) => new Date(b.pinned_at) - new Date(a.pinned_at));
  noSection.unpinned.sort((a, b) => a.id - b.id);
  
  return { pinned, bySection, noSection };
}
```

### 3.3 Auto-Unpin Logic

**When task is completed:**
- In `updateTask` or completion handler:
  - If `completed = 1`, also set `pinned = 0` and `pinned_at = NULL`

**When task is moved to another project:**
- In project change handler:
  - Set `pinned = 0` and `pinned_at = NULL` when project changes

**Location**: 
- Completion: `repositories/tasks.js` → `updateTask()` or completion mutation
- Project change: `hooks/task-detail/useTaskActions.js` → `handleSelectProject()`

---

## 4. Sync Implementation

### 4.1 Supabase Schema

**Add columns to `tasks` table in Supabase:**
```sql
ALTER TABLE tasks ADD COLUMN pinned BOOLEAN DEFAULT false;
ALTER TABLE tasks ADD COLUMN pinned_at TIMESTAMPTZ;
```

### 4.2 Sync Push (Local → Supabase)

**File**: `lib/sync/syncpush/tasks/supabase-utils.js`

**Update `syncTask` function:**
```javascript
async syncTask(task) {
  const taskData = {
    id: task.id,
    title: task.title,
    description: task.description || null,
    project_id: task.project_id,
    created_at: task.created_at || new Date().toISOString(),
    updated_at: task.updated_at || new Date().toISOString(),
    pinned: task.pinned === 1 ? true : false,
    pinned_at: task.pinned_at || null,
  };
  
  // ... rest of sync logic
}
```

### 4.3 Sync Pull (Supabase → Local)

**File**: `lib/sync/syncpull/tasks.js`

**Update pull logic:**
- Include `pinned` and `pinned_at` fields when fetching from Supabase
- Map boolean to INTEGER (0/1) for local database

**File**: `lib/sync/updatesync.js`

**Update `buildUpdateData` function:**
- Include `pinned` and `pinned_at` in task update data

---

## 5. Implementation Files

### 5.1 Database Layer
- `lib/database.js` - Add migration for new columns
- `repositories/tasks.js` - Add `toggleTaskPin(id)` function
- `repositories/tasks.js` - Update `updateTask()` to handle auto-unpin

### 5.2 UI Components
- `components/task-detail/TaskHeader.js` - Add pin icon button
- `app/project/[projectId].js` - Update task grouping and rendering logic
- `app/task/[taskId].js` - Add pin toggle handler

### 5.3 Hooks
- `hooks/task-detail/useTaskActions.js` - Add `togglePin` action
- `hooks/task-detail/useTaskDetail.js` - Include pinned status in task data

### 5.4 Sync
- `lib/sync/syncpush/tasks/supabase-utils.js` - Include pinned fields
- `lib/sync/syncpull/tasks.js` - Include pinned fields
- `lib/sync/updatesync.js` - Handle pinned fields in updates

---

## 6. Edge Cases & Considerations

### 6.1 Edge Cases
1. **Task pinned then completed**: Auto-unpin on completion
2. **Task pinned then moved to another project**: Auto-unpin on project change
3. **Task pinned then moved to different section**: Keep pinned, just update section
4. **Multiple pinned tasks**: All appear in pinned section, sorted by pin time
5. **All tasks in section pinned**: Section shows only pinned tasks (no unpinned)
6. **Pinned task deleted**: Soft delete works normally, pinned status preserved in DB

### 6.2 Performance
- Sorting pinned tasks: Use indexed `pinned_at` for efficient sorting
- Query optimization: Consider adding index on `pinned` column if needed

### 6.3 User Experience
- Immediate visual feedback when pinning/unpinning
- No loading states needed (local operation)
- Sync happens in background

---

## 7. Testing Checklist

- [ ] Pin a task from task detail screen
- [ ] Unpin a task from task detail screen
- [ ] Verify pinned task appears in "Pinned" section
- [ ] Verify pinned task appears at top of its section
- [ ] Verify sorting by pin time (most recent first)
- [ ] Verify auto-unpin on task completion
- [ ] Verify auto-unpin on project change
- [ ] Verify pinned status persists when moving to different section
- [ ] Verify sync to Supabase works
- [ ] Verify sync from Supabase works
- [ ] Verify multiple pinned tasks display correctly
- [ ] Verify empty pinned section doesn't show when no pinned tasks

---

## 8. Visual Mockup

### Task Detail Header
```
┌─────────────────────────────────────────┐
│ ←  Project Name  ▼    📌    ⋮         │
└─────────────────────────────────────────┘
```

### Project View
```
┌─────────────────────────────────────────┐
│ 📌 Pinned (2)                    [▼]    │
│ ┌─────────────────────────────────────┐ │
│ │ Task C (from "To Do")                │ │
│ │ Task A (from "In Progress")          │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ To Do                            [▼]    │
│ ┌─────────────────────────────────────┐ │
│ │ Task C (pinned)                      │ │
│ │ Task B                               │ │
│ │ Task D                               │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ In Progress                       [▼]   │
│ ┌─────────────────────────────────────┐ │
│ │ Task A (pinned)                      │ │
│ │ Task E                               │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## 9. Implementation Order

1. **Database Schema** - Add columns and migration
2. **Repository Layer** - Add `toggleTaskPin` function
3. **Task Detail UI** - Add pin icon button
4. **Task Actions Hook** - Add pin toggle handler
5. **Project View Logic** - Update grouping and rendering
6. **Auto-Unpin Logic** - On completion and project change
7. **Sync Implementation** - Update push/pull logic
8. **Testing** - Verify all functionality

---

## 10. Future Enhancements (Not in Scope)

- Pin limit with warning
- Pin from project view (swipe action)
- Pin from task list item
- Visual indicator (icon) in task list items
- Pin statistics/analytics


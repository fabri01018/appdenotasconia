# Task Templates Feature Design Document

## Overview
Implement a task templates feature that allows users to mark existing tasks as templates using tags, and create new tasks from those template tasks. Templates are regular tasks with a special tag, making them selectable when creating new tasks.

## Requirements Summary
- **Template Scope**: Task content only (title + blocks/content)
- **Template Creation**: Mark existing task as template by adding a tag
- **Template Usage**: Create new tasks from template tasks
- **Template Content**: Title and content (blocks) from the template task
- **Post-Creation**: Tasks created from templates work as normal tasks
- **Storage**: No new database tables - uses existing tasks and tags
- **UI Access**: Option available when creating tasks

---

## 1. Database Schema Changes

### 1.1 No New Tables Required! ✅

**Approach**: Use existing `tasks` and `task_tags` tables.

**Template Identification**:
- Tasks with a specific tag (e.g., "Template") are considered templates
- The tag name is configurable (recommended: "Template")
- Template tasks can have additional tags for categorization (e.g., "Template" + "Meeting")

**Benefits**:
- Zero database changes
- Reuses existing infrastructure
- Templates are just regular tasks with a tag
- Can use multiple tags for organization

---

## 2. UI/UX Design

### 2.1 Mark Task as Template

**Location**: Task Detail Screen (`app/task/[taskId].js`)

**Action**: Add "Mark as Template" option in Task Menu Modal

**Flow:**
1. User opens task detail screen
2. User taps menu button (three dots) in header
3. Task Menu Modal opens
4. New option: "Mark as Template" appears in menu
5. User taps "Mark as Template"
6. System checks if "Template" tag exists:
   - If exists: Add "Template" tag to task
   - If doesn't exist: Create "Template" tag, then add to task
7. Success message: "Task marked as template"
8. Menu closes

**Alternative Flow (if task already has Template tag):**
- Option changes to "Remove Template" or "Unmark as Template"
- Removes "Template" tag from task

**Visual Layout:**
```
Task Menu Modal:
- Change Section
- Add Tags
- AI Feature
- Mark as Template  ← NEW (or "Remove Template" if already marked)
```

### 2.2 Create Task from Template

**Location**: Add Task Modal (`components/add-task-modal.js`)

**Action**: Add "Use Template" button/option

**Flow:**
1. User opens Add Task Modal (from project view)
2. Below title input or as a button, show "Use Template" option
3. User taps "Use Template"
4. Template Selection Modal opens:
   - Fetches all tasks with "Template" tag
   - Shows list of template tasks (title, preview of content, other tags)
   - Empty state if no template tasks exist
   - (Tag filtering will be added in future)
5. User selects a template task
6. Modal closes, Add Task Modal is populated:
   - Title field: Pre-filled with template task title
   - Description field: Pre-filled with template task content
7. User can edit before saving
8. On save: Normal task creation flow (new task is independent, no link to template)

**Visual Layout:**

**Option A: Button above form (Recommended)**
```
Add Task Modal:
┌─────────────────────────────┐
│ [X] Add Task          [Save]│
├─────────────────────────────┤
│ 📁 Project Name             │
├─────────────────────────────┤
│ [Use Template]  ← NEW        │
│                             │
│ Title *                      │
│ [_________________________]  │
│                             │
│ Description                  │
│ [_________________________]  │
└─────────────────────────────┘
```

**Template Selection Modal:**
```
┌─────────────────────────────┐
│ Select Template        [X]  │
├─────────────────────────────┤
│                             │
│ 📄 Weekly Team Meeting      │
│    #Meeting #Planning       │
│    "Weekly Team Meeting"    │
│    - Agenda                 │
│    - Action items           │
│                             │
│ 📄 New Project Setup         │
│    #Project #Planning        │
│    "New Project Setup"      │
│    - Goals                  │
│    - Timeline               │
│                             │
│ [No templates yet]          │
│ Mark a task as template     │
│ using the menu!             │
│                             │
└─────────────────────────────┘
```

### 2.3 Template Task Visibility

**Decision**: Template tasks appear normally in all task views
- Template tasks appear in all normal task views
- User can complete, delete, edit them like any task
- Simple, no special handling needed
- No filtering logic required

---

## 3. Data Flow

### 3.1 Marking Task as Template

**Trigger**: User selects "Mark as Template" from task menu

**Steps:**
1. Check if task already has "Template" tag:
   - If yes: Show "Remove Template" option instead
   - If no: Proceed to mark
2. Get or create "Template" tag:
   - Query tags table for name = "Template"
   - If not found: Create new tag with name "Template"
3. Add "Template" tag to task:
   - Use existing `addTagToTask(taskId, templateTagId)`
4. Show success feedback
5. Refresh task tags display

**Files:**
- `components/task-detail/modals/TaskMenuModal.js` - Add menu item
- `hooks/task-detail/useTaskActions.js` - Add `handleMarkAsTemplate()` function
- `repositories/tags.js` - Add `getOrCreateTag(name)` helper (if needed)
- `repositories/tasks.js` - Reuse existing `addTagToTask()`

### 3.2 Creating Task from Template

**Trigger**: User selects "Use Template" in Add Task Modal

**Steps:**
1. Fetch all tasks with "Template" tag:
   - Query: `SELECT tasks.* FROM tasks JOIN task_tags ON tasks.id = task_tags.task_id JOIN tags ON task_tags.tag_id = tags.id WHERE tags.name = 'Template' AND tasks.deleted_at IS NULL`
2. Show template selection modal with list
3. User selects template task
4. Load template task data:
   - `templateTask.title`
   - `templateTask.description`
5. Pre-fill Add Task Modal:
   - Set title state to `templateTask.title`
   - Set description state to `templateTask.description`
6. User can edit before saving
7. Normal task creation proceeds (template data is just initial values)

**Files:**
- `components/add-task-modal.js` - Add "Use Template" button
- `components/template-selection-modal.js` - New modal component
- `repositories/tasks.js` - Add `getTasksByTagName(tagName)` function
- `hooks/use-tasks.js` - Add `useTemplateTasks()` hook (optional)

---

## 4. Implementation Files

### 4.1 Database Layer
- **No new tables needed!** ✅
- `repositories/tags.js` - Add helper function:
  - `getOrCreateTag(name)` - Get tag by name, create if doesn't exist
- `repositories/tasks.js` - Add query function:
  - `getTasksByTagName(tagName)` - Get all tasks with a specific tag

### 4.2 UI Components
- `components/task-detail/modals/TaskMenuModal.js` - Add "Mark as Template" / "Remove Template" option
- `components/template-selection-modal.js` - New modal for selecting template task
- `components/add-task-modal.js` - Add "Use Template" button and integration

### 4.3 Hooks
- `hooks/task-detail/useTaskActions.js` - Add `handleMarkAsTemplate()` and `handleRemoveTemplate()`
- `hooks/use-tasks.js` - Add `useTemplateTasks()` hook (optional, for fetching template tasks)

### 4.4 Data Flow Integration
- Task detail screen: Add handler for "Mark as Template"
- Add task modal: Add handler for "Use Template"

---

## 5. Technical Details

### 5.1 Template Tag Name

**Configuration**: Use a constant for the template tag name

```javascript
// constants/templates.js
export const TEMPLATE_TAG_NAME = 'Template';
```

**Benefits**:
- Easy to change if needed
- Consistent across codebase
- Can be localized later

### 5.2 Template Task Query

**Query to get template tasks:**
```sql
SELECT DISTINCT t.*
FROM tasks t
INNER JOIN task_tags tt ON t.id = tt.task_id
INNER JOIN tags ON tt.tag_id = tags.id
WHERE tags.name = 'Template'
  AND t.deleted_at IS NULL
ORDER BY t.updated_at DESC
```

**Note**: Tag filtering by additional tags will be added in future enhancement

### 5.3 Template Content Format
Templates use existing task description format:
- Newline-separated blocks
- Format: `blocksToDescription(blocks)` from `lib/blocks-utils.js`
- When creating task from template, content is loaded directly into task description
- Blocks are parsed when task is opened (existing flow)

### 5.4 Template Tag Management
- "Template" tag is a regular tag (no special system tag)
- User can see it in Tags screen
- User can delete it (but should warn if template tasks exist)
- User can rename it (but would break template functionality)

**Recommendation**: Consider making "Template" tag read-only or system-managed in future

---

## 6. User Experience Considerations

### 6.1 Marking as Template
- Simple one-tap action from menu
- Visual feedback: Tag appears in task tags display
- Can unmark by removing "Template" tag or using menu option

### 6.2 Template Selection
- Show template task title prominently
- Show other tags (for visual categorization)
- Show preview of content (first 2-3 lines)
- (Tag filtering will be added in future)

### 6.3 Template Task Behavior
- Template tasks work like normal tasks
- Can be completed, deleted, edited
- If template task is deleted, it's no longer available as template
- If template task is edited, changes reflect in future uses

### 6.4 Empty States
- If no template tasks: Show helpful message
- Guide user: "Mark a task as template using the menu (⋮) in task detail"

### 6.5 Tag-Based Organization
- Template tasks can have multiple tags
- Use tags like "Meeting", "Project", "Planning" for visual categorization
- Tags displayed in template selection for context
- (Tag filtering will be added in future)
- Example: "Template" + "Meeting" = Meeting template (visually categorized)

---

## 7. Future Enhancements (Not in Initial Implementation)

### 7.1 Template Management Screen
- Dedicated screen to view all template tasks
- Better organization than just selection modal
- Edit template tasks easily

### 7.2 Template Variables/Placeholders
- Support placeholders like `{{date}}`, `{{project}}` in templates
- Replace when creating task
- More advanced use case

### 7.3 Template Sync
- Templates sync automatically (they're just tasks with a tag)
- No special sync logic needed!

### 7.4 Template Usage Analytics
- Track how often templates are used
- Show most-used templates first
- Help users discover useful templates

### 7.5 System Template Tag
- Make "Template" tag special/system-managed
- Prevent accidental deletion
- Auto-create if missing

---

## 8. Implementation Order

### Phase 1: Core Functionality
1. Add `getOrCreateTag()` helper function
2. Add `getTasksByTagName()` query function
3. Add "Mark as Template" menu option and handler
4. Template selection modal
5. Use template in add task modal

### Phase 2: Polish (If Time Permits)
1. Better empty states
2. Template task preview improvements
3. Error handling improvements
4. Tag filtering in template selection (future enhancement)

### Phase 3: Future (Not Initial)
1. Template management screen
2. Template variables/placeholders
3. Template usage analytics
4. System template tag protection

---

## 9. Testing Considerations

### 9.1 Test Cases
- Mark task as template (Template tag doesn't exist)
- Mark task as template (Template tag exists)
- Unmark task as template
- Create task from template
- Create task from template and edit before saving
- Handle empty template list gracefully
- Template task appears in normal task views
- Template task can be completed/deleted normally
- Template task with multiple tags displays correctly

### 9.2 Edge Cases
- Template tag deleted (should handle gracefully or prevent)
- Template task deleted (no longer available as template)
- Template task with very long content
- Multiple template tasks with same title
- Template selection when no template tasks exist
- Template task with many tags

---

## 10. Design Decisions

1. **Template Tag Name**: ✅ Fixed "Template" tag name (constant: `TEMPLATE_TAG_NAME = 'Template'`)

2. **Template Task Visibility**: ✅ Template tasks appear in normal task views (no special filtering)

3. **Template Tag Management**: Allow user to delete "Template" tag (but warn if template tasks exist) - future enhancement

4. **Tag Filtering**: ❌ Not in initial implementation (will be added in future)

5. **Template Preview**: Show 2-3 lines of content in template selection modal

---

## Summary

This design provides a **zero-database-changes** implementation of task templates that:
- Uses existing tasks and tags tables (no new tables!)
- Marks tasks as templates by adding a "Template" tag
- Allows quick task creation from template tasks
- Supports tag-based organization and filtering
- Integrates seamlessly into existing task creation flow
- Templates are just regular tasks with a tag (simple and flexible)

**Key Design Decisions:**
- **Fixed Template Tag**: Uses "Template" as fixed tag name (constant)
- **No Database Changes**: Templates are regular tasks with a "Template" tag
- **Visible Templates**: Template tasks appear in normal task views
- **Simple Initial Implementation**: No tag filtering in v1 (future enhancement)
- **Tag-Based**: Reuses existing tag infrastructure
- **Flexible**: Can use multiple tags for visual categorization

The implementation is focused on core functionality first, with clear paths for future improvements.

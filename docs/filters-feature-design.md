# Filters Feature Design

## Executive Summary

**What**: A dynamic filter system that creates custom task views based on tags and projects.

**How it Works**: Users create named filters by selecting tags and/or projects. The filter then displays all incomplete tasks that match ANY of the selected criteria (OR logic).

**Key Decisions**:
- ✅ OR logic for both tags and projects (flexible matching)
- ✅ Filters appear alongside projects in sidebar (subtle icon distinction)
- ✅ Always hide completed tasks (no toggle)
- ✅ Full edit/delete capabilities
- ✅ Syncs across devices via Supabase
- ✅ MVP scope: Tags + Projects only

**Example**: A filter named "Work Urgent" with tags [urgent, work] and projects [Client A, Client B] shows all incomplete tasks that have the "urgent" tag OR "work" tag OR are in "Client A" OR "Client B".

---

## Overview
A dynamic filter system similar to TickTick that allows users to create custom views of tasks based on specific criteria. Filters act like "smart folders" that automatically show tasks matching the defined criteria.

## Core Concept
- **Filters as Virtual Projects**: Filters behave like projects in the UI but don't actually contain tasks
- **Dynamic Content**: Filter views display tasks that match the filter criteria in real-time
- **Multiple Criteria**: Each filter can combine multiple tags and projects to create powerful task views
- **OR Logic**: Flexible matching - tasks appear if they match ANY selected tag OR are in ANY selected project

## User Flow Example

**Scenario**: User wants to see all urgent work-related tasks across multiple projects.

1. **Create Filter**:
   - Navigate to sidebar, click "+ Add Filter" (next to + Add Project)
   - Modal opens
   - Enter name: "Urgent Work"
   - Select tags: ✓ urgent, ✓ work
   - Select projects: ✓ Client A, ✓ Client B
   - Click "Create Filter"

2. **View Filter**:
   - Filter appears in sidebar: 🔎 Urgent Work (8)
   - Click on filter
   - See all incomplete tasks that have "urgent" OR "work" tag OR are in Client A or Client B
   - Criteria shown at top: [urgent] [work] [Client A] [Client B]

3. **Use Filter**:
   - Click on any task to view/edit details
   - Complete tasks from filter view
   - Tasks automatically appear/disappear as criteria match changes
   - Task count badge updates in real-time

4. **Edit Filter**:
   - Click three-dot menu on filter
   - Select "Edit Filter"
   - Remove "work" tag, add "Client C" project
   - Save changes
   - Filter view automatically refreshes with new criteria

5. **Delete Filter**:
   - Click three-dot menu
   - Select "Delete Filter"
   - Confirm deletion
   - Navigate back to Inbox
   - Original tasks remain untouched in their projects

## Data Structure

### Database Schema

```sql
CREATE TABLE IF NOT EXISTS filters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'filter-outline',
  color TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  sync_status TEXT DEFAULT 'pending',
  deleted_at DATETIME
);

CREATE TABLE IF NOT EXISTS filter_tags (
  filter_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (filter_id, tag_id),
  FOREIGN KEY (filter_id) REFERENCES filters(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS filter_projects (
  filter_id INTEGER NOT NULL,
  project_id INTEGER NOT NULL,
  PRIMARY KEY (filter_id, project_id),
  FOREIGN KEY (filter_id) REFERENCES filters(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
```

**Key Fields**:
- `icon`: Ionicon name for visual distinction (default: 'filter-outline')
- `color`: Optional hex color for subtle visual accent
- `sync_status`: Tracks sync state with Supabase ('pending', 'synced', 'pending_delete')
- `deleted_at`: Soft delete support

### Filter Object Structure

```javascript
{
  id: 1,
  name: "Urgent Work Items",
  icon: "filter-outline", // Ionicon name for subtle distinction
  color: "#FF6B6B", // Optional accent color
  tags: [
    { id: 1, name: "urgent" },
    { id: 3, name: "work" }
  ],
  projects: [
    { id: 2, name: "Q4 Goals" },
    { id: 5, name: "Client Projects" }
  ],
  created_at: "2024-01-15T10:30:00Z",
  updated_at: "2024-01-15T10:30:00Z"
}
```

**Note**: Filters always exclude completed tasks - no toggle needed.

## Filter Logic

### Matching Criteria (OR Logic)

**Logic**: Tasks match if they have **ANY** selected tag OR are in **ANY** selected project.

**Behavior**:
- More permissive and flexible
- Casts a wider net to capture relevant tasks
- Easy to understand: "Show me tasks with these tags or in these projects"

**Examples**:
1. Filter with tags [urgent, work]:
   - Shows tasks with "urgent" OR "work" tag (or both)

2. Filter with projects [Project A, Project B]:
   - Shows tasks in Project A OR Project B

3. Filter with tags [urgent] + projects [Project A, Project B]:
   - Shows tasks that have "urgent" tag OR are in Project A OR in Project B

**Completed Tasks**: Always excluded from filter results (no toggle option).

### Query Implementation

```javascript
// Get tasks matching a filter (OR logic)
export async function getTasksByFilter(filterId) {
  return await withRetry(async () => {
    const db = getDb();
    
    // Get filter configuration
    const filter = await db.getFirstAsync(
      'SELECT * FROM filters WHERE id = ? AND deleted_at IS NULL',
      [filterId]
    );
    
    if (!filter) return [];
    
    // Get filter tags
    const filterTags = await db.getAllAsync(`
      SELECT tag_id FROM filter_tags WHERE filter_id = ?
    `, [filterId]);
    
    // Get filter projects
    const filterProjects = await db.getAllAsync(`
      SELECT project_id FROM filter_projects WHERE filter_id = ?
    `, [filterId]);
    
    const tagIds = filterTags.map(ft => ft.tag_id);
    const projectIds = filterProjects.map(fp => fp.project_id);
    
    // Build query with OR logic
    let query = `
      SELECT DISTINCT t.*, p.name as project_name 
      FROM tasks t 
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.deleted_at IS NULL
        AND t.completed = 0
    `;
    
    const conditions = [];
    const params = [];
    
    // Add tag conditions (OR logic - task has ANY of the tags)
    if (tagIds.length > 0) {
      const tagPlaceholders = tagIds.map(() => '?').join(',');
      conditions.push(`
        EXISTS (
          SELECT 1 FROM task_tags 
          WHERE task_id = t.id AND tag_id IN (${tagPlaceholders})
        )
      `);
      params.push(...tagIds);
    }
    
    // Add project conditions (OR logic - task in ANY project)
    if (projectIds.length > 0) {
      const projectPlaceholders = projectIds.map(() => '?').join(',');
      conditions.push(`t.project_id IN (${projectPlaceholders})`);
      params.push(...projectIds);
    }
    
    // Combine conditions with OR
    if (conditions.length > 0) {
      query += ' AND (' + conditions.join(' OR ') + ')';
    } else {
      // No criteria specified - return empty array
      return [];
    }
    
    query += ' ORDER BY t.updated_at DESC';
    
    const tasks = await db.getAllAsync(query, params);
    return tasks;
  });
}
```

**Key Points**:
- Uses `EXISTS` for tag matching (any tag match)
- Uses `IN` clause for project matching (any project match)
- Always excludes completed tasks (`t.completed = 0`)
- Returns empty array if no criteria specified
- Orders by most recently updated first

## User Interface

### UI Mockups (Text-based)

**Sidebar View**:
```
┌─────────────────────────────┐
│  ProductionAI               │
├─────────────────────────────┤
│  📥 Inbox                12 │ ← Special project (bold)
├─────────────────────────────┤
│  My Projects                │
│  [+ Project] [+ Filter]     │ ← Action buttons
│                             │
│  📁 Work                  8 │ ← Regular project (bold)
│  🔎 Urgent Items          5 │ ← Filter (regular weight, subtle)
│  📁 Personal              3 │ ← Regular project (bold)
│  🔎 This Week             7 │ ← Filter (regular weight, subtle)
│  📁 Client Projects      12 │ ← Regular project (bold)
├─────────────────────────────┤
│  🏷️  Tags                   │
└─────────────────────────────┘
```

**Filter Detail View**:
```
┌──────────────────────────────────────────┐
│  🔎 Urgent Items                    ⋮   │ ← Header with menu
├──────────────────────────────────────────┤
│  Filtering by:                           │
│  [urgent] [work] [Client A]        ˅     │ ← Criteria pills (collapsible)
│  Tasks with any of these tags or         │
│  in any of these projects                │
├──────────────────────────────────────────┤
│  ☐ Fix critical bug                      │ ← Task list
│     Project: Client A                    │
│                                          │
│  ☐ Update documentation                 │
│     Tags: urgent, work                   │
│                                          │
│  ☐ Review PRs                            │
│     Project: Client A • Tags: work       │
│                                          │
│  ☐ Deploy hotfix                         │
│     Tags: urgent                         │
└──────────────────────────────────────────┘
```

**Add/Edit Filter Modal**:
```
┌──────────────────────────────────────────┐
│  Create Filter                      ✕    │
├──────────────────────────────────────────┤
│  Filter Name                             │
│  ┌────────────────────────────────────┐  │
│  │ Urgent Items                       │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Select Tags                             │
│  ☑ urgent        ☐ personal             │
│  ☑ work          ☐ meeting              │
│  ☐ important     ☐ quick                │
│                                          │
│  Select Projects                         │
│  ☑ Client A      ☐ Personal              │
│  ☑ Client B      ☐ Archive               │
│  ☐ Internal      ☐ Learning              │
│                                          │
│  Icon (optional)                         │
│  🔎 [Change Icon]                        │
│                                          │
│           [Cancel]  [Create Filter]      │
└──────────────────────────────────────────┘
```

**Empty Filter State**:
```
┌──────────────────────────────────────────┐
│  🔎 Urgent Items                    ⋮   │
├──────────────────────────────────────────┤
│  Filtering by: [urgent] [work]           │
├──────────────────────────────────────────┤
│                                          │
│               🔍                         │
│                                          │
│        No tasks match this filter        │
│                                          │
│  Create tasks with these tags or         │
│  edit filter to adjust criteria          │
│                                          │
│           [Edit Filter]                  │
│                                          │
└──────────────────────────────────────────┘
```

### Navigation Structure

Filters appear **alongside projects** in the same section with subtle visual distinction:

```
Sidebar/Navigation:
├── Inbox (special project)
├── Projects & Filters
│   ├── 📁 Project A
│   ├── 📁 Project B  
│   ├── 🔎 Urgent Work Items (filter - subtle icon)
│   ├── 🔎 Personal Tasks (filter - subtle icon)
│   ├── 📁 Project C
│   └── + Add Project / + Add Filter
└── Tags
```

**OR** Alternative layout with grouped buttons:

```
Sidebar/Navigation:
├── Inbox (special project)
├── My Projects
│   ├── [+ Project] [+ Filter] (action buttons)
│   ├── 📁 Project A
│   ├── 🔎 Urgent Work Items (filter)
│   ├── 📁 Project B
│   └── 🔎 Personal Tasks (filter)
└── Tags
```

### Visual Distinction (Subtle)

Filters need to be distinguishable from projects but not overly prominent:

- **Icon**: Use `filter-outline` or similar Ionicon (subtle, not bold)
- **Icon Size/Opacity**: Slightly smaller or lower opacity than project icons
- **Color**: Optional subtle accent color per filter
- **Badge**: Show count of matching tasks (incomplete only)
- **Font Weight**: Could use regular weight for filters vs. bold for projects

**Example Visual Hierarchy**:
```
📁 Work Project     (bold, folder icon, 12 tasks)
🔎 Urgent Items     (regular, filter icon, 5 tasks)  ← Subtle difference
📁 Personal         (bold, folder icon, 8 tasks)
```

### Filter Creation Flow

1. **Trigger**: User clicks "+ Add Filter" button (alongside + Add Project)
2. **Modal Opens**: `add-filter-modal.js`
3. **Input Steps**:
   - **Name**: Text input for filter name (required)
   - **Icon**: Optional icon picker (default: "filter-outline")
   - **Color**: Optional subtle color picker
   - **Tags**: Multi-select tag picker with checkboxes
     - Show all available tags
     - Check/uncheck to include in filter
   - **Projects**: Multi-select project picker with checkboxes
     - Show all available projects (except Inbox?)
     - Check/uncheck to include in filter
4. **Validation**: 
   - Name is required (min 1 char, max 100 chars)
   - At least one tag OR one project must be selected
   - No duplicate filter names
5. **Save**: Create filter in database and navigate to filter view

### Filter View Screen

Create new route: `app/filter/[filterId].js`

```javascript
// Similar to project detail view but reads from filter
import FilterDetailView from '@/components/FilterDetailView';
import { useLocalSearchParams } from 'expo-router';

export default function FilterDetailScreen() {
  const { filterId } = useLocalSearchParams();
  return <FilterDetailView filterId={filterId} />;
}
```

**Filter Detail View Components**:
- **Header**: Filter name with subtle filter icon
- **Criteria Summary**: Collapsible section showing:
  - Pills for selected tags (e.g., [urgent] [work])
  - Pills for selected projects (e.g., [Client A] [Client B])
  - Small text: "Showing tasks with any of these tags or in any of these projects"
- **Action Buttons**: 
  - Three-dot menu with "Edit Filter" and "Delete Filter"
- **Task List**: 
  - Same task list component used in projects
  - Shows incomplete tasks only
  - Tasks are clickable to view/edit details
  - No "Add Task" button (tasks can't be added directly to filters)
- **Empty State**: "No tasks match this filter" with criteria display

**Differences from Project View**:
- No sections support
- No "Add Task" button
- No subtask hierarchy (flat list)
- Criteria summary at top
- Read-only in terms of task creation (can still edit existing tasks)

### Filter Management

**Actions Available**:
- ✏️ **Edit Filter**: Modify name, icon, color, tags, and projects
- 🗑️ **Delete Filter**: Remove filter (doesn't affect actual tasks)
- 📋 **Duplicate Filter**: Create copy for variation (optional, Phase 4)

**Edit Flow**:
- Three-dot menu on filter (similar to project options)
- Reuse add-filter-modal.js with pre-populated data
- Allow changing all criteria (name, tags, projects)
- Validation same as creation
- Auto-refresh filter view when saved
- Show confirmation before deletion

## Components to Create

### 1. `components/add-filter-modal.js`
Modal for creating/editing filters with:
- Name input
- Tag multi-select
- Project multi-select
- Options toggles

### 2. `components/FilterDetailView.js`
Main view component showing filtered tasks:
- Filter header with name/icon
- Criteria summary
- Task list
- Edit/delete actions

### 3. `components/filter-button.js`
Sidebar button component for filter navigation

### 4. `app/filter/[filterId].js`
Route for individual filter view

### 5. Update existing components:
- Update `app/_layout.js` to include filters route
- Update sidebar/navigation to show filters section

## Repository Layer

Create `repositories/filters.js`:

```javascript
// CRUD operations for filters
- getAllFilters()
- getFilterById(id)
- createFilter(name, options)
- updateFilter(id, updates)
- deleteFilter(id)
- getTasksByFilter(filterId)
- addTagToFilter(filterId, tagId)
- removeTagFromFilter(filterId, tagId)
- addProjectToFilter(filterId, projectId)
- removeProjectFromFilter(filterId, projectId)
```

## Hooks Layer

Create `hooks/use-filters.ts`:

```typescript
// React Query hooks for filters
- useFilters() // Get all filters
- useFilter(filterId) // Get specific filter
- useFilterTasks(filterId) // Get tasks matching filter
- useCreateFilter()
- useUpdateFilter()
- useDeleteFilter()
```

## Sync Considerations

### Supabase Schema
Create corresponding tables in Supabase:
- `filters` table
- `filter_tags` table  
- `filter_projects` table

### Sync Strategy
- Filters sync like projects (pending → synced)
- On pull: Download filters and their relationships
- On push: Upload new/modified filters
- Conflict resolution: Last-write-wins based on updated_at

## Edge Cases & Considerations

### Tag/Project Deletion
**Problem**: What happens when a tag or project used in a filter is deleted?

**Solution**: 
- Database CASCADE on filter_tags/filter_projects automatically removes the relationship
- Filter still exists but with fewer criteria
- If filter ends up with NO criteria (0 tags and 0 projects):
  - Show warning message in filter view: "This filter has no criteria"
  - Suggest editing or deleting the filter
  - Optional: Auto-prompt user to add criteria or delete filter
- Filter continues to work with remaining valid criteria

### Performance
**Concern**: Complex filters with many tags/projects could be slow

**Optimization**:
- Add database indexes on `task_tags(task_id, tag_id)` for faster lookups
- Add index on `tasks(project_id)` and `tasks(completed)`
- Cache filter results with React Query (5 min stale time)
- Limit maximum filter criteria (e.g., max 10 tags + 10 projects)
- Use EXPLAIN QUERY PLAN to optimize SQL queries
- Consider pagination if filter returns > 100 tasks

### Empty Filters
**Scenario**: Filter matches zero tasks (valid criteria but no matches)

**UX Solution**: 
- Show friendly empty state with filter icon
- Message: "No tasks match this filter"
- Display active criteria as pills: "Filtering by: [urgent] [work] [Project A]"
- Helpful suggestions:
  - "Create tasks with these tags or in these projects"
  - "Edit filter to adjust criteria"
- Keep view functional (not broken)

### Filter with Only Completed Tasks
**Scenario**: Filter criteria would match tasks, but they're all completed

**Behavior**:
- Since filters always hide completed tasks, this appears as empty filter
- Empty state message same as above
- User can check individual projects/tags to see completed tasks

### Real-time Updates
**Challenge**: Tasks added/edited should appear in filters immediately

**Solution**:
- React Query auto-invalidation on task mutations
- When task created/updated/deleted, invalidate:
  - All filter queries: `queryClient.invalidateQueries({ queryKey: ['filters'] })`
  - Specific filter tasks: `queryClient.invalidateQueries({ queryKey: ['filter-tasks'] })`
- Filters re-fetch automatically (React Query handles this)
- Optimistic updates for better UX

### Circular Dependencies
**Problem**: Can filters reference each other? (Not in current design)

**Current Solution**: Filters only reference tags and projects (not other filters)
- Keeps system simple
- Avoids infinite loops
- Future: If allowing filter-to-filter references, implement cycle detection

### Navigation Edge Cases
**Scenario**: User deletes current filter while viewing it

**Solution**:
- Show toast: "Filter deleted"
- Automatically navigate to Inbox
- Use React Router navigation in delete handler

## Future Enhancements (Post-MVP)

### Potential Phase 5+ Features

1. **Smart/System Filters**: Pre-defined filters users can't edit
   - "Today" (tasks due today)
   - "This Week" (tasks due this week)
   - "Overdue" (past due tasks)
   - "No Tags" (untagged tasks)
   - "All Tasks" (cross-project view)

2. **Advanced Criteria**: Additional filtering options
   - Date ranges (created, updated, due)
   - Section filtering within projects
   - Subtask inclusion/exclusion
   - Text search in title/description
   - Priority levels (if added to tasks)

3. **Filter Templates**: Reusable configurations
   - Save filter as template
   - Create filter from template
   - Share templates with other users

4. **Advanced Logic Options**:
   - Configurable AND/OR logic toggle per filter
   - Exclude criteria (NOT operators)
   - Nested conditions (complex queries)

5. **Filter Analytics**: Insights on filtered tasks
   - Task count trends over time
   - Completion rate for filtered tasks
   - Time tracking aggregations
   - Export filtered task lists

## Design Decisions (Finalized)

### Core Behavior
1. ✅ **Filter Logic**: OR logic for both tags and projects (flexible matching)
2. ✅ **Sync**: Filters must be saved to database and sync via Supabase
3. ✅ **UI Placement**: Filters appear alongside projects with subtle icon distinction
4. ✅ **Edit/Delete**: Users can fully edit filter criteria, rename, and delete filters
5. ✅ **Completed Tasks**: Always hidden (no show/hide toggle)
6. ✅ **Scope**: Tags + Projects only for MVP (no date/priority/other criteria yet)

### Future Considerations (Phase 2+)
- Custom sort orders per filter
- Set filter as default view
- Filter sharing across team members
- Filter groups/categories
- Smart filters (Today, This Week, etc.)
- Advanced criteria (dates, priorities, sections)

## Implementation Phases

### Phase 1: MVP (Core Functionality)
- [ ] Database schema creation (filters, filter_tags, filter_projects tables)
- [ ] Repository layer (repositories/filters.js)
- [ ] Hooks layer (hooks/use-filters.ts)
- [ ] Basic filter CRUD operations
- [ ] Filter creation modal (add-filter-modal.js)
- [ ] Filter detail view component (FilterDetailView.js)
- [ ] Filter route (app/filter/[filterId].js)
- [ ] Navigation integration (filters alongside projects)
- [ ] Task filtering logic (OR for both tags and projects)
- [ ] Filter list/management UI
- [ ] Empty states and error handling

### Phase 2: Edit & Delete
- [ ] Edit filter functionality (reuse creation modal)
- [ ] Delete filter with confirmation
- [ ] Filter rename capability
- [ ] Filter criteria summary in detail view
- [ ] Optimistic UI updates

### Phase 3: Sync Integration
- [ ] Supabase schema (filters, filter_tags, filter_projects)
- [ ] Push filter changes to Supabase
- [ ] Pull filter updates from Supabase
- [ ] Conflict resolution (last-write-wins)
- [ ] Sync status tracking

### Phase 4: Polish & Enhancements
- [ ] Custom icons per filter
- [ ] Subtle color coding
- [ ] Task count badges
- [ ] Filter sorting/reordering
- [ ] Performance optimization
- [ ] Loading states and skeletons

### Phase 5: Advanced (Future)
- [ ] Smart/system filters (Today, This Week, Overdue)
- [ ] Filter templates
- [ ] Additional criteria (dates, sections, priorities)
- [ ] Configurable AND/OR logic
- [ ] Filter sharing

## Technical Architecture

```
User Interaction
      ↓
UI Components (Modal, DetailView, FilterButton)
      ↓
Hooks Layer (useFilters, useFilterTasks)
      ↓
Repository Layer (filters.js)
      ↓
Database Layer (SQLite with React Query cache)
      ↓
Sync Layer (Supabase integration)
```

## Success Metrics

- Users can create a filter in < 30 seconds
- Filter views load in < 500ms
- Zero data loss during sync
- Intuitive enough that users don't need documentation

---

## Implementation Checklist Summary

**Database**:
- [ ] Add 3 new tables: filters, filter_tags, filter_projects
- [ ] Add indexes for performance
- [ ] Test migration on existing database

**Backend (Repositories & Hooks)**:
- [ ] Create repositories/filters.js with CRUD operations
- [ ] Create hooks/use-filters.ts with React Query hooks
- [ ] Implement getTasksByFilter with OR logic
- [ ] Add filter tag/project relationship methods

**UI Components**:
- [ ] Create add-filter-modal.js (create/edit)
- [ ] Create FilterDetailView.js component
- [ ] Add filter-button.js for sidebar
- [ ] Create app/filter/[filterId].js route
- [ ] Update navigation to show filters alongside projects

**Sync**:
- [ ] Add Supabase tables (filters, filter_tags, filter_projects)
- [ ] Implement push/pull sync for filters
- [ ] Test sync conflicts and resolution

**Polish**:
- [ ] Empty states
- [ ] Loading skeletons
- [ ] Error handling
- [ ] Confirmation dialogs
- [ ] Task count badges

---

## Notes

- **Design Philosophy**: Simplicity first - Tag + Project filtering covers 80% of real-world needs
- **Extensibility**: Architecture allows easy expansion to more criteria later (dates, priorities, etc.)
- **Consistency**: UI patterns match existing project/task management flows
- **Performance**: OR logic is more permissive but also simpler to optimize
- **User Mental Model**: Filters as "saved searches" that update dynamically


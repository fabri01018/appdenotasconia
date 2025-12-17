# Filters Feature - Implementation Roadmap

## Philosophy

**Incremental Development**: Build small, test often, verify before moving forward.

**Each step should**:
- ✅ Be independently testable
- ✅ Have clear success criteria
- ✅ Take 15-30 minutes to implement
- ✅ Not break existing functionality
- ⏸️ Include a **STOP & TEST** checkpoint

---

## Stage 1: Database Foundation (3 steps)

### Step 1.1: Add Filter Tables to Database Schema
**Goal**: Create the three new tables in SQLite schema.

**Files to modify**:
- `lib/database.js`

**What to do**:
1. Add `filters` table creation in `_initDatabase()` function
2. Add `filter_tags` table creation
3. Add `filter_projects` table creation
4. Add indexes for performance:
   - `CREATE INDEX idx_filter_tags_filter_id ON filter_tags(filter_id)`
   - `CREATE INDEX idx_filter_tags_tag_id ON filter_tags(tag_id)`
   - `CREATE INDEX idx_filter_projects_filter_id ON filter_projects(filter_id)`
   - `CREATE INDEX idx_filter_projects_project_id ON filter_projects(project_id)`

**Success criteria**:
- App starts without errors
- Database initializes successfully
- Check logs for "Database initialization completed successfully"

**Test commands**:
```bash
# Delete app and reinstall to trigger fresh database creation
# OR use the database reset function if available
```

**STOP & TEST**: 
- [ ] App launches
- [ ] No database errors in console
- [ ] Existing projects/tasks still visible

---

### Step 1.2: Add Migration Logic for Existing Databases
**Goal**: Handle users with existing databases (add new tables gracefully).

**Files to modify**:
- `lib/database.js`

**What to do**:
1. Add safe table creation (IF NOT EXISTS is already there, but verify)
2. Test on an existing database with data

**Success criteria**:
- Existing app data is preserved
- New tables are created
- No data loss

**STOP & TEST**:
- [ ] Update app without deleting data
- [ ] All existing projects/tasks intact
- [ ] New tables exist (we'll verify in next step)

---

### Step 1.3: Create Database Query Helper
**Goal**: Add a simple query to verify tables exist.

**Files to create**:
- None yet, just test in existing code

**What to do**:
1. In `lib/database.js`, add a simple helper function temporarily:
```javascript
export async function verifyFilterTables() {
  const db = getDb();
  const filters = await db.getAllAsync('SELECT * FROM filters LIMIT 1');
  const filterTags = await db.getAllAsync('SELECT * FROM filter_tags LIMIT 1');
  const filterProjects = await db.getAllAsync('SELECT * FROM filter_projects LIMIT 1');
  console.log('✅ Filter tables verified:', { filters, filterTags, filterProjects });
  return true;
}
```

2. Call this function somewhere to verify (can remove later)

**STOP & TEST**:
- [ ] Function runs without errors
- [ ] Returns empty results (no filters yet)
- [ ] Log shows table verification

---

## Stage 2: Repository Layer (3 steps)

### Step 2.1: Create Basic Filter Repository
**Goal**: Create CRUD operations for filters (without relationships yet).

**Files to create**:
- `repositories/filters.js`

**What to implement**:
```javascript
// Basic CRUD only - no tags/projects yet
- getAllFilters()
- getFilterById(id)
- createFilter(name, icon, color)
- updateFilter(id, updates)
- deleteFilter(id)
```

**What NOT to implement yet**:
- ❌ Tag relationships
- ❌ Project relationships
- ❌ Task filtering logic

**Success criteria**:
- Functions exist and can be imported
- Can create a filter with just a name
- Can retrieve created filter
- Can delete filter

**Test approach**:
1. Import functions in a test file
2. Create a filter: `createFilter('Test Filter', 'filter-outline', '#FF0000')`
3. Get all filters: `getAllFilters()`
4. Verify it returns the created filter
5. Delete filter: `deleteFilter(filterId)`

**STOP & TEST**:
- [ ] Create filter succeeds
- [ ] getAllFilters returns created filter
- [ ] Delete filter succeeds
- [ ] No errors in console

---

### Step 2.2: Add Filter-Tag Relationship Methods
**Goal**: Add ability to associate tags with filters.

**Files to modify**:
- `repositories/filters.js`

**What to implement**:
```javascript
- addTagToFilter(filterId, tagId)
- removeTagFromFilter(filterId, tagId)
- getFilterTags(filterId)
```

**Success criteria**:
- Can add a tag to a filter
- Can remove a tag from a filter
- Can retrieve all tags for a filter

**Test approach**:
1. Create a filter
2. Create a tag (or use existing)
3. Call `addTagToFilter(filterId, tagId)`
4. Call `getFilterTags(filterId)` - should return the tag
5. Call `removeTagFromFilter(filterId, tagId)`
6. Verify tag is removed

**STOP & TEST**:
- [ ] Can associate tags with filters
- [ ] Can retrieve associated tags
- [ ] Can remove tag associations
- [ ] Foreign key relationships work

---

### Step 2.3: Add Filter-Project Relationship Methods
**Goal**: Add ability to associate projects with filters.

**Files to modify**:
- `repositories/filters.js`

**What to implement**:
```javascript
- addProjectToFilter(filterId, projectId)
- removeProjectFromFilter(filterId, projectId)
- getFilterProjects(filterId)
```

**Success criteria**:
- Can add a project to a filter
- Can remove a project from a filter
- Can retrieve all projects for a filter

**STOP & TEST**:
- [ ] Can associate projects with filters
- [ ] Can retrieve associated projects
- [ ] Can remove project associations
- [ ] Complete filter with tags + projects works

---

## Stage 3: Task Filtering Logic (2 steps)

### Step 3.1: Implement Basic Task Filter Query
**Goal**: Create the core query that filters tasks by criteria.

**Files to modify**:
- `repositories/filters.js`

**What to implement**:
```javascript
- getTasksByFilter(filterId) // Returns tasks matching filter criteria
```

**Implementation notes**:
- Use the OR logic from design doc
- Must exclude completed tasks
- Must handle empty criteria gracefully
- Must join with projects to get project_name

**Success criteria**:
- Query runs without errors
- Returns correct tasks based on filter criteria
- Excludes completed tasks
- Returns empty array for empty criteria

**Test approach**:
1. Create a filter with 1 tag
2. Create tasks with that tag
3. Create tasks without that tag
4. Call `getTasksByFilter(filterId)`
5. Verify only tagged tasks returned
6. Mark a task as completed
7. Verify completed task NOT returned

**STOP & TEST**:
- [ ] Filter returns correct tasks
- [ ] Excludes completed tasks
- [ ] Handles multiple tags (OR logic)
- [ ] Handles multiple projects (OR logic)
- [ ] Handles mixed tags + projects
- [ ] Returns empty array gracefully

---

### Step 3.2: Add Filter with Full Details
**Goal**: Get filter with all its relationships in one call.

**Files to modify**:
- `repositories/filters.js`

**What to implement**:
```javascript
- getFilterWithDetails(filterId) // Returns filter + tags + projects
```

**Returns**:
```javascript
{
  id: 1,
  name: "Urgent Work",
  icon: "filter-outline",
  color: "#FF0000",
  tags: [{ id: 1, name: "urgent" }],
  projects: [{ id: 2, name: "Client A" }],
  created_at: "...",
  updated_at: "..."
}
```

**STOP & TEST**:
- [ ] Returns complete filter object
- [ ] Includes all tags
- [ ] Includes all projects
- [ ] Handles filters with no tags/projects

---

## Stage 4: React Query Hooks (2 steps)

### Step 4.1: Create Basic Filter Hooks
**Goal**: Wrap repository functions in React Query hooks.

**Files to create**:
- `hooks/use-filters.ts`

**What to implement**:
```typescript
- useFilters() // Get all filters
- useFilter(filterId) // Get specific filter with details
- useCreateFilter() // Mutation
- useDeleteFilter() // Mutation
```

**What NOT to implement yet**:
- ❌ useUpdateFilter
- ❌ useFilterTasks
- ❌ Tag/project relationship hooks

**Success criteria**:
- Hooks can be imported
- useFilters returns empty array initially
- Can create filter via mutation
- useFilters updates after creation
- Can delete filter via mutation

**Test approach**:
1. Import hooks in a component
2. Use `useFilters()` - should return empty array
3. Use `useCreateFilter()` mutation to create filter
4. Verify `useFilters()` updates with new filter
5. Use `useDeleteFilter()` to remove it

**STOP & TEST**:
- [ ] Hooks work in React components
- [ ] React Query caching works
- [ ] Mutations invalidate queries correctly
- [ ] No TypeScript errors

---

### Step 4.2: Add Filter Tasks Hook
**Goal**: Hook to get tasks for a specific filter.

**Files to modify**:
- `hooks/use-filters.ts`

**What to implement**:
```typescript
- useFilterTasks(filterId) // Get tasks matching filter
```

**Success criteria**:
- Hook returns tasks for given filter
- Updates when tasks change
- Updates when filter criteria change
- Handles filterId = null gracefully

**STOP & TEST**:
- [ ] Hook returns correct filtered tasks
- [ ] Updates when task is added with matching tag
- [ ] Updates when task is completed (disappears)
- [ ] Handles filter with no criteria

---

## Stage 5: UI - Filter Creation Modal (3 steps)

### Step 5.1: Create Basic Modal Structure
**Goal**: Create the modal component with just name input.

**Files to create**:
- `components/add-filter-modal.js`

**What to implement**:
- Modal wrapper with open/close
- Name input field
- Cancel/Create buttons
- Basic validation (name required)

**What NOT to implement yet**:
- ❌ Tag selection
- ❌ Project selection
- ❌ Icon picker
- ❌ Color picker

**Success criteria**:
- Modal opens and closes
- Can type in name field
- Create button calls mutation
- Modal closes on success
- Shows error if name empty

**Test approach**:
1. Add button to open modal somewhere
2. Click button, modal opens
3. Type filter name
4. Click Create
5. Verify filter created in database
6. Modal closes

**STOP & TEST**:
- [ ] Modal UI looks good
- [ ] Can create filter with name only
- [ ] Validation works
- [ ] Modal closes properly
- [ ] Filter appears in database

---

### Step 5.2: Add Tag Selection UI
**Goal**: Add multi-select checkboxes for tags.

**Files to modify**:
- `components/add-filter-modal.js`

**What to implement**:
- Fetch all available tags
- Show tags as checkboxes
- Track selected tags in state
- Pass selected tag IDs to creation function
- Call `addTagToFilter` for each selected tag after filter created

**Success criteria**:
- All tags displayed as checkboxes
- Can check/uncheck tags
- Selected tags saved when filter created
- Can retrieve tags via `getFilterTags()`

**STOP & TEST**:
- [ ] Tags display correctly
- [ ] Selection state works
- [ ] Tags associated with filter
- [ ] Can create filter with multiple tags

---

### Step 5.3: Add Project Selection UI
**Goal**: Add multi-select checkboxes for projects.

**Files to modify**:
- `components/add-filter-modal.js`

**What to implement**:
- Fetch all available projects
- Show projects as checkboxes
- Track selected projects in state
- Pass selected project IDs to creation function
- Call `addProjectToFilter` for each selected project
- Validation: At least one tag OR one project required

**Success criteria**:
- All projects displayed as checkboxes
- Can select/deselect projects
- Selected projects saved when filter created
- Validation prevents creating filter with no criteria
- Can create filter with only tags, only projects, or both

**STOP & TEST**:
- [ ] Projects display correctly
- [ ] Can select multiple projects
- [ ] Projects associated with filter
- [ ] Validation works (at least 1 tag or project)
- [ ] Can create various filter combinations

---

## Stage 6: UI - Filter Display in Sidebar (3 steps)

### Step 6.1: Display Filters in Sidebar (Basic)
**Goal**: Show filter names in the sidebar list.

**Files to modify**:
- Look at how projects are displayed in sidebar
- Add filters to the same list or create separate section

**What to implement**:
- Use `useFilters()` hook to get all filters
- Map over filters and display names
- Use same styling as projects for now (we'll differentiate later)
- Make filters clickable (navigation TBD in next step)

**Success criteria**:
- Filters appear in sidebar
- List updates when filters added/deleted
- Filters have correct names

**STOP & TEST**:
- [ ] Filters visible in sidebar
- [ ] Newly created filters appear automatically
- [ ] Deleted filters disappear
- [ ] No layout issues

---

### Step 6.2: Add Navigation to Filter Views
**Goal**: Clicking a filter navigates to filter view.

**Files to create**:
- `app/filter/[filterId].js` (route)
- `components/FilterDetailView.js` (component)

**What to implement**:

**Route** (`app/filter/[filterId].js`):
```javascript
import FilterDetailView from '@/components/FilterDetailView';
import { useLocalSearchParams } from 'expo-router';

export default function FilterDetailScreen() {
  const { filterId } = useLocalSearchParams();
  return <FilterDetailView filterId={filterId} />;
}
```

**Component** (`FilterDetailView.js`):
- Basic header with filter name
- Use `useFilter(filterId)` to get filter details
- Use `useFilterTasks(filterId)` to get tasks
- Display task list (reuse existing task list component)
- Show loading state
- Show empty state if no tasks

**Success criteria**:
- Clicking filter in sidebar navigates to filter view
- Filter view shows correct filter name
- Filter view shows correct filtered tasks
- Back navigation works

**STOP & TEST**:
- [ ] Can navigate to filter view
- [ ] Correct filter data displayed
- [ ] Correct tasks shown
- [ ] Task list functional
- [ ] Navigation works both ways

---

### Step 6.3: Add Visual Distinction for Filters
**Goal**: Make filters look subtly different from projects.

**Files to modify**:
- Sidebar component where filters are listed
- Filter list item component

**What to implement**:
- Different icon for filters (`filter-outline`)
- Slightly lighter font weight or opacity
- Optional: small text label or different background
- Task count badge (incomplete tasks only)

**Success criteria**:
- Filters visually distinct but subtle
- Easy to differentiate projects from filters
- UI looks polished and consistent

**STOP & TEST**:
- [ ] Can easily tell filters from projects
- [ ] Visual distinction is subtle and tasteful
- [ ] Task count badges accurate
- [ ] Icons appropriate

---

## Stage 7: Filter Detail View Enhancements (3 steps)

### Step 7.1: Add Criteria Summary
**Goal**: Show which tags/projects are filtering the view.

**Files to modify**:
- `components/FilterDetailView.js`

**What to implement**:
- Section at top showing filter criteria
- Display tags as pills: `[urgent] [work]`
- Display projects as pills: `[Client A] [Client B]`
- Small explanatory text: "Showing tasks with any of these tags or in any of these projects"
- Make it collapsible (optional, can be Phase 2)

**Success criteria**:
- Criteria clearly visible
- Pills look good
- Easy to understand what's being filtered

**STOP & TEST**:
- [ ] Criteria summary displays correctly
- [ ] Pills formatted nicely
- [ ] Text is clear and helpful
- [ ] Layout responsive

---

### Step 7.2: Add Empty State
**Goal**: Show helpful message when filter has no matching tasks.

**Files to modify**:
- `components/FilterDetailView.js`

**What to implement**:
- Check if tasks array is empty
- Show empty state UI:
  - Filter icon
  - "No tasks match this filter"
  - Display criteria pills
  - Suggestion text
  - "Edit Filter" button (implement in next stage)

**Success criteria**:
- Empty state shows when no tasks match
- UI is friendly and helpful
- Criteria still visible

**STOP & TEST**:
- [ ] Empty state displays correctly
- [ ] Message is helpful
- [ ] Doesn't show when tasks exist
- [ ] Layout looks good

---

### Step 7.3: Add Filter Options Menu
**Goal**: Three-dot menu with Edit and Delete options.

**Files to modify**:
- `components/FilterDetailView.js`

**What to implement**:
- Three-dot menu button in header (like projects)
- Menu modal/dropdown with options:
  - "Edit Filter" (implement in next stage)
  - "Delete Filter"
- Delete confirmation dialog
- Use `useDeleteFilter()` mutation
- Navigate to Inbox after deletion

**Success criteria**:
- Menu opens and closes properly
- Delete shows confirmation
- Delete removes filter
- Navigation after delete works

**STOP & TEST**:
- [ ] Menu accessible and functional
- [ ] Delete confirmation works
- [ ] Filter deleted successfully
- [ ] Navigation to Inbox after delete
- [ ] No crashes when deleting current filter

---

## Stage 8: Edit Filter (2 steps)

### Step 8.1: Add Update Filter Mutation
**Goal**: Add ability to update filter details.

**Files to modify**:
- `repositories/filters.js` (already has updateFilter, verify it works)
- `hooks/use-filters.ts`

**What to implement**:
```typescript
- useUpdateFilter() // Mutation hook
```

**Mutation should**:
1. Update filter basic info (name, icon, color)
2. Remove all existing tag associations
3. Add new tag associations
4. Remove all existing project associations
5. Add new project associations
6. Invalidate queries to refresh UI

**Success criteria**:
- Can update filter name
- Can change tag selections
- Can change project selections
- UI updates after mutation
- Tasks update based on new criteria

**STOP & TEST**:
- [ ] Mutation works
- [ ] Can update filter via code
- [ ] Queries invalidate correctly
- [ ] Filter view updates

---

### Step 8.2: Reuse Modal for Editing
**Goal**: Open creation modal with pre-populated data.

**Files to modify**:
- `components/add-filter-modal.js`
- `components/FilterDetailView.js`

**What to implement**:
- Add `editMode` prop to modal
- Add `initialFilter` prop with filter data
- Pre-populate fields when editing:
  - Name input
  - Selected tags (checkboxes)
  - Selected projects (checkboxes)
  - Icon/color (if implemented)
- Change button text to "Save" instead of "Create"
- Use update mutation instead of create mutation
- Wire up "Edit Filter" menu option to open modal

**Success criteria**:
- Modal opens with current filter data
- All fields pre-populated correctly
- Saving updates the filter
- Modal closes after save
- Filter view refreshes

**STOP & TEST**:
- [ ] Edit modal opens from menu
- [ ] Fields pre-populated correctly
- [ ] Can modify all criteria
- [ ] Save updates filter
- [ ] UI refreshes automatically
- [ ] Can edit multiple times

---

## Stage 9: Polish & Edge Cases (4 steps)

### Step 9.1: Add Loading States
**Goal**: Show loading indicators during async operations.

**Files to modify**:
- `components/FilterDetailView.js`
- `components/add-filter-modal.js`

**What to implement**:
- Loading spinner while filter data loads
- Loading spinner while tasks load
- Disable buttons during mutations
- Loading state in modal during creation
- Loading text: "Creating filter..." / "Updating filter..."

**STOP & TEST**:
- [ ] Loading states appear appropriately
- [ ] No flickering or jarring transitions
- [ ] Buttons disabled during operations
- [ ] User can't double-submit

---

### Step 9.2: Add Error Handling
**Goal**: Handle and display errors gracefully.

**Files to modify**:
- All components using mutations/queries
- `repositories/filters.js`

**What to implement**:
- Try-catch blocks in repository functions
- Error state in components
- Toast notifications for errors
- Specific error messages:
  - "Failed to create filter"
  - "Failed to load filter"
  - "Failed to delete filter"
  - "Filter not found"
- Retry mechanisms for queries

**STOP & TEST**:
- [ ] Errors don't crash app
- [ ] Error messages are clear
- [ ] User can recover from errors
- [ ] Errors logged to console

---

### Step 9.3: Handle Filter with No Criteria
**Goal**: Handle edge case where filter has no tags/projects.

**Files to modify**:
- `components/FilterDetailView.js`
- `repositories/filters.js`

**What to implement**:
- Detection when filter has no criteria
- Warning message in filter view
- Suggestion to edit or delete filter
- Graceful handling in task query

**Scenarios to handle**:
1. User creates filter, then deletes all tags used by it
2. User creates filter, then deletes all projects used by it
3. User somehow creates filter with no criteria (shouldn't happen with validation)

**STOP & TEST**:
- [ ] No-criteria filters show warning
- [ ] Doesn't crash
- [ ] User can edit to add criteria
- [ ] User can delete filter

---

### Step 9.4: Real-time Updates
**Goal**: Ensure filter views update when tasks change.

**Files to modify**:
- `hooks/use-filters.ts`
- Task mutation hooks

**What to implement**:
- When task is created/updated/deleted, invalidate filter queries
- When task tags change, invalidate filter queries
- When task moves projects, invalidate filter queries
- Add to existing mutation success handlers:

```typescript
// In useCreateTask, useUpdateTask, useDeleteTask
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['tasks'] });
  queryClient.invalidateQueries({ queryKey: ['filter-tasks'] }); // Add this
}
```

**STOP & TEST**:
- [ ] Adding task with tag shows in relevant filters immediately
- [ ] Completing task removes from filter view
- [ ] Removing tag from task updates filter view
- [ ] Moving task to different project updates filter views

---

## Stage 10: Icon & Color Customization (Optional)

### Step 10.1: Add Icon Picker (Optional)
**Goal**: Let users choose custom icon for filter.

**Files to modify**:
- `components/add-filter-modal.js`

**What to implement**:
- Icon picker UI (simple dropdown or modal)
- Popular icons to choose from
- Default to `filter-outline`
- Save selected icon
- Display custom icon in sidebar and filter view

**STOP & TEST**:
- [ ] Can select different icons
- [ ] Icons save correctly
- [ ] Icons display in UI
- [ ] Default icon works

---

### Step 10.2: Add Color Picker (Optional)
**Goal**: Let users choose accent color for filter.

**Files to modify**:
- `components/add-filter-modal.js`

**What to implement**:
- Color picker UI (preset colors or full picker)
- Apply color to filter name or icon
- Subtle application (not overwhelming)
- Default to no color

**STOP & TEST**:
- [ ] Can select colors
- [ ] Colors save correctly
- [ ] Colors display subtly
- [ ] Works with both light/dark mode

---

## Stage 11: Supabase Sync (4 steps)

### Step 11.1: Create Supabase Tables
**Goal**: Set up tables in Supabase for sync.

**What to do**:
1. Create tables in Supabase dashboard:
   - `filters`
   - `filter_tags`
   - `filter_projects`
2. Set up RLS policies (if needed)
3. Test table creation

**Success criteria**:
- Tables exist in Supabase
- Schema matches local schema
- Can manually insert/query data

**STOP & TEST**:
- [ ] Tables created successfully
- [ ] Can query tables from Supabase dashboard
- [ ] Relationships work

---

### Step 11.2: Implement Push (Upload) Sync
**Goal**: Push local filters to Supabase.

**Files to modify**:
- `lib/sync/` (wherever sync logic lives)

**What to implement**:
- Push filters to Supabase
- Push filter_tags relationships
- Push filter_projects relationships
- Handle sync_status tracking
- Handle errors gracefully

**Success criteria**:
- Filters created locally sync to Supabase
- Relationships sync correctly
- sync_status updates to 'synced'

**STOP & TEST**:
- [ ] Create filter locally
- [ ] Trigger push sync
- [ ] Verify filter in Supabase
- [ ] Verify relationships in Supabase
- [ ] sync_status updated

---

### Step 11.3: Implement Pull (Download) Sync
**Goal**: Pull filters from Supabase to local device.

**Files to modify**:
- `lib/sync/` (sync logic)

**What to implement**:
- Pull filters from Supabase
- Pull filter_tags relationships
- Pull filter_projects relationships
- Merge with local data
- Handle conflicts (last-write-wins)

**Success criteria**:
- Can pull filters from another device
- Filters appear in local database
- Relationships intact
- Conflicts resolved

**STOP & TEST**:
- [ ] Create filter on Device A
- [ ] Push sync on Device A
- [ ] Pull sync on Device B
- [ ] Filter appears on Device B
- [ ] Filter fully functional on Device B

---

### Step 11.4: Handle Filter Deletion Sync
**Goal**: Sync filter deletions across devices.

**Files to modify**:
- `lib/sync/` (sync logic)
- `repositories/filters.js`

**What to implement**:
- Soft delete support (already has deleted_at)
- Push deleted filters to Supabase
- Pull deletions and remove locally
- Cascade delete relationships

**Success criteria**:
- Deleted filters sync to Supabase
- Deleted filters removed on pull sync
- No orphaned data

**STOP & TEST**:
- [ ] Delete filter on Device A
- [ ] Push sync
- [ ] Pull sync on Device B
- [ ] Filter removed from Device B
- [ ] No broken references

---

## Completion Checklist

After completing all stages, verify:

### Core Functionality
- [ ] Can create filters with tags and/or projects
- [ ] Can edit filters (change name, tags, projects)
- [ ] Can delete filters
- [ ] Filters appear in sidebar alongside projects
- [ ] Filter views show correct filtered tasks
- [ ] Tasks update in real-time
- [ ] Completed tasks never show in filters

### UI/UX
- [ ] Filters visually distinct from projects
- [ ] Empty states are helpful
- [ ] Loading states show during operations
- [ ] Errors display with clear messages
- [ ] Navigation works smoothly
- [ ] Modal validation prevents invalid filters

### Data Integrity
- [ ] Filter-tag relationships work
- [ ] Filter-project relationships work
- [ ] OR logic implemented correctly
- [ ] Deleting tags/projects doesn't break filters
- [ ] No orphaned data

### Sync (if implemented)
- [ ] Filters sync to Supabase
- [ ] Filters pull from Supabase
- [ ] Edits sync correctly
- [ ] Deletions sync correctly
- [ ] Multi-device support works

### Edge Cases
- [ ] Filter with no criteria handled
- [ ] Filter with no matching tasks shows empty state
- [ ] Deleting filter while viewing it navigates away
- [ ] Creating duplicate filter names (decide: allow or prevent?)
- [ ] Very long filter names handled

---

## Testing Strategy for Each Step

### Before implementing a step:
1. ✅ Read the step completely
2. ✅ Understand what you're building
3. ✅ Know what success looks like

### While implementing:
1. ⚙️ Write code for that step ONLY
2. ⚙️ Don't add extra features
3. ⚙️ Keep it simple

### After implementing:
1. 🧪 Test the success criteria
2. 🧪 Verify no regressions
3. 🧪 Check console for errors
4. ⏸️ STOP - Ask: "Should I continue or wait for feedback?"

---

## Emergency Rollback Plan

If a step breaks something:

1. **Identify**: What broke?
2. **Revert**: Undo changes for that step
3. **Diagnose**: Why did it break?
4. **Fix**: Address the root cause
5. **Re-test**: Verify the fix
6. **Continue**: Move to next step

---

## Estimated Timeline

- **Stage 1-2** (Database + Repository): 1-2 hours
- **Stage 3** (Task Filtering): 30 minutes
- **Stage 4** (Hooks): 30 minutes
- **Stage 5** (Modal UI): 1-2 hours
- **Stage 6** (Sidebar Display): 1 hour
- **Stage 7** (Filter View): 1-2 hours
- **Stage 8** (Edit): 1 hour
- **Stage 9** (Polish): 1-2 hours
- **Stage 10** (Icons/Colors): 1 hour (optional)
- **Stage 11** (Sync): 2-3 hours

**Total MVP (Stages 1-9)**: ~8-12 hours of implementation
**With Sync (Stage 11)**: +2-3 hours

---

## Notes for AI Implementation

**When implementing**:
- Implement ONE step at a time
- Don't move to the next step automatically
- After each step, STOP and present what was done
- Wait for user confirmation before continuing
- If unsure, ask questions
- Prefer smaller changes over larger ones
- Test success criteria before moving on

**Communication pattern**:
```
1. "I've completed Step X.X: [name]"
2. Show what was changed
3. List success criteria to test
4. Ask: "Should I continue to the next step or would you like to test this first?"
```

This ensures we catch issues early and don't build on broken foundations!


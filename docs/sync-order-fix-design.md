# Sync Order Fix Design Document

## Problem Statement

The `handleUpdateConflicts()` function in `lib/sync/updatesync.js` is experiencing foreign key constraint violations when syncing tasks to Supabase. The error occurs because tasks are being synced **before** sections, but tasks have a foreign key dependency on sections (`tasks.section_id` references `sections.id`).

### Current Error
```
Error Code: 23503
Message: "insert or update on table \"tasks\" violates foreign key constraint \"tasks_section_id_fkey\""
Details: "Key is not present in table \"sections\"."
```

### Root Cause
When a task with `section_id: 2` tries to sync, if section 2 is also pending sync locally but hasn't been synced to Supabase yet, the task sync fails because the foreign key constraint requires the section to exist in Supabase first.

## Database Dependency Graph

Based on the schema analysis in `lib/database.js`, the foreign key dependencies are:

```
projects (no dependencies)
  ↓
sections (depends on: projects via project_id)
  ↓
tasks (depends on: projects via project_id, sections via section_id)
  ↓
task_tags (depends on: tasks and tags)

tags (no dependencies - independent)
```

### Dependency Details

1. **projects** - Root table, no foreign key dependencies
2. **sections** - Foreign key: `project_id` → `projects(id)`
3. **tasks** - Foreign keys: 
   - `project_id` → `projects(id)` (required)
   - `section_id` → `sections(id)` (optional, nullable)
4. **tags** - Independent table, no foreign key dependencies
5. **task_tags** - Foreign keys: `task_id` → `tasks(id)`, `tag_id` → `tags(id)`

## Current Implementation

### Current Sync Order in `handleUpdateConflicts()`
```javascript
1. Projects    ✓ (correct - no dependencies)
2. Tasks       ✗ (WRONG - depends on sections)
3. Tags        ✓ (correct - no dependencies)
4. Sections    ✗ (WRONG - should come before tasks)
```

### Current Code (lines 20-30)
```javascript
// Handle projects updates
await handleTableUpdates(db, 'projects');

// Handle tasks updates
await handleTableUpdates(db, 'tasks');  // ❌ Too early!

// Handle tags updates
await handleTableUpdates(db, 'tags');

// Handle sections updates
await handleTableUpdates(db, 'sections');  // ❌ Too late!
```

## Proposed Solution

### Correct Sync Order

The sync order must respect foreign key dependencies. The correct order is:

```
1. Projects    (no dependencies)
2. Sections   (depends on projects - already synced)
3. Tags        (no dependencies - can sync anytime after projects)
4. Tasks       (depends on projects and sections - both already synced)
```

**Note:** `task_tags` is not currently handled in `handleUpdateConflicts()`, so it's not included in this fix.

### Implementation Changes

#### Change 1: Reorder Table Syncs
Move sections sync to occur **before** tasks sync.

**Before:**
```javascript
await handleTableUpdates(db, 'projects');
await handleTableUpdates(db, 'tasks');      // ❌
await handleTableUpdates(db, 'tags');
await handleTableUpdates(db, 'sections');    // ❌
```

**After:**
```javascript
await handleTableUpdates(db, 'projects');
await handleTableUpdates(db, 'sections');    // ✅ Now before tasks
await handleTableUpdates(db, 'tags');
await handleTableUpdates(db, 'tasks');       // ✅ Now after sections
```

#### Change 2: Update Function Documentation
Update the JSDoc comment to reflect that sections are now handled.

**Before:**
```javascript
/**
 * Handle update conflicts and sync updates from local SQLite to Supabase
 * @description
 *  - Only runs one-way (local → Supabase)
 *  - Uses updated_at to resolve conflicts ("latest wins")
 *  - Updates remotely only if local version is newer or equal
 *  - Handles projects, tasks, and tags
 */
```

**After:**
```javascript
/**
 * Handle update conflicts and sync updates from local SQLite to Supabase
 * @description
 *  - Only runs one-way (local → Supabase)
 *  - Uses updated_at to resolve conflicts ("latest wins")
 *  - Updates remotely only if local version is newer or equal
 *  - Handles projects, sections, tags, and tasks (in dependency order)
 *  - Sync order: projects → sections → tags → tasks (respects FK constraints)
 */
```

## Why This Solution Works

1. **Respects Foreign Key Dependencies**: Sections are synced before tasks, ensuring that when a task with `section_id` syncs, the referenced section already exists in Supabase.

2. **Minimal Change**: Only reordering existing code, no new logic required.

3. **Safe**: Projects are still synced first (as they should be), and tags can sync anytime since they have no dependencies.

4. **Backward Compatible**: No breaking changes to function signatures or data structures.

## Edge Cases Handled

1. **Section doesn't exist in Supabase**: If a section is pending sync locally, it will be synced before any tasks that reference it, preventing the foreign key error.

2. **Task with null section_id**: Tasks with `section_id = null` will continue to work as before, since the foreign key constraint allows null values.

3. **Section sync fails**: If a section sync fails, any dependent tasks will also fail (which is correct behavior - we shouldn't sync tasks with invalid section references).

4. **No pending sections**: If there are no pending sections, the function will simply skip to the next table (tags), then tasks.

## Testing Considerations

After implementation, verify:

1. ✅ Tasks with `section_id` can sync successfully when the section exists in Supabase
2. ✅ Tasks with `section_id` can sync successfully when the section is also pending sync (section syncs first)
3. ✅ Tasks with `section_id = null` continue to work
4. ✅ Tasks with invalid `section_id` (section doesn't exist) still fail appropriately (expected behavior)
5. ✅ Projects, tags, and other tables continue to sync normally

## Implementation Impact

### Files to Modify
- `lib/sync/updatesync.js` (lines 20-30 and JSDoc comment)

### Risk Level
**Low** - This is a simple reordering of existing code with no logic changes.

### Rollback Plan
If issues arise, simply revert the order back to the original. The change is isolated to a single function.

## Alternative Solutions Considered

### Alternative 1: Validate Foreign Keys Before Sync
**Approach**: Check if referenced sections exist in Supabase before syncing tasks.

**Rejected Because**:
- Adds complexity and additional Supabase queries
- Doesn't solve the root cause (ordering issue)
- Performance impact (extra queries for each task)

### Alternative 2: Two-Pass Sync
**Approach**: First pass syncs all sections, second pass syncs tasks.

**Rejected Because**:
- More complex than needed
- The simple reordering achieves the same result

### Alternative 3: Skip Tasks with Missing Sections
**Approach**: If a section doesn't exist, skip the task sync.

**Rejected Because**:
- Hides data integrity issues
- Tasks would remain unsynced indefinitely
- Not a proper solution to the ordering problem

## Conclusion

The simplest and most effective solution is to reorder the table syncs in `handleUpdateConflicts()` to respect foreign key dependencies. This ensures that sections are synced before tasks, preventing foreign key constraint violations while maintaining all existing functionality.

---

**Document Version**: 1.0  
**Date**: 2025-01-19  
**Status**: Ready for Implementation Review


# Tag Delete Function Design Document

## Overview
This document outlines the design for implementing the tag deletion functionality in the application. The backend infrastructure already exists, but the UI integration needs to be completed.

## Current State

### ✅ Already Implemented

1. **Backend Repository** (`repositories/tags.js`)
   - `deleteTag(id)` function exists
   - Performs soft delete (sets `deleted_at` timestamp)
   - Sets `sync_status` to `'pending_delete'`
   - Hard deletes `task_tags` relationships (junction table cleanup)
   - Returns error if tag not found

2. **React Hook** (`hooks/use-tags.ts`)
   - `useDeleteTag()` hook exists
   - Uses React Query mutation
   - Invalidates `['tags']` query on success
   - Handles async operations

3. **Sync Infrastructure** (`lib/sync/@deletesync.js`)
   - `handleDeleteConflicts()` handles tag deletions
   - Syncs soft-deleted tags to Supabase
   - Uses "latest wins" conflict resolution
   - Marks as synced after successful remote deletion

4. **UI Structure** (`app/tags.js`)
   - Delete button exists in tag options modal (lines 114-128)
   - Modal structure is in place
   - Currently no functionality wired to the button

### ❌ Missing Implementation

1. **UI Integration**
   - Delete button in `app/tags.js` doesn't call delete function
   - No confirmation dialog before deletion
   - No loading state during deletion
   - No error handling/feedback to user

2. **User Experience**
   - No confirmation prompt
   - No success/error feedback
   - No handling of edge cases (e.g., tag in use)

## Design Requirements

### 1. User Flow

```
User clicks ellipsis (⋯) on tag item
  ↓
Tag options modal opens
  ↓
User clicks "Delete tag" option
  ↓
Confirmation dialog appears
  ↓
User confirms deletion
  ↓
Tag is soft-deleted
  ↓
Tag disappears from list
  ↓
Success feedback (optional)
```

### 2. UI Components

#### 2.1 Confirmation Dialog
- **Purpose**: Prevent accidental deletions
- **Content**:
  - Title: "Delete Tag"
  - Message: "Are you sure you want to delete '{tagName}'? This will remove the tag from all tasks."
  - Actions:
    - Cancel (default)
    - Delete (destructive style)
- **Implementation**: Use React Native `Alert.alert()` (consistent with project deletion pattern)

#### 2.2 Loading State
- Show loading indicator during deletion
- Disable delete button while processing
- Optional: Show "Deleting..." text

#### 2.3 Error Handling
- Display error alert if deletion fails
- Revert UI state on error
- Log error to console for debugging

#### 2.4 Success Feedback
- Tag automatically disappears from list (via query invalidation)
- Optional: Show brief success message
- Close modal after successful deletion

### 3. Technical Implementation

#### 3.1 File: `app/tags.js`

**Changes needed:**
1. Import `useDeleteTag` hook
2. Import `Alert` from React Native
3. Create handler function `handleDeleteTag`
4. Wire handler to delete button
5. Add loading state management
6. Add error handling

**Code structure:**
```javascript
const deleteTagMutation = useDeleteTag();

const handleDeleteTag = () => {
  if (!selectedTag) return;
  
  Alert.alert(
    'Delete Tag',
    `Are you sure you want to delete "${selectedTag.name}"? This will remove the tag from all tasks.`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTagMutation.mutateAsync(selectedTag.id);
            closeTagOptions(); // Close modal on success
            // Optional: Show success message
          } catch (error) {
            Alert.alert('Error', 'Failed to delete tag');
            console.error('Error deleting tag:', error);
          }
        },
      },
    ]
  );
};
```

#### 3.2 Loading State
- Use `deleteTagMutation.isPending` to show loading state
- Disable delete button during mutation
- Show loading indicator in modal

#### 3.3 Query Invalidation
- Already handled by `useDeleteTag` hook
- Automatically refreshes tag list after deletion

### 4. Edge Cases & Considerations

#### 4.1 Tag in Use
- **Current behavior**: `deleteTag` automatically removes tag from all tasks (hard deletes `task_tags` relationships)
- **User impact**: Tag disappears from all tasks immediately
- **Consideration**: This is expected behavior, but should be communicated in confirmation message

#### 4.2 Concurrent Deletions
- React Query handles this automatically
- Multiple rapid clicks should be prevented by loading state

#### 4.3 Network/Sync Issues
- Local deletion happens immediately
- Sync to Supabase happens asynchronously via `@deletesync.js`
- User doesn't need to wait for sync completion
- If sync fails, it will retry on next sync operation

#### 4.4 Tag Not Found
- Repository function throws error if tag not found
- Should be caught and displayed to user
- Rare edge case (tag deleted by another device during sync)

### 5. Sync Behavior

#### 5.1 Local Deletion
- Immediate soft delete
- Sets `deleted_at` timestamp
- Sets `sync_status` to `'pending_delete'`

#### 5.2 Remote Sync
- Handled by `handleDeleteConflicts()` in `@deletesync.js`
- Deletes tag from Supabase
- Removes tag permanently from local DB after successful sync
- Uses conflict resolution (latest wins)

#### 5.3 Pull Sync
- If tag deleted on another device, pull sync will handle it
- Tag will be removed from local list automatically

### 6. Testing Considerations

1. **Happy Path**
   - Delete tag successfully
   - Verify tag disappears from list
   - Verify tag removed from tasks

2. **Error Cases**
   - Handle network errors gracefully
   - Handle tag not found error
   - Verify UI state reverts on error

3. **Edge Cases**
   - Delete tag that's in use by multiple tasks
   - Rapid successive delete attempts
   - Delete during sync operation

4. **Sync Testing**
   - Verify deletion syncs to Supabase
   - Verify deletion pulled from other devices
   - Test conflict resolution

## Implementation Checklist

- [ ] Import `useDeleteTag` hook in `app/tags.js`
- [ ] Import `Alert` from React Native
- [ ] Create `handleDeleteTag` function with confirmation dialog
- [ ] Wire delete button to handler
- [ ] Add loading state to delete button
- [ ] Add error handling with user feedback
- [ ] Test deletion flow
- [ ] Test error scenarios
- [ ] Verify sync behavior
- [ ] Test with tags in use

## Future Enhancements (Optional)

1. **Bulk Delete**: Allow selecting multiple tags for deletion
2. **Undo Functionality**: Allow undoing deletion within short time window
3. **Tag Usage Count**: Show how many tasks use the tag before deletion
4. **Archive Instead of Delete**: Soft delete with option to restore
5. **Delete Confirmation with Task List**: Show which tasks will be affected

## Related Files

- `repositories/tags.js` - Backend delete function
- `hooks/use-tags.ts` - React hook for deletion
- `app/tags.js` - UI component (needs implementation)
- `lib/sync/@deletesync.js` - Sync handler
- `lib/sync/syncpull/tags.js` - Pull sync handler

## Notes

- Follows same pattern as project deletion (`hooks/useProjectOptions.ts`)
- Uses soft delete pattern consistent with tasks and projects
- Sync is handled automatically by existing infrastructure
- No additional backend changes needed


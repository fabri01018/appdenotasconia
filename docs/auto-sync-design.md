# Auto-Sync System Design

## Overview

Automatic synchronization system that keeps local and remote data in sync without manual user intervention.

---

## Sync Strategy

### Trigger Mechanism

| Trigger | Interval | Purpose |
|---------|----------|---------|
| **Periodic Sync** | Every 4 minutes | Regular background sync while app is active |

---

## Periodic Sync (4-Minute Interval)

### Concept
- Timer runs in background while app is active
- Every 4 minutes, push any pending local changes to Supabase
- Only syncs if there are actual changes (dirty check)

### Behavior
1. App starts → Start 4-minute timer
2. Timer fires → Check for local changes
3. If changes exist → Push to remote
4. Reset timer → Wait another 4 minutes
5. Repeat while app is running

### Considerations
- Timer should pause if app is minimized/backgrounded (optional)
- Skip sync if no changes detected (avoid empty API calls)
- Show subtle indicator during sync (non-intrusive)
- Handle sync failures gracefully (retry on next interval)

---

## What Gets Synced

Based on current system:
- Projects
- Tasks
- Tags
- Sections
- Notes (if applicable)

### Sync Order
Maintain existing dependency order to avoid foreign key issues.

---

## User Experience

### During Normal Use
- Sync happens silently in background
- No user action required
- Optional: Small indicator showing last sync time

### On Sync Failure
- Don't interrupt user workflow
- Log failures for debugging
- Retry on next interval

---

## Configuration (Future)

Potential settings for later:
- [ ] Adjust sync interval (default: 4 minutes)
- [ ] Enable/disable auto-sync
- [ ] Sync on app open (pull)
- [ ] Show/hide sync notifications

---

## Technical Notes

### Timer Management
- Single timer instance (avoid multiple timers)
- Clear timer on app close
- Handle app lifecycle (pause/resume)

### Change Detection
- Track "dirty" state for each entity type
- Only sync entities with changes
- Reset dirty flags after successful sync

### Conflict Handling
- Use existing conflict resolution logic
- Periodic sync reduces conflict window (changes pushed regularly)

---

## Out of Scope (For Now)

- Real-time sync via WebSockets
- Debounced sync on every change
- Offline queue system
- Sync on navigation/focus loss
- Sync on app close
- Pull sync automation

---

## Success Criteria

1. Changes auto-sync every 4 minutes without user action
2. Minimal performance impact
3. Clear feedback when sync is happening
4. Graceful handling of network failures

---

## Open Questions

1. Should periodic timer pause when app is minimized?
2. Should we show a toast/notification after each periodic sync?
3. What visual indicator for sync status?

---

## Next Steps

1. Review and finalize design decisions
2. Create implementation plan
3. Implement periodic sync timer
4. Add sync status indicators
5. Test edge cases (offline, slow network, etc.)

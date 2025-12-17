# Supabase Sync Guide

Complete guide to syncing your ProductionAI CLI with Supabase.

## What is Sync?

Sync keeps your local SQLite database (on your computer) in sync with Supabase (in the cloud). This enables:

- **Cloud Backup**: Your tasks are safely stored in the cloud
- **Cross-Device**: Access the same tasks on multiple devices
- **Mobile Integration**: Sync with the ProductionAI mobile app
- **Collaboration**: Share projects with team members (future feature)

## How Sync Works

### Push (Local → Supabase)

When you run `prod sync --push`, the CLI:
1. Finds all local changes (tasks marked as `sync_status = 'pending'`)
2. Uploads them to Supabase
3. Marks them as synced locally

### Pull (Supabase → Local)

When you run `prod sync --pull`, the CLI:
1. Checks the last sync timestamp for each table
2. Downloads newer records from Supabase
3. Updates your local database

### Full Sync (Default)

`prod sync` does both: push first, then pull. This is the safest option.

## Setup Instructions

See **ENV_SETUP.md** for detailed setup instructions.

Quick version:

1. Create `.env` file
2. Add your Supabase credentials
3. Run `prod sync`

## Sync Strategies

### 1. Manual Sync (Recommended)

Run sync when you want to:

```bash
# After working on tasks
prod add "Complete the report"
prod add "Review pull requests"
prod sync  # Push to cloud
```

### 2. Session-Based Sync

Sync at the start and end of your work session:

```bash
# Morning
prod sync --pull   # Get latest from cloud

# ... work on tasks ...

# Evening
prod sync --push   # Backup to cloud
```

### 3. Full Sync

When in doubt, run a full sync:

```bash
prod sync  # Does both push and pull
```

## What Gets Synced

| Entity | Synced? | Notes |
|--------|---------|-------|
| Projects | ✅ | Including default_section_id |
| Sections | ✅ | Kanban columns |
| Tasks | ✅ | Including all blocks in description |
| Tags | ✅ | - |
| Task-Tag relationships | ✅ | - |
| Completed status | ✅ | - |
| Deletions | ✅ | Soft deletes synced to Supabase |

## Conflict Resolution

### Current Strategy: "Last Write Wins"

If the same task is edited on two devices:
- The version with the latest `updated_at` timestamp wins
- Older changes are overwritten

### Example:

1. Device A edits Task #1 at 10:00 AM
2. Device B edits Task #1 at 10:05 AM
3. Both sync
4. Device B's version (10:05 AM) is kept
5. Device A's version is overwritten

**Future**: More sophisticated conflict resolution (3-way merge, manual conflict resolution UI).

## Troubleshooting

### Sync is slow

- **Cause**: Large number of tasks
- **Solution**: The first sync takes longer. Subsequent syncs are incremental and fast.

### "Duplicate key" errors

- **Cause**: Same ID exists on both local and remote
- **Solution**: Use `INSERT OR REPLACE` (already implemented)

### Tasks not appearing after sync

1. Check sync status: `prod sync` should show counts
2. Verify timestamps: Check `updated_at` in both databases
3. Check deleted_at: Deleted tasks won't appear

### Lost local changes

- **Prevention**: Always `prod sync --push` before working on another device
- **Recovery**: Check Supabase dashboard for recent records

## Advanced Usage

### Sync Only Specific Tables

Currently, sync is all-or-nothing. To sync specific tables, modify `src/lib/sync/push.js` and `src/lib/sync/pull.js`.

### View Sync Status

```bash
# Check which tasks need syncing (via SQLite)
sqlite3 projects.db "SELECT id, title, sync_status FROM tasks WHERE sync_status = 'pending';"
```

### Force Full Re-sync

To reset and re-sync everything:

```bash
# 1. Backup your database
cp projects.db projects.db.backup

# 2. Pull everything fresh
prod sync --pull

# Note: This overwrites local changes!
```

## Sync Architecture

```
┌─────────────────┐      Push      ┌──────────────┐      Pull      ┌─────────────────┐
│                 │  ─────────────> │              │  <───────────  │                 │
│   Local SQLite  │                 │   Supabase   │                │  Mobile App     │
│   (CLI)         │  <─────────────  │  PostgreSQL  │  ─────────────>│  (React Native) │
│                 │      Pull        │              │      Push      │                 │
└─────────────────┘                 └──────────────┘                └─────────────────┘
```

All clients sync through Supabase as the central source of truth.

## Performance

- **First sync**: Can take 5-10 seconds for 1000+ tasks
- **Incremental sync**: < 2 seconds (only new/changed records)
- **Network**: Requires internet connection

## Security

- Uses Supabase anon key (safe for client apps)
- Row Level Security (RLS) can be enabled in Supabase
- No sensitive data should be stored in task descriptions

## Future Enhancements

- [ ] Auto-sync (watch for file changes)
- [ ] Sync progress indicators
- [ ] Conflict resolution UI
- [ ] Selective sync (by project/tag)
- [ ] Sync statistics dashboard
- [ ] Offline queue (retry failed syncs)

## Questions?

Check the main README.md or ENV_SETUP.md for more information.


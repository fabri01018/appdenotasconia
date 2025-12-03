# Android Block Deletion Analysis

## Problem Description
User reports issues with deleting blocks via backspace on Android (Physical Device, Expo Dev Build).

### Observed Behaviors
1. **Scenario A (First Attempt):** Delete all text -> Cursor stays blinking. Subsequent backspaces do nothing.
   - *Implication:* The system detects the content is empty, but the "trigger" to delete the block (second backspace) is never received or processed.
2. **Scenario B (Retry):** Write text, then delete all text again -> Focus is lost (keyboard closes), but the empty block remains visible.
   - *Implication:* The deletion logic likely *triggers* (causing focus loss), but the block is "resurrected" or the deletion state update is overridden (likely by an `onBlur` save or race condition).

## Technical Context (Android Specifics)
- **`onKeyPress` Limitations:** On Android soft keyboards, `onKeyPress` often does not fire for the Backspace key, especially if the input is empty.
- **`onChangeText` Limitations:** `onChangeText` only fires when the text *changes*. Pressing backspace on an already empty input does not trigger this event.
- **Focus/Blur Cycle:** When a block is deleted, the `TextInput` is unmounted or loses focus. This triggers `onBlur`. If `onBlur` triggers a `save()` using stale state (where the block still exists), it might re-save the block to the database/state, undoing the deletion.

## Investigation Plan

### 1. Verify Event Firing
We need to know exactly which events are firing on Android when Backspace is pressed in an empty input.
- Does `onKeyPress` fire? (Likely no or inconsistent)
- Does `onChangeText` fire? (Likely no)
- Is there another event we can use? (`onSelectionChange` can sometimes be used as a proxy if selection stays at 0, but it's noisy).

### 2. Verify Deletion vs. Resurrection
In Scenario B, focus is lost. This confirms `deleteBlock` is likely called. We need to prove if:
- `deleteBlock` updates the state correctly.
- `onBlur` fires immediately after.
- `handleSave` (called by `onBlur`) saves the *old* blocks list, effectively undoing the delete.

## Proposed Solution Strategy
1. **Fix Event Detection:** If `onKeyPress` is missing, we might need a hacky workaround (e.g., detecting `onSelectionChange` or using a native-module dependent solution if absolutely necessary, but prefer JS-only first). *Correction:* Actually, `onKeyPress` support on Android has improved in newer RN versions, but we need to verify if `Backspce` key code is transmitted.
2. **Fix Race Condition:** Ensure `onBlur` does not save if a deletion is in progress. (We attempted this with `isDeletingRef`, but it might not be working as expected or the timing is off).

## Next Steps
1. Add targeted logging to `BlockItem` (events) and `useBlocks` (logic flow).
2. Analyze logs to confirm if `deleteBlock` is called and if `handleSave` is reverting it.


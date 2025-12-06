# Recursive Subtasks Rendering Design Document

## 1. Problem Description
The current implementation of `ProjectDetailView` only renders one level of subtasks. If a subtask has its own subtasks (grandchildren of the root task), they are not displayed in the UI. 
The data structure (`subTaskMap`) already supports arbitrary nesting (parent-child relationships), but the rendering logic is not recursive. It simply iterates over the direct children of a task and renders their rows, without checking if those children have their own children.

## 2. Constraints & Considerations
- **Recursion**: The rendering function must be recursive to handle arbitrary depths.
- **Indentation**: Visual hierarchy must be maintained. Indentation should increase with each level of nesting.
- **Styling**: 
    - The "connected" look (borders) needs to be maintained across nested levels.
    - "Last item" logic (rounded corners) becomes more complex. The visual "end" of a card might be a deep descendant.
- **Performance**: Recursive rendering in React Native `FlatList` is generally fine for reasonable depths, but we should be mindful of render counts.

## 3. Proposed Solution
We will refactor the `renderTask` function to be recursive.

### Key Changes:
1.  **Recursive Rendering**:
    - Instead of iterating `children` and calling `renderTaskRow`, `renderTask` will iterate `children` and call `renderTask` (itself) recursively.
    
2.  **Level/Depth Parameter**:
    - Update `renderTask` and `renderTaskRow` to accept a `depth` or `level` parameter instead of just `isSubtask`.
    - `isSubtask` can be derived as `depth > 0`.
    - Indentation (padding) will be calculated as `basePadding + (depth * indentPerLevel)`.

3.  **Styling Adjustments**:
    - The `renderTaskRow` styling logic needs to handle the `depth` to apply correct padding.
    - The `isLast` logic needs to be passed down correctly so that the final element in a nested tree closes the visual container (rounded corners) if it's the last visible element of the root group.

### Implementation Plan

1.  **Update `renderTaskRow` Signature**:
    - Replace `isSubtask` boolean with `depth` (number). 
    - Calculate `paddingLeft` dynamically: e.g., `depth * 32 + 16`.

2.  **Update `renderTask` to be Recursive**:
    - Modify the `children.map` loop to call `renderTask` instead of `renderTaskRow`.
    - Pass `depth + 1` to the recursive calls.

3.  **Fix Styling & Borders**:
    - Ensure that intermediate rows in a nested tree don't accidentally close the container (rounded corners) unless they are truly the last visible item.
    - This might require passing an `isLastChild` prop down the recursion tree.

## 4. Technical Details
```javascript
// Pseudo-code structure
const renderTask = (task, index, group, depth = 0) => {
   // ...
   return (
     <View>
       {renderTaskRow(task, index, group, depth)}
       {isExpanded && children.map((child, i) => 
          renderTask(child, i, children, depth + 1) // Recursion
       )}
     </View>
   )
}
```

## 5. Verification
- Create a task structure: Root -> Child A -> Grandchild B.
- Verify Child A appears indented.
- Verify Grandchild B appears further indented under Child A.
- Verify expanding/collapsing Child A works independently of Root.


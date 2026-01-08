# Block Types System Design

## Overview

The block system provides a structured way to organize content in task descriptions. Each block has a **type**, **content**, and optional **properties**. Blocks are stored as plain text with special prefixes and parsed into structured objects for rendering.

---

## Architecture

### Storage Format

Blocks are stored in `task.description` as **newline-separated plain text**:
- Each line = one block
- Special prefixes determine block type
- Indentation (2 spaces per level) indicates nesting
- No prefix = regular text block

### Block Object Structure

```javascript
{
  type: string,       // Block type identifier
  content: string,    // Text content
  // Type-specific properties:
  isOpen?: boolean,   // For toggle blocks
  checked?: boolean,  // For check blocks
  level?: number,     // For header blocks
  children?: Block[], // For container blocks (toggle)
}
```

---

## Existing Block Types

| Type | Prefix | Description | Can Have Children |
|------|--------|-------------|-------------------|
| `block` | *(none)* | Plain text paragraph | No |
| `toggle` | `> ` | Collapsible section | Yes |
| `check` | `- [ ]` or `- [x]` | Checkbox item | No |

### Existing Prefix Patterns

```
> Toggle header text          → type: 'toggle'
- [ ] Unchecked item          → type: 'check', checked: false
- [x] Checked item            → type: 'check', checked: true
Plain text here               → type: 'block'
```

---

## New Block Types

### Header Block

**Purpose:** Section titles with visual hierarchy.

| Property | Value |
|----------|-------|
| Type | `header` |
| Prefix | `# `, `## `, `### ` |
| Levels | 1, 2, 3 |
| Can Have Children | No |

**Syntax:**
```
# Header Level 1
## Header Level 2
### Header Level 3
```

**Object Structure:**
```javascript
{
  type: 'header',
  content: 'Header text',
  level: 1  // 1, 2, or 3
}
```

**Visual Styling:**
| Level | Font Size | Font Weight | Margin |
|-------|-----------|-------------|--------|
| 1 | 24px | Bold | 16px top, 8px bottom |
| 2 | 20px | Semi-bold | 12px top, 6px bottom |
| 3 | 17px | Semi-bold | 8px top, 4px bottom |

---

### Bullet Block

**Purpose:** Unordered list items.

| Property | Value |
|----------|-------|
| Type | `bullet` |
| Prefix | `- ` |
| Can Have Children | No |

**Syntax:**
```
- First bullet point
- Second bullet point
- Third bullet point
```

**Object Structure:**
```javascript
{
  type: 'bullet',
  content: 'Bullet text'
}
```

**Visual Styling:**
- Bullet character: `•` (or custom icon)
- Left padding for bullet indicator
- Same font size as regular blocks (16px)

**Parsing Note:** Check blocks (`- [ ]`, `- [x]`) are detected first due to the bracket pattern, so `- text` safely becomes a bullet.

---

## Complete Block Type Reference

| Type | Prefix | Example | Properties |
|------|--------|---------|------------|
| `block` | *(none)* | `Plain text` | content |
| `toggle` | `> ` | `> Section` | content, isOpen, children |
| `check` | `- [ ]` / `- [x]` | `- [x] Done` | content, checked |
| `header` | `# ` / `## ` / `### ` | `## Title` | content, level |
| `bullet` | `- ` | `- Item` | content |

---

## Parsing Rules

### Priority Order

When parsing a line, check prefixes in this order (most specific first):

1. **Check block:** `^-\s*\[([\sx])\]\s*(.*)$` — must have brackets
2. **Header block:** `^(#{1,3})\s+(.+)$`
3. **Toggle block:** `^>\s+(.*)$`
4. **Bullet block:** `^-\s+(.*)$` — after check, so no conflict
5. **Regular block:** Everything else

### Nesting Rules

- Only `toggle` blocks can have children
- Children are determined by indentation (2 spaces = 1 level)
- Headers, bullets, and checks are leaf nodes (no children)

---

## Rendering Guidelines

### BlockItem Component

Each block type should have distinct visual rendering:

```
┌─────────────────────────────────────┐
│ # Header 1                          │  ← Large, bold
├─────────────────────────────────────┤
│ ## Header 2                         │  ← Medium, semi-bold
├─────────────────────────────────────┤
│ Regular text block                  │  ← Normal text
├─────────────────────────────────────┤
│ • Bullet point                      │  ← With bullet indicator (- in edit)
├─────────────────────────────────────┤
│ ☐ Check item                        │  ← With checkbox (- [ ] in edit)
├─────────────────────────────────────┤
│ ▶ Toggle header                     │  ← With chevron icon
│   └── Child content                 │
└─────────────────────────────────────┘
```

### Edit Mode

When editing a block:
- Show the raw prefix in the input
- User can change block type by changing prefix
- Example: typing `# ` at start converts to header

### Color Scheme Support

All block types must support both light and dark themes:
- Text colors from theme
- Icon colors with appropriate opacity
- Hover/press states for interactive elements

---

## Implementation Checklist

### Parser Updates (`lib/blocks-utils.js`)

- [ ] Add header detection regex
- [ ] Add bullet detection regex
- [ ] Update `customTextToJson()` with new block types
- [ ] Update `blocksToDescription()` to serialize new types
- [ ] Maintain backward compatibility with existing descriptions

### Component Updates (`components/blocks/BlockItem.js`)

- [ ] Add rendering for `header` type
- [ ] Add rendering for `bullet` type
- [ ] Add styling constants for each type
- [ ] Update type validation filter

### UI Buttons (Optional)

- [ ] Add "Add Header" button
- [ ] Add "Add Bullet" button
- [ ] Consider dropdown menu for block type selection

---

## Future Block Types (Not in Scope)

These types may be added later:

| Type | Prefix | Description |
|------|--------|-------------|
| `quote` | `" ` or `> >` | Block quote with left border |
| `code` | `` ``` `` | Code block with monospace font |
| `divider` | `---` | Horizontal separator line |
| `callout` | `! ` | Highlighted info/warning box |
| `numbered` | `1. ` | Ordered list items |

---

## Migration & Compatibility

- Existing descriptions remain valid
- Unknown prefixes fall back to `block` type
- Parser is additive (new types don't break old data)

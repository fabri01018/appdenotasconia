# Editing Toolbar Styling Documentation

## Overview

The Editing Toolbar is a fixed bottom bar in the task detail screen that contains two action buttons: a checkbox button and a toggle button. This document explains how its styling system works.

## Component Location

- **File**: `components/task-detail/EditingToolbar.js`
- **Usage**: Rendered at the bottom of the task detail screen (`app/task/[taskId].js`)

## Visual Structure

The toolbar consists of:
1. A container bar (`Animated.View`) that spans the full width at the bottom
2. Two pressable icon buttons:
   - Checkbox button (left) - adds a check block
   - Toggle button (right) - adds a toggle block

## Styling Architecture

### 1. Container Styling (`toolbar`)

The main container uses absolute positioning to stay fixed at the bottom of the screen:

```javascript
toolbar: {
  position: 'absolute',
  left: 0,
  right: 0,
  paddingHorizontal: 8,
  flexDirection: 'row',
  alignItems: 'flex-end',
  justifyContent: 'flex-start',
  gap: 12,
  // Platform-specific shadows
}
```

**Key Properties:**
- **Position**: Absolute positioning ensures the toolbar stays fixed at the bottom
- **Layout**: `flexDirection: 'row'` arranges buttons horizontally
- **Alignment**: `alignItems: 'flex-end'` aligns buttons to the bottom of the container
- **Spacing**: `gap: 12` provides spacing between buttons
- **Padding**: `paddingHorizontal: 8` adds horizontal padding

### 2. Dynamic Background & Border

The background and border colors adapt to the color scheme:

```javascript
backgroundColor: colorScheme === 'dark'
  ? '#151718'  // Dark mode: very dark gray
  : '#fff',    // Light mode: white

borderTopColor: colorScheme === 'dark'
  ? 'rgba(255, 255, 255, 0.1)'  // Dark mode: subtle white border
  : 'rgba(0, 0, 0, 0.1)',       // Light mode: subtle black border
```

**Color Scheme Logic:**
- Uses `useColorScheme()` hook to detect system theme
- Dark mode: Dark background (`#151718`) with subtle white border
- Light mode: White background with subtle black border

### 3. Platform-Specific Shadows

The toolbar uses platform-specific shadow implementations:

**iOS:**
```javascript
shadowColor: '#000',
shadowOffset: { width: 0, height: -2 },
shadowOpacity: 0.1,
shadowRadius: 4,
```
- Creates a subtle upward shadow (negative height offset)
- Low opacity (0.1) for a subtle effect

**Android:**
```javascript
elevation: 8,
```
- Uses Material Design elevation system
- Higher elevation value (8) for more pronounced shadow

### 4. Dynamic Positioning & Height

The toolbar's position and height are dynamically calculated:

```javascript
bottom: bottomPosition,  // Animated value
height: TOOLBAR_HEIGHT + safeAreaPadding,
paddingBottom: safeAreaPadding,
```

**Constants:**
- `TOOLBAR_HEIGHT = 32` - Base height of the toolbar
- `ICON_CONTAINER = 40` - Size of each button container
- `ICON_SIZE = 25` - Size of the icons inside buttons

**Safe Area Handling:**
- `safeAreaPadding = Math.max(insets.bottom, 2)` - Ensures minimum 2px padding, uses device safe area insets
- Total height = `32 + safeAreaPadding` to accommodate safe area (notches, home indicators)

### 5. Keyboard-Aware Animation

The toolbar animates when the keyboard appears/disappears:

**Animation Logic:**
- Uses `Animated.Value` for smooth transitions
- Listens to keyboard show/hide events
- Animates `bottom` position to move above keyboard

**Keyboard Show:**
```javascript
bottom: keyboardHeight + insets.bottom
```

**Keyboard Hide:**
```javascript
bottom: insets.bottom
```

**Animation Duration:**
- iOS: Uses keyboard animation duration (from event) or defaults to 250ms
- Android: Fixed 250ms duration

### 6. Icon Button Styling

Each button uses a function-based style that accepts a size parameter:

```javascript
iconButton: (size) => ({
  width: size,              // 40px
  height: size,             // 40px
  borderRadius: 4,          // Slightly rounded corners
  alignItems: 'center',     // Center icon horizontally
  justifyContent: 'center', // Center icon vertically
  borderWidth: 0,          // No border
  backgroundColor: 'transparent',
  marginBottom: -30,        // Negative margin to align with toolbar bottom
})
```

**Key Styling Details:**
- **Size**: 40x40px containers (larger than 25px icons for better touch targets)
- **Alignment**: Icons are centered within their containers
- **Negative Margin**: `marginBottom: -30` pulls buttons down to align with the toolbar's visual bottom edge
- **Transparent Background**: No background color, only the icon is visible

### 7. Pressed State

Buttons have a pressed state that reduces opacity:

```javascript
iconButtonPressed: {
  opacity: 0.6,
}
```

**Implementation:**
- Uses `Pressable` component's `style` prop with function syntax
- Applies `iconButtonPressed` style when `pressed` is true
- Provides visual feedback when button is tapped

### 8. Icon Styling

Icons use dynamic colors based on color scheme:

```javascript
const iconColor = colorScheme === 'dark' ? '#fff' : '#000';
```

**Icons Used:**
- Checkbox: `checkbox-outline` (Ionicons)
- Toggle: `chevron-down` (Ionicons)
- Both use size `25` and the dynamic `iconColor`

## Layout Flow

1. **Container** (`Animated.View`)
   - Positioned absolutely at bottom
   - Contains background, border, and shadow
   - Height adjusts for safe area

2. **Buttons** (`Pressable` components)
   - Arranged horizontally with gap spacing
   - Aligned to bottom of container
   - Each button is 40x40px with centered 25px icon

3. **Visual Hierarchy**
   - Buttons appear to "float" above the toolbar background
   - Negative margin creates visual alignment with toolbar edge
   - Icons are the primary visual elements

## Responsive Behavior

### Safe Area Insets
- Automatically adjusts for device notches and home indicators
- Uses `useSafeAreaInsets()` hook from `react-native-safe-area-context`
- Ensures buttons are always accessible above system UI

### Keyboard Interaction
- Smoothly animates above keyboard when it appears
- Returns to bottom position when keyboard hides
- Maintains proper spacing from keyboard

### Platform Differences
- **iOS**: Uses native shadow properties with subtle upward shadow
- **Android**: Uses Material Design elevation for shadow effect
- Both platforms maintain consistent visual appearance

## Color Scheme Support

The toolbar fully supports both light and dark modes:

| Element | Light Mode | Dark Mode |
|---------|-----------|-----------|
| Background | `#fff` (white) | `#151718` (dark gray) |
| Border | `rgba(0, 0, 0, 0.1)` | `rgba(255, 255, 255, 0.1)` |
| Icons | `#000` (black) | `#fff` (white) |

## Accessibility Considerations

- **Touch Targets**: 40x40px buttons exceed minimum 44x44px recommendation (could be improved)
- **Visual Feedback**: Pressed state provides clear interaction feedback
- **Color Contrast**: Icons maintain good contrast in both color schemes
- **Safe Area**: Properly handles device safe areas for accessibility

## Summary

The Editing Toolbar uses a combination of:
- Absolute positioning for fixed placement
- Animated values for smooth keyboard interactions
- Platform-specific shadows for depth
- Dynamic theming for color scheme support
- Safe area insets for device compatibility
- Function-based styles for reusable button sizing

The styling creates a clean, minimal toolbar that stays accessible above the keyboard while maintaining visual consistency across platforms and themes.


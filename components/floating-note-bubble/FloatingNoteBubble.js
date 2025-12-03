import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFloatingNote } from '@/hooks/useFloatingNote';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Animated, Dimensions, PanResponder, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from './floating-note-bubble-styles';
import FloatingNoteBubbleContent from './FloatingNoteBubbleContent';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function FloatingNoteBubble() {
  const {
    isVisible,
    taskId,
    taskData,
    position,
    hideFloatingNote,
    deleteFloatingNote,
    updatePosition,
  } = useFloatingNote();
  
  const colorScheme = useColorScheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  
  // Pan animation value (holds absolute position: x, y)
  const pan = useRef(new Animated.ValueXY()).current;
  
  // Local state for toggle/check interactions
  const [localBlocks, setLocalBlocks] = useState(taskData?.blocks || []);
  
  // State for expanded/collapsed bubble
  const [isExpanded, setIsExpanded] = useState(false);

  // Track if we're dragging in collapsed state to prevent tap
  const [wasDragging, setWasDragging] = useState(false);

  // Update local blocks when taskData changes
  React.useEffect(() => {
    if (taskData?.blocks) {
      setLocalBlocks(taskData.blocks);
    }
  }, [taskData]);

  // Calculate default position (bottom-right with safe area)
  const getDefaultPosition = (expanded = false) => {
    // For collapsed bubble, use smaller size
    const bubbleWidth = expanded ? 280 : 60;
    const bubbleHeight = expanded ? 400 : 60;
    const defaultX = SCREEN_WIDTH - bubbleWidth - 20 - insets.right;
    const defaultY = SCREEN_HEIGHT - bubbleHeight - 20 - insets.bottom;
    return {
      x: position.x !== null && position.x !== undefined ? position.x : defaultX,
      y: position.y !== null && position.y !== undefined ? position.y : defaultY,
    };
  };

  // Sync pan value with context position or default
  React.useEffect(() => {
    const defaultPos = getDefaultPosition(isExpanded);
    // If context has position, use it, otherwise use default
    const startX = position.x !== null && position.x !== undefined ? position.x : defaultPos.x;
    const startY = position.y !== null && position.y !== undefined ? position.y : defaultPos.y;
    
    pan.setValue({ x: startX, y: startY });
  }, [position.x, position.y, isVisible, isExpanded]); // Re-run if visibility or expanded state changes to reset position logic if needed

  // Helper to get current pan value synchronously
  const getCurrentPan = () => {
    // @ts-ignore
    const x = pan.x._value;
    // @ts-ignore
    const y = pan.y._value;
    return { x, y };
  };

  // Pan responder for dragging
  const createPanResponder = (isCollapsed) => PanResponder.create({
    onStartShouldSetPanResponder: () => false, // Let tap work
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      const hasMovement = Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      if (!hasMovement) return false;
      
      if (!isCollapsed) {
        // In expanded state, only drag from header? 
        // Current logic: drag from content. 
        // Keeping existing logic: drag from content except header (reversed in original code?)
        // Original code: "Don't capture if in header area" -> meaning drag content to move?
        // Wait, original code: "Don't capture if in header area" for expanded.
        // Let's stick to the original behavior but optimized.
        
        const { locationY } = evt.nativeEvent;
        // Don't capture if in header area (where close/collapse buttons are)
        // Header height is approx 45-50. 
        if (locationY < 60) {
          return false;
        }
      } else {
        setWasDragging(true);
      }
      return true;
    },
    onPanResponderGrant: () => {
      pan.extractOffset();
    },
    onPanResponderMove: Animated.event(
      [null, { dx: pan.x, dy: pan.y }],
      { useNativeDriver: false }
    ),
    onPanResponderRelease: (evt, gestureState) => {
      pan.flattenOffset();
      
      // Boundary checks
      const { x, y } = getCurrentPan();
      const bubbleWidth = isCollapsed ? 60 : 280;
      const bubbleHeight = isCollapsed ? 60 : 400;
      
      const newX = Math.max(
        10,
        Math.min(
          SCREEN_WIDTH - bubbleWidth - 10,
          x
        )
      );
      const newY = Math.max(
        insets.top + 10,
        Math.min(
          SCREEN_HEIGHT - bubbleHeight - insets.bottom - 10,
          y
        )
      );

      // Animate to bounded position if needed
      if (newX !== x || newY !== y) {
        Animated.spring(pan, {
          toValue: { x: newX, y: newY },
          useNativeDriver: false,
          friction: 7,
          tension: 40
        }).start();
      }
      
      // Update context
      updatePosition({ x: newX, y: newY });
      setWasDragging(false); // Reset after release
    },
  });

  const panResponder = useRef(createPanResponder(false)).current;
  const collapsedPanResponder = useRef(createPanResponder(true)).current;

  // Show/hide animations
  React.useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: false,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 150,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [isVisible]);

  // Handle toggle block expand/collapse
  const handleToggleBlock = (path) => {
    const pathArray = Array.isArray(path) ? path : [path];
    const newBlocks = [...localBlocks];
    
    const updateBlock = (blocks, [currentIndex, ...rest]) => {
      if (rest.length === 0) {
        if (blocks[currentIndex]) {
          blocks[currentIndex] = {
            ...blocks[currentIndex],
            isOpen: !blocks[currentIndex].isOpen,
          };
        }
      } else {
        if (blocks[currentIndex]?.children) {
          updateBlock(blocks[currentIndex].children, rest);
        }
      }
    };
    
    updateBlock(newBlocks, pathArray);
    setLocalBlocks(newBlocks);
  };

  // Handle check toggle
  const handleCheckToggle = (path) => {
    const pathArray = Array.isArray(path) ? path : [path];
    const newBlocks = [...localBlocks];
    
    const updateBlock = (blocks, [currentIndex, ...rest]) => {
      if (rest.length === 0) {
        if (blocks[currentIndex]) {
          blocks[currentIndex] = {
            ...blocks[currentIndex],
            checked: !blocks[currentIndex].checked,
          };
        }
      } else {
        if (blocks[currentIndex]?.children) {
          updateBlock(blocks[currentIndex].children, rest);
        }
      }
    };
    
    updateBlock(newBlocks, pathArray);
    setLocalBlocks(newBlocks);
  };

  // Handle tap to expand/collapse or open task detail
  const handleTap = () => {
    if (!isExpanded) {
      // Expand the bubble
      const { x, y } = getCurrentPan();
      const expandedWidth = 280;
      const expandedHeight = 400;
      
      // Adjust position if expanding would push it off screen
      let newX = x;
      let newY = y;
      
      if (x + expandedWidth > SCREEN_WIDTH - 10) {
        newX = SCREEN_WIDTH - expandedWidth - 10 - insets.right;
      }
      if (newX < 10) newX = 10;
      
      if (y + expandedHeight > SCREEN_HEIGHT - insets.bottom - 10) {
        newY = SCREEN_HEIGHT - expandedHeight - insets.bottom - 10;
      }
      if (newY < insets.top + 10) newY = insets.top + 10;
      
      // Animate to new position if needed
      if (newX !== x || newY !== y) {
        pan.setValue({ x: newX, y: newY });
        updatePosition({ x: newX, y: newY });
      }
      
      setIsExpanded(true);
    } else {
      if (taskId) {
        router.push(`/task/${taskId}`);
      }
    }
  };
  
  // Handle collapse button
  const handleCollapse = () => {
    const { x, y } = getCurrentPan();
    const collapsedWidth = 60;
    const collapsedHeight = 60;
    
    // Center collapsed bubble on the expanded bubble's center
    const expandedCenterX = x + 140;
    const expandedCenterY = y + 200;
    
    let newX = expandedCenterX - collapsedWidth / 2;
    let newY = expandedCenterY - collapsedHeight / 2;
    
    newX = Math.max(10, Math.min(SCREEN_WIDTH - collapsedWidth - 10 - insets.right, newX));
    newY = Math.max(insets.top + 10, Math.min(SCREEN_HEIGHT - collapsedHeight - insets.bottom - 10, newY));
    
    pan.setValue({ x: newX, y: newY });
    updatePosition({ x: newX, y: newY });
    
    setIsExpanded(false);
  };

  const handleClosePress = () => {
    deleteFloatingNote();
  };

  const handleCollapsedTap = () => {
    if (!wasDragging) {
      handleTap();
    }
    setWasDragging(false);
  };

  if (!isVisible || !taskData) {
    return null;
  }

  const animatedStyle = {
    opacity: fadeAnim,
    transform: [
      { scale: scaleAnim },
      { translateX: pan.x }, // Use translateX/Y driven by the Animated.ValueXY
      { translateY: pan.y }
    ],
    top: 0, // Reset top/left because we use transform
    left: 0, 
  };

  const containerStyle = [
    isExpanded ? styles.bubbleContainer : styles.bubbleContainerCollapsed,
    colorScheme === 'dark' ? styles.bubbleContainerDark : styles.bubbleContainerLight,
    // Removed explicit left/top from here as they are now in animatedStyle via transform
  ];

  // Collapsed bubble view
  if (!isExpanded) {
    return (
      <Animated.View
        style={[containerStyle, animatedStyle]}
        pointerEvents="box-none"
      >
        <View
          {...collapsedPanResponder.panHandlers}
          style={styles.collapsedBubbleWrapper}
        >
          <TouchableOpacity
            style={styles.collapsedBubble}
            onPress={handleCollapsedTap}
            activeOpacity={0.8}
          >
            <Ionicons
              name="document-text"
              size={24}
              color={colorScheme === 'dark' ? '#fff' : '#000'}
            />
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  }

  // Expanded bubble view
  return (
    <Animated.View
      style={[containerStyle, animatedStyle]}
      pointerEvents="box-none"
    >
      <View 
        style={[
          styles.header,
          colorScheme === 'dark' ? styles.headerBorderDark : styles.headerBorderLight,
        ]}
        pointerEvents="auto"
      >
        <TouchableOpacity
          style={styles.headerLeft}
          onPress={handleTap}
          activeOpacity={0.7}
        >
          <ThemedText style={styles.title} numberOfLines={1}>
            {taskData.title || 'Untitled'}
          </ThemedText>
          {taskData.project_name && (
            <ThemedText style={styles.projectName} numberOfLines={1}>
              {taskData.project_name}
            </ThemedText>
          )}
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.collapseButton}
            onPress={handleCollapse}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name="chevron-down"
              size={20}
              color={colorScheme === 'dark' ? '#fff' : '#000'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClosePress}
            activeOpacity={0.7}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Ionicons
              name="close-circle-outline"
              size={24}
              color={colorScheme === 'dark' ? '#fff' : '#000'}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View
        {...panResponder.panHandlers}
        pointerEvents="auto"
      >
        <FloatingNoteBubbleContent
          taskData={{ ...taskData, blocks: localBlocks }}
          onToggleBlock={handleToggleBlock}
          onCheckToggle={handleCheckToggle}
        />
      </View>
    </Animated.View>
  );
}

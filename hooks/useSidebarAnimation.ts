import { useRef, useState } from 'react';
import { Animated, Dimensions } from 'react-native';
import { State } from 'react-native-gesture-handler';

const { width: screenWidth } = Dimensions.get('window');
export const SIDEBAR_WIDTH = screenWidth * 0.8;
const EDGE_THRESHOLD = 30; // Distance from left edge to detect swipe
const SWIPE_THRESHOLD = 50; // Minimum translation to open sidebar

const ANIMATION_DURATION = 300;

export function useSidebarAnimation() {
  const [isOpen, setIsOpen] = useState(false);
  const translateX = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const hamburgerRotation = useRef(new Animated.Value(0)).current;
  const isDragging = useRef(false);

  const animateSidebar = (open: boolean) => {
    if (open) {
      setIsOpen(true);
    }

    Animated.parallel([
      Animated.timing(translateX, {
        toValue: open ? 0 : -SIDEBAR_WIDTH,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: open ? 1 : 0,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(hamburgerRotation, {
        toValue: open ? 1 : 0,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (!open) {
        setIsOpen(false);
      }
      isDragging.current = false;
    });
  };

  const openSidebar = () => {
    animateSidebar(true);
  };

  const closeSidebar = () => {
    animateSidebar(false);
  };

  // Gesture handler event for sidebar drag (when open)
  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { 
      useNativeDriver: true,
      listener: (event: any) => {
        const { translationX } = event.nativeEvent;
        // Clamp the translation to prevent dragging beyond bounds
        if (translationX < -SIDEBAR_WIDTH) {
          translateX.setValue(-SIDEBAR_WIDTH);
        } else if (translationX > 0) {
          translateX.setValue(0);
        }
      }
    }
  );

  // Handler state change for sidebar drag gestures (when open)
  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      isDragging.current = true;
    } else if (event.nativeEvent.state === State.END) {
      const { translationX, velocityX } = event.nativeEvent;
      
      if (translationX > SIDEBAR_WIDTH / 2 || velocityX > 500) {
        openSidebar();
      } else {
        closeSidebar();
      }
      isDragging.current = false;
    }
  };

  // Edge swipe gesture event for main content (when closed)
  const onEdgeSwipeEvent = (event: any) => {
    if (!isDragging.current) return;
    
    const { translationX } = event.nativeEvent;
    
    // Only process rightward swipes
    if (translationX > 0) {
      // Stop any running animations
      translateX.stopAnimation();
      overlayOpacity.stopAnimation();
      
      // Clamp to sidebar width
      const clampedValue = Math.min(translationX, SIDEBAR_WIDTH);
      // When closed, sidebar is at -SIDEBAR_WIDTH, so we add the translation
      const newValue = -SIDEBAR_WIDTH + clampedValue;
      translateX.setValue(newValue);
      
      // Update overlay opacity based on progress
      const progress = clampedValue / SIDEBAR_WIDTH;
      overlayOpacity.setValue(progress);
    }
  };

  // Handler state change for edge swipe gestures (when closed)
  const onEdgeSwipeStateChange = (event: any) => {
    const { state, translationX, velocityX, x } = event.nativeEvent;
    
    if (state === State.BEGAN) {
      // Check if gesture started near the left edge (x is relative to the view)
      if (x > EDGE_THRESHOLD) {
        return; // Not starting from edge, ignore
      }
      isDragging.current = true;
      setIsOpen(true); // Show sidebar immediately when dragging starts
    } else if (state === State.ACTIVE) {
      // Update sidebar position as user drags
      onEdgeSwipeEvent(event);
    } else if (state === State.END) {
      isDragging.current = false;
      
      // Check if swipe was sufficient to open
      if (translationX > SWIPE_THRESHOLD || velocityX > 300) {
        openSidebar();
      } else {
        // Snap back to closed
        closeSidebar();
      }
    } else if (state === State.CANCELLED || state === State.FAILED) {
      isDragging.current = false;
      closeSidebar();
    }
  };

  // Interpolated values for hamburger icon animation
  const hamburgerIconRotation = hamburgerRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const hamburgerIconOpacity = hamburgerRotation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  const closeIconRotation = hamburgerRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['-45deg', '0deg'],
  });

  const closeIconOpacity = hamburgerRotation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return {
    // State
    isOpen,
    
    // Actions
    openSidebar,
    closeSidebar,
    toggleSidebar: () => (isOpen ? closeSidebar() : openSidebar()),
    
    // Animated values
    translateX,
    overlayOpacity,
    hamburgerRotation,
    
    // Interpolated values
    hamburgerIconRotation,
    hamburgerIconOpacity,
    closeIconRotation,
    closeIconOpacity,
    
    // Gesture handlers (for sidebar when open)
    onGestureEvent,
    onHandlerStateChange,
    
    // Edge swipe gesture handlers (for main content when closed)
    onEdgeSwipeEvent,
    onEdgeSwipeStateChange,
    
    // Constants
    SIDEBAR_WIDTH,
    EDGE_THRESHOLD,
  };
}

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Animated, Keyboard, Platform, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function EditingToolbar({ visible, onKeyboardHeightChange, onAddToggleBlock, onAddCheckBlock, onInsertTab }) {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const bottomPosition = React.useRef(new Animated.Value(0)).current;

  const TOOLBAR_HEIGHT = 16;        // smaller toolbar
  const ICON_CONTAINER = 40;        // button size
  const ICON_SIZE = 25;             // icon size

  useEffect(() => {
    bottomPosition.setValue(insets.bottom);

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (e) => {
      const height = e.endCoordinates.height;
      setKeyboardHeight(height);
      onKeyboardHeightChange?.(height);
      Animated.timing(bottomPosition, {
        toValue: height + insets.bottom,
        duration: Platform.OS === 'ios' ? e.duration || 250 : 250,
        useNativeDriver: false,
      }).start();
    });

    const hideSubscription = Keyboard.addListener(hideEvent, (e) => {
      setKeyboardHeight(0);
      onKeyboardHeightChange?.(0);
      Animated.timing(bottomPosition, {
        toValue: insets.bottom,
        duration: Platform.OS === 'ios' ? e.duration || 250 : 250,
        useNativeDriver: false,
      }).start();
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [bottomPosition, onKeyboardHeightChange, insets.bottom]);

  const iconColor = colorScheme === 'dark' ? '#fff' : '#000';
  const safeAreaPadding = Math.max(insets.bottom, 2);

  return (
    <Animated.View
      style={[
        styles.toolbar,
        {
          backgroundColor: colorScheme === 'dark'
            ? '#151718'
            : '#fff',
          borderTopColor: colorScheme === 'dark'
            ? 'rgba(255, 255, 255, 0.1)'
            : 'rgba(0, 0, 0, 0.1)',
          bottom: bottomPosition,
          height: TOOLBAR_HEIGHT + safeAreaPadding,
          paddingBottom: safeAreaPadding,
        },
      ]}
    >
      <Pressable 
        onPress={onAddCheckBlock}
        style={({ pressed }) => [
          styles.iconButton(ICON_CONTAINER),
          pressed && styles.iconButtonPressed
        ]}
      >
        <Ionicons name="checkbox-outline" size={ICON_SIZE} color={iconColor} />
      </Pressable>

      <Pressable 
        onPress={onAddToggleBlock}
        style={({ pressed }) => [
          styles.iconButton(ICON_CONTAINER),
          pressed && styles.iconButtonPressed
        ]}
      >
        <Ionicons name="chevron-down" size={ICON_SIZE} color={iconColor} />
      </Pressable>

      <Pressable 
        onPress={onInsertTab}
        style={({ pressed }) => [
          styles.iconButton(ICON_CONTAINER),
          pressed && styles.iconButtonPressed
        ]}
      >
        <Ionicons name="arrow-forward" size={ICON_SIZE} color={iconColor} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },

  iconButton: (size) => ({
    width: size,
    height: size,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    backgroundColor: 'transparent',
    marginBottom: -30,
  }),

  iconButtonPressed: {
    opacity: 0.6,
  },
});

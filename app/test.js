import TaskHeader from '@/components/task-detail/TaskHeader';
import { styles as taskStyles } from '@/components/task-detail/task-detail-styles';
import { ThemedText } from '@/components/themed-text';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Dimensions, Platform, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
    Extrapolation,
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const THRESHOLD = 120; // Distance to pull down to trigger the return

export default function TestScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [scrollEnabled, setScrollEnabled] = useState(true);
  
  // Shared values for animation
  const translateY = useSharedValue(0);
  const isDragging = useSharedValue(false);
  
  // Only enable this logic on Android as requested
  const isAndroid = Platform.OS === 'android';

  const goBack = () => {
    Alert.alert("Action Triggered", "Returning to Project Detail Screen");
    // In real app: router.back();
  };

  // The Pan Gesture
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (!isAndroid) return;
      
      // Only allow dragging downwards
      if (e.translationY > 0) {
        translateY.value = e.translationY;
        isDragging.value = true;
      }
    })
    .onEnd((e) => {
      if (!isAndroid) return;

      isDragging.value = false;
      if (e.translationY > THRESHOLD) {
        runOnJS(goBack)();
        translateY.value = withSpring(0); 
      } else {
        translateY.value = withSpring(0);
      }
    })
    .activeOffsetY(10); 

  // Screen animation style
  const animatedStyle = useAnimatedStyle(() => {
    if (!isAndroid) return {};
    return {
      transform: [{ translateY: translateY.value }]
    };
  });

  // Background style 
  const backgroundStyle = useAnimatedStyle(() => {
    if (!isAndroid) return { opacity: 0 };
    const opacity = interpolate(translateY.value, [0, THRESHOLD], [0, 1], Extrapolation.CLAMP);
    return { opacity };
  });

  // Mock Data for Task Header
  const mockTask = {
    project_name: "Personal Project",
    title: "Review pull-down interaction",
    project_id: 1
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        
        {/* "Background" Project Screen Hint */}
        <Animated.View style={[styles.backgroundHint, backgroundStyle, { paddingTop: insets.top }]}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
                <Ionicons name="folder-open-outline" size={24} color="#fff" />
                <Text style={styles.backgroundText}>Personal Project</Text>
            </View>
            <Ionicons name="arrow-up-circle" size={40} color="rgba(255,255,255,0.6)" style={{marginTop: 20}} />
            <Text style={styles.backgroundSubText}>Release to return to project</Text>
        </Animated.View>

        {/* The Screen Content */}
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.screen, animatedStyle]}>
             {/* Mock Task Header */}
            <View style={{ paddingTop: 0, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#eee' }}>
                {/* Use actual TaskHeader component if possible, or mock it visually */}
                 <TaskHeader 
                    task={mockTask}
                    onChangeProject={() => {}}
                    onOpenMenu={() => {}}
                    onTogglePin={() => {}}
                    isPinned={false}
                 />
            </View>

            <Animated.ScrollView 
              style={styles.scrollView}
              contentContainerStyle={{ paddingBottom: 40 }}
              scrollEnabled={scrollEnabled}
              showsVerticalScrollIndicator={false}
            >
               <View style={{ paddingHorizontal: 14, paddingTop: 12 }}>
                    <View style={taskStyles.dateRow}>
                        <View style={taskStyles.dateLeft}>
                            <Ionicons name="square-outline" size={18} color="#666" />
                            <ThemedText style={taskStyles.dateText}>Date and repetition</ThemedText>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                             <ThemedText style={{ fontSize: 12, color: '#888' }}>Note</ThemedText>
                        </View>
                    </View>

                    <View style={taskStyles.titleSection}>
                         <Text style={taskStyles.taskTitle}>Review pull-down interaction</Text>
                    </View>

                    <View style={{ marginTop: 20 }}>
                        <Text style={[taskStyles.taskDescription, { minHeight: 0, marginBottom: 20 }]}>
                            This screen mimics the Task Detail view. 
                            {"\n\n"}
                            Try pulling down from the top header area or when the scroll is at the top.
                        </Text>

                        {/* Mock Blocks */}
                        {['Implement gesture handler', 'Connect to reanimated', 'Test on Android', 'Verify smooth transition', 'Add visual cues'].map((item, i) => (
                            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingVertical: 4 }}>
                                <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: '#ddd', marginRight: 12 }} />
                                <Text style={{ fontSize: 16, color: '#333' }}>{item}</Text>
                            </View>
                        ))}
                    </View>
               </View>
            </Animated.ScrollView>
          </Animated.View>
        </GestureDetector>

      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a', // Darker background
  },
  backgroundHint: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center', 
    paddingBottom: 100, // Push it up a bit
    zIndex: 0,
  },
  backgroundText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  backgroundSubText: {
    color: '#aaa',
    marginTop: 10,
    fontSize: 14,
  },
  screen: {
    flex: 1,
    backgroundColor: 'white', // Task detail is usually white/themed
    overflow: 'hidden',
    zIndex: 1,
    // Rounded top corners only to simulate a "card" or "sheet" being pulled
    // In a real app, you might want this to be 0 normally and animate to >0 when pulling
    borderRadius: 0, 
  },
  scrollView: {
    flex: 1,
  },
});

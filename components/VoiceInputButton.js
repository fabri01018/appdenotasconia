import { useColorScheme } from '@/hooks/use-color-scheme';
import { useDeepgramFlux } from '@/hooks/useDeepgramFlux';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

/**
 * Voice input button component for AI chat screen
 * Provides microphone button with recording state and visual feedback
 */
export default function VoiceInputButton({ onTranscriptReady, disabled }) {
  const colorScheme = useColorScheme();
  const {
    isRecording,
    isConnecting,
    isConnected,
    interimTranscript,
    finalTranscript,
    fullTranscript,
    error,
    errorCode,
    errorType,
    startRecording,
    stopRecording,
    clearTranscript,
  } = useDeepgramFlux();

  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation when recording
  useEffect(() => {
    if (isRecording) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, pulseAnim]);

  // Update input field in real-time with transcription (both interim and final)
  // This ensures words appear in the input field as you speak
  useEffect(() => {
    if (!onTranscriptReady) return;
    
    // Update whenever fullTranscript changes while recording (real-time updates)
    if (isRecording) {
      // Always update with fullTranscript (includes both final and interim) while recording
      // This gives real-time feedback as words come in
      if (fullTranscript) {
        onTranscriptReady(fullTranscript);
      }
    } else if (finalTranscript && finalTranscript.trim().length > 0) {
      // When recording stops, ensure final transcript is set
      onTranscriptReady(finalTranscript);
    }
  }, [fullTranscript, finalTranscript, isRecording, onTranscriptReady]);

  // Clear transcript when recording stops and final transcript is ready
  useEffect(() => {
    if (finalTranscript && !isRecording && onTranscriptReady) {
      // Small delay to ensure transcript is finalized
      const timer = setTimeout(() => {
        // Final transcript is already set via fullTranscript effect above
        clearTranscript();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [finalTranscript, isRecording, onTranscriptReady, clearTranscript]);

  const handlePress = async () => {
    if (disabled) return;

    if (isRecording) {
      await stopRecording();
    } else {
      // Clear any previous errors when starting a new recording
      if (error) {
        // Error will be cleared by startRecording
      }
      await startRecording();
    }
  };

  const getButtonColor = () => {
    if (error) return '#FF6B6B';
    if (isRecording) return '#FF3B30'; // Red when recording
    if (isConnecting) return '#9BA1A6'; // Gray when connecting
    return '#0a7ea4'; // Default blue
  };

  const getIcon = () => {
    if (isConnecting) return 'hourglass-outline';
    if (error) return 'alert-circle';
    if (isRecording) return 'mic';
    return 'mic-outline';
  };

  return (
    <View style={styles.container}>
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: getButtonColor(),
            },
            disabled && styles.buttonDisabled,
          ]}
          onPress={handlePress}
          disabled={disabled || isConnecting}
          activeOpacity={0.7}
        >
          {isConnecting ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Ionicons name={getIcon()} size={20} color="white" />
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Show error message when there's an error */}
      {error && !isRecording && (
        <View style={styles.errorContainer}>
          <View style={[
            styles.errorBubble,
            {
              backgroundColor: colorScheme === 'dark' ? '#3A1F1F' : '#FFEBEE',
            }
          ]}>
            <Ionicons 
              name="alert-circle" 
              size={14} 
              color={colorScheme === 'dark' ? '#FF6B6B' : '#D32F2F'} 
              style={styles.errorIcon}
            />
            <View style={styles.errorTextContainer}>
              <Text style={[
                styles.errorText,
                { color: colorScheme === 'dark' ? '#FF6B6B' : '#D32F2F' }
              ]}>
                {error}
              </Text>
              {__DEV__ && errorCode && (
                <Text style={[
                  styles.errorCodeText,
                  { color: colorScheme === 'dark' ? '#888' : '#666' }
                ]}>
                  Code: {errorCode} | Type: {errorType}
                </Text>
              )}
            </View>
            <TouchableOpacity
              onPress={handlePress}
              style={styles.retryButton}
            >
              <Ionicons 
                name="refresh" 
                size={16} 
                color={colorScheme === 'dark' ? '#FF6B6B' : '#D32F2F'} 
              />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Show interim transcript when recording */}
      {isRecording && interimTranscript && (
        <View style={styles.transcriptContainer}>
          <View style={[
            styles.transcriptBubble,
            {
              backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#F5F5F5',
            }
          ]}>
            <Ionicons 
              name="mic" 
              size={12} 
              color={colorScheme === 'dark' ? '#888' : '#666'} 
              style={styles.micIcon}
            />
            <View style={styles.transcriptTextContainer}>
              {finalTranscript ? (
                <>
                  <View style={styles.finalText}>
                    <Text style={[
                      styles.transcriptText,
                      { color: colorScheme === 'dark' ? '#ECEDEE' : '#11181C' }
                    ]}>
                      {finalTranscript}
                    </Text>
                  </View>
                  {interimTranscript && (
                    <Text style={[
                      styles.interimText,
                      { color: colorScheme === 'dark' ? '#9BA1A6' : '#687076' }
                    ]}>
                      {interimTranscript}
                    </Text>
                  )}
                </>
              ) : (
                <Text style={[
                  styles.interimText,
                  { color: colorScheme === 'dark' ? '#9BA1A6' : '#687076' }
                ]}>
                  {interimTranscript}
                </Text>
              )}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  transcriptContainer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  transcriptBubble: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    maxWidth: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  micIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  transcriptTextContainer: {
    flex: 1,
  },
  finalText: {
    marginBottom: 2,
  },
  transcriptText: {
    fontSize: 14,
    lineHeight: 18,
  },
  interimText: {
    fontSize: 14,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  errorContainer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  errorBubble: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    maxWidth: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  errorIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  errorTextContainer: {
    flex: 1,
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  errorCodeText: {
    fontSize: 11,
    lineHeight: 14,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  retryButton: {
    marginLeft: 8,
    padding: 4,
  },
});


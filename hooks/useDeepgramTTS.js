import { getUserFriendlyMessage, logError, normalizeError } from '@/lib/deepgram-error-utils';
import { deepgramTTSClient } from '@/lib/deepgram-tts-client';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Hook for managing Deepgram Text-to-Speech
 * Handles text-to-speech conversion and audio playback
 */
export function useDeepgramTTS() {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0); // 0-1

  const soundRef = useRef(null);
  const currentTextRef = useRef(null);
  const playbackPositionRef = useRef(0);
  const playbackDurationRef = useRef(0);

  // Default TTS options
  const defaultOptions = {
    model: 'aura-2-thalia-en', // Can be changed to other Aura models
    encoding: 'linear16',
    container: 'wav',
  };

  /**
   * Handle errors
   */
  const handleError = useCallback((err) => {
    const normalizedError = err.type ? err : normalizeError(err, {
      hook: 'useDeepgramTTS',
    });
    
    logError(normalizedError, { hook: 'useDeepgramTTS' });
    setError(normalizedError);
    setIsLoading(false);
    setIsPlaying(false);
  }, []);

  /**
   * Convert ArrayBuffer to base64 string
   * @private
   */
  const arrayBufferToBase64 = (buffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    // Convert binary string to base64
    // In React Native, we can use btoa if available, otherwise use a polyfill
    if (typeof btoa !== 'undefined') {
      return btoa(binary);
    } else {
      // Fallback base64 encoding for React Native
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      let result = '';
      let i = 0;
      while (i < binary.length) {
        const a = binary.charCodeAt(i++);
        const b = i < binary.length ? binary.charCodeAt(i++) : 0;
        const c = i < binary.length ? binary.charCodeAt(i++) : 0;
        const bitmap = (a << 16) | (b << 8) | c;
        result += chars.charAt((bitmap >> 18) & 63);
        result += chars.charAt((bitmap >> 12) & 63);
        result += i - 2 < binary.length ? chars.charAt((bitmap >> 6) & 63) : '=';
        result += i - 1 < binary.length ? chars.charAt(bitmap & 63) : '=';
      }
      return result;
    }
  };

  /**
   * Clean up audio resources
   */
  const cleanup = useCallback(async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    } catch (err) {
      console.warn('Error cleaning up audio:', err);
    }
  }, []);

  /**
   * Stop current playback
   */
  const stop = useCallback(async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await cleanup();
      }
      setIsPlaying(false);
      setProgress(0);
      playbackPositionRef.current = 0;
      playbackDurationRef.current = 0;
    } catch (err) {
      console.warn('Error stopping playback:', err);
    }
  }, [cleanup]);

  /**
   * Convert text to speech and play audio
   * @param {string} text - Text to convert to speech
   * @param {Object} options - TTS options (model, encoding, container, etc.)
   */
  const speak = useCallback(async (text, options = {}) => {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      const error = normalizeError(new Error('Text cannot be empty'), {
        stage: 'speak_validation',
      });
      handleError(error);
      return;
    }

    // Stop any current playback
    await stop();

    try {
      setIsLoading(true);
      setError(null);
      setProgress(0);
      currentTextRef.current = text;

      // Merge options with defaults
      const ttsOptions = { ...defaultOptions, ...options };

      // Check if text needs to be chunked
      const textChunks = deepgramTTSClient.chunkText(text);

      if (textChunks.length > 1) {
        console.log(`📝 Text split into ${textChunks.length} chunks for TTS`);
      }

      // For now, we'll process the first chunk
      // TODO: Could implement queue system for multiple chunks
      const textToProcess = textChunks[0];

      // Convert text to speech
      const { audioBuffer, headers } = await deepgramTTSClient.speak(textToProcess, ttsOptions);

      console.log('✅ TTS audio received:', {
        size: audioBuffer.byteLength,
        model: headers['dg-model-name'],
        charCount: headers['dg-char-count'],
      });

      // Save audio buffer to temporary file
      const audioDir = `${FileSystem.cacheDirectory}tts/`;
      await FileSystem.makeDirectoryAsync(audioDir, { intermediates: true });
      
      const timestamp = Date.now();
      const fileExtension = ttsOptions.container || 'wav';
      const audioFilePath = `${audioDir}tts_${timestamp}.${fileExtension}`;

      // Convert ArrayBuffer to base64 and write to file
      const base64Audio = arrayBufferToBase64(audioBuffer);
      await FileSystem.writeAsStringAsync(audioFilePath, base64Audio, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Configure audio mode for playback
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      // Load and play audio from file
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioFilePath },
        {
          shouldPlay: true,
          isLooping: false,
        }
      );

      soundRef.current = sound;

      // Get duration
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        playbackDurationRef.current = status.durationMillis || 0;
      }

      // Set up status update listener for progress tracking
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setIsPlaying(status.isPlaying);
          
          if (status.durationMillis) {
            playbackDurationRef.current = status.durationMillis;
            playbackPositionRef.current = status.positionMillis || 0;
            const newProgress = status.durationMillis > 0
              ? (status.positionMillis || 0) / status.durationMillis
              : 0;
            setProgress(newProgress);
          }

          // Clean up when finished
          if (status.didJustFinish) {
            setIsPlaying(false);
            setProgress(1);
            cleanup();
          }
        }
      });

      setIsLoading(false);
    } catch (err) {
      handleError(err);
    }
  }, [stop, handleError, cleanup]);

  /**
   * Pause current playback
   */
  const pause = useCallback(async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
      }
    } catch (err) {
      console.warn('Error pausing playback:', err);
    }
  }, []);

  /**
   * Resume paused playback
   */
  const resume = useCallback(async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.playAsync();
        setIsPlaying(true);
      }
    } catch (err) {
      console.warn('Error resuming playback:', err);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    // State
    isLoading,
    isPlaying,
    error: error ? getUserFriendlyMessage(error) : null,
    errorDetails: error,
    errorCode: error?.code || null,
    errorType: error?.type || null,
    progress,
    currentText: currentTextRef.current,
    duration: playbackDurationRef.current,
    position: playbackPositionRef.current,

    // Actions
    speak,
    stop,
    pause,
    resume,
  };
}


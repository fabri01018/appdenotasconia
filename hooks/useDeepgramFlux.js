import { audioRecorder } from '@/lib/audio-recorder';
import { deepgramClient } from '@/lib/deepgram-client';
import { getUserFriendlyMessage, logError, normalizeError } from '@/lib/deepgram-error-utils';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Hook for managing Deepgram Flux transcription
 * Handles audio recording, WebSocket connection, and transcription state
 */
export function useDeepgramFlux() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [error, setError] = useState(null); // Stores normalized error object
  const [recordingDuration, setRecordingDuration] = useState(0);

  const transcriptBufferRef = useRef('');
  const durationIntervalRef = useRef(null);
  const startTimeRef = useRef(null);

  /**
   * Handle transcription messages from Deepgram
   */
  const handleTranscription = useCallback((message) => {
    console.log('🎯 handleTranscription called with:', {
      type: message.type,
      text: message.text,
      isFinal: message.isFinal,
      textLength: message.text?.length || 0,
    });
    
    if (message.type === 'transcript') {
      if (message.isFinal) {
        // Final transcript - append to buffer and update final transcript
        const newText = message.text || '';
        console.log('📌 Processing FINAL transcript:', newText);
        if (newText) {
          transcriptBufferRef.current += (transcriptBufferRef.current ? ' ' : '') + newText;
          console.log('📌 Updated finalTranscript buffer:', transcriptBufferRef.current);
          setFinalTranscript(transcriptBufferRef.current);
          setInterimTranscript(''); // Clear interim when final arrives
        }
      } else {
        // Interim transcript - show live updates
        console.log('📌 Processing INTERIM transcript:', message.text);
        setInterimTranscript(message.text || '');
      }
    } else if (message.type === 'endOfTurn') {
      // End of turn - finalize current transcript
      console.log('📌 Processing endOfTurn, current interim:', interimTranscript);
      if (interimTranscript) {
        transcriptBufferRef.current += (transcriptBufferRef.current ? ' ' : '') + interimTranscript;
        setFinalTranscript(transcriptBufferRef.current);
        setInterimTranscript('');
      }
    }
  }, [interimTranscript]);

  /**
   * Handle errors
   */
  const handleError = useCallback((err) => {
    // err should already be normalized from deepgram-client
    // But ensure it's normalized in case it's not
    const normalizedError = err.type ? err : normalizeError(err, {
      hook: 'useDeepgramFlux',
    });
    
    logError(normalizedError, { hook: 'useDeepgramFlux' });
    
    // Set error state with normalized error
    setError(normalizedError);
    setIsConnecting(false);
    setIsRecording(false);
    
    // Log detailed error for debugging
    if (__DEV__) {
      console.error('Error details:', {
        message: normalizedError.message,
        code: normalizedError.code,
        type: normalizedError.type,
        context: normalizedError.context,
      });
    }
  }, []);

  /**
   * Start recording and transcription
   */
  const startRecording = useCallback(async () => {
    if (isRecording) {
      console.warn('Already recording');
      return;
    }

    try {
      setError(null);
      setInterimTranscript('');
      setFinalTranscript('');
      transcriptBufferRef.current = '';
      setRecordingDuration(0);
      startTimeRef.current = Date.now();

      // Start duration timer
      durationIntervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setRecordingDuration(Date.now() - startTimeRef.current);
        }
      }, 100);

      // Connect to Deepgram
      setIsConnecting(true);
      await deepgramClient.connect(
        {
          eot_threshold: 0.7,
          eager_eot_threshold: 0.5, // Enable eager end-of-turn for faster responses
        },
        handleTranscription,
        handleError
      );

      // The promise resolves when WebSocket is actually open
      // Verify connection state before proceeding
      const OPEN = 1; // WebSocket.OPEN
      if (!deepgramClient.isConnected || !deepgramClient.ws || deepgramClient.ws.readyState !== OPEN) {
        throw new Error('WebSocket connection failed to establish');
      }

      setIsConnected(true);
      setIsConnecting(false);

      // Start audio recording
      // Add a small delay to ensure WebSocket is fully ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await audioRecorder.startRecording((audioChunk) => {
        // Send audio chunk to Deepgram
        // The sendAudio method will check connection state internally
        deepgramClient.sendAudio(audioChunk);
      });

      setIsRecording(true);
    } catch (err) {
      const normalizedError = normalizeError(err, {
        stage: 'startRecording',
        hook: 'useDeepgramFlux',
      });
      logError(normalizedError, { handler: 'startRecording-catch' });
      setError(normalizedError);
      setIsConnecting(false);
      setIsRecording(false);
      
      // Clean up
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }
  }, [isRecording, handleTranscription, handleError]);

  /**
   * Stop recording and transcription
   */
  const stopRecording = useCallback(async () => {
    if (!isRecording) {
      return;
    }

    try {
      // Stop audio recording
      await audioRecorder.stopRecording();

      // Disconnect from Deepgram (this will finalize any pending transcripts)
      deepgramClient.disconnect();
      setIsConnected(false);
      setIsRecording(false);

      // Clear duration timer
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }

      // Finalize any remaining interim transcript
      if (interimTranscript) {
        transcriptBufferRef.current += (transcriptBufferRef.current ? ' ' : '') + interimTranscript;
        setFinalTranscript(transcriptBufferRef.current);
        setInterimTranscript('');
      }
    } catch (err) {
      const normalizedError = normalizeError(err, {
        stage: 'stopRecording',
        hook: 'useDeepgramFlux',
      });
      logError(normalizedError, { handler: 'stopRecording-catch' });
      setError(normalizedError);
    }
  }, [isRecording, interimTranscript]);

  /**
   * Clear transcription
   */
  const clearTranscript = useCallback(() => {
    setInterimTranscript('');
    setFinalTranscript('');
    transcriptBufferRef.current = '';
  }, []);

  /**
   * Get full transcript (final + interim)
   */
  const getFullTranscript = useCallback(() => {
    const parts = [];
    if (finalTranscript) parts.push(finalTranscript);
    if (interimTranscript) parts.push(interimTranscript);
    return parts.join(' ');
  }, [finalTranscript, interimTranscript]);

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      // Only cleanup on actual unmount, not on dependency changes
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      // Disconnect WebSocket on unmount
      deepgramClient.disconnect();
    };
    // Empty dependency array - only run cleanup on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    // State
    isConnected,
    isConnecting,
    isRecording,
    interimTranscript,
    finalTranscript,
    fullTranscript: getFullTranscript(),
    error: error ? getUserFriendlyMessage(error) : null, // String message for backward compatibility
    errorDetails: error, // Full error object for advanced use
    errorCode: error?.code || null,
    errorType: error?.type || null,
    recordingDuration,

    // Actions
    startRecording,
    stopRecording,
    clearTranscript,
  };
}


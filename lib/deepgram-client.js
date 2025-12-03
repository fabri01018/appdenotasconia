import Constants from 'expo-constants';
import { isRecoverableError, logError, normalizeError } from './deepgram-error-utils';

// Deepgram API configuration
const deepgramApiKey = Constants.expoConfig?.extra?.deepgramApiKey || process.env.EXPO_PUBLIC_DEEPGRAM_API_KEY;
const DEEPGRAM_WS_URL = 'wss://api.deepgram.com/v2/listen';

if (!deepgramApiKey) {
  console.warn('⚠️ Deepgram API key not found in configuration');
  console.warn('📋 Please add deepgramApiKey to app.json extra section or set EXPO_PUBLIC_DEEPGRAM_API_KEY environment variable');
}

/**
 * Deepgram Flux WebSocket client
 * Handles connection to Deepgram v2/listen endpoint with flux-general-en model
 */
class DeepgramClient {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
    this.reconnectDelay = 1000;
    this.listeners = {
      message: [],
      error: [],
      open: [],
      close: [],
      endOfTurn: [],
      eagerEndOfTurn: [],
      rawMessage: [], // For debugging - raw messages from Deepgram
    };
  }

  /**
   * Connect to Deepgram WebSocket
   * @param {Object} options - Connection options
   * @param {Function} onMessage - Callback for transcription messages
   * @param {Function} onError - Callback for errors
   * @returns {Promise<void>}
   */
  async connect(options = {}, onMessage, onError) {
    if (this.isConnecting || this.isConnected) {
      console.warn('Already connected or connecting');
      return;
    }

    if (!deepgramApiKey) {
      const error = normalizeError(new Error('Deepgram API key is not configured'), {
        stage: 'pre-connection',
      });
      if (onError) onError(error);
      throw new Error(error.message);
    }

    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      let connectionTimeout = null;
      
      try {
        // Build WebSocket URL with query parameters
        const params = new URLSearchParams({
          model: 'flux-general-en',
          encoding: 'linear16',
          sample_rate: '16000',
          ...options,
        });

        const url = `${DEEPGRAM_WS_URL}?${params.toString()}`;

        // Create WebSocket connection with Sec-WebSocket-Protocol authentication
        // React Native WebSocket doesn't support custom headers, so we use
        // the Sec-WebSocket-Protocol header by passing protocols array
        // Format: ['token', apiKey] - Deepgram recognizes this for authentication
        this.ws = new WebSocket(url, ['token', deepgramApiKey]);

        // Connection timeout (10 seconds)
        connectionTimeout = setTimeout(() => {
          const OPEN = 1; // WebSocket.OPEN
          if (this.ws && this.ws.readyState !== OPEN) {
            const timeoutError = normalizeError(new Error('WebSocket connection timeout'), {
              stage: 'connection',
              readyState: this.ws.readyState,
            });
            this.ws.close();
            this.isConnecting = false;
            if (onError) onError(timeoutError);
            reject(timeoutError);
          }
        }, 10000);

        // Set up event handlers
        this.ws.onopen = () => {
          clearTimeout(connectionTimeout);
          console.log('✅ Connected to Deepgram Flux');
          this.isConnected = true;
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.emit('open');
          resolve(); // Resolve the promise when WebSocket is actually open
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // Always log raw messages to console for debugging
            const timestamp = new Date().toISOString();
            console.log('\n' + '='.repeat(80));
            console.log(`[${timestamp}] 🔵 Deepgram WebSocket Message Received`);
            console.log('='.repeat(80));
            console.log('Message Type:', data.type || 'unknown');
            console.log('Full Message:');
            console.log(JSON.stringify(data, null, 2));
            console.log('='.repeat(80) + '\n');
            
            // Emit raw message for debugging (for UI listeners)
            this.emit('rawMessage', data);
            this.handleMessage(data, onMessage);
          } catch (error) {
            console.error('❌ Error parsing Deepgram message:', error);
            console.error('Raw event data:', event.data);
            // Emit raw message even if parsing fails
            this.emit('rawMessage', { raw: event.data, parseError: error.message });
          }
        };

        this.ws.onerror = (event) => {
          clearTimeout(connectionTimeout);
          // Extract connection state
          const readyState = this.ws?.readyState;
          const connectionStage = this.isConnecting ? 'connecting' : 
                                 this.isConnected ? 'connected' : 'unknown';
          
          // Normalize error
          const normalizedError = normalizeError(event, {
            readyState,
            connectionStage,
            url: this.ws?.url,
            reconnectAttempts: this.reconnectAttempts,
          });
          
          logError(normalizedError, { handler: 'onerror' });
          
          this.isConnecting = false;
          
          // Emit normalized error
          if (onError) {
            onError(normalizedError);
          }
          this.emit('error', normalizedError);
          
          // Reject the promise if we're still connecting
          if (!this.isConnected) {
            reject(normalizedError);
          }
        };

        this.ws.onclose = (event) => {
          clearTimeout(connectionTimeout);
          console.log('Deepgram WebSocket closed:', event.code, event.reason);
          
          const wasConnected = this.isConnected;
          this.isConnected = false;
          this.isConnecting = false;
          
          // Check if this is an error closure (not a normal closure)
          const isErrorClosure = event.code !== 1000 && event.code !== 1001;
          
          if (isErrorClosure) {
            // Normalize close event as error
            const normalizedError = normalizeError({
              code: event.code,
              reason: event.reason,
              wasClean: event.wasClean,
            }, {
              readyState: 3, // CLOSED
              wasConnected,
              reconnectAttempts: this.reconnectAttempts,
            });
            
            logError(normalizedError, { handler: 'onclose' });
            
            // Reject the promise if we're still connecting
            if (!wasConnected) {
              reject(normalizedError);
              return;
            }
            
            // Check if error is recoverable
            const isRecoverable = isRecoverableError(normalizedError);
            
            if (!isRecoverable) {
              // Don't attempt reconnection for non-recoverable errors
              if (onError) {
                onError(normalizedError);
              }
              this.emit('error', normalizedError);
              this.emit('close', event);
              return;
            }
            
            // For recoverable errors, attempt reconnection
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
              this.attemptReconnect(options, onMessage, onError);
            } else {
              // Max reconnection attempts reached
              normalizedError.message = `Connection failed after ${this.maxReconnectAttempts} attempts: ${normalizedError.message}`;
              if (onError) {
                onError(normalizedError);
              }
              this.emit('error', normalizedError);
            }
          }
          
          this.emit('close', event);
        };
      } catch (error) {
        if (connectionTimeout) {
          clearTimeout(connectionTimeout);
        }
        const normalizedError = normalizeError(error, {
          stage: 'connection',
          reconnectAttempts: this.reconnectAttempts,
        });
        logError(normalizedError, { handler: 'connect-catch' });
        this.isConnecting = false;
        if (onError) onError(normalizedError);
        reject(normalizedError);
      }
    });
  }

  /**
   * Attempt to reconnect to Deepgram
   * @private
   */
  attemptReconnect(options, onMessage, onError) {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`Attempting to reconnect to Deepgram (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms...`);

    setTimeout(() => {
      this.connect(options, onMessage, onError).catch((error) => {
        const normalizedError = normalizeError(error, {
          stage: 'reconnection',
          attempt: this.reconnectAttempts,
        });
        logError(normalizedError, { handler: 'attemptReconnect' });
        if (onError) onError(normalizedError);
      });
    }, delay);
  }

  /**
   * Handle incoming messages from Deepgram
   * @private
   */
  handleMessage(data, onMessage) {
    // Handle different message types
    if (data.type === 'TurnInfo') {
      // Deepgram Flux uses TurnInfo messages with transcript directly in data.transcript
      const transcript = data.transcript || '';
      const event = data.event || '';
      
      // Determine if this is final based on event type
      // EndOfTurn or EagerEndOfTurn = final, Update = interim
      const isFinal = event === 'EndOfTurn' || event === 'EagerEndOfTurn';
      
      // Always log for debugging
      console.log('📝 Processing Deepgram TurnInfo:');
      console.log('  - Event:', event);
      console.log('  - Transcript:', transcript || '(null/empty)');
      console.log('  - Is final:', isFinal);
      
      if (transcript && transcript.trim().length > 0 && onMessage) {
        console.log('✅ Sending transcript to callback:', transcript.trim(), isFinal ? '(FINAL)' : '(INTERIM)');
        onMessage({
          type: 'transcript',
          text: transcript.trim(),
          isFinal: isFinal,
          confidence: data.end_of_turn_confidence || 0,
        });
      } else if (!transcript) {
        console.warn('⚠️ TurnInfo message but transcript is empty or null');
      } else if (!onMessage) {
        console.warn('⚠️ onMessage callback is not defined!');
      }
    } else if (data.type === 'Results') {
      // Legacy Results format (for older Deepgram APIs)
      const transcript = this.extractTranscript(data);
      
      // Always log for debugging (not just in dev mode)
      console.log('📝 Processing Deepgram Results:');
      console.log('  - Has transcript:', !!transcript);
      console.log('  - Transcript text:', transcript || '(null/empty)');
      console.log('  - Is final:', data.is_final || false);
      console.log('  - Data keys:', Object.keys(data));
      
      if (transcript && transcript.trim().length > 0) {
        console.log('✅ Sending transcript to callback:', transcript.trim());
        if (onMessage) {
          onMessage({
            type: 'transcript',
            text: transcript.trim(),
            isFinal: data.is_final || false,
            confidence: data.confidence || 0,
          });
        } else {
          console.warn('⚠️ onMessage callback is not defined!');
        }
      } else {
        console.warn('⚠️ Deepgram Results message but transcript is empty or null');
        console.warn('⚠️ This means extractTranscript() returned null/empty');
      }
    } else if (data.type === 'Metadata') {
      // Connection metadata
      console.log('Deepgram metadata:', data);
    } else if (data.type === 'SpeechStarted') {
      // Speech detection started
      console.log('Speech started');
    } else if (data.type === 'UtteranceEnd') {
      // End of utterance (turn)
      this.emit('endOfTurn', data);
      if (onMessage) {
        onMessage({
          type: 'endOfTurn',
        });
      }
    } else if (data.type === 'Error') {
      // Error message from Deepgram API
      const normalizedError = normalizeError({
        message: data.message || 'Unknown Deepgram error',
        type: 'deepgram_api_error',
      }, {
        stage: 'message_handling',
        deepgramData: data,
      });
      logError(normalizedError, { handler: 'handleMessage' });
      this.emit('error', normalizedError);
    }
  }

  /**
   * Extract transcript text from Deepgram result
   * @private
   */
  extractTranscript(data) {
    // Deepgram Flux API structure can vary, try multiple paths
    let transcript = null;

    // Try: data.channel.alternatives[0].transcript (standard structure)
    if (data.channel?.alternatives?.[0]?.transcript) {
      transcript = data.channel.alternatives[0].transcript;
    }
    // Try: data.channels[0].alternatives[0].transcript (alternative structure)
    else if (data.channels?.[0]?.alternatives?.[0]?.transcript) {
      transcript = data.channels[0].alternatives[0].transcript;
    }
    // Try: data.results.channels[0].alternatives[0].transcript (nested structure)
    else if (data.results?.channels?.[0]?.alternatives?.[0]?.transcript) {
      transcript = data.results.channels[0].alternatives[0].transcript;
    }
    // Try: data.alternatives[0].transcript (direct structure)
    else if (data.alternatives?.[0]?.transcript) {
      transcript = data.alternatives[0].transcript;
    }
    // Try: data.transcript (direct transcript field)
    else if (data.transcript) {
      transcript = data.transcript;
    }

    // Log for debugging if we have a Results message but no transcript
    if (!transcript && data.type === 'Results') {
      console.warn('⚠️ Deepgram Results message but no transcript found. Data structure:', JSON.stringify(data, null, 2));
    }

    return transcript;
  }

  /**
   * Send audio data to Deepgram
   * @param {ArrayBuffer} audioData - Audio chunk as ArrayBuffer
   */
  sendAudio(audioData) {
    // Double-check connection state before sending
    if (!this.ws) {
      // Silently skip if WebSocket doesn't exist (connection not established)
      return;
    }

    // WebSocket readyState constants:
    // 0 = CONNECTING, 1 = OPEN, 2 = CLOSING, 3 = CLOSED
    const readyState = this.ws.readyState;
    const OPEN = 1; // WebSocket.OPEN or 1
    
    if (!this.isConnected || readyState !== OPEN) {
      // Silently skip if not connected - this is expected during connection/disconnection
      // Only log if we were connected and it's an unexpected state (not CONNECTING or CLOSED)
      const CONNECTING = 0;
      const CLOSED = 3;
      
      if (this.isConnected && readyState !== CONNECTING && readyState !== CLOSED) {
        // Unexpected state - log for debugging
        console.warn('Cannot send audio: WebSocket in unexpected state', {
          isConnected: this.isConnected,
          readyState: readyState,
        });
      }
      return;
    }

    try {
      this.ws.send(audioData);
    } catch (error) {
      const normalizedError = normalizeError(error, {
        stage: 'sending_audio',
        readyState: this.ws?.readyState,
      });
      logError(normalizedError, { handler: 'sendAudio' });
      this.emit('error', normalizedError);
    }
  }

  /**
   * Close WebSocket connection
   */
  disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
  }

  /**
   * Add event listener
   */
  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  /**
   * Remove event listener
   */
  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  /**
   * Emit event to listeners
   * @private
   */
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }
}

// Export singleton instance
export const deepgramClient = new DeepgramClient();
export default deepgramClient;


import { Audio } from 'expo-av';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Import live audio stream for native platforms
let LiveAudioStream = null;
let liveAudioStreamError = null;

if (Platform.OS !== 'web') {
  // Check if we're in Expo Go (which doesn't support native modules)
  const isExpoGo = Constants.executionEnvironment === 'storeClient';
  
  if (isExpoGo) {
    liveAudioStreamError = 'Expo Go detected. react-native-live-audio-stream requires a development build. Please create a development build using "npx expo prebuild" and "npx expo run:ios" or "npx expo run:android".';
    console.warn(liveAudioStreamError);
  } else {
    try {
      // Try different import patterns
      const module = require('react-native-live-audio-stream');
      LiveAudioStream = module.default || module;
      
      // Verify the module is actually available and has required methods
      if (!LiveAudioStream) {
        liveAudioStreamError = 'react-native-live-audio-stream module is null. The native module may not be linked properly.';
      } else if (typeof LiveAudioStream.init !== 'function') {
        liveAudioStreamError = 'react-native-live-audio-stream module loaded but init method not available. Please rebuild the app.';
        LiveAudioStream = null;
      } else {
        console.log('✅ react-native-live-audio-stream module loaded successfully');
      }
    } catch (error) {
      liveAudioStreamError = `react-native-live-audio-stream not available: ${error.message}. This requires a development build and native module linking. For iOS, run "cd ios && pod install" then rebuild.`;
      console.warn(liveAudioStreamError);
      LiveAudioStream = null;
    }
  }
}

/**
 * Audio recorder service for capturing microphone input
 * Converts audio to Deepgram Flux-compatible format (16kHz, linear16, mono)
 */
class AudioRecorder {
  constructor() {
    this.recording = null;
    this.isRecording = false;
    this.onAudioData = null;
    this.audioInterval = null;
    this.recordingStatus = 'idle'; // 'idle' | 'recording' | 'paused' | 'error'
    this.liveAudioStreamInitialized = false;
    this.dataListener = null; // Store reference to the data listener for cleanup
  }

  /**
   * Request microphone permissions
   * @returns {Promise<boolean>} True if permission granted
   */
  async requestPermissions() {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting audio permissions:', error);
      return false;
    }
  }

  /**
   * Check if microphone permissions are granted
   * @returns {Promise<boolean>}
   */
  async hasPermissions() {
    try {
      const { status } = await Audio.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error checking audio permissions:', error);
      return false;
    }
  }

  /**
   * Start recording audio
   * @param {Function} onAudioData - Callback that receives audio chunks (ArrayBuffer)
   * @returns {Promise<void>}
   */
  async startRecording(onAudioData) {
    if (this.isRecording) {
      console.warn('Recording already in progress');
      return;
    }

    // Check permissions
    const hasPermission = await this.hasPermissions();
    if (!hasPermission) {
      const granted = await this.requestPermissions();
      if (!granted) {
        throw new Error('Microphone permission denied');
      }
    }

    try {
      // Configure audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      // Create recording instance
      const { recording } = await Audio.Recording.createAsync(
        {
          android: {
            extension: '.wav',
            outputFormat: Audio.AndroidOutputFormat.DEFAULT,
            audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
            sampleRate: 16000,
            numberOfChannels: 1,
            bitRate: 128000,
          },
          ios: {
            extension: '.wav',
            outputFormat: Audio.IOSOutputFormat.LINEARPCM,
            audioQuality: Audio.IOSAudioQuality.HIGH,
            sampleRate: 16000,
            numberOfChannels: 1,
            bitRate: 128000,
            linearPCMBitDepth: 16,
            linearPCMIsBigEndian: false,
            linearPCMIsFloat: false,
          },
          web: {
            mimeType: 'audio/webm',
            bitsPerSecond: 128000,
          },
        },
        async (status) => {
          // Handle recording status updates
          if (status.isRecording) {
            this.isRecording = true;
            this.recordingStatus = 'recording';
          }
        }
      );

      this.recording = recording;
      this.onAudioData = onAudioData;
      this.recordingStatus = 'recording';

      // For web platform, we need to use MediaRecorder API directly
      if (Platform.OS === 'web') {
        await this.startWebRecording(onAudioData);
      } else {
        // For native platforms, use react-native-live-audio-stream for real-time streaming
        await this.startNativeRecording(onAudioData);
      }

      return;
    } catch (error) {
      console.error('Error starting recording:', error);
      this.recordingStatus = 'error';
      throw error;
    }
  }

  /**
   * Start recording for native platforms using react-native-live-audio-stream
   * @private
   */
  async startNativeRecording(onAudioData) {
    if (!LiveAudioStream) {
      const errorMsg = liveAudioStreamError || 
        'react-native-live-audio-stream is not available. ' +
        'This requires:\n' +
        '1. A development build (not Expo Go)\n' +
        '2. Native module linking\n' +
        '3. For iOS: Run "cd ios && pod install"\n' +
        '4. Rebuild the app after installation';
      throw new Error(errorMsg);
    }
    
    // Double-check the module is still valid
    if (typeof LiveAudioStream.init !== 'function') {
      throw new Error('react-native-live-audio-stream module is not properly initialized. Please rebuild the app.');
    }

    try {
      // Configure audio stream options for Deepgram (16kHz, 16-bit PCM, mono)
      const options = {
        sampleRate: 16000,  // Deepgram requires 16kHz
        channels: 1,        // Mono channel
        bitsPerSample: 16,  // 16-bit PCM
        audioSource: 6,     // Android: VOICE_RECOGNITION (best for speech)
        bufferSize: 4096,   // Buffer size for audio chunks
      };

      // Initialize the audio stream
      if (!this.liveAudioStreamInitialized) {
        LiveAudioStream.init(options);
        this.liveAudioStreamInitialized = true;
      }

      // Remove any existing listener before adding a new one
      if (this.dataListener) {
        if (typeof LiveAudioStream.off === 'function') {
          LiveAudioStream.off('data', this.dataListener);
        } else if (typeof LiveAudioStream.removeListener === 'function') {
          LiveAudioStream.removeListener('data', this.dataListener);
        }
        this.dataListener = null;
      }

      // Set up data handler - receives base64-encoded audio chunks
      // Store listener reference for proper cleanup
      this.dataListener = (base64Data) => {
        // Only process audio if we're actually recording
        // The callback will check connection state before sending
        if (!this.isRecording || !onAudioData) return;

        try {
          // Convert base64 string to ArrayBuffer
          // Use global atob if available, otherwise use polyfill
          const atobFn = typeof atob !== 'undefined' ? atob : 
            (str) => {
              // Simple base64 decode polyfill for React Native
              const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
              let output = '';
              let i = 0;
              str = str.replace(/[^A-Za-z0-9\+\/\=]/g, '');
              while (i < str.length) {
                const enc1 = chars.indexOf(str.charAt(i++));
                const enc2 = chars.indexOf(str.charAt(i++));
                const enc3 = chars.indexOf(str.charAt(i++));
                const enc4 = chars.indexOf(str.charAt(i++));
                const chr1 = (enc1 << 2) | (enc2 >> 4);
                const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
                const chr3 = ((enc3 & 3) << 6) | enc4;
                output += String.fromCharCode(chr1);
                if (enc3 !== 64) output += String.fromCharCode(chr2);
                if (enc4 !== 64) output += String.fromCharCode(chr3);
              }
              return output;
            };
          
          const binaryString = atobFn(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          // Convert to ArrayBuffer (Deepgram expects raw PCM data)
          const arrayBuffer = bytes.buffer;
          
          // Send audio chunk to Deepgram
          // The callback should check connection state before sending
          onAudioData(arrayBuffer);
        } catch (error) {
          console.error('Error processing native audio chunk:', error);
        }
      };
      
      LiveAudioStream.on('data', this.dataListener);

      // Start streaming
      LiveAudioStream.start();
      console.log('✅ Native audio streaming started');
    } catch (error) {
      console.error('Error starting native recording:', error);
      throw error;
    }
  }

  /**
   * Start recording for web platform using MediaRecorder API
   * @private
   */
  async startWebRecording(onAudioData) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      // Use AudioContext to process audio in real-time
      const audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000,
      });

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (e) => {
        if (!this.isRecording) return;

        const inputData = e.inputBuffer.getChannelData(0);
        
        // Convert Float32Array to Int16Array (linear16 PCM)
        const int16Array = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          // Clamp and convert to 16-bit integer
          const s = Math.max(-1, Math.min(1, inputData[i]));
          int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Send audio chunk (approximately 80ms at 16kHz = 1280 samples)
        // We'll send in chunks of ~2560 bytes (1280 samples * 2 bytes)
        const chunkSize = 1280;
        for (let i = 0; i < int16Array.length; i += chunkSize) {
          const chunk = int16Array.slice(i, i + chunkSize);
          const buffer = chunk.buffer;
          onAudioData(buffer);
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      this.webStream = stream;
      this.webAudioContext = audioContext;
      this.webProcessor = processor;
    } catch (error) {
      console.error('Error starting web recording:', error);
      throw error;
    }
  }

  /**
   * Stop recording
   * @returns {Promise<string|null>} URI of recorded file (for native) or null (for web)
   */
  async stopRecording() {
    if (!this.isRecording && !this.recording) {
      return null;
    }

    try {
      this.isRecording = false;
      this.recordingStatus = 'idle';

      // Clean up web recording
      if (Platform.OS === 'web') {
        if (this.webProcessor) {
          this.webProcessor.disconnect();
        }
        if (this.webAudioContext) {
          await this.webAudioContext.close();
        }
        if (this.webStream) {
          this.webStream.getTracks().forEach(track => track.stop());
        }
        this.webStream = null;
        this.webAudioContext = null;
        this.webProcessor = null;
        return null;
      }

      // Clean up native recording
      if (LiveAudioStream && this.liveAudioStreamInitialized) {
        try {
          LiveAudioStream.stop();
          // Remove listener if method exists (react-native-live-audio-stream may not have removeAllListeners)
          if (this.dataListener) {
            if (typeof LiveAudioStream.off === 'function') {
              LiveAudioStream.off('data', this.dataListener);
            } else if (typeof LiveAudioStream.removeListener === 'function') {
              LiveAudioStream.removeListener('data', this.dataListener);
            } else if (typeof LiveAudioStream.removeAllListeners === 'function') {
              LiveAudioStream.removeAllListeners('data');
            }
            this.dataListener = null;
          }
          this.liveAudioStreamInitialized = false; // Reset for next recording
          console.log('✅ Native audio streaming stopped');
        } catch (error) {
          console.error('Error stopping native audio stream:', error);
        }
      }

      // Stop expo-av recording (kept for compatibility, but not used for streaming)
      if (this.recording) {
        try {
          await this.recording.stopAndUnloadAsync();
          const uri = this.recording.getURI();
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
          });
          this.recording = null;
          // Note: We don't return the URI since we're using live streaming
        } catch (error) {
          console.warn('Error stopping expo-av recording:', error);
        }
      }

      return null;
    } catch (error) {
      console.error('Error stopping recording:', error);
      this.recordingStatus = 'error';
      throw error;
    }
  }

  /**
   * Get current recording status
   * @returns {string} 'idle' | 'recording' | 'paused' | 'error'
   */
  getRecordingStatus() {
    return this.recordingStatus;
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    if (this.isRecording) {
      await this.stopRecording();
    }
    this.onAudioData = null;
    
    // Clean up native stream if initialized
    if (LiveAudioStream && this.liveAudioStreamInitialized) {
      try {
        LiveAudioStream.stop();
        // Remove listener if method exists (react-native-live-audio-stream may not have removeAllListeners)
        if (this.dataListener) {
          if (typeof LiveAudioStream.off === 'function') {
            LiveAudioStream.off('data', this.dataListener);
          } else if (typeof LiveAudioStream.removeListener === 'function') {
            LiveAudioStream.removeListener('data', this.dataListener);
          } else if (typeof LiveAudioStream.removeAllListeners === 'function') {
            LiveAudioStream.removeAllListeners('data');
          }
          this.dataListener = null;
        }
        this.liveAudioStreamInitialized = false;
      } catch (error) {
        console.error('Error cleaning up native audio stream:', error);
      }
    }
  }
}

// Export singleton instance
export const audioRecorder = new AudioRecorder();
export default audioRecorder;


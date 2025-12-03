import Constants from 'expo-constants';
import { logError, normalizeError } from './deepgram-error-utils';

// Deepgram API configuration
const deepgramApiKey = Constants.expoConfig?.extra?.deepgramApiKey || process.env.EXPO_PUBLIC_DEEPGRAM_API_KEY;
const DEEPGRAM_TTS_URL = 'https://api.deepgram.com/v1/speak';

if (!deepgramApiKey) {
  console.warn('⚠️ Deepgram API key not found in configuration');
  console.warn('📋 Please add deepgramApiKey to app.json extra section or set EXPO_PUBLIC_DEEPGRAM_API_KEY environment variable');
}

/**
 * Deepgram Text-to-Speech REST API client
 * Handles conversion of text to audio using Deepgram's Aura models
 */
class DeepgramTTSClient {
  constructor() {
    this.maxTextLength = 2000; // Character limit for Aura-2 and Aura-1 models
  }

  /**
   * Convert text to speech
   * @param {string} text - Text to convert to speech
   * @param {Object} options - TTS options
   * @param {string} options.model - Voice model (e.g., 'aura-2-thalia-en', 'aura-asteria-en')
   * @param {string} options.encoding - Audio encoding (e.g., 'linear16', 'mp3')
   * @param {string} options.container - Audio container format (e.g., 'wav', 'mp3')
   * @param {number} options.bit_rate - Bit rate (optional)
   * @param {number} options.sample_rate - Sample rate (optional)
   * @returns {Promise<{audioBuffer: ArrayBuffer, headers: Object}>} Audio buffer and response headers
   */
  async speak(text, options = {}) {
    if (!deepgramApiKey) {
      const error = normalizeError(new Error('Deepgram API key is not configured'), {
        stage: 'pre-request',
      });
      throw error;
    }

    // Validate text length
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      const error = normalizeError(new Error('Text cannot be empty'), {
        stage: 'validation',
      });
      throw error;
    }

    if (text.length > this.maxTextLength) {
      const error = normalizeError(new Error(`Text exceeds maximum length of ${this.maxTextLength} characters`), {
        stage: 'validation',
        textLength: text.length,
        maxLength: this.maxTextLength,
      });
      error.code = 413; // Match HTTP 413 status
      throw error;
    }

    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (options.model) {
        params.append('model', options.model);
      }
      if (options.encoding) {
        params.append('encoding', options.encoding);
      }
      if (options.container) {
        params.append('container', options.container);
      }
      if (options.bit_rate) {
        params.append('bit_rate', options.bit_rate.toString());
      }
      if (options.sample_rate) {
        params.append('sample_rate', options.sample_rate.toString());
      }

      const url = params.toString() 
        ? `${DEEPGRAM_TTS_URL}?${params.toString()}`
        : DEEPGRAM_TTS_URL;

      // Make the request
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${deepgramApiKey}`,
        },
        body: JSON.stringify({ text: text.trim() }),
      });

      // Extract response headers
      const headers = {
        'content-type': response.headers.get('content-type'),
        'dg-model-name': response.headers.get('dg-model-name'),
        'dg-model-uuid': response.headers.get('dg-model-uuid'),
        'dg-char-count': response.headers.get('dg-char-count'),
        'dg-request-id': response.headers.get('dg-request-id'),
      };

      // Handle errors
      if (!response.ok) {
        let errorMessage = `TTS request failed with status ${response.status}`;
        let errorData = null;

        // Try to parse error response
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            errorData = await response.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
          } else {
            // Sometimes errors come as text in the audio file
            const errorText = await response.text();
            if (errorText) {
              try {
                errorData = JSON.parse(errorText);
                errorMessage = errorData.message || errorData.error || errorMessage;
              } catch {
                errorMessage = errorText || errorMessage;
              }
            }
          }
        } catch (parseError) {
          console.warn('Could not parse error response:', parseError);
        }

        const error = normalizeError(new Error(errorMessage), {
          stage: 'api_request',
          status: response.status,
          statusText: response.statusText,
          errorData,
        });
        error.code = response.status;
        
        // Map HTTP status codes to error types
        if (response.status === 413) {
          error.type = 'text_too_long';
        } else if (response.status === 422) {
          error.type = 'unprocessable_content';
        } else if (response.status === 429) {
          error.type = 'rate_limit_exceeded';
        } else if (response.status === 401 || response.status === 403) {
          error.type = 'authentication_failed';
        } else {
          error.type = 'api_error';
        }

        logError(error, { handler: 'speak' });
        throw error;
      }

      // Get audio data as ArrayBuffer
      const audioBuffer = await response.arrayBuffer();

      if (!audioBuffer || audioBuffer.byteLength === 0) {
        const error = normalizeError(new Error('Received empty audio response'), {
          stage: 'response_processing',
        });
        throw error;
      }

      return {
        audioBuffer,
        headers,
      };
    } catch (error) {
      // If error is already normalized, re-throw it
      if (error.type && error.code !== undefined) {
        throw error;
      }

      // Normalize unknown errors
      const normalizedError = normalizeError(error, {
        stage: 'speak',
        textLength: text.length,
      });
      logError(normalizedError, { handler: 'speak-catch' });
      throw normalizedError;
    }
  }

  /**
   * Split text into chunks that respect the character limit
   * @param {string} text - Text to split
   * @param {number} maxLength - Maximum length per chunk (defaults to maxTextLength)
   * @returns {Array<string>} Array of text chunks
   */
  chunkText(text, maxLength = this.maxTextLength) {
    if (!text || text.length <= maxLength) {
      return [text];
    }

    const chunks = [];
    let currentChunk = '';

    // Split by sentences first (periods, exclamation marks, question marks)
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

    for (const sentence of sentences) {
      // If adding this sentence would exceed the limit
      if (currentChunk.length + sentence.length > maxLength) {
        // If current chunk has content, save it
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
        }
        // If sentence itself is too long, split by words
        if (sentence.length > maxLength) {
          const words = sentence.split(/\s+/);
          let wordChunk = '';
          for (const word of words) {
            if (wordChunk.length + word.length + 1 > maxLength) {
              if (wordChunk.trim()) {
                chunks.push(wordChunk.trim());
              }
              wordChunk = word;
            } else {
              wordChunk += (wordChunk ? ' ' : '') + word;
            }
          }
          currentChunk = wordChunk;
        } else {
          currentChunk = sentence;
        }
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      }
    }

    // Add remaining chunk
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks.filter(chunk => chunk.length > 0);
  }
}

// Export singleton instance
export const deepgramTTSClient = new DeepgramTTSClient();
export default deepgramTTSClient;


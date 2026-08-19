import AIQuestionMessage from '@/components/ai/AIQuestionMessage';
import ChatHistoryModal from '@/components/chat-history-modal';
import DevLogModal from '@/components/dev-log-modal';
import PromptsSelectionModal from '@/components/prompts-selection-modal';
import TaskSelectionModal from '@/components/task-selection-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import VoiceInputButton from '@/components/VoiceInputButton';
import { AI_SETTING_KEYS, boolFromSetting } from '@/constants/ai-settings';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSetting } from '@/hooks/use-settings';
import { useDeepgramTTS } from '@/hooks/useDeepgramTTS';
import { sendMessageToClaude } from '@/lib/claude-api';
import { formatMultipleTasksContext } from '@/lib/context-utils';
import {
    addChatMessage,
    createChatSession,
    getChatMessages,
    getLatestSessionForTask,
    updateChatSessionContextTasks,
} from '@/repositories/chat';
import { getTaskById } from '@/repositories/tasks';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const AIView = forwardRef(({ taskId, initialTask, initialSystemPrompt, showHeader = true }, ref) => {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState([
    { id: Date.now(), text: 'Hello! How can I help you today?', isUser: false },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [showPromptsModal, setShowPromptsModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showDevModal, setShowDevModal] = useState(false);
  const [apiCallLog, setApiCallLog] = useState([]);
  const { value: savedSystemPrompt } = useSetting(AI_SETTING_KEYS.DEFAULT_SYSTEM_PROMPT);
  const { value: savedVoiceMode } = useSetting(AI_SETTING_KEYS.VOICE_MODE_DEFAULT);
  const { value: savedToolsDisabled } = useSetting(AI_SETTING_KEYS.TOOLS_DISABLED_DEFAULT);

  const [systemMessage, setSystemMessage] = useState(initialSystemPrompt || null);
  const [showContextModal, setShowContextModal] = useState(false);
  const [selectedContextTasks, setSelectedContextTasks] = useState(initialTask ? [initialTask] : []);
  const [toolsDisabled, setToolsDisabled] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const scrollViewRef = useRef(null);
  const textInputRef = useRef(null);

  // Chat Session State
  const [currentSessionId, setCurrentSessionId] = useState(null);

  // ---------------------------------------------------------------------------
  // Parses a <question> block out of an AI response string.
  //
  // Expected format (no JSON — plain lines):
  //   <question>
  //   What is the question?
  //   Option one
  //   Option two
  //   </question>
  //
  // First non-empty line = question text; remaining non-empty lines = options.
  // Returns { cleanText, questionText, options } where cleanText has the block
  // stripped out, and options is [] when no block was found.
  // ---------------------------------------------------------------------------
  const parseQuestionBlock = (text) => {
    const match = text.match(/<question>([\s\S]*?)<\/question>/i);
    if (!match) return { cleanText: text, questionText: null, options: [] };

    const lines = match[1]
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    if (lines.length < 2) return { cleanText: text, questionText: null, options: [] };

    const questionText = lines[0];
    const options = lines.slice(1);
    const cleanText = text.replace(match[0], '').trim();

    return { cleanText, questionText, options };
  };

  // Handles tapping a pre-made option in an AI question bubble.
  const handleOptionSelect = (messageId, option) => {
    // Mark the question as answered (disables further taps)
    setMessages(prev =>
      prev.map(msg => msg.id === messageId ? { ...msg, answered: option } : msg)
    );
    // Tiny delay so the state flush above completes before we send
    setTimeout(() => {
      handleSendMessageWithText(option);
    }, 0);
  };

  // Handles the "Other…" button — pre-focuses the text input
  const handleOtherOption = () => {
    textInputRef.current?.focus();
  };
  
  // TTS hook
  const { speak, isPlaying, isLoading: isTTSLoading, stop, currentText } = useDeepgramTTS();
  const [playingMessageId, setPlayingMessageId] = useState(null);
  const [copiedMessageId, setCopiedMessageId] = useState(null);

  // Load messages for a session
  const loadSession = async (sessionId) => {
    if (!sessionId) {
        setMessages([
            { id: Date.now(), text: 'Hello! How can I help you today?', isUser: false },
        ]);
        setCurrentSessionId(null);
        return;
    }

    try {
      setIsLoading(true);
      const dbMessages = await getChatMessages(sessionId);
      
      if (dbMessages.length === 0) {
         // Should typically not happen if session exists, but fallback
         setMessages([
            { id: Date.now(), text: 'Hello! How can I help you today?', isUser: false },
        ]);
      } else {
          const formattedMessages = dbMessages.map(msg => ({
              id: msg.id,
              text: msg.content,
              isUser: msg.role === 'user',
          }));
          setMessages(formattedMessages);
      }
      setCurrentSessionId(sessionId);
    } catch (error) {
      console.error('Error loading session:', error);
      Alert.alert('Error', 'Failed to load chat history');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle session selection from history
  const handleSelectSession = (session) => {
      if (session) {
          loadSession(session.id);
          // Restore context tasks from session
          const restoreContextTasks = async () => {
            try {
              if (session.context_task_ids) {
                const ids = JSON.parse(session.context_task_ids);
                if (Array.isArray(ids) && ids.length > 0) {
                  const tasks = await Promise.all(ids.map(id => getTaskById(id)));
                  setSelectedContextTasks(tasks.filter(Boolean));
                  return;
                }
              }
              if (session.context_task_id) {
                const task = await getTaskById(session.context_task_id);
                if (task) setSelectedContextTasks([task]);
              }
            } catch (e) {
              console.error('Error restoring context tasks:', e);
            }
          };
          restoreContextTasks();
      } else {
          // New chat
          setMessages([
            { id: Date.now(), text: 'Hello! How can I help you today?', isUser: false },
          ]);
          setCurrentSessionId(null);
          
          if (taskId) {
              getTaskById(parseInt(taskId)).then(task => {
                 if (task) setSelectedContextTasks([task]);
              });
          } else {
              setSelectedContextTasks([]);
          }
      }
  };

  useImperativeHandle(ref, () => ({
    startNewChat: () => {
      handleSelectSession(null);
    }
  }));

  // Apply saved AI defaults (and refresh when returning from AI settings)
  useEffect(() => {
    if (!initialSystemPrompt) {
      setSystemMessage(savedSystemPrompt || null);
    }
    setVoiceMode(boolFromSetting(savedVoiceMode));
    setToolsDisabled(boolFromSetting(savedToolsDisabled));
  }, [savedSystemPrompt, savedVoiceMode, savedToolsDisabled, initialSystemPrompt]);

  // Auto-load task context when taskId is provided
  useEffect(() => {
    const loadTaskContextAndSession = async () => {
      if (taskId) {
        try {
            // Load Task Context
            if (selectedContextTasks.length === 0) {
                if (initialTask) {
                    setSelectedContextTasks([initialTask]);
                } else {
                    const task = await getTaskById(parseInt(taskId));
                    if (task) {
                        setSelectedContextTasks([task]);
                    }
                }
            }

            const existingSession = await getLatestSessionForTask(parseInt(taskId));
            if (existingSession) {
                await loadSession(existingSession.id);
            } else {
                setCurrentSessionId(null);
                setMessages([
                    { id: Date.now(), text: 'Hello! How can I help you today?', isUser: false },
                ]);
            }
        } catch (error) {
          console.error('Error loading task context:', error);
        }
      }
    };

    loadTaskContextAndSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, initialTask]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Track which message is currently playing
  useEffect(() => {
    if (!isPlaying && !isTTSLoading) {
      setPlayingMessageId(null);
    }
  }, [isPlaying, isTTSLoading]);

  // Stop playback when voice mode is disabled
  useEffect(() => {
    if (!voiceMode && isPlaying) {
      stop();
      setPlayingMessageId(null);
    }
  }, [voiceMode, isPlaying, stop]);

  // Handle automatic TTS when voice mode is active
  const handleAutoSpeak = async (messageText, messageId) => {
    // Validate text
    if (!messageText || messageText.trim() === '' || messageText === '...') {
      return;
    }

    // Stop any current playback
    if (isPlaying) {
      await stop();
    }

    // Start speaking the message
    setPlayingMessageId(messageId);
    try {
      await speak(messageText);
    } catch (error) {
      console.error('Error in auto-speak:', error);
      // Silently fail for auto-TTS - don't show alerts
      setPlayingMessageId(null);
    }
  };

  // Handle speaking a message (manual TTS)
  const handleSpeakMessage = async (messageId, messageText) => {
    // If this message is already playing, stop it
    if (playingMessageId === messageId && isPlaying) {
      await stop();
      setPlayingMessageId(null);
      return;
    }

    // Stop any current playback
    if (isPlaying) {
      await stop();
    }

    // Start speaking the new message
    setPlayingMessageId(messageId);
    try {
      await speak(messageText);
    } catch (error) {
      console.error('Error speaking message:', error);
      setPlayingMessageId(null);
      Alert.alert('Error', 'Failed to convert message to speech. Please try again.');
    }
  };

  const handleCopyMessage = async (messageId, messageText) => {
    await Clipboard.setStringAsync(messageText);
    setCopiedMessageId(messageId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  // Core send logic — accepts an optional explicit text so option-select can
  // call it without waiting for the inputText state to flush.
  const handleSendMessageWithText = async (explicitText) => {
    const trimmedInput = (explicitText ?? inputText).trim();
    if (!trimmedInput || isLoading) return;

    setInputText('');
    await _doSend(trimmedInput);
  };

  const handleSendMessage = async () => {
    const trimmedInput = inputText.trim();
    if (!trimmedInput || isLoading) return;
    setInputText('');
    await _doSend(trimmedInput);
  };

  const _doSend = async (trimmedInput) => {

    // Initialize session if needed
    let activeSessionId = currentSessionId;
    if (!activeSessionId) {
        try {
            const title = trimmedInput.length > 30
                ? trimmedInput.substring(0, 30) + '...'
                : trimmedInput;

            activeSessionId = await createChatSession(
                title,
                selectedContextTasks.map(t => t.id)
            );
            setCurrentSessionId(activeSessionId);
        } catch (error) {
            console.error('Error creating session:', error);
            Alert.alert('Error', 'Failed to start chat session');
            return;
        }
    } else if (selectedContextTasks.length > 0) {
        // Keep stored context IDs in sync with current selection
        updateChatSessionContextTasks(activeSessionId, selectedContextTasks.map(t => t.id))
          .catch(e => console.error('Error updating session context tasks:', e));
    }

    // Format context if tasks are selected
    let messageWithContext = trimmedInput;
    if (selectedContextTasks.length > 0) {
      try {
        const contextString = await formatMultipleTasksContext(selectedContextTasks);
        messageWithContext = `${contextString}\n\n${trimmedInput}`;
      } catch (error) {
        console.error('Error formatting context:', error);
        messageWithContext = trimmedInput;
      }
    }

    // Add user message immediately (show original message, not context)
    // Save to DB
    let userMessageId;
    try {
       userMessageId = await addChatMessage(activeSessionId, 'user', trimmedInput);
    } catch (error) {
        console.error('Failed to save user message', error);
    }

    const userMessage = {
      id: userMessageId || Date.now(),
      text: trimmedInput,
      isUser: true,
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Create a placeholder for AI response
    const aiMessageId = Date.now() + 1;
    setMessages(prev => [...prev, {
      id: aiMessageId,
      text: '...',
      isUser: false,
    }]);

    try {
      // Send message to Claude (with context included)
      // Note: We should pass previous messages history to Claude for context
      // Filter out system messages/loading states and map to API format
      // But for now, passing full 'messages' state is what the original code did (it seems the API wrapper handles it)
      // The API wrapper expects { text, isUser } objects.
      const response = await sendMessageToClaude(
        messageWithContext, 
        messages.filter(m => !m.type || m.type === 'text'), // Filter out tool usage messages
        systemMessage, 
        toolsDisabled,
        (name, status, toolUseId) => {
          // If running, add a new message
          if (status === 'running') {
            setMessages(prev => {
                // Check if already exists to avoid duplicates (though id should be unique)
                if (prev.some(m => m.id === toolUseId)) return prev;
                return [...prev, {
                    id: toolUseId,
                    text: `Used ${name}`,
                    isUser: false,
                    type: 'tool-usage',
                    toolName: name,
                    status: 'running'
                }];
            });
          } else if (status === 'completed') {
              // Update the message status
              setMessages(prev => prev.map(msg => 
                  msg.id === toolUseId 
                      ? { ...msg, status: 'completed' }
                      : msg
              ));
          }
        },
        (callEntry) => {
          setApiCallLog(prev => [...prev, callEntry]);
        }
      );

      if (response.error) {
        // Remove placeholder and show error
        setMessages(prev => prev.filter(msg => msg.id !== aiMessageId));
        Alert.alert('Error', response.error);
      } else {
        // Parse any <question> block embedded in the response
        const { cleanText, questionText, options } = parseQuestionBlock(response.text);

        // Save AI response to DB (store the raw text including any question block)
        let dbAiMessageId;
        try {
             dbAiMessageId = await addChatMessage(activeSessionId, 'assistant', response.text);
        } catch (error) {
            console.error('Failed to save AI message', error);
        }

        // Update placeholder with actual response (stripped of question block)
        setMessages(prev => prev.map(msg =>
          msg.id === aiMessageId
            ? {
                ...msg,
                text: cleanText,
                id: dbAiMessageId || msg.id,
                ...(options.length > 0 ? { questionText, options, answered: null } : {}),
              }
            : msg
        ));

        // Update session title if it was the first message and we want to be smarter?
        // (We already set it to user input, which is fine for now)

        // Auto-play TTS if voice mode is active
        if (voiceMode && response.text && response.text.trim() !== '' && response.text !== '...') {
          // Use setTimeout to ensure message state is updated before TTS
          setTimeout(() => {
            handleAutoSpeak(response.text, dbAiMessageId || aiMessageId);
          }, 100);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.filter(msg => msg.id !== aiMessageId));
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    if (messages.length > 1) {
      Alert.alert(
        'New Chat',
        'Start a new chat? The current conversation will be saved.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'New Chat', 
            onPress: () => handleSelectSession(null) 
          }
        ]
      );
    } else {
      handleSelectSession(null);
    }
  };

  const handleLinkPress = (url) => {
    if (url.startsWith('/')) {
      // Internal link
      try {
        router.push(url);
        return false; // Prevent default behavior
      } catch (error) {
        Alert.alert('Navigation Error', `Could not navigate to ${url}`);
        return false;
      }
    } else {
      // External link - let default behavior handle it (opens in browser)
      return true;
    }
  };

  // Custom Link Component mimicking Cursor AI
  const CustomLink = ({ href, children }) => {
    const isTask = href.startsWith('/task/');
    const isProject = href.startsWith('/project/');
    const isInternal = isTask || isProject;
    
    const isDark = colorScheme === 'dark';

    if (isInternal) {
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
            <Text 
                style={[
                    styles.cursorLink,
                    isDark ? styles.cursorLinkDark : styles.cursorLinkLight,
                ]}
                onPress={() => handleLinkPress(href)}
            >
                <Text style={{ fontSize: 14, color: isDark ? '#A1A1AA' : '#52525B' }}>
                    {isTask ? '📄 ' : isProject ? '📂 ' : '🔗 '}
                </Text>
                <Text style={[
                    styles.cursorLinkText, 
                    { color: isDark ? '#E4E4E7' : '#27272A' }
                ]}>
                    {children}
                </Text>
            </Text>
        </View>
      );
    }

    // Default Link
    return (
      <Text 
        style={{ color: '#0a7ea4', textDecorationLine: 'underline' }}
        onPress={() => handleLinkPress(href)}
      >
        {children}
      </Text>
    );
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      {showHeader && (
        <ThemedView style={styles.header}>
          <View style={styles.headerButtons}>
            <TouchableOpacity 
                style={styles.headerButton}
                onPress={handleNewChat}
            >
                <Ionicons name="create-outline" size={24} color={colorScheme === 'dark' ? '#ECEDEE' : '#11181C'} />
            </TouchableOpacity>
            <TouchableOpacity 
                style={styles.headerButton}
                onPress={() => setShowHistoryModal(true)}
            >
                <Ionicons name="time-outline" size={24} color={colorScheme === 'dark' ? '#ECEDEE' : '#11181C'} />
            </TouchableOpacity>
            <TouchableOpacity
                style={[
                  styles.headerButton,
                  apiCallLog.length > 0 && { position: 'relative' }
                ]}
                onPress={() => setShowDevModal(true)}
            >
                <Ionicons name="bug-outline" size={24} color={colorScheme === 'dark' ? '#60A5FA' : '#2563eb'} />
                {apiCallLog.length > 0 && (
                  <View style={[styles.callBadge, { backgroundColor: '#60A5FA' }]}>
                    <ThemedText style={styles.callBadgeText}>{apiCallLog.length > 99 ? '99+' : String(apiCallLog.length)}</ThemedText>
                  </View>
                )}
            </TouchableOpacity>
            <TouchableOpacity 
                style={styles.headerButton}
                onPress={() => router.push('/ai-settings')}
            >
                <Ionicons name="settings-outline" size={24} color={colorScheme === 'dark' ? '#ECEDEE' : '#11181C'} />
            </TouchableOpacity>
          </View>
        </ThemedView>
      )}

      {/* Messages List */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView 
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageRow,
                message.isUser
                  ? { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#F7F7F8' }
                  : (message.type === 'tool-usage' ? styles.toolMessageRow : null),
              ]}
            >
              <View style={[styles.messageContent, message.type === 'tool-usage' && styles.messageContentCompact]}>
              {message.text === '...' && !message.isUser ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={colorScheme === 'dark' ? '#ECEDEE' : '#11181C'} />
                </View>
              ) : message.type === 'tool-usage' ? (
                <View style={styles.toolUsageContainer}>
                    <Ionicons 
                        name="hammer-outline" 
                        size={14} 
                        color={colorScheme === 'dark' ? '#9BA1A6' : '#687076'} 
                    />
                    <ThemedText style={styles.toolUsageText}>
                        {message.text}
                    </ThemedText>
                </View>
              ) : (
                <>
                  {message.isUser ? (
                    <>
                      <ThemedText
                        style={[
                          styles.messageText,
                          styles.userMessageText,
                        ]}
                      >
                        {message.text}
                      </ThemedText>
                      <TouchableOpacity
                        style={[
                          styles.copyButton,
                          {
                            backgroundColor: copiedMessageId === message.id
                              ? (colorScheme === 'dark' ? 'rgba(10, 126, 164, 0.3)' : 'rgba(10, 126, 164, 0.2)')
                              : (colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'),
                          },
                        ]}
                        activeOpacity={0.7}
                        onPress={() => handleCopyMessage(message.id, message.text)}
                      >
                        <Ionicons
                          name={copiedMessageId === message.id ? 'checkmark' : 'copy-outline'}
                          size={14}
                          color={colorScheme === 'dark' ? '#ECEDEE' : '#11181C'}
                        />
                      </TouchableOpacity>
                    </>
                  ) : (
                    <Markdown
                      style={{
                        body: {
                          fontSize: 16,
                          lineHeight: 24,
                          color: colorScheme === 'dark' ? '#ECEDEE' : '#11181C',
                        },
                        heading1: {
                          fontSize: 24,
                          fontWeight: 'bold',
                          color: colorScheme === 'dark' ? '#ECEDEE' : '#11181C',
                          marginBottom: 10,
                        },
                        heading2: {
                          fontSize: 20,
                          fontWeight: 'bold',
                          color: colorScheme === 'dark' ? '#ECEDEE' : '#11181C',
                          marginBottom: 10,
                        },
                        strong: {
                          fontWeight: 'bold',
                          color: colorScheme === 'dark' ? '#ECEDEE' : '#11181C',
                        },
                        code_inline: {
                          backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                          color: colorScheme === 'dark' ? '#ECEDEE' : '#11181C',
                          borderRadius: 4,
                          fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                        },
                        fence: {
                          backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                          borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                          color: colorScheme === 'dark' ? '#ECEDEE' : '#11181C',
                        },
                        blockquote: {
                          backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                          borderLeftColor: '#0a7ea4',
                          borderLeftWidth: 4,
                          paddingLeft: 12,
                          paddingVertical: 4,
                        },
                        bullet_list: {
                          marginVertical: 8,
                        },
                        ordered_list: {
                          marginVertical: 8,
                        },
                        bullet_list_icon: {
                          color: colorScheme === 'dark' ? '#ECEDEE' : '#11181C',
                          marginLeft: 8,
                        },
                        ordered_list_icon: {
                          color: colorScheme === 'dark' ? '#ECEDEE' : '#11181C',
                          marginLeft: 8,
                        },
                        link: {
                          color: '#0a7ea4',
                        },
                        paragraph: {
                            flexWrap: 'wrap',
                            flexDirection: 'row',
                            alignItems: 'center',
                        }
                      }}
                      rules={{
                        link: (node, children, parent, styles) => {
                            return (
                                <CustomLink key={node.key} href={node.attributes.href}>
                                    {children}
                                </CustomLink>
                            );
                        }
                      }}
                    >
                      {message.text}
                    </Markdown>
                  )}
                  {/* Structured question options */}
                  {!message.isUser && message.options?.length > 0 && (
                    <AIQuestionMessage
                      questionText={message.questionText}
                      options={message.options}
                      answered={message.answered}
                      onSelect={(option) => handleOptionSelect(message.id, option)}
                      onOther={handleOtherOption}
                    />
                  )}

                  {!message.isUser && message.text !== '...' && (
                    <View style={styles.messageActions}>
                      <TouchableOpacity
                        style={[
                          styles.microphoneButton,
                          {
                            backgroundColor: playingMessageId === message.id && (isPlaying || isTTSLoading)
                              ? (colorScheme === 'dark' ? 'rgba(10, 126, 164, 0.3)' : 'rgba(10, 126, 164, 0.2)')
                              : (colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'),
                          },
                        ]}
                        activeOpacity={0.7}
                        onPress={() => handleSpeakMessage(message.id, message.text)}
                        disabled={isTTSLoading && playingMessageId !== message.id}
                      >
                        {isTTSLoading && playingMessageId === message.id ? (
                          <ActivityIndicator
                            size="small"
                            color={colorScheme === 'dark' ? '#ECEDEE' : '#11181C'}
                          />
                        ) : isPlaying && playingMessageId === message.id ? (
                          <Ionicons
                            name="stop-circle"
                            size={16}
                            color={colorScheme === 'dark' ? '#ECEDEE' : '#11181C'}
                          />
                        ) : (
                          <Ionicons
                            name="mic"
                            size={16}
                            color={colorScheme === 'dark' ? '#ECEDEE' : '#11181C'}
                          />
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.copyButton,
                          {
                            backgroundColor: copiedMessageId === message.id
                              ? (colorScheme === 'dark' ? 'rgba(10, 126, 164, 0.3)' : 'rgba(10, 126, 164, 0.2)')
                              : (colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'),
                          },
                        ]}
                        activeOpacity={0.7}
                        onPress={() => handleCopyMessage(message.id, message.text)}
                      >
                        <Ionicons
                          name={copiedMessageId === message.id ? 'checkmark' : 'copy-outline'}
                          size={14}
                          color={colorScheme === 'dark' ? '#ECEDEE' : '#11181C'}
                        />
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Mini Buttons */}
        <ThemedView style={styles.miniButtonsContainer}>
          <TouchableOpacity
            style={[
              styles.miniButton,
              {
                backgroundColor: systemMessage 
                  ? (colorScheme === 'dark' ? '#0a7ea4' : '#0a7ea4') 
                  : (colorScheme === 'dark' ? '#3A3A3A' : '#E0E0E0'),
              },
            ]}
            activeOpacity={0.7}
            onPress={() => setShowPromptsModal(true)}
          >
            <ThemedText style={[
              styles.miniButtonText,
              systemMessage && styles.miniButtonTextActive
            ]}>
              Prompts{systemMessage ? ' ✓' : ''}
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.miniButton,
              {
                backgroundColor: selectedContextTasks.length > 0
                  ? '#0a7ea4'
                  : (colorScheme === 'dark' ? '#3A3A3A' : '#E0E0E0'),
              },
            ]}
            activeOpacity={0.7}
            onPress={() => setShowContextModal(true)}
          >
            <ThemedText style={[
              styles.miniButtonText,
              selectedContextTasks.length > 0 && styles.miniButtonTextActive
            ]}>
              {selectedContextTasks.length > 0
                ? `Context (${selectedContextTasks.length})`
                : 'Context'}
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.miniButton,
              {
                backgroundColor: toolsDisabled 
                  ? (colorScheme === 'dark' ? '#0a7ea4' : '#0a7ea4') 
                  : (colorScheme === 'dark' ? '#3A3A3A' : '#E0E0E0'),
              },
            ]}
            activeOpacity={0.7}
            onPress={() => setToolsDisabled(!toolsDisabled)}
          >
            <ThemedText style={[
              styles.miniButtonText,
              toolsDisabled && styles.miniButtonTextActive
            ]}>
              No Tools{toolsDisabled ? ' ✓' : ''}
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.miniButton,
              {
                backgroundColor: voiceMode 
                  ? (colorScheme === 'dark' ? '#0a7ea4' : '#0a7ea4') 
                  : (colorScheme === 'dark' ? '#3A3A3A' : '#E0E0E0'),
              },
            ]}
            activeOpacity={0.7}
            onPress={async () => {
              const newVoiceMode = !voiceMode;
              setVoiceMode(newVoiceMode);
              
              // If disabling voice mode, stop any current playback
              if (!newVoiceMode && isPlaying) {
                await stop();
                setPlayingMessageId(null);
              }
            }}
          >
            <ThemedText style={[
              styles.miniButtonText,
              voiceMode && styles.miniButtonTextActive
            ]}>
              Voice Mode{voiceMode ? ' ✓' : ''}
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>

        {/* Input Area */}
        <ThemedView style={[
          styles.inputContainer,
          { paddingBottom: Platform.OS === 'ios' ? 28 : Math.max(insets.bottom + 10, 10) }
        ]}>
          <TextInput
            ref={textInputRef}
            style={[
              styles.textInput,
              {
                color: colorScheme === 'dark' ? '#ECEDEE' : '#11181C',
                borderColor: colorScheme === 'dark' ? '#3A3A3A' : '#E0E0E0',
              },
            ]}
            placeholder="Type your message..."
            placeholderTextColor={colorScheme === 'dark' ? '#9BA1A6' : '#687076'}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
            onSubmitEditing={handleSendMessage}
            returnKeyType="send"
            editable={!isLoading}
          />
          <VoiceInputButton
            onTranscriptReady={(text) => {
              // Update input field with transcription text in real-time
              // Accept empty string to allow clearing
              setInputText(text || '');
            }}
            disabled={isLoading}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor: (inputText.trim() && !isLoading) ? '#0a7ea4' : '#9BA1A6',
              },
            ]}
            disabled={!inputText.trim() || isLoading}
            onPress={handleSendMessage}
            activeOpacity={0.7}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="send" size={20} color="white" />
            )}
          </TouchableOpacity>
        </ThemedView>
      </KeyboardAvoidingView>

      {/* Prompts Selection Modal */}
      <PromptsSelectionModal
        visible={showPromptsModal}
        onClose={() => setShowPromptsModal(false)}
        onSelectPrompt={(prompt) => {
          setSystemMessage(prompt);
        }}
      />

      {/* Task Selection Modal */}
      <TaskSelectionModal
        visible={showContextModal}
        onClose={() => setShowContextModal(false)}
        onUpdateTasks={(tasks) => setSelectedContextTasks(tasks)}
        selectedTasks={selectedContextTasks}
      />

      {/* Chat History Modal */}
      <ChatHistoryModal
        visible={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        onSelectSession={handleSelectSession}
        currentSessionId={currentSessionId}
      />

      {/* Dev Log Modal */}
      <DevLogModal
        visible={showDevModal}
        onClose={() => setShowDevModal(false)}
        calls={apiCallLog}
      />
    </ThemedView>
  );
});

export default AIView;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 24,
    fontWeight: '600',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: -8,
  },
  headerButton: {
    padding: 8,
  },
  callBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  callBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#ffffff',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 0,
  },
  messageRow: {
    width: '100%',
  },
  messageContent: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  messageContentCompact: {
    paddingVertical: 6,
  },
  toolUsageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    opacity: 0.8,
  },
  toolUsageText: {
    fontSize: 12,
    color: '#9BA1A6', // Neutral gray
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  toolMessageRow: {
    backgroundColor: 'transparent',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
  },
  userMessageText: {},
  loadingContainer: {
    paddingVertical: 8,
  },
  messageActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  microphoneButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  copyButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    alignItems: 'flex-end',
    gap: 8,
    position: 'relative',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 120,
    minHeight: 48,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 4,
    gap: 8,
  },
  miniButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  miniButtonTextActive: {
    color: '#FFFFFF',
  },
  cursorLink: {
      // Simulates a View container but for Text nesting
      paddingHorizontal: 6,
      borderRadius: 6,
      borderWidth: 1,
      overflow: 'hidden',
      // Vertical align adjustment often needed for nested text on iOS
      lineHeight: Platform.OS === 'ios' ? 22 : 24,
  },
  cursorLinkDark: {
      backgroundColor: '#18181B', // Zinc 900
      borderColor: '#27272A',    // Zinc 800
  },
  cursorLinkLight: {
      backgroundColor: '#F4F4F5', // Zinc 100
      borderColor: '#E4E4E7',    // Zinc 200
  },
  cursorLinkText: {
      fontWeight: '500',
      fontSize: 14,
  }
});

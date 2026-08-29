import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Image,
  Text,
  Alert,
  NativeModules,
} from 'react-native';
import Voice from '@react-native-voice/voice';
import Tts from 'react-native-tts';
import { Mic, Send, X, Volume2 } from 'lucide-react-native';
import { useTheme } from '../theme/theme';

const hasNativeVoice = !!NativeModules.Voice && typeof NativeModules.Voice.startSpeech === 'function';

const { height } = Dimensions.get('window');
const MODAL_HEIGHT = height * 0.35;
const YELLOW = '#FFC400';

export const VoiceChatModal = ({
  visible,
  onClose,
  imageUri,
  onSubmit,
}) => {
  const theme = useTheme();
  const inputRef = useRef(null);
  const voiceRef = useRef(null);
  const [question, setQuestion] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [submitted, setSubmitted] = useState('');
  const [messages, setMessages] = useState([]);
  const [voiceAvailable, setVoiceAvailable] = useState(true);

  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 250);
    }
  }, [visible]);

  useEffect(() => {
    // Initialize Voice with proper error handling
    const initializeVoice = () => {
      try {
        if (hasNativeVoice && Voice) {
          voiceRef.current = Voice;

          Voice.onSpeechResults = (event) => {
            const text = event.value?.[0]?.trim();
            setIsListening(false);
            if (text) {
              setQuestion('');
              setSubmitted(text);
              handleSubmit(text);
            }
          };

          Voice.onSpeechError = (event) => {
            setIsListening(false);
            console.error('Speech error:', event.error);
            Alert.alert('Voice Error', event.error || 'Could not process speech. Please try again.');
          };

          Voice.onSpeechStart = () => {
            console.log('Speech recording started');
          };

          Voice.onSpeechEnd = () => {
            console.log('Speech recording ended');
          };
          setVoiceAvailable(true);
          return;
        }

        setVoiceAvailable(false);
        console.warn('Voice module not available');
      } catch (error) {
        console.error('Voice initialization error:', error);
        setVoiceAvailable(false);
      }
    };

    initializeVoice();

    return () => {
      if (voiceRef.current && hasNativeVoice) {
        try {
          voiceRef.current.destroy?.().catch(() => {});
        } catch (error) {
          console.error('Voice cleanup error:', error);
        }
      }
    };
  }, []);

  const startListening = async () => {
    try {
      if (!hasNativeVoice || !Voice || !voiceRef.current) {
        Alert.alert('Error', 'Voice recognition is not available on this device.');
        setVoiceAvailable(false);
        return;
      }

      setIsListening(true);

      try {
        await Voice.stop?.();
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (e) {
        console.warn('Error stopping previous voice:', e);
      }

      await Voice.start('en-US');
    } catch (error) {
      setIsListening(false);
      console.error('Voice start error:', error);
      Alert.alert('Error', `Could not start voice recognition: ${error.message || error}`);
    }
  };

  const stopListening = async () => {
    try {
      if (voiceRef.current && hasNativeVoice) {
        await voiceRef.current.stop?.();
      }
      setIsListening(false);
    } catch (error) {
      setIsListening(false);
      console.error('Voice stop error:', error);
    }
  };

  const handleSubmit = async (textToSubmit) => {
    const text = (textToSubmit || question).trim();
    if (text) {
      setQuestion('');
      setSubmitted(text);

      setMessages([...messages, { id: Date.now(), text, sender: 'user' }]);

      if (onSubmit) {
        onSubmit(text);
      }
    }
  };

  const handleSpeakText = async () => {
    const text = submitted?.trim();
    if (!text) return;

    try {
      if (!Tts || typeof Tts.speak !== 'function') {
        Alert.alert('Text-to-speech', 'Text-to-speech is not available on this device.');
        return;
      }
      Tts.stop();
      Tts.setDefaultLanguage('en-US');
      Tts.setDefaultRate(0.9);
      Tts.setDefaultPitch(1);
      Tts.speak(text);
    } catch (error) {
      Alert.alert('Text-to-speech', error?.message || 'Unable to play the spoken response.');
    }
  };

  const handleClose = () => {
    if (isListening) {
      stopListening();
    }

    try {
      if (hasNativeVoice && voiceRef.current) {
        voiceRef.current.cancel?.().catch(() => {});
      }
    } catch (error) {
      console.error('Cancel error:', error);
    }

    setIsListening(false);
    setQuestion('');
    setSubmitted('');
    setMessages([]);
    onClose?.();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
          style={styles.keyboardAvoid}
        >
          <Pressable
            style={[styles.sheet, { backgroundColor: theme.colors.card }]}
            onPress={() => {}}
          >
            {/* Handle bar */}
            <View style={[styles.handle, { backgroundColor: theme.colors.border }]} />

            {/* Header with image and info */}
            <View style={styles.header}>
              <View style={styles.headerContent}>
                {imageUri && (
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.thumbnail}
                    resizeMode="cover"
                  />
                )}
                <View style={styles.headerText}>
                  <Text style={[styles.title, { color: theme.colors.text }]}>
                    Ask about this image
                  </Text>
                  <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                    VisionIQ is ready to help
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                <X color={theme.colors.text} size={20} />
              </TouchableOpacity>
            </View>

            {submitted && (
              <View style={styles.messageContainer}>
                <View style={styles.messageRow}>
                  <View style={styles.messageTextWrap}>
                    <Text style={[styles.messageLabel, { color: theme.colors.textSecondary }]}>
                      Submitted
                    </Text>
                    <Text style={[styles.submittedText, { color: theme.colors.text }]}>
                      "{submitted}"
                    </Text>
                  </View>
                  <TouchableOpacity onPress={handleSpeakText} style={styles.playButton}>
                    <Volume2 color={YELLOW} size={18} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View
              style={[
                styles.inputContainer,
                { borderTopColor: theme.colors.border },
              ]}
            >
              <TextInput
                ref={inputRef}
                value={question}
                onChangeText={setQuestion}
                onSubmitEditing={() => handleSubmit()}
                placeholder="Ask anything about this image..."
                placeholderTextColor={theme.colors.textMuted}
                style={[
                  styles.input,
                  {
                    color: theme.colors.text,
                    backgroundColor: theme.colors.cardDark,
                  },
                ]}
                returnKeyType="send"
              />

              {/* Mic Button */}
              <TouchableOpacity
                onPress={() => {
                  if (!voiceAvailable) {
                    Alert.alert('Voice Not Available', 'Voice recognition is not available on this device. Please use text input instead.');
                    return;
                  }
                  if (isListening) {
                    stopListening();
                  } else {
                    startListening();
                  }
                }}
                disabled={!voiceAvailable}
                style={[
                  styles.micButton,
                  isListening && { backgroundColor: YELLOW + '30' },
                  !voiceAvailable && { opacity: 0.5 },
                ]}
              >
                <Mic
                  color={isListening ? YELLOW : (voiceAvailable ? theme.colors.textMuted : theme.colors.textMuted)}
                  size={20}
                  strokeWidth={isListening ? 2.5 : 2}
                />
              </TouchableOpacity>

              {/* Send Button */}
              <TouchableOpacity
                onPress={() => handleSubmit()}
                style={[
                  styles.sendButton,
                  { backgroundColor: YELLOW },
                ]}
              >
                <Send color="#000" size={18} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  keyboardAvoid: {
    flex: 0,
    height: MODAL_HEIGHT,
  },
  sheet: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginTop: 8,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 12,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnail: {
    width: 44,
    height: 44,
    borderRadius: 8,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 8,
  },
  messageContainer: {
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  messageTextWrap: {
    flex: 1,
  },
  messageLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  submittedText: {
    fontSize: 13,
    fontWeight: '500',
    fontStyle: 'italic',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  playButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 196, 0, 0.12)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 12,
    gap: 8,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '500',
  },
  micButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 196, 0, 0.1)',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default VoiceChatModal;

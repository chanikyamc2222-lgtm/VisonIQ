import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  TouchableOpacity,
  Keyboard,
  Platform,
  Dimensions,
  Image,
  Text,
  Alert,
  PermissionsAndroid,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import Tts from 'react-native-tts';
import { Mic, Send, X } from 'lucide-react-native';
import { useTheme } from '../theme/theme';
import { visionApi } from '../services/api/visionApi';
import { startNativeVoiceRecognition, stopNativeVoiceRecognition } from '../services/api/localLLMService';

const { height } = Dimensions.get('window');
const YELLOW = '#FFC400';

// ─── Mic permission helper ────────────────────────────────────────────────────
const requestMicPermission = async () => {
  if (Platform.OS !== 'android') return true;
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: 'Microphone Permission',
        message: 'VisionIQ needs microphone access to understand your voice questions.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (e) {
    console.warn('[VoiceChatModal] Mic permission error:', e);
    return false;
  }
};

export const VoiceChatModal = ({
  visible,
  onClose,
  imageUri,
  onSubmit,
}) => {
  const theme = useTheme();
  const inputRef = useRef(null);
  // Keep imageUri in a ref so handleSubmit always reads the latest value (no stale closure)
  const imageUriRef = useRef(imageUri);
  const [question, setQuestion] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [submitted, setSubmitted] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  // Keep ref in sync with prop
  useEffect(() => {
    imageUriRef.current = imageUri;
  }, [imageUri]);

  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 250);
    }
  }, [visible]);

  // When imageUri changes (new image selected), reset conversation and re-analyze
  useEffect(() => {
    if (visible && imageUri) {
      setMessages([]);
      setSubmitted('');

      (async () => {
        setLoading(true);
        try {
          console.log('[VoiceChatModal] Analyzing new image:', imageUri);
          const res = await visionApi.analyzeImage({ imageUri });
          const initialText = res.result?.summary || res.answer || 'Image analyzed successfully.';
          setMessages([{ id: Date.now(), text: initialText, sender: 'ai' }]);
        } catch (err) {
          console.warn('[VoiceChatModal] Initial image analysis error:', err);
          setMessages([{ id: Date.now(), text: `Could not analyze image: ${err.message}`, sender: 'ai' }]);
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [visible, imageUri]);

  const startListening = async () => {
    // Request mic permission first
    const hasMicPermission = await requestMicPermission();
    if (!hasMicPermission) {
      Alert.alert(
        'Microphone Permission Required',
        'Please allow microphone access in Settings to use voice input.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setIsListening(true);
      const spokenText = await startNativeVoiceRecognition();
      setIsListening(false);
      if (spokenText?.trim()) {
        handleSubmit(spokenText.trim());
      }
    } catch (err) {
      setIsListening(false);
      console.warn('[VoiceChatModal] Voice recognition error:', err);
      Alert.alert('Voice Input', err.message || 'Could not recognize speech. Please type your question instead.');
    }
  };

  const stopListening = async () => {
    try {
      await stopNativeVoiceRecognition();
    } catch (e) {
      console.warn('[VoiceChatModal] stopListening error:', e);
    } finally {
      setIsListening(false);
    }
  };

  const handleSubmit = async (textToSubmit) => {
    const text = (textToSubmit || question).trim();
    if (text) {
      setQuestion('');
      setSubmitted(text);

      const userMsg = { id: Date.now(), text, sender: 'user' };
      setMessages(prev => [...prev, userMsg]);

      if (onSubmit) {
        onSubmit(text);
      }

      setLoading(true);
      try {
        const res = await visionApi.askChat({ sessionId: `session_${Date.now()}`, message: text, imageUri: imageUriRef.current });
        const aiText = res.answer || res.result?.summary || (typeof res === 'string' ? res : JSON.stringify(res));
        const aiMsg = { id: Date.now() + 1, text: aiText, sender: 'ai' };
        setMessages(prev => [...prev, aiMsg]);
      } catch (err) {
        const errMsg = { id: Date.now() + 1, text: `Analysis error: ${err.message || err}`, sender: 'ai' };
        setMessages(prev => [...prev, errMsg]);
      } finally {
        setLoading(false);
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

    setIsListening(false);
    setQuestion('');
    setSubmitted('');
    setMessages([]);
    onClose?.();
  };

  const [keyboardPadding, setKeyboardPadding] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardPadding(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardPadding(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <View style={{ width: '100%', paddingBottom: keyboardPadding, justifyContent: 'flex-end' }}>
          <View style={[styles.sheet, { backgroundColor: theme.colors.card }]}>
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

            <ScrollView style={{ flex: 1, marginVertical: 8 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={true}>
              {messages.map((msg, index) => (
                <View
                  key={msg.id || index}
                  style={{
                    marginVertical: 4,
                    alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                    backgroundColor: msg.sender === 'user' ? YELLOW + '20' : '#222',
                    borderColor: msg.sender === 'user' ? YELLOW : '#444',
                    borderWidth: 1,
                    borderRadius: 12,
                    padding: 10,
                    maxWidth: '88%',
                  }}
                >
                  <Text style={{ color: msg.sender === 'user' ? YELLOW : '#fff', fontSize: 13, lineHeight: 18 }}>
                    {msg.text}
                  </Text>
                </View>
              ))}
              {loading && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 6 }}>
                  <ActivityIndicator color={YELLOW} size="small" style={{ marginRight: 8 }} />
                  <Text style={{ color: YELLOW, fontSize: 12, fontWeight: '600' }}>Analyzing image with Gemma AI...</Text>
                </View>
              )}
            </ScrollView>

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
                  if (isListening) {
                    stopListening();
                  } else {
                    startListening();
                  }
                }}
                style={[
                  styles.micButton,
                  isListening && { backgroundColor: YELLOW + '30' },
                ]}
              >
                <Mic
                  color={isListening ? YELLOW : YELLOW}
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
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
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

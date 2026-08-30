import { NativeModules, Platform } from 'react-native';

const { LiteRTLMModule } = NativeModules;

export const DEFAULT_MODEL_FILENAME = 'gemma-4-e2b-it.litertlm';
export const DEFAULT_MODEL_PATH = `/storage/emulated/0/Download/${DEFAULT_MODEL_FILENAME}`;

/**
 * Check if local Gemma model file exists on device storage
 */
export const checkLocalModelAvailable = async () => {
  if (Platform.OS !== 'android' || !LiteRTLMModule) {
    return { exists: false, path: DEFAULT_MODEL_PATH, reason: 'Native module not available on this platform' };
  }
  try {
    return await LiteRTLMModule.checkModelStatus();
  } catch (error) {
    console.warn('[localLLM] checkModelStatus error:', error);
    return { exists: false, path: DEFAULT_MODEL_PATH, error: error.message };
  }
};

/**
 * Analyze an image using the on-device Gemma model.
 * Returns real AI-generated description of the image.
 */
export const analyzeImageLocal = async (imageUri, prompt = '', customModelPath = null) => {
  if (Platform.OS !== 'android' || !LiteRTLMModule) {
    throw new Error('Local Gemma inference native module is not available.');
  }
  const modelPath = customModelPath || DEFAULT_MODEL_PATH;
  // Kotlin returns: { sessionId, prompt, result: { summary, modelUsed, isLocalInference } }
  const result = await LiteRTLMModule.analyzeImageWithLocalModel(imageUri, prompt, modelPath);
  return result;
};

/**
 * Ask a question about an image (or plain text question) using the on-device Gemma model.
 * imageUri is optional — if provided, the image is encoded and sent along with the question.
 * Returns: { sessionId, answer, isLocalInference }
 */
export const askChatLocal = async (sessionId, message, imageUri = null) => {
  if (Platform.OS !== 'android' || !LiteRTLMModule) {
    throw new Error('Local Gemma inference native module is not available.');
  }
  const result = await LiteRTLMModule.askChatWithLocalModel(
    sessionId || '',
    message || '',
    imageUri || ''
  );
  return result;
};

/**
 * Start native Android Speech Recognition
 */
export const startNativeVoiceRecognition = async () => {
  if (Platform.OS !== 'android' || !LiteRTLMModule || typeof LiteRTLMModule.startSpeechRecognition !== 'function') {
    throw new Error('Native speech recognition is not supported on this device.');
  }
  try {
    const res = await LiteRTLMModule.startSpeechRecognition();
    return res?.text || '';
  } catch (e) {
    return '';
  }
};

/**
 * Stop native Android Speech Recognition
 */
export const stopNativeVoiceRecognition = async () => {
  if (Platform.OS === 'android' && LiteRTLMModule && typeof LiteRTLMModule.stopSpeechRecognition === 'function') {
    try {
      await LiteRTLMModule.stopSpeechRecognition();
    } catch (e) {
      console.warn('[localLLM] stopSpeechRecognition error:', e);
    }
  }
};

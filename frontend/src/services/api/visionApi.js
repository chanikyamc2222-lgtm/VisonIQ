import { API_BASE_URL } from '../../constants';
import {
  checkLocalModelAvailable,
  analyzeImageLocal,
  askChatLocal,
} from './localLLMService';

const request = async (endpoint, method, body) => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json();
};

export const visionApi = {
  checkLocalModel: async () => {
    return await checkLocalModelAvailable();
  },

  analyzeImage: async payload => {
    const { imageUri, prompt } = payload || {};
    console.log('[visionApi] analyzeImage called, imageUri:', imageUri);

    if (!imageUri) {
      throw new Error('No imageUri provided.');
    }

    // Attempt on-device Gemma inference and report errors directly
    try {
      const localResult = await analyzeImageLocal(imageUri, prompt || '', null);
      console.log('[visionApi] Local Gemma analyze result:', localResult);
      return localResult;
    } catch (localErr) {
      console.error('[visionApi] Local Gemma inference failed:', localErr);
      throw new Error(`On-device model failed: ${localErr.message || localErr}. Please check if the model is located in your Downloads folder and storage permissions are granted.`);
    }
  },

  askChat: async payload => {
    const { sessionId, message, imageUri } = payload || {};
    console.log('[visionApi] askChat called, message:', message, 'imageUri:', imageUri);

    // Attempt on-device Gemma chat and report errors directly
    try {
      const localResult = await askChatLocal(sessionId, message, imageUri || null);
      console.log('[visionApi] Local Gemma chat result:', localResult);
      return localResult;
    } catch (localErr) {
      console.error('[visionApi] Local Gemma chat failed:', localErr);
      throw new Error(`On-device chat failed: ${localErr.message || localErr}. Please check if the model is located in your Downloads folder and storage permissions are granted.`);
    }
  },
};


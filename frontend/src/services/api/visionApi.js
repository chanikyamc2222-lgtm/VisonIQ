import { API_BASE_URL } from '../../constants';

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
  analyzeImage: async payload => request('/vision/analyze', 'POST', payload),
  askChat: async payload => request('/chat', 'POST', payload),
};

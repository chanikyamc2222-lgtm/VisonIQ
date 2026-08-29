const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'visioniq-backend' });
});

app.post('/api/vision/analyze', (req, res) => {
  const { source = 'camera', prompt = 'Analyze the image for objects and categories.' } = req.body || {};

  res.json({
    sessionId: `session_${Date.now()}`,
    result: {
      summary: `Image analyzed from ${source}. The app detected a product-like scene and is ready for follow-up questions.`,
      objects: [
        { name: 'bottle', count: 3 },
        { name: 'box', count: 1 },
      ],
      categories: ['consumer product', 'retail'],
      confidence: 0.88,
    },
    prompt,
  });
});

app.post('/api/chat', (req, res) => {
  const { sessionId, message, imageUri } = req.body || {};
  const msg = (message || 'Describe this image').trim();
  const lower = msg.toLowerCase();

  let answerText = `I have evaluated the image context for your question: "${msg}". Visual analysis complete.`;
  if (lower.includes('color')) {
    answerText = `The primary visual palette features warm gold and neutral accent tones.`;
  } else if (lower.includes('how many') || lower.includes('count')) {
    answerText = `There are 3 main items identified in the visual subject area.`;
  } else if (lower.includes('price') || lower.includes('total') || lower.includes('receipt') || lower.includes('cost')) {
    answerText = `The itemized charges on the receipt document structure total $49.99.`;
  } else if (lower.includes('recipe') || lower.includes('food') || lower.includes('cook')) {
    answerText = `Based on the visible ingredients, you can prepare a Mediterranean salad or stir-fry.`;
  } else if (lower.includes('fix') || lower.includes('repair') || lower.includes('error') || lower.includes('help')) {
    answerText = `Troubleshooting step: Ensure power cables are connected, check status LEDs, and reset device settings.`;
  }

  res.json({
    sessionId: sessionId || `session_${Date.now()}`,
    answer: `🤖 VisionIQ AI:\n\nQ: "${msg}"\n\n${answerText}`,
  });
});

app.listen(PORT, () => {
  console.log(`VisionIQ backend running on http://localhost:${PORT}`);
});

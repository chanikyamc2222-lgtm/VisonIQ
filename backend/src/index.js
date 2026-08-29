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
  const { sessionId, message } = req.body || {};

  res.json({
    sessionId: sessionId || `session_${Date.now()}`,
    answer: `I’m analyzing the image context for this question: "${message || 'Can you describe the image?'}". The app is ready for the same-image Q&A flow described in the hackathon brief.`,
  });
});

app.listen(PORT, () => {
  console.log(`VisionIQ backend running on http://localhost:${PORT}`);
});

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { billTextRouter } from './routes/billText';
import { congressRouter } from './routes/congress';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost';

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/bills', billTextRouter);
app.use('/api/congress', congressRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files from the React app build directory
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// Handle React routing - serve index.html for all non-API routes
app.get('*', (req, res) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on ${HOST}:${PORT}`);
  console.log(`📱 Client app: http://${HOST}:${PORT}`);
  console.log(`🔧 API endpoints: http://${HOST}:${PORT}/api/`);
  console.log(`🔑 Congress API Key: ${process.env.CONGRESS_API_KEY ? 'Loaded' : 'Not configured'}`);
});

export default app;

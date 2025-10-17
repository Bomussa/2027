import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import helmet from 'helmet';
import api from './dist_server/api/index.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for development
  crossOriginEmbedderPolicy: false
}));

// Mount API routes
app.use(api);

// Serve static files from dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Serve index.html for all non-API routes (SPA support)
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  }
});

// Start server
app.listen(PORT, HOST, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║   Medical Military Committee System - 2027   ║
╠═══════════════════════════════════════════════╣
║  Server: http://${HOST}:${PORT}              ║
║  Status: Running                              ║
║  Environment: ${process.env.NODE_ENV || 'development'}                    ║
╚═══════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

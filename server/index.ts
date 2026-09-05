import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { createRoutes } from './routes';

dotenv.config();

const app = express();
// Cloud Run (the deploy target documented in .env.example / metadata.json) injects PORT at
// runtime; hardcoding 3000 would fail the platform's health check in production.
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '15mb' }));

const ROOT_DIR = process.cwd();
const INTELLIGENCE_DIR = path.join(ROOT_DIR, 'intelligence');

app.use('/api', createRoutes(ROOT_DIR, INTELLIGENCE_DIR));

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Bluecore Energy Intelligence Engine running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

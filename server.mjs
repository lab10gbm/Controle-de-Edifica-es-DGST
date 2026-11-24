import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const distDir = path.resolve(__dirname, 'dist');
const indexHtmlPath = path.join(distDir, 'index.html');
const port = Number(process.env.PORT) || 3000;

app.disable('x-powered-by');

app.get('/healthz', (_req, res) => {
  res.status(200).json({ ok: true });
});

app.use(
  '/assets',
  express.static(path.join(distDir, 'assets'), {
    immutable: true,
    maxAge: '1y',
  })
);

app.use(
  express.static(distDir, {
    index: false,
  })
);

app.use((_req, res) => {
  if (!fs.existsSync(indexHtmlPath)) {
    res
      .status(503)
      .send('Build não encontrado (dist/index.html). Execute "npm run build" ou "bun run build" antes de iniciar.');
    return;
  }
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(indexHtmlPath);
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Servidor online ouvindo em http://0.0.0.0:${port}`);
});

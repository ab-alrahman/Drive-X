import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import path from 'path';
import { env } from './config/env';
import { swaggerRoutes } from './docs/swagger';
import { errorMiddleware } from './middleware/error.middleware';
import { router } from './routes';

export const app = express();

app.use(
  helmet({
    contentSecurityPolicy: false
  })
);
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(path.resolve(env.UPLOAD_DIR)));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(swaggerRoutes);
app.use('/v1', router);
app.use(errorMiddleware);

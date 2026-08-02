import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import path from 'path';
import { env } from './config/env';
import { swaggerRoutes } from './docs/swagger';
import { errorMiddleware } from './middleware/error.middleware';
import { requestLogger } from './middleware/request-logger.middleware';
import { router } from './routes';

export const app = express();

if (env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

app.use(
  helmet({
    contentSecurityPolicy: false,
    // Car photos under /uploads are public marketplace assets meant to be embedded
    // from a different origin (the frontend runs on a separate host/port in both
    // dev and production) — helmet's default 'same-origin' silently blocks <img>
    // loads across origins, which is why car photos rendered as broken images.
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);
const allowedOrigins = env.ADMIN_WEB_ORIGIN.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(requestLogger);
app.use('/uploads', express.static(path.resolve(env.UPLOAD_DIR)));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(swaggerRoutes);
app.use('/v1', router);
app.use(errorMiddleware);

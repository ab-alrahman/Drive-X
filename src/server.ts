import { app } from './app';
import { env } from './config/env';
import { logger } from './shared/logger';

app.listen(env.PORT, () => {
  logger.info('DriveX API listening', { port: env.PORT, nodeEnv: env.NODE_ENV });
});

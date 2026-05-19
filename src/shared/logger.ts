import fs from 'fs';
import path from 'path';
import { env } from '../config/env';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogMeta = Record<string, unknown>;

const logDir = path.resolve(env.LOG_DIR);
const appLogPath = path.join(logDir, 'app.log');
const errorLogPath = path.join(logDir, 'error.log');

function ensureLogDir() {
  fs.mkdirSync(logDir, { recursive: true });
}

function normalizeValue(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack
    };
  }

  return value;
}

function write(level: LogLevel, message: string, meta: LogMeta = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...Object.fromEntries(Object.entries(meta).map(([key, value]) => [key, normalizeValue(value)]))
  };
  const line = `${JSON.stringify(entry)}\n`;

  try {
    ensureLogDir();
    fs.appendFileSync(appLogPath, line);
    if (level === 'error') {
      fs.appendFileSync(errorLogPath, line);
    }
  } catch (err) {
    console.error('Failed to write log entry', err);
  }

  const consoleMessage = `[${entry.timestamp}] ${level.toUpperCase()} ${message}`;
  if (level === 'error') {
    console.error(consoleMessage, meta);
    return;
  }
  if (level === 'warn') {
    console.warn(consoleMessage, meta);
    return;
  }
  console.log(consoleMessage, meta);
}

export const logger = {
  debug(message: string, meta?: LogMeta) {
    if (env.NODE_ENV !== 'production') {
      write('debug', message, meta);
    }
  },
  info(message: string, meta?: LogMeta) {
    write('info', message, meta);
  },
  warn(message: string, meta?: LogMeta) {
    write('warn', message, meta);
  },
  error(message: string, meta?: LogMeta) {
    write('error', message, meta);
  }
};


require('dotenv').config();

function isLocalHost(host) {
  return ['localhost', '127.0.0.1', '::1'].includes(host);
}

const databaseUrl = process.env.DATABASE_URL;
const dbHost = process.env.DB_HOST || 'localhost';
const useSsl =
  process.env.DB_SSL === 'true' || (process.env.DB_SSL !== 'false' && !isLocalHost(dbHost));

module.exports = databaseUrl
  ? {
      url: databaseUrl,
      ssl: useSsl ? { rejectUnauthorized: false } : false,
      'migrations-dir': 'migrations'
    }
  : {
      user: process.env.DB_USER || 'postgres',
      host: dbHost,
      database: process.env.DB_NAME || 'drivex',
      password: String(process.env.DB_PASSWORD || ''),
      port: Number(process.env.DB_PORT || 5432),
      ssl: useSsl ? { rejectUnauthorized: false } : false,
      'migrations-dir': 'migrations'
    };

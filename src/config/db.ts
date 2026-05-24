import { Pool, PoolConfig, QueryResult, QueryResultRow } from 'pg';
import { env } from './env';

const ssl = env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined;

const poolConfig: PoolConfig = env.DATABASE_URL
  ? {
      connectionString: env.DATABASE_URL,
      ssl
    }
  : {
      user: env.DB_USER,
      host: env.DB_HOST,
      database: env.DB_NAME,
      password: String(env.DB_PASSWORD),
      port: Number(env.DB_PORT) || 5432,
      ssl
    };

export const pool = new Pool(poolConfig);

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params);
}


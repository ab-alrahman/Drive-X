import { Pool, QueryResult, QueryResultRow } from 'pg';
import { env } from './env';


export const pool = new Pool({
  user: env.DB_USER,
  host: env.DB_HOST,
  database: env.DB_NAME,
  password: String(env.DB_PASSWORD),
  port: Number(env.DB_PORT) || 5432,  
  // ssl: {
  //   rejectUnauthorized: false,
  // },
  // max: 20,
  // idleTimeoutMillis: 30000,
  // connectionTimeoutMillis: 2000,
});

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params);
}


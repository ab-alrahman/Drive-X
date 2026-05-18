import fs from 'fs';
import path from 'path';
import { pool } from '../config/db';

async function main() {
  const schemaPath = path.resolve('docs', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  await pool.query(sql);
  await pool.end();

  console.log('Database schema applied');
}

main().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});

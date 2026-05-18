import bcrypt from 'bcryptjs';
import { pool, query } from '../config/db';

async function main() {
  const email = process.env.ADMIN_EMAIL ?? 'admin@drivex.com';
  const password = process.env.ADMIN_PASSWORD ?? 'admin123';
  const fullName = process.env.ADMIN_FULL_NAME ?? 'DriveX Owner';

  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required');
  }
  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await query(
    `INSERT INTO admin_users (email, password_hash, full_name, role)
     VALUES ($1, $2, $3, 'OWNER')
     ON CONFLICT (email)
     DO UPDATE SET password_hash = EXCLUDED.password_hash, full_name = EXCLUDED.full_name, updated_at = NOW()`,
    [email, passwordHash, fullName]
  );

  await pool.end();
  console.log(`Seeded admin user: ${email}`);
}

main().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});

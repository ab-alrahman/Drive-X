import bcrypt from 'bcryptjs';
import { pool, query } from '../config/db';

const VENDOR_NAME = 'Drive X Direct';

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

  const vendorResult = await query<{ id: string }>(
    `INSERT INTO vendors (name, status)
     SELECT $1::varchar, 'ACTIVE'
     WHERE NOT EXISTS (SELECT 1 FROM vendors WHERE name = $1)
     RETURNING id`,
    [VENDOR_NAME]
  );
  const vendorId =
    vendorResult.rows[0]?.id ?? (await query<{ id: string }>(`SELECT id FROM vendors WHERE name = $1`, [VENDOR_NAME])).rows[0].id;

  const passwordHash = await bcrypt.hash(password, 12);

  await query(
    `INSERT INTO admin_users (email, password_hash, full_name, role, vendor_id)
     VALUES ($1, $2, $3, 'OWNER', $4)
     ON CONFLICT (email)
     DO UPDATE SET password_hash = EXCLUDED.password_hash, full_name = EXCLUDED.full_name, updated_at = NOW()`,
    [email, passwordHash, fullName, vendorId]
  );

  console.log(`Seeded vendor OWNER: ${email} (vendor: ${VENDOR_NAME})`);

  const platformEmail = process.env.PLATFORM_ADMIN_EMAIL;
  const platformPassword = process.env.PLATFORM_ADMIN_PASSWORD;
  const platformFullName = process.env.PLATFORM_ADMIN_FULL_NAME ?? 'Drive X Platform Admin';

  if (platformEmail && platformPassword) {
    if (platformPassword.length < 8) {
      throw new Error('PLATFORM_ADMIN_PASSWORD must be at least 8 characters');
    }
    const platformPasswordHash = await bcrypt.hash(platformPassword, 12);
    await query(
      `INSERT INTO admin_users (email, password_hash, full_name, role, vendor_id)
       VALUES ($1, $2, $3, 'PLATFORM_ADMIN', NULL)
       ON CONFLICT (email)
       DO UPDATE SET password_hash = EXCLUDED.password_hash, full_name = EXCLUDED.full_name, updated_at = NOW()`,
      [platformEmail, platformPasswordHash, platformFullName]
    );
    console.log(`Seeded Platform Admin: ${platformEmail}`);
  } else {
    console.log('Skipped Platform Admin seed (set PLATFORM_ADMIN_EMAIL and PLATFORM_ADMIN_PASSWORD in .env to create one).');
  }

  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});

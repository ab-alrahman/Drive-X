import bcrypt from 'bcryptjs';
import { PoolClient } from 'pg';
import { query, withTransaction } from '../../config/db';
import { AuthUser } from '../../middleware/auth.middleware';
import { conflict, notFound } from '../../shared/errors';
import { issueTokens } from '../auth/auth.service';

function mapVendor(row: any) {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    suspendedAt: row.suspended_at ?? undefined,
    suspendedReason: row.suspended_reason ?? undefined,
    flaggedAt: row.flagged_at ?? undefined,
    flaggedReason: row.flagged_reason ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function logPlatformAction(
  client: PoolClient,
  adminId: string,
  action: string,
  targetType: 'VENDOR' | 'CAR',
  targetId: string,
  reason: string
) {
  await client.query(
    `INSERT INTO platform_admin_actions (admin_id, action, target_type, target_id, reason)
     VALUES ($1,$2,$3,$4,$5)`,
    [adminId, action, targetType, targetId, reason]
  );
}

// Self-serve: anyone can register a vendor - no manual approval gate. Trust is established at
// the car level (Pillar 1's mandatory inspection/maintenance-file rule), not by gatekeeping who
// gets to become a vendor.
export async function registerVendor(data: { vendorName: string; ownerFullName: string; ownerEmail: string; ownerPassword: string }) {
  const existing = await query(`SELECT id FROM admin_users WHERE email = $1`, [data.ownerEmail]);
  if (existing.rows[0]) {
    throw conflict('An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(data.ownerPassword, 12);

  const { vendor, adminId } = await withTransaction(async (client: PoolClient) => {
    const vendorResult = await client.query(
      `INSERT INTO vendors (name, status) VALUES ($1, 'ACTIVE') RETURNING *`,
      [data.vendorName]
    );
    const vendorRow = vendorResult.rows[0];

    const adminResult = await client.query(
      `INSERT INTO admin_users (email, password_hash, full_name, role, vendor_id)
       VALUES ($1, $2, $3, 'OWNER', $4) RETURNING id`,
      [data.ownerEmail, passwordHash, data.ownerFullName, vendorRow.id]
    );

    return { vendor: vendorRow, adminId: adminResult.rows[0].id };
  });

  const user: AuthUser = { id: adminId, email: data.ownerEmail, role: 'OWNER', vendorId: vendor.id };
  const tokens = await issueTokens(user);

  return { vendor: mapVendor(vendor), ...tokens };
}

export async function listVendorsForPlatform() {
  const result = await query(
    `SELECT v.*,
      (SELECT COUNT(*) FROM cars c WHERE c.vendor_id = v.id AND c.deleted_at IS NULL) AS car_count,
      (SELECT COUNT(*) FROM complaints comp
        JOIN cars c ON c.id = comp.car_id
        WHERE c.vendor_id = v.id AND comp.status = 'OPEN') AS open_complaints
     FROM vendors v ORDER BY v.created_at DESC`
  );
  return result.rows.map((row) => ({
    ...mapVendor(row),
    carCount: Number(row.car_count),
    openComplaints: Number(row.open_complaints)
  }));
}

export async function suspendVendor(vendorId: string, adminId: string, reason: string) {
  return withTransaction(async (client: PoolClient) => {
    const result = await client.query(
      `UPDATE vendors SET status = 'SUSPENDED', suspended_at = NOW(), suspended_reason = $1, updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [reason, vendorId]
    );
    if (!result.rows[0]) {
      throw notFound('Vendor not found');
    }
    await logPlatformAction(client, adminId, 'SUSPEND_VENDOR', 'VENDOR', vendorId, reason);
    return mapVendor(result.rows[0]);
  });
}

export async function unsuspendVendor(vendorId: string, adminId: string) {
  return withTransaction(async (client: PoolClient) => {
    const result = await client.query(
      `UPDATE vendors SET status = 'ACTIVE', suspended_at = NULL, suspended_reason = NULL, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [vendorId]
    );
    if (!result.rows[0]) {
      throw notFound('Vendor not found');
    }
    await logPlatformAction(client, adminId, 'UNSUSPEND_VENDOR', 'VENDOR', vendorId, 'Reinstated by Platform Admin');
    return mapVendor(result.rows[0]);
  });
}

export async function hideCar(carId: string, adminId: string, reason: string) {
  return withTransaction(async (client: PoolClient) => {
    const result = await client.query(
      `UPDATE cars SET hidden_by_platform_at = NOW(), hidden_reason = $1
       WHERE id = $2 AND deleted_at IS NULL RETURNING id`,
      [reason, carId]
    );
    if (!result.rows[0]) {
      throw notFound('Car not found');
    }
    await logPlatformAction(client, adminId, 'HIDE_CAR', 'CAR', carId, reason);
  });
}

export async function unhideCar(carId: string, adminId: string) {
  return withTransaction(async (client: PoolClient) => {
    const result = await client.query(
      `UPDATE cars SET hidden_by_platform_at = NULL, hidden_reason = NULL
       WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
      [carId]
    );
    if (!result.rows[0]) {
      throw notFound('Car not found');
    }
    await logPlatformAction(client, adminId, 'UNHIDE_CAR', 'CAR', carId, 'Restored by Platform Admin');
  });
}

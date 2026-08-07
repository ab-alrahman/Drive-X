import { PoolClient } from 'pg';
import { query, withTransaction } from '../../config/db';
import { notFound } from '../../shared/errors';
import { offset, paginationMeta } from '../../shared/pagination';

const SUBSTANTIATED_THRESHOLD = 3;
const THRESHOLD_WINDOW_DAYS = 30;

function mapComplaint(row: any) {
  return {
    id: row.id,
    carId: row.car_id,
    carBrand: row.car_brand ?? undefined,
    carModel: row.car_model ?? undefined,
    vendorId: row.vendor_id ?? undefined,
    vendorName: row.vendor_name ?? undefined,
    customerId: row.customer_id ?? undefined,
    customerName: row.customer_name ?? undefined,
    description: row.description,
    status: row.status,
    reviewedById: row.reviewed_by ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
    reviewNote: row.review_note ?? undefined,
    createdAt: row.created_at
  };
}

// "3+ substantiated complaints in 30 days" auto-FLAGS the vendor for Platform Admin review -
// it does NOT auto-suspend (avoids weaponized/rival-abused complaints). A human Platform Admin
// always makes the final suspend call (see the vendors suspend/unsuspend endpoints).
async function autoFlagVendorIfThresholdMet(client: PoolClient, vendorId: string) {
  const countResult = await client.query(
    `SELECT COUNT(*) AS count
     FROM complaints c
     JOIN cars car ON car.id = c.car_id
     WHERE car.vendor_id = $1
       AND c.status = 'SUBSTANTIATED'
       AND c.created_at >= NOW() - $2::interval`,
    [vendorId, `${THRESHOLD_WINDOW_DAYS} days`]
  );
  const count = Number(countResult.rows[0].count);

  if (count < SUBSTANTIATED_THRESHOLD) {
    return false;
  }

  const vendorResult = await client.query(
    `UPDATE vendors
     SET flagged_at = COALESCE(flagged_at, NOW()),
         flagged_reason = COALESCE(flagged_reason, $1),
         updated_at = NOW()
     WHERE id = $2 AND flagged_at IS NULL
     RETURNING id`,
    [`Auto-flagged: ${count} substantiated complaints in the last ${THRESHOLD_WINDOW_DAYS} days`, vendorId]
  );

  return Boolean(vendorResult.rows[0]);
}

// Public/customer side: file a complaint against a specific car/listing. The complaint itself
// starts OPEN - it only becomes a vendor flag once Platform Admin substantiates it.
export async function submitComplaint(carId: string, customerId: string, description: string) {
  return withTransaction(async (client: PoolClient) => {
    const carResult = await client.query(`SELECT id FROM cars WHERE id = $1 AND deleted_at IS NULL`, [carId]);
    if (!carResult.rows[0]) {
      throw notFound('Car not found');
    }

    const result = await client.query(
      `INSERT INTO complaints (car_id, customer_id, description) VALUES ($1, $2, $3) RETURNING *`,
      [carId, customerId, description]
    );

    return mapComplaint(result.rows[0]);
  });
}

export async function listComplaintsForPlatform(filters: any) {
  const where: string[] = [];
  const params: unknown[] = [];
  if (filters.status) {
    params.push(filters.status);
    where.push(`comp.status = $${params.length}`);
  }
  if (filters.vendorId) {
    params.push(filters.vendorId);
    where.push(`car.vendor_id = $${params.length}`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const select = `
    SELECT comp.*,
      car.brand AS car_brand,
      car.model AS car_model,
      car.vendor_id,
      v.name AS vendor_name,
      cu.full_name AS customer_name
    FROM complaints comp
    JOIN cars car ON car.id = comp.car_id
    JOIN vendors v ON v.id = car.vendor_id
    LEFT JOIN customer_users cu ON cu.id = comp.customer_id
  `;

  const count = await query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM complaints comp JOIN cars car ON car.id = comp.car_id ${whereSql.replace('comp.', 'comp.')}`,
    params
  );
  const total = Number(count.rows[0].count);

  const pageParams = [...params, filters.limit, offset(filters.page, filters.limit)];
  const result = await query(
    `${select} ${whereSql}
     ORDER BY comp.created_at DESC
     LIMIT $${pageParams.length - 1} OFFSET $${pageParams.length}`,
    pageParams
  );

  return { items: result.rows.map(mapComplaint), ...paginationMeta(filters.page, filters.limit, total) };
}

// Platform Admin review: SUBSTANTIATED re-runs the auto-flag threshold on the vendor; DISMISSED
// records the call without any effect; RESOLVED marks the underlying issue as handled.
export async function reviewComplaint(complaintId: string, data: { decision: string; note?: string }, adminId: string) {
  return withTransaction(async (client: PoolClient) => {
    const current = await client.query(
      `SELECT comp.*, car.vendor_id
       FROM complaints comp JOIN cars car ON car.id = comp.car_id
       WHERE comp.id = $1 FOR UPDATE`,
      [complaintId]
    );
    const row = current.rows[0];
    if (!row) {
      throw notFound('Complaint not found');
    }

    const result = await client.query(
      `UPDATE complaints
       SET status = $1, reviewed_by = $2, reviewed_at = NOW(), review_note = $3
       WHERE id = $4 RETURNING *`,
      [data.decision, adminId, data.note ?? null, complaintId]
    );

    if (data.decision === 'SUBSTANTIATED') {
      await autoFlagVendorIfThresholdMet(client, row.vendor_id);
    }

    return mapComplaint(result.rows[0]);
  });
}

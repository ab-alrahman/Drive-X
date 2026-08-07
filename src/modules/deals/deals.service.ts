import { PoolClient } from 'pg';
import { query, withTransaction } from '../../config/db';
import { notFound } from '../../shared/errors';
import { offset, paginationMeta } from '../../shared/pagination';

function carStatusForDealType(type: string) {
  return type === 'SALE' ? 'SOLD' : 'RENTED';
}

// Pillar 2, item 25: a single flat platform-wide take-rate at launch (e.g. 2.5% on every
// completed deal, any vendor) - NOT per-vendor negotiated, NOT volume-tiered. The rate lives
// in platform_settings so it's data-driven and auditable, and every deal reuses this one
// number via the same commissionAmount() pattern as before.
export async function getCommissionRate() {
  const result = await query<{ value: string }>(
    `SELECT value FROM platform_settings WHERE key = 'commission_rate_percent'`
  );
  return Number(result.rows[0]?.value ?? 0);
}

function commissionAmount(finalPrice: number, commissionType: string, commissionValue: number) {
  if (commissionType === 'PERCENTAGE') {
    return Number(((finalPrice * commissionValue) / 100).toFixed(2));
  }
  return Number(commissionValue.toFixed(2));
}

function mapDeal(row: any) {
  return {
    id: row.id,
    leadId: row.lead_id,
    carId: row.car_id,
    type: row.type,
    finalPrice: { amount: Number(row.final_price_amount), currency: row.final_price_currency },
    commissionType: row.commission_type,
    commissionValue: Number(row.commission_value),
    commission: { amount: Number(row.commission_amount), currency: row.commission_currency },
    notes: row.notes,
    createdAt: row.created_at
  };
}

// Deals don't carry their own vendor_id either - scope is derived via the linked car.
export async function listDeals(filters: any, vendorScopeId?: string) {
  const where: string[] = [];
  const params: unknown[] = [];
  if (vendorScopeId) {
    params.push(vendorScopeId);
    where.push(`car_id IN (SELECT id FROM cars WHERE vendor_id = $${params.length})`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const count = await query<{ count: string }>(`SELECT COUNT(*) FROM deals ${whereSql}`, params);
  const total = Number(count.rows[0].count);
  const orderBy = filters.sortBy === 'oldest' ? 'created_at ASC' : 'created_at DESC';
  const pageParams = [...params, filters.limit, offset(filters.page, filters.limit)];
  const result = await query(
    `SELECT * FROM deals ${whereSql} ORDER BY ${orderBy} LIMIT $${pageParams.length - 1} OFFSET $${pageParams.length}`,
    pageParams
  );

  return { items: result.rows.map(mapDeal), ...paginationMeta(filters.page, filters.limit, total) };
}

export async function getDeal(id: string, vendorScopeId?: string) {
  const where = ['id = $1'];
  const params: unknown[] = [id];
  if (vendorScopeId) {
    params.push(vendorScopeId);
    where.push(`car_id IN (SELECT id FROM cars WHERE vendor_id = $${params.length})`);
  }

  const result = await query(`SELECT * FROM deals WHERE ${where.join(' AND ')}`, params);
  if (!result.rows[0]) {
    throw notFound('Deal not found');
  }
  return mapDeal(result.rows[0]);
}

export async function createDeal(data: any, adminId: string, vendorScopeId: string) {
  const rate = await getCommissionRate();
  const amount = commissionAmount(data.finalPrice.amount, 'PERCENTAGE', rate);

  return withTransaction(async (client) => {
    const car = await client.query(`SELECT id FROM cars WHERE id = $1 AND vendor_id = $2`, [
      data.carId,
      vendorScopeId
    ]);
    if (!car.rows[0]) {
      throw notFound('Car not found');
    }

    const result = await client.query(
      `INSERT INTO deals (
        lead_id, car_id, type, final_price_amount, final_price_currency,
        commission_type, commission_value, commission_amount, commission_currency, notes, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *`,
      [
        data.leadId,
        data.carId,
        data.type,
        data.finalPrice.amount,
        data.finalPrice.currency,
        'PERCENTAGE',
        rate,
        amount,
        data.finalPrice.currency,
        data.notes,
        adminId
      ]
    );

    await client.query(`UPDATE leads SET status = 'CLOSED', updated_by = $1, updated_at = NOW() WHERE id = $2`, [
      adminId,
      data.leadId
    ]);

    await client.query(`UPDATE cars SET status = $1, updated_by = $2, updated_at = NOW() WHERE id = $3`, [
      carStatusForDealType(data.type),
      adminId,
      data.carId
    ]);

    return mapDeal(result.rows[0]);
  });
}

export async function updateDeal(id: string, data: any, adminId: string, vendorScopeId: string) {
  return withTransaction(async (client: PoolClient) => {
    const currentResult = await client.query(`SELECT * FROM deals WHERE id = $1 FOR UPDATE`, [id]);
    const currentRow = currentResult.rows[0];
    if (!currentRow) {
      throw notFound('Deal not found');
    }
    const current = mapDeal(currentRow);

    const ownsCurrentCar = await client.query(`SELECT id FROM cars WHERE id = $1 AND vendor_id = $2`, [
      current.carId,
      vendorScopeId
    ]);
    if (!ownsCurrentCar.rows[0]) {
      throw notFound('Deal not found');
    }

    const leadId = data.leadId ?? current.leadId;
    const carId = data.carId ?? current.carId;

    if (carId !== current.carId) {
      const ownsNewCar = await client.query(`SELECT id FROM cars WHERE id = $1 AND vendor_id = $2`, [
        carId,
        vendorScopeId
      ]);
      if (!ownsNewCar.rows[0]) {
        throw notFound('Car not found');
      }
    }
    const type = data.type ?? current.type;
    const finalPrice = data.finalPrice ?? current.finalPrice;
    const rate = await getCommissionRate();
    const amount = commissionAmount(finalPrice.amount, 'PERCENTAGE', rate);

    const result = await client.query(
      `UPDATE deals SET
        lead_id = $1,
        car_id = $2,
        type = $3,
        final_price_amount = $4,
        final_price_currency = $5,
        commission_type = $6,
        commission_value = $7,
        commission_amount = $8,
        commission_currency = $9,
        notes = $10
       WHERE id = $11
       RETURNING *`,
      [
        leadId,
        carId,
        type,
        finalPrice.amount,
        finalPrice.currency,
        'PERCENTAGE',
        rate,
        amount,
        finalPrice.currency,
        data.notes ?? current.notes,
        id
      ]
    );

    // Reconcile the car's status whenever the linked car or the deal type changes.
    if (carId !== current.carId) {
      await client.query(`UPDATE cars SET status = 'AVAILABLE', updated_by = $1, updated_at = NOW() WHERE id = $2`, [
        adminId,
        current.carId
      ]);
      await client.query(`UPDATE cars SET status = $1, updated_by = $2, updated_at = NOW() WHERE id = $3`, [
        carStatusForDealType(type),
        adminId,
        carId
      ]);
    } else if (type !== current.type) {
      await client.query(`UPDATE cars SET status = $1, updated_by = $2, updated_at = NOW() WHERE id = $3`, [
        carStatusForDealType(type),
        adminId,
        carId
      ]);
    }

    // Reconcile lead status whenever the deal is reassigned to a different lead.
    if (leadId !== current.leadId) {
      await client.query(`UPDATE leads SET status = 'APPROVED', updated_by = $1, updated_at = NOW() WHERE id = $2`, [
        adminId,
        current.leadId
      ]);
      await client.query(`UPDATE leads SET status = 'CLOSED', updated_by = $1, updated_at = NOW() WHERE id = $2`, [
        adminId,
        leadId
      ]);
    }

    return mapDeal(result.rows[0]);
  });
}

export async function deleteDeal(id: string, adminId: string, vendorScopeId: string) {
  return withTransaction(async (client: PoolClient) => {
    const currentResult = await client.query(`SELECT * FROM deals WHERE id = $1 FOR UPDATE`, [id]);
    const currentRow = currentResult.rows[0];
    if (!currentRow) {
      throw notFound('Deal not found');
    }
    const current = mapDeal(currentRow);

    const ownsCar = await client.query(`SELECT id FROM cars WHERE id = $1 AND vendor_id = $2`, [
      current.carId,
      vendorScopeId
    ]);
    if (!ownsCar.rows[0]) {
      throw notFound('Deal not found');
    }

    await client.query(`DELETE FROM deals WHERE id = $1`, [id]);

    // Deleting a deal undoes its side effects: the car goes back on the market
    // and the lead returns to APPROVED so the deal can be redone if needed.
    await client.query(`UPDATE cars SET status = 'AVAILABLE', updated_by = $1, updated_at = NOW() WHERE id = $2`, [
      adminId,
      current.carId
    ]);
    await client.query(`UPDATE leads SET status = 'APPROVED', updated_by = $1, updated_at = NOW() WHERE id = $2`, [
      adminId,
      current.leadId
    ]);
  });
}

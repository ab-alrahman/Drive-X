import { PoolClient } from 'pg';
import { query, withTransaction } from '../../config/db';
import { notFound } from '../../shared/errors';
import { offset, paginationMeta } from '../../shared/pagination';

function carStatusForDealType(type: string) {
  return type === 'SALE' ? 'SOLD' : 'RENTED';
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

export async function listDeals(filters: any) {
  const count = await query<{ count: string }>(`SELECT COUNT(*) FROM deals`);
  const total = Number(count.rows[0].count);
  const orderBy = filters.sortBy === 'oldest' ? 'created_at ASC' : 'created_at DESC';
  const result = await query(
    `SELECT * FROM deals ORDER BY ${orderBy} LIMIT $1 OFFSET $2`,
    [filters.limit, offset(filters.page, filters.limit)]
  );

  return { items: result.rows.map(mapDeal), ...paginationMeta(filters.page, filters.limit, total) };
}

export async function getDeal(id: string) {
  const result = await query(`SELECT * FROM deals WHERE id = $1`, [id]);
  if (!result.rows[0]) {
    throw notFound('Deal not found');
  }
  return mapDeal(result.rows[0]);
}

export async function createDeal(data: any, adminId: string) {
  const amount = commissionAmount(data.finalPrice.amount, data.commissionType, data.commissionValue);

  return withTransaction(async (client) => {
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
        data.commissionType,
        data.commissionValue,
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

export async function updateDeal(id: string, data: any, adminId: string) {
  return withTransaction(async (client: PoolClient) => {
    const currentResult = await client.query(`SELECT * FROM deals WHERE id = $1 FOR UPDATE`, [id]);
    const currentRow = currentResult.rows[0];
    if (!currentRow) {
      throw notFound('Deal not found');
    }
    const current = mapDeal(currentRow);

    const leadId = data.leadId ?? current.leadId;
    const carId = data.carId ?? current.carId;
    const type = data.type ?? current.type;
    const finalPrice = data.finalPrice ?? current.finalPrice;
    const commissionType = data.commissionType ?? current.commissionType;
    const commissionValue = data.commissionValue ?? current.commissionValue;
    const amount = commissionAmount(finalPrice.amount, commissionType, commissionValue);

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
        commissionType,
        commissionValue,
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

export async function deleteDeal(id: string, adminId: string) {
  return withTransaction(async (client: PoolClient) => {
    const currentResult = await client.query(`SELECT * FROM deals WHERE id = $1 FOR UPDATE`, [id]);
    const currentRow = currentResult.rows[0];
    if (!currentRow) {
      throw notFound('Deal not found');
    }
    const current = mapDeal(currentRow);

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

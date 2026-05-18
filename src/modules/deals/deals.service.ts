import { query } from '../../config/db';
import { offset, paginationMeta } from '../../shared/pagination';

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
  const result = await query(
    `SELECT * FROM deals ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
    [filters.limit, offset(filters.page, filters.limit)]
  );

  return { items: result.rows.map(mapDeal), ...paginationMeta(filters.page, filters.limit, total) };
}

export async function createDeal(data: any, adminId: string) {
  const amount = commissionAmount(data.finalPrice.amount, data.commissionType, data.commissionValue);
  const result = await query(
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

  await query(`UPDATE leads SET status = 'CLOSED', updated_by = $1, updated_at = NOW() WHERE id = $2`, [
    adminId,
    data.leadId
  ]);

  await query(`UPDATE cars SET status = $1, updated_by = $2, updated_at = NOW() WHERE id = $3`, [
    data.type === 'SALE' ? 'SOLD' : 'RENTED',
    adminId,
    data.carId
  ]);

  return mapDeal(result.rows[0]);
}

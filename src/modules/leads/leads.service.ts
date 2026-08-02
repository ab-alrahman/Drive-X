import { query } from '../../config/db';
import { notFound } from '../../shared/errors';
import { offset, paginationMeta } from '../../shared/pagination';

function mapLead(row: any) {
  const lead: any = {
    id: row.id,
    carId: row.car_id,
    intent: row.intent,
    status: row.status,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email,
    city: row.city,
    message: row.message,
    rentalStartDate: row.rental_start_date,
    rentalEndDate: row.rental_end_date,
    requestDelivery: row.request_delivery,
    deliveryAddress: row.delivery_address,
    adminNotes: row.admin_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };

  if (row.brand) {
    lead.car = {
      brand: row.brand,
      model: row.model,
      year: row.year,
      imageUrl: row.primary_image || null
    };
  }

  return lead;
}

export async function createLead(data: any) {
  const result = await query<{ id: string }>(
    `INSERT INTO leads (
      car_id, intent, full_name, phone, email, city, message,
      rental_start_date, rental_end_date, request_delivery, delivery_address
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    RETURNING id`,
    [
      data.carId,
      data.intent,
      data.fullName,
      data.phone,
      data.email,
      data.city,
      data.message,
      data.rentalStartDate,
      data.rentalEndDate,
      data.requestDelivery,
      data.deliveryAddress
    ]
  );

  return { leadId: result.rows[0].id, message: 'Your request has been received successfully.' };
}

export async function listLeads(filters: any) {
  const where: string[] = [];
  const params: unknown[] = [];

  if (filters.status) {
    params.push(filters.status);
    where.push(`status = $${params.length}`);
  }
  if (filters.intent) {
    params.push(filters.intent);
    where.push(`intent = $${params.length}`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const count = await query<{ count: string }>(`SELECT COUNT(*) FROM leads ${whereSql}`, params);
  const total = Number(count.rows[0].count);
  const pageParams = [...params, filters.limit, offset(filters.page, filters.limit)];
  const orderBy = filters.sortBy === 'oldest' ? 'created_at ASC' : 'created_at DESC';
  const result = await query(
    `SELECT * FROM leads ${whereSql}
     ORDER BY ${orderBy}
     LIMIT $${pageParams.length - 1} OFFSET $${pageParams.length}`,
    pageParams
  );

  return { items: result.rows.map(mapLead), ...paginationMeta(filters.page, filters.limit, total) };
}

export async function getLead(id: string) {
  const result = await query(`SELECT * FROM leads WHERE id = $1`, [id]);
  if (!result.rows[0]) {
    throw notFound('Lead not found');
  }
  return mapLead(result.rows[0]);
}

export async function getMyLeads(customerEmail: string, filters: any) {
  const where: string[] = ['email = $1'];
  const params: unknown[] = [customerEmail];

  if (filters.status) {
    params.push(filters.status);
    where.push(`status = $${params.length}`);
  }
  if (filters.intent) {
    params.push(filters.intent);
    where.push(`intent = $${params.length}`);
  }

  const whereSql = `WHERE ${where.join(' AND ')}`;
  const count = await query<{ count: string }>(`SELECT COUNT(*) FROM leads ${whereSql}`, params);
  const total = Number(count.rows[0].count);
  const pageParams = [...params, filters.limit, offset(filters.page, filters.limit)];
  const orderBy = filters.sortBy === 'oldest' ? 'created_at ASC' : 'created_at DESC';
  const result = await query(
    `SELECT l.*, cr.brand, cr.model, cr.year, ci.image_url AS primary_image
     FROM leads l
     LEFT JOIN cars cr ON cr.id = l.car_id
     LEFT JOIN (
       SELECT car_id, image_url, ROW_NUMBER() OVER (PARTITION BY car_id ORDER BY is_primary DESC, position ASC) AS rn
       FROM car_images
     ) ci ON ci.car_id = l.car_id AND ci.rn = 1
     ${whereSql}
     ORDER BY ${orderBy}
     LIMIT $${pageParams.length - 1} OFFSET $${pageParams.length}`,
    pageParams
  );

  return { items: result.rows.map(mapLead), ...paginationMeta(filters.page, filters.limit, total) };
}

export async function updateLead(id: string, data: any, adminId: string) {
  const result = await query(
    `UPDATE leads SET
      status = COALESCE($1, status),
      admin_notes = COALESCE($2, admin_notes),
      updated_by = $3,
      updated_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [data.status, data.adminNotes, adminId, id]
  );

  if (!result.rows[0]) {
    throw notFound('Lead not found');
  }

  return mapLead(result.rows[0]);
}

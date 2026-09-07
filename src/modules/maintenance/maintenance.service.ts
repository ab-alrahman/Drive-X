import { PoolClient } from 'pg';
import { uploadBuffer } from '../../config/cloudinary';
import { query, withTransaction } from '../../config/db';
import type { AuthUser } from '../../middleware/auth.middleware';
import { conflict, forbidden, notFound } from '../../shared/errors';
import { offset, paginationMeta } from '../../shared/pagination';

type MaintenanceStatus =
  | 'NEW'
  | 'ADMIN_REVIEW'
  | 'TRIAGED'
  | 'SENT_TO_VENDOR'
  | 'VENDOR_ACKNOWLEDGED'
  | 'ASSIGNED_TO_PARTNER'
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'WAITING_CUSTOMER_APPROVAL'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED';

const terminalStatuses = new Set<MaintenanceStatus>(['COMPLETED', 'CANCELLED', 'REJECTED']);

function mapMoney(amount: unknown, currency: unknown) {
  return amount != null ? { amount: Number(amount), currency } : undefined;
}

function mapMaintenanceRequest(row: any, updates: any[] = [], files: any[] = []) {
  return {
    id: row.id,
    customerId: row.customer_id,
    customerName: row.customer_name ?? undefined,
    customerEmail: row.customer_email ?? undefined,
    carId: row.car_id,
    dealId: row.deal_id ?? undefined,
    dealType: row.deal_type ?? undefined,
    vendorId: row.vendor_id ?? undefined,
    vendorName: row.vendor_name ?? undefined,
    assignedPartnerId: row.assigned_partner_id ?? undefined,
    assignedPartnerName: row.assigned_partner_name ?? undefined,
    preferredPartnerId: row.preferred_partner_id ?? undefined,
    preferredPartnerName: row.preferred_partner_name ?? undefined,
    requestType: row.request_type,
    status: row.status,
    city: row.city,
    preferredTime: row.preferred_time ?? undefined,
    pickupNeeded: row.pickup_needed,
    notes: row.notes,
    contactPhone: row.contact_phone,
    quote: mapMoney(row.quoted_amount, row.quoted_currency),
    approvedAmount: mapMoney(row.approved_amount, row.approved_currency),
    quoteApprovedAt: row.quote_approved_at ?? undefined,
    publicSummary: row.public_summary ?? undefined,
    completedAt: row.completed_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    car: row.brand
      ? {
          brand: row.brand,
          model: row.model,
          year: row.year,
          listingType: row.listing_type,
          imageUrl: row.primary_image ?? undefined
        }
      : undefined,
    updates: updates.map(mapMaintenanceUpdate),
    files: files.map(mapMaintenanceFile)
  };
}

function mapMaintenanceUpdate(row: any) {
  return {
    id: row.id,
    requestId: row.request_id,
    authorRole: row.author_role,
    authorAdminId: row.author_admin_id ?? undefined,
    authorCustomerId: row.author_customer_id ?? undefined,
    statusFrom: row.status_from ?? undefined,
    statusTo: row.status_to ?? undefined,
    note: row.note ?? undefined,
    isPublic: row.is_public,
    createdAt: row.created_at
  };
}

function mapMaintenanceFile(row: any) {
  return {
    id: row.id,
    requestId: row.request_id,
    fileUrl: row.file_url,
    storageKey: row.storage_key ?? undefined,
    fileType: row.file_type ?? undefined,
    createdAt: row.created_at
  };
}

function mapMyCar(row: any) {
  return {
    dealId: row.deal_id,
    dealType: row.deal_type,
    dealCreatedAt: row.deal_created_at,
    car: {
      id: row.car_id,
      brand: row.brand,
      model: row.model,
      year: row.year,
      listingType: row.listing_type,
      status: row.status,
      vendorId: row.vendor_id,
      vendorName: row.vendor_name ?? undefined,
      imageUrl: row.primary_image ?? undefined
    }
  };
}

function baseSelect() {
  return `
    SELECT mr.*,
      cu.full_name AS customer_name, cu.email AS customer_email,
      c.brand, c.model, c.year, c.listing_type, ci.image_url AS primary_image,
      d.type AS deal_type,
      v.name AS vendor_name,
      t.name AS assigned_partner_name,
      pt.name AS preferred_partner_name
    FROM maintenance_requests mr
    JOIN customer_users cu ON cu.id = mr.customer_id
    JOIN cars c ON c.id = mr.car_id
    LEFT JOIN deals d ON d.id = mr.deal_id
    LEFT JOIN vendors v ON v.id = mr.vendor_id
    LEFT JOIN technicians t ON t.id = mr.assigned_partner_id
    LEFT JOIN technicians pt ON pt.id = mr.preferred_partner_id
    LEFT JOIN (
      SELECT car_id, image_url, ROW_NUMBER() OVER (PARTITION BY car_id ORDER BY is_primary DESC, position ASC) AS rn
      FROM car_images
    ) ci ON ci.car_id = c.id AND ci.rn = 1
  `;
}

async function addUpdate(
  client: PoolClient,
  requestId: string,
  actor: { role: 'CUSTOMER' | 'VENDOR' | 'PLATFORM_ADMIN' | 'SYSTEM'; adminId?: string; customerId?: string },
  statusFrom?: string | null,
  statusTo?: string | null,
  note?: string,
  isPublic = false
) {
  await client.query(
    `INSERT INTO maintenance_updates (
      request_id, author_role, author_admin_id, author_customer_id, status_from, status_to, note, is_public
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [requestId, actor.role, actor.adminId ?? null, actor.customerId ?? null, statusFrom ?? null, statusTo ?? null, note ?? null, isPublic]
  );
}

async function loadRequestForUpdate(client: PoolClient, requestId: string) {
  const result = await client.query(`SELECT * FROM maintenance_requests WHERE id = $1 FOR UPDATE`, [requestId]);
  if (!result.rows[0]) {
    throw notFound('Maintenance request not found');
  }
  return result.rows[0];
}

async function hydrateRequest(requestId: string) {
  const result = await query(`${baseSelect()} WHERE mr.id = $1`, [requestId]);
  if (!result.rows[0]) {
    throw notFound('Maintenance request not found');
  }

  const [updates, files] = await Promise.all([
    query(`SELECT * FROM maintenance_updates WHERE request_id = $1 ORDER BY created_at ASC`, [requestId]),
    query(`SELECT * FROM maintenance_request_files WHERE request_id = $1 ORDER BY created_at DESC`, [requestId])
  ]);

  return mapMaintenanceRequest(result.rows[0], updates.rows, files.rows);
}

async function findCustomerDeal(client: PoolClient, customerId: string, carId: string, dealId?: string) {
  const customer = await client.query(`SELECT email FROM customer_users WHERE id = $1`, [customerId]);
  if (!customer.rows[0]) {
    throw notFound('Customer not found');
  }

  const params: unknown[] = [customer.rows[0].email, carId];
  const where = ['LOWER(l.email) = LOWER($1)', 'd.car_id = $2'];
  if (dealId) {
    params.push(dealId);
    where.push(`d.id = $${params.length}`);
  }

  const result = await client.query(
    `SELECT d.id, d.type, d.car_id
     FROM deals d
     JOIN leads l ON l.id = d.lead_id
     WHERE ${where.join(' AND ')}
     ORDER BY d.created_at DESC
     LIMIT 1`,
    params
  );

  return result.rows[0] ?? null;
}

export async function listActiveWorkshops() {
  const result = await query(
    `SELECT id, name, city, phone, specialty, service_tiers
     FROM technicians
     WHERE is_active = TRUE
     ORDER BY name`
  );
  return result.rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    city: row.city,
    phone: row.phone ?? undefined,
    specialty: row.specialty ?? undefined,
    serviceTiers: row.service_tiers ?? []
  }));
}

export async function getMyCars(customerId: string) {
  const customer = await query(`SELECT email FROM customer_users WHERE id = $1`, [customerId]);
  if (!customer.rows[0]) {
    throw notFound('Customer not found');
  }

  const result = await query(
    `SELECT d.id AS deal_id, d.type AS deal_type, d.created_at AS deal_created_at,
      c.id AS car_id, c.brand, c.model, c.year, c.listing_type, c.status, c.vendor_id,
      v.name AS vendor_name, ci.image_url AS primary_image
     FROM deals d
     JOIN leads l ON l.id = d.lead_id
     JOIN cars c ON c.id = d.car_id
     LEFT JOIN vendors v ON v.id = c.vendor_id
     LEFT JOIN (
       SELECT car_id, image_url, ROW_NUMBER() OVER (PARTITION BY car_id ORDER BY is_primary DESC, position ASC) AS rn
       FROM car_images
     ) ci ON ci.car_id = c.id AND ci.rn = 1
     WHERE LOWER(l.email) = LOWER($1)
     ORDER BY d.created_at DESC`,
    [customer.rows[0].email]
  );

  return result.rows.map(mapMyCar);
}

export async function createCustomerRequest(customerId: string, data: any) {
  return withTransaction(async (client) => {
    const car = await client.query(`SELECT id, vendor_id FROM cars WHERE id = $1 AND deleted_at IS NULL`, [data.carId]);
    if (!car.rows[0]) {
      throw notFound('Drive X car not found');
    }

    const deal = await findCustomerDeal(client, customerId, data.carId, data.dealId);
    if (data.dealId && !deal) {
      throw forbidden('This deal is not linked to your account.');
    }

    let preferredPartnerId: string | null = null;
    if (data.preferredWorkshopId) {
      const workshop = await client.query(
        `SELECT id FROM technicians WHERE id = $1 AND is_active = TRUE`,
        [data.preferredWorkshopId]
      );
      if (!workshop.rows[0]) {
        throw notFound('Technician not found or inactive');
      }
      preferredPartnerId = workshop.rows[0].id;
    }

    const initialStatus: MaintenanceStatus = deal?.type === 'RENT' ? 'ADMIN_REVIEW' : 'NEW';
    const result = await client.query(
      `INSERT INTO maintenance_requests (
        customer_id, car_id, deal_id, vendor_id, preferred_partner_id, request_type, status, city, preferred_time,
        pickup_needed, notes, contact_phone
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *`,
      [
        customerId,
        data.carId,
        deal?.id ?? data.dealId ?? null,
        car.rows[0].vendor_id,
        preferredPartnerId,
        data.requestType,
        initialStatus,
        data.city,
        data.preferredTime ?? null,
        data.pickupNeeded ?? false,
        data.notes,
        data.contactPhone
      ]
    );

    await addUpdate(
      client,
      result.rows[0].id,
      { role: 'CUSTOMER', customerId },
      null,
      initialStatus,
      deal ? 'Customer opened a maintenance request.' : 'Customer opened a maintenance request; relationship needs admin verification.'
    );

    return mapMaintenanceRequest(result.rows[0]);
  }).then((request) => hydrateRequest(request.id));
}

export async function listCustomerRequests(customerId: string, filters: any) {
  const params: unknown[] = [customerId];
  const where = ['mr.customer_id = $1'];
  if (filters.status) {
    params.push(filters.status);
    where.push(`mr.status = $${params.length}`);
  }

  const count = await query<{ count: string }>(
    `SELECT COUNT(*) FROM maintenance_requests mr WHERE ${where.join(' AND ')}`,
    params
  );
  const pageParams = [...params, filters.limit, offset(filters.page, filters.limit)];
  const result = await query(
    `${baseSelect()}
     WHERE ${where.join(' AND ')}
     ORDER BY mr.created_at DESC
     LIMIT $${pageParams.length - 1} OFFSET $${pageParams.length}`,
    pageParams
  );

  return {
    items: result.rows.map((row) => mapMaintenanceRequest(row)),
    ...paginationMeta(filters.page, filters.limit, Number(count.rows[0].count))
  };
}

export async function getCustomerRequest(customerId: string, requestId: string) {
  const request = await hydrateRequest(requestId);
  if (request.customerId !== customerId) {
    throw notFound('Maintenance request not found');
  }
  return request;
}

export async function cancelCustomerRequest(customerId: string, requestId: string) {
  return withTransaction(async (client) => {
    const current = await loadRequestForUpdate(client, requestId);
    if (current.customer_id !== customerId) {
      throw notFound('Maintenance request not found');
    }
    if (terminalStatuses.has(current.status) || current.status === 'IN_PROGRESS') {
      throw conflict(`Cannot cancel a request in status ${current.status}`);
    }

    await client.query(
      `UPDATE maintenance_requests SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1`,
      [requestId]
    );
    await addUpdate(client, requestId, { role: 'CUSTOMER', customerId }, current.status, 'CANCELLED', 'Customer cancelled the request.');
  }).then(() => hydrateRequest(requestId));
}

export async function approveCustomerQuote(customerId: string, requestId: string) {
  return withTransaction(async (client) => {
    const current = await loadRequestForUpdate(client, requestId);
    if (current.customer_id !== customerId) {
      throw notFound('Maintenance request not found');
    }
    if (current.status !== 'WAITING_CUSTOMER_APPROVAL') {
      throw conflict(`Cannot approve quote in status ${current.status}`);
    }

    const nextStatus: MaintenanceStatus = current.assigned_partner_id ? 'ASSIGNED_TO_PARTNER' : 'TRIAGED';
    await client.query(
      `UPDATE maintenance_requests SET
        status = $1, approved_amount = quoted_amount, approved_currency = quoted_currency,
        quote_approved_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [nextStatus, requestId]
    );
    await addUpdate(client, requestId, { role: 'CUSTOMER', customerId }, current.status, nextStatus, 'Customer approved the quote.');
  }).then(() => hydrateRequest(requestId));
}

export async function rejectCustomerQuote(customerId: string, requestId: string, note?: string) {
  return withTransaction(async (client) => {
    const current = await loadRequestForUpdate(client, requestId);
    if (current.customer_id !== customerId) {
      throw notFound('Maintenance request not found');
    }
    if (current.status !== 'WAITING_CUSTOMER_APPROVAL') {
      throw conflict(`Cannot reject quote in status ${current.status}`);
    }

    await client.query(
      `UPDATE maintenance_requests SET status = 'TRIAGED', updated_at = NOW() WHERE id = $1`,
      [requestId]
    );
    await addUpdate(
      client,
      requestId,
      { role: 'CUSTOMER', customerId },
      current.status,
      'TRIAGED',
      note ?? 'Customer rejected the quote and requested follow-up.'
    );
  }).then(() => hydrateRequest(requestId));
}

export async function uploadCustomerFile(customerId: string, requestId: string, file: Express.Multer.File) {
  const current = await query(`SELECT id FROM maintenance_requests WHERE id = $1 AND customer_id = $2`, [requestId, customerId]);
  if (!current.rows[0]) {
    throw notFound('Maintenance request not found');
  }
  const uploaded = await uploadBuffer(file.buffer, `drivex/maintenance/${requestId}`, 'auto');
  const result = await query(
    `INSERT INTO maintenance_request_files (request_id, file_url, storage_key, file_type)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [requestId, uploaded.secure_url, uploaded.public_id, file.mimetype]
  );
  return mapMaintenanceFile(result.rows[0]);
}

function adminScopeWhere(user: AuthUser, params: unknown[]) {
  if (user.role === 'PLATFORM_ADMIN') {
    return '';
  }
  params.push(user.vendorId);
  return ` AND mr.vendor_id = $${params.length} AND mr.status <> 'ADMIN_REVIEW'`;
}

export async function listAdminRequests(user: AuthUser, filters: any) {
  const params: unknown[] = [];
  const where = ['1=1'];
  if (filters.status) {
    params.push(filters.status);
    where.push(`mr.status = $${params.length}`);
  }
  if (filters.requestType) {
    params.push(filters.requestType);
    where.push(`mr.request_type = $${params.length}`);
  }
  if (filters.city) {
    params.push(filters.city);
    where.push(`mr.city = $${params.length}`);
  }
  const scope = adminScopeWhere(user, params);

  const whereSql = `${where.join(' AND ')}${scope}`;
  const count = await query<{ count: string }>(`SELECT COUNT(*) FROM maintenance_requests mr WHERE ${whereSql}`, params);
  const pageParams = [...params, filters.limit, offset(filters.page, filters.limit)];
  const result = await query(
    `${baseSelect()}
     WHERE ${whereSql}
     ORDER BY mr.created_at DESC
     LIMIT $${pageParams.length - 1} OFFSET $${pageParams.length}`,
    pageParams
  );

  return {
    items: result.rows.map((row) => mapMaintenanceRequest(row)),
    ...paginationMeta(filters.page, filters.limit, Number(count.rows[0].count))
  };
}

export async function getAdminRequest(user: AuthUser, requestId: string) {
  const request = await hydrateRequest(requestId);
  if (user.role !== 'PLATFORM_ADMIN') {
    if (request.vendorId !== user.vendorId || request.status === 'ADMIN_REVIEW') {
      throw notFound('Maintenance request not found');
    }
  }
  return request;
}

function requirePlatformAdmin(user: AuthUser) {
  if (user.role !== 'PLATFORM_ADMIN') {
    throw forbidden('This action requires a Platform Admin.');
  }
}

export async function triageRequest(user: AuthUser, requestId: string, data: { status: MaintenanceStatus; note?: string }) {
  requirePlatformAdmin(user);
  return updateStatus(user, requestId, { status: data.status, note: data.note });
}

export async function assignPartner(user: AuthUser, requestId: string, data: { partnerId: string; note?: string }) {
  requirePlatformAdmin(user);
  return withTransaction(async (client) => {
    const current = await loadRequestForUpdate(client, requestId);
    if (terminalStatuses.has(current.status)) {
      throw conflict(`Cannot assign a request in status ${current.status}`);
    }
    const partner = await client.query(`SELECT id FROM technicians WHERE id = $1 AND is_active = TRUE`, [data.partnerId]);
    if (!partner.rows[0]) {
      throw notFound('Partner not found or inactive');
    }
    await client.query(
      `UPDATE maintenance_requests SET assigned_partner_id = $1, status = 'ASSIGNED_TO_PARTNER', updated_at = NOW()
       WHERE id = $2`,
      [data.partnerId, requestId]
    );
    await addUpdate(client, requestId, { role: 'PLATFORM_ADMIN', adminId: user.id }, current.status, 'ASSIGNED_TO_PARTNER', data.note ?? 'Partner assigned.');
  }).then(() => hydrateRequest(requestId));
}

export async function scheduleRequest(user: AuthUser, requestId: string, data: { scheduledAt: string; note?: string }) {
  requirePlatformAdmin(user);
  return withTransaction(async (client) => {
    const current = await loadRequestForUpdate(client, requestId);
    if (!['ASSIGNED_TO_PARTNER', 'VENDOR_ACKNOWLEDGED', 'TRIAGED'].includes(current.status)) {
      throw conflict(`Cannot schedule a request in status ${current.status}`);
    }
    await client.query(
      `UPDATE maintenance_requests SET preferred_time = $1, status = 'SCHEDULED', updated_at = NOW() WHERE id = $2`,
      [data.scheduledAt, requestId]
    );
    await addUpdate(client, requestId, { role: 'PLATFORM_ADMIN', adminId: user.id }, current.status, 'SCHEDULED', data.note ?? 'Maintenance scheduled.', true);
  }).then(() => hydrateRequest(requestId));
}

export async function updateStatus(
  user: AuthUser,
  requestId: string,
  data: { status: MaintenanceStatus; note?: string; publicSummary?: string; quotedAmount?: number; quotedCurrency?: 'USD' | 'SYP' }
) {
  return withTransaction(async (client) => {
    const current = await loadRequestForUpdate(client, requestId);
    const isVendor = user.role !== 'PLATFORM_ADMIN';
    if (isVendor) {
      if (current.vendor_id !== user.vendorId || current.status !== 'SENT_TO_VENDOR' || data.status !== 'VENDOR_ACKNOWLEDGED') {
        throw forbidden('Vendor can only acknowledge routed rental maintenance requests.');
      }
    }

    const completedAt = data.status === 'COMPLETED' ? new Date().toISOString() : current.completed_at;
    const publicSummary = data.status === 'COMPLETED' ? data.publicSummary ?? current.public_summary : current.public_summary;
    await client.query(
      `UPDATE maintenance_requests SET
        status = $1,
        quoted_amount = COALESCE($2, quoted_amount),
        quoted_currency = COALESCE($3, quoted_currency),
        public_summary = $4,
        completed_at = $5,
        updated_at = NOW()
       WHERE id = $6`,
      [data.status, data.quotedAmount ?? null, data.quotedCurrency ?? null, publicSummary ?? null, completedAt, requestId]
    );

    await addUpdate(
      client,
      requestId,
      { role: isVendor ? 'VENDOR' : 'PLATFORM_ADMIN', adminId: user.id },
      current.status,
      data.status,
      data.note,
      data.status === 'COMPLETED' || data.status === 'SCHEDULED'
    );
  }).then(() => hydrateRequest(requestId));
}

export async function addAdminUpdate(user: AuthUser, requestId: string, data: { note: string; isPublic?: boolean }) {
  const request = await getAdminRequest(user, requestId);
  return withTransaction(async (client) => {
    await addUpdate(
      client,
      request.id,
      { role: user.role === 'PLATFORM_ADMIN' ? 'PLATFORM_ADMIN' : 'VENDOR', adminId: user.id },
      null,
      null,
      data.note,
      data.isPublic ?? false
    );
  }).then(() => hydrateRequest(requestId));
}

export async function getPublicCarMaintenanceHistory(carId: string) {
  const result = await query(
    `SELECT mr.id, mr.car_id, mr.request_type, mr.status, mr.public_summary, mr.completed_at,
      mr.created_at, t.name AS partner_name
     FROM maintenance_requests mr
     LEFT JOIN technicians t ON t.id = mr.assigned_partner_id
     JOIN cars c ON c.id = mr.car_id
     WHERE mr.car_id = $1
       AND mr.status = 'COMPLETED'
       AND c.deleted_at IS NULL
     ORDER BY mr.completed_at DESC NULLS LAST, mr.created_at DESC`,
    [carId]
  );

  return {
    carId,
    items: result.rows.map((row) => ({
      id: row.id,
      carId: row.car_id,
      requestType: row.request_type,
      status: row.status,
      publicSummary: row.public_summary ?? undefined,
      completedAt: row.completed_at ?? undefined,
      partnerName: row.partner_name ?? undefined,
      createdAt: row.created_at
    }))
  };
}

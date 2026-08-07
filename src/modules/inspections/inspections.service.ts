import { PoolClient } from 'pg';
import { uploadBuffer } from '../../config/cloudinary';
import { query, withTransaction } from '../../config/db';
import { conflict, notFound } from '../../shared/errors';

export async function uploadInspectionFile(carId: string, file: Express.Multer.File) {
  const uploaded = await uploadBuffer(file.buffer, `drivex/inspections/${carId}`, 'auto');
  return { url: uploaded.secure_url };
}

function mapFinding(row: any) {
  return {
    id: row.id,
    description: row.description,
    severity: row.severity,
    estimatedRepairCost:
      row.estimated_repair_cost_amount != null
        ? { amount: Number(row.estimated_repair_cost_amount), currency: row.estimated_repair_cost_currency }
        : undefined,
    createdAt: row.created_at
  };
}

function mapRound(row: any, findings: any[] = []) {
  return {
    id: row.id,
    roundNumber: row.round_number,
    requestedByRole: row.requested_by_role,
    requestedByAdminId: row.requested_by_admin_id,
    requestedByCustomerId: row.requested_by_customer_id,
    sourceType: row.source_type,
    status: row.status,
    templateData: row.template_data ?? undefined,
    externalFileUrl: row.external_file_url ?? undefined,
    technicianId: row.technician_id ?? undefined,
    scheduledAt: row.scheduled_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    overallVerdict: row.overall_verdict ?? undefined,
    price: row.price_amount != null ? { amount: Number(row.price_amount), currency: row.price_currency } : undefined,
    paidBy: row.paid_by ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    findings: findings.map(mapFinding)
  };
}

// Every submission (external file or self-filled template) passes through Drive X's own
// review before it's trusted - but there's no separate "internal reviewer" persona in the
// system yet (Pillar 2's Platform Admin role is the natural future home for that step), so
// for now the OPENED -> INTERNAL_REVIEW -> FILE_ACCEPTED transition happens instantly rather
// than sitting in a pending queue. The states still exist in the schema for when that changes.
export async function submitSellerInspection(
  carId: string,
  data: { sourceType: 'EXTERNAL_FILE' | 'TEMPLATE'; externalFileUrl?: string; templateData?: Record<string, unknown> },
  adminId: string
) {
  return withTransaction(async (client: PoolClient) => {
    const carResult = await client.query(`SELECT id FROM cars WHERE id = $1 AND deleted_at IS NULL`, [carId]);
    if (!carResult.rows[0]) {
      throw notFound('Car not found');
    }

    let caseResult = await client.query(`SELECT id FROM inspection_cases WHERE car_id = $1 FOR UPDATE`, [carId]);
    let caseId: string;
    if (caseResult.rows[0]) {
      caseId = caseResult.rows[0].id;
    } else {
      const inserted = await client.query(`INSERT INTO inspection_cases (car_id) VALUES ($1) RETURNING id`, [carId]);
      caseId = inserted.rows[0].id;
    }

    const nextRound = await client.query(
      `SELECT COALESCE(MAX(round_number), 0) + 1 AS next FROM inspection_rounds WHERE case_id = $1`,
      [caseId]
    );

    const result = await client.query(
      `INSERT INTO inspection_rounds (
        case_id, round_number, requested_by_role, requested_by_admin_id, source_type, status,
        template_data, external_file_url
      ) VALUES ($1,$2,'SELLER',$3,$4,'FILE_ACCEPTED',$5,$6)
      RETURNING *`,
      [
        caseId,
        nextRound.rows[0].next,
        adminId,
        data.sourceType,
        data.sourceType === 'TEMPLATE' ? data.templateData : null,
        data.sourceType === 'EXTERNAL_FILE' ? data.externalFileUrl : null
      ]
    );

    return mapRound(result.rows[0]);
  });
}

// A buyer/renter distrusting an already-accepted file (or a seller/admin escalating one)
// opens a brand new round rather than mutating the old one, so the full history survives.
export async function requestTechnicianVisit(
  carId: string,
  data: { requestedByRole: 'SELLER' | 'BUYER' | 'RENTER'; notes?: string },
  actor: { adminId?: string; customerId?: string }
) {
  return withTransaction(async (client: PoolClient) => {
    const carResult = await client.query(`SELECT id FROM cars WHERE id = $1 AND deleted_at IS NULL`, [carId]);
    if (!carResult.rows[0]) {
      throw notFound('Car not found');
    }

    let caseResult = await client.query(`SELECT id FROM inspection_cases WHERE car_id = $1 FOR UPDATE`, [carId]);
    let caseId: string;
    if (caseResult.rows[0]) {
      caseId = caseResult.rows[0].id;
    } else {
      const inserted = await client.query(`INSERT INTO inspection_cases (car_id) VALUES ($1) RETURNING id`, [carId]);
      caseId = inserted.rows[0].id;
    }

    const nextRound = await client.query(
      `SELECT COALESCE(MAX(round_number), 0) + 1 AS next FROM inspection_rounds WHERE case_id = $1`,
      [caseId]
    );

    const result = await client.query(
      `INSERT INTO inspection_rounds (
        case_id, round_number, requested_by_role, requested_by_admin_id, requested_by_customer_id,
        source_type, status, notes
      ) VALUES ($1,$2,$3,$4,$5,'DRIVEX_INSPECTION','ESCALATED_TO_TECHNICIAN',$6)
      RETURNING *`,
      [caseId, nextRound.rows[0].next, data.requestedByRole, actor.adminId ?? null, actor.customerId ?? null, data.notes ?? null]
    );

    return mapRound(result.rows[0]);
  });
}

async function loadRoundForUpdate(client: PoolClient, roundId: string) {
  const result = await client.query(`SELECT * FROM inspection_rounds WHERE id = $1 FOR UPDATE`, [roundId]);
  if (!result.rows[0]) {
    throw notFound('Inspection round not found');
  }
  return result.rows[0];
}

export async function scheduleRound(roundId: string, data: { technicianId: string; scheduledAt: string }) {
  return withTransaction(async (client: PoolClient) => {
    const round = await loadRoundForUpdate(client, roundId);
    if (round.status !== 'ESCALATED_TO_TECHNICIAN') {
      throw conflict(`Cannot schedule a round in status ${round.status}`);
    }

    const technician = await client.query(`SELECT id FROM technicians WHERE id = $1 AND is_active = TRUE`, [
      data.technicianId
    ]);
    if (!technician.rows[0]) {
      throw notFound('Technician not found or inactive');
    }

    const result = await client.query(
      `UPDATE inspection_rounds SET technician_id = $1, scheduled_at = $2, status = 'SCHEDULED', updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [data.technicianId, data.scheduledAt, roundId]
    );

    return mapRound(result.rows[0]);
  });
}

export async function startRound(roundId: string) {
  return withTransaction(async (client: PoolClient) => {
    const round = await loadRoundForUpdate(client, roundId);
    if (round.status !== 'SCHEDULED') {
      throw conflict(`Cannot start a round in status ${round.status}`);
    }

    const result = await client.query(
      `UPDATE inspection_rounds SET status = 'IN_PROGRESS', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [roundId]
    );

    return mapRound(result.rows[0]);
  });
}

export async function submitReport(
  roundId: string,
  data: {
    overallVerdict?: string;
    priceAmount?: number;
    priceCurrency?: 'USD' | 'SYP';
    paidBy?: 'SELLER' | 'BUYER' | 'RENTER' | 'DRIVEX';
    findings: Array<{
      description: string;
      severity: 'MINOR' | 'MODERATE' | 'SEVERE' | 'SAFETY_CRITICAL';
      estimatedRepairCostAmount?: number;
      estimatedRepairCostCurrency?: 'USD' | 'SYP';
    }>;
  }
) {
  return withTransaction(async (client: PoolClient) => {
    const round = await loadRoundForUpdate(client, roundId);
    if (round.status !== 'IN_PROGRESS') {
      throw conflict(`Cannot submit a report for a round in status ${round.status}`);
    }

    const result = await client.query(
      `UPDATE inspection_rounds SET
        status = 'REPORT_SUBMITTED', completed_at = NOW(), updated_at = NOW(),
        overall_verdict = $1, price_amount = $2, price_currency = $3, paid_by = $4
       WHERE id = $5 RETURNING *`,
      [data.overallVerdict ?? null, data.priceAmount ?? null, data.priceCurrency ?? null, data.paidBy ?? null, roundId]
    );

    for (const finding of data.findings) {
      await client.query(
        `INSERT INTO inspection_findings (
          round_id, description, severity, estimated_repair_cost_amount, estimated_repair_cost_currency
        ) VALUES ($1,$2,$3,$4,$5)`,
        [
          roundId,
          finding.description,
          finding.severity,
          finding.estimatedRepairCostAmount ?? null,
          finding.estimatedRepairCostCurrency ?? null
        ]
      );
    }

    const findingsResult = await client.query(`SELECT * FROM inspection_findings WHERE round_id = $1 ORDER BY created_at`, [
      roundId
    ]);

    return mapRound(result.rows[0], findingsResult.rows);
  });
}

export async function certifyRound(roundId: string) {
  return withTransaction(async (client: PoolClient) => {
    const round = await loadRoundForUpdate(client, roundId);
    if (round.status !== 'REPORT_SUBMITTED') {
      throw conflict(`Cannot certify a round in status ${round.status}`);
    }

    const result = await client.query(
      `UPDATE inspection_rounds SET status = 'CERTIFIED', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [roundId]
    );

    return mapRound(result.rows[0]);
  });
}

export async function cancelRound(roundId: string) {
  return withTransaction(async (client: PoolClient) => {
    const round = await loadRoundForUpdate(client, roundId);
    if (round.status === 'CERTIFIED' || round.status === 'CANCELLED') {
      throw conflict(`Cannot cancel a round in status ${round.status}`);
    }

    const result = await client.query(
      `UPDATE inspection_rounds SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [roundId]
    );

    return mapRound(result.rows[0]);
  });
}

// Pillar 2, item 23: when Drive X's own review confirms a falsified/fraudulent maintenance
// file, the affected listing is AUTOMATICALLY hidden - no separate human gate is needed for
// just hiding that one listing. Only the Platform Admin can substantiate the fraud call
// (the natural future home of the Pillar 1 "internal reviewer" persona). The round's history
// is preserved via the terminal FLAGGED_FRAUDULENT status, and un-hiding later restores the
// car exactly as the vendor had it.
export async function flagRoundAsFraudulent(roundId: string, adminId: string, reason: string) {
  return withTransaction(async (client: PoolClient) => {
    const round = await loadRoundForUpdate(client, roundId);
    if (round.status !== 'FILE_ACCEPTED') {
      throw conflict(
        `Only an accepted maintenance file (FILE_ACCEPTED) can be flagged as fraudulent - current status: ${round.status}`
      );
    }

    const caseResult = await client.query(`SELECT car_id FROM inspection_cases WHERE id = $1`, [round.case_id]);
    const carId = caseResult.rows[0].car_id;

    const result = await client.query(
      `UPDATE inspection_rounds SET status = 'FLAGGED_FRAUDULENT', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [roundId]
    );

    await client.query(
      `UPDATE cars SET hidden_by_platform_at = NOW(), hidden_reason = $1, updated_at = NOW() WHERE id = $2`,
      [reason, carId]
    );

    await client.query(
      `INSERT INTO platform_admin_actions (admin_id, action, target_type, target_id, reason)
       VALUES ($1, 'AUTO_HIDE_CAR', 'CAR', $2, $3)`,
      [adminId, carId, reason]
    );

    return mapRound(result.rows[0]);
  });
}

export async function getCaseForCar(carId: string) {
  const caseResult = await query(`SELECT * FROM inspection_cases WHERE car_id = $1`, [carId]);
  if (!caseResult.rows[0]) {
    return { carId, rounds: [] };
  }

  const inspectionCase = caseResult.rows[0];
  const roundsResult = await query(
    `SELECT * FROM inspection_rounds WHERE case_id = $1 ORDER BY round_number DESC`,
    [inspectionCase.id]
  );

  const roundIds = roundsResult.rows.map((r) => r.id);
  const findingsByRound = new Map<string, any[]>();
  if (roundIds.length) {
    const findingsResult = await query(
      `SELECT * FROM inspection_findings WHERE round_id = ANY($1::uuid[]) ORDER BY created_at`,
      [roundIds]
    );
    for (const row of findingsResult.rows) {
      const list = findingsByRound.get(row.round_id) ?? [];
      list.push(row);
      findingsByRound.set(row.round_id, list);
    }
  }

  return {
    id: inspectionCase.id,
    carId: inspectionCase.car_id,
    createdAt: inspectionCase.created_at,
    updatedAt: inspectionCase.updated_at,
    rounds: roundsResult.rows.map((row) => mapRound(row, findingsByRound.get(row.id) ?? []))
  };
}

// Used by cars.service.ts to enforce the "must have an accepted maintenance file or
// certified inspection before a car can be listed publicly" rule.
export async function hasAcceptedInspection(carId: string) {
  const result = await query(
    `SELECT 1 FROM inspection_rounds ir
     JOIN inspection_cases ic ON ic.id = ir.case_id
     WHERE ic.car_id = $1 AND ir.status IN ('FILE_ACCEPTED', 'CERTIFIED')
     LIMIT 1`,
    [carId]
  );
  return Boolean(result.rows[0]);
}

function mapTechnician(row: any) {
  return {
    id: row.id,
    name: row.name,
    city: row.city,
    phone: row.phone ?? undefined,
    serviceTiers: row.service_tiers ?? [],
    specialty: row.specialty ?? undefined,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function listTechnicians() {
  const result = await query(`SELECT * FROM technicians ORDER BY name`);
  return result.rows.map(mapTechnician);
}

export async function createTechnician(data: {
  name: string;
  city: string;
  phone?: string;
  serviceTiers: Array<'QUICK' | 'COMPREHENSIVE'>;
  specialty?: string;
}) {
  const result = await query(
    `INSERT INTO technicians (name, city, phone, service_tiers, specialty)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [data.name, data.city, data.phone ?? null, data.serviceTiers, data.specialty ?? null]
  );
  return mapTechnician(result.rows[0]);
}

export async function updateTechnician(
  id: string,
  data: Partial<{
    name: string;
    city: string;
    phone: string;
    serviceTiers: Array<'QUICK' | 'COMPREHENSIVE'>;
    specialty: string;
    isActive: boolean;
  }>
) {
  const current = await query(`SELECT * FROM technicians WHERE id = $1`, [id]);
  if (!current.rows[0]) {
    throw notFound('Technician not found');
  }
  const existing = current.rows[0];

  const result = await query(
    `UPDATE technicians SET
      name = $1, city = $2, phone = $3, service_tiers = $4, specialty = $5, is_active = $6, updated_at = NOW()
     WHERE id = $7 RETURNING *`,
    [
      data.name ?? existing.name,
      data.city ?? existing.city,
      data.phone ?? existing.phone,
      data.serviceTiers ?? existing.service_tiers,
      data.specialty ?? existing.specialty,
      data.isActive ?? existing.is_active,
      id
    ]
  );

  return mapTechnician(result.rows[0]);
}

import { cloudinary, uploadBuffer } from '../../config/cloudinary';
import { query } from '../../config/db';
import * as inspectionsService from '../inspections/inspections.service';
import { offset, paginationMeta } from '../../shared/pagination';
import { conflict, notFound } from '../../shared/errors';

const PUBLICLY_LISTED_STATUSES = new Set(['AVAILABLE', 'RESERVED']);

async function assertListableStatus(carId: string | null, status: string) {
  if (!PUBLICLY_LISTED_STATUSES.has(status)) {
    return;
  }
  if (!carId) {
    // A brand new car can't have an inspection round yet (it needs a car id first) - it must
    // be created with a non-public status, then get a maintenance file/inspection, then be
    // updated to AVAILABLE/RESERVED.
    throw conflict(
      'New cars must be created with a non-public status (e.g. INACTIVE). Submit a maintenance file/inspection for the car first, then update its status to AVAILABLE or RESERVED.'
    );
  }
  const hasInspection = await inspectionsService.hasAcceptedInspection(carId);
  if (!hasInspection) {
    throw conflict(
      'This car needs an accepted maintenance file or certified inspection before it can be listed as AVAILABLE or RESERVED.'
    );
  }
}

type ListCarsQuery = Record<string, unknown> & { page: number; limit: number; sortBy: string };

const carSelect = `
  SELECT c.*,
    MAX(v.name) AS vendor_name,
    COALESCE(
      json_agg(
        json_build_object(
          'id', ci.id,
          'url', ci.image_url,
          'storageKey', ci.storage_key,
          'localPath', ci.local_path,
          'mimeType', ci.mime_type,
          'sizeBytes', ci.size_bytes,
          'isPrimary', ci.is_primary,
          'position', ci.position
        ) ORDER BY ci.is_primary DESC, ci.position ASC
      ) FILTER (WHERE ci.id IS NOT NULL),
      '[]'
    ) AS images
  FROM cars c
  LEFT JOIN car_images ci ON ci.car_id = c.id
  LEFT JOIN vendors v ON v.id = c.vendor_id
`;

function mapCar(row: any) {
  return {
    id: row.id,
    brand: row.brand,
    model: row.model,
    year: row.year,
    listingType: row.listing_type,
    condition: row.condition,
    status: row.status,
    salePrice: row.sale_price_amount
      ? { amount: Number(row.sale_price_amount), currency: row.sale_price_currency }
      : undefined,
    dailyRentPrice: row.daily_rent_price_amount
      ? { amount: Number(row.daily_rent_price_amount), currency: row.daily_rent_price_currency }
      : undefined,
    monthlyRentPrice: row.monthly_rent_price_amount
      ? { amount: Number(row.monthly_rent_price_amount), currency: row.monthly_rent_price_currency }
      : undefined,
    mileageKm: row.mileage_km,
    transmission: row.transmission,
    fuelType: row.fuel_type,
    color: row.color,
    city: row.city,
    specs: {
      engine: row.engine,
      seats: row.seats,
      drivetrain: row.drivetrain,
      horsepower: row.horsepower
    },
    description: row.description,
    images: row.images ?? [],
    vendorId: row.vendor_id,
    vendorName: row.vendor_name ?? undefined,
    hiddenByPlatform: Boolean(row.hidden_by_platform_at),
    hiddenReason: row.hidden_reason ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at
  };
}

// vendorScopeId: pass the acting OWNER/STAFF's vendor_id to restrict results to their own
// vendor; leave undefined for Platform Admin (sees every vendor) or for public browsing
// (publicOnly already scopes it a different way - see below).
function buildFilters(filters: ListCarsQuery, publicOnly: boolean, vendorScopeId?: string) {
  const where: string[] = ['c.deleted_at IS NULL'];
  const params: unknown[] = [];

  if (publicOnly) {
    where.push(`c.status IN ('AVAILABLE', 'RESERVED')`);
    where.push(`c.hidden_by_platform_at IS NULL`);
    where.push(`c.vendor_id NOT IN (SELECT id FROM vendors WHERE status = 'SUSPENDED')`);
  } else {
    if (vendorScopeId) {
      params.push(vendorScopeId);
      where.push(`c.vendor_id = $${params.length}`);
    }
    if (filters.status) {
      params.push(filters.status);
      where.push(`c.status = $${params.length}`);
    }
  }

  for (const [key, column] of [
    ['brand', 'brand'],
    ['model', 'model'],
    ['listingType', 'listing_type'],
    ['transmission', 'transmission'],
    ['fuelType', 'fuel_type']
  ] as const) {
    if (filters[key]) {
      params.push(filters[key]);
      where.push(`c.${column} = $${params.length}`);
    }
  }

  if (filters.search) {
    params.push(`%${filters.search}%`);
    where.push(`(c.brand ILIKE $${params.length} OR c.model ILIKE $${params.length})`);
  }
  if (filters.yearMin) {
    params.push(filters.yearMin);
    where.push(`c.year >= $${params.length}`);
  }
  if (filters.yearMax) {
    params.push(filters.yearMax);
    where.push(`c.year <= $${params.length}`);
  }
  if (filters.priceMin) {
    params.push(filters.priceMin);
    where.push(`COALESCE(c.sale_price_amount, c.monthly_rent_price_amount, c.daily_rent_price_amount) >= $${params.length}`);
  }
  if (filters.priceMax) {
    params.push(filters.priceMax);
    where.push(`COALESCE(c.sale_price_amount, c.monthly_rent_price_amount, c.daily_rent_price_amount) <= $${params.length}`);
  }

  return { where: where.join(' AND '), params };
}

function sortClause(sortBy: string) {
  const clauses: Record<string, string> = {
    newest: 'c.created_at DESC',
    priceAsc: 'COALESCE(c.sale_price_amount, c.monthly_rent_price_amount, c.daily_rent_price_amount) ASC NULLS LAST',
    priceDesc: 'COALESCE(c.sale_price_amount, c.monthly_rent_price_amount, c.daily_rent_price_amount) DESC NULLS LAST',
    yearDesc: 'c.year DESC',
    price_asc: 'COALESCE(c.sale_price_amount, c.monthly_rent_price_amount, c.daily_rent_price_amount) ASC NULLS LAST',
    price_desc: 'COALESCE(c.sale_price_amount, c.monthly_rent_price_amount, c.daily_rent_price_amount) DESC NULLS LAST',
    year_desc: 'c.year DESC',
    mileage_asc: 'c.mileage_km ASC NULLS LAST'
  };

  return clauses[sortBy] ?? clauses.newest;
}

export async function listCars(filters: ListCarsQuery, publicOnly: boolean, vendorScopeId?: string) {
  const built = buildFilters(filters, publicOnly, vendorScopeId);
  const count = await query<{ count: string }>(`SELECT COUNT(*) FROM cars c WHERE ${built.where}`, built.params);
  const total = Number(count.rows[0].count);
  const params = [...built.params, filters.limit, offset(filters.page, filters.limit)];
  const result = await query(
    `${carSelect}
     WHERE ${built.where}
     GROUP BY c.id
     ORDER BY ${sortClause(filters.sortBy)}
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { items: result.rows.map(mapCar), ...paginationMeta(filters.page, filters.limit, total) };
}

export async function getCar(id: string, publicOnly: boolean, vendorScopeId?: string) {
  const where = ['c.id = $1', 'c.deleted_at IS NULL'];
  const params: unknown[] = [id];

  if (publicOnly) {
    where.push(`c.status IN ('AVAILABLE', 'RESERVED')`);
    where.push(`c.hidden_by_platform_at IS NULL`);
    where.push(`c.vendor_id NOT IN (SELECT id FROM vendors WHERE status = 'SUSPENDED')`);
  } else if (vendorScopeId) {
    // A vendor's own admin looking up any car by id (including one that isn't theirs) gets a
    // plain 404, same as if it didn't exist - not a 403 - so as not to confirm other vendors'
    // car ids exist.
    params.push(vendorScopeId);
    where.push(`c.vendor_id = $${params.length}`);
  }

  const result = await query(
    `${carSelect}
     WHERE ${where.join(' AND ')}
     GROUP BY c.id`,
    params
  );

  if (!result.rows[0]) {
    throw notFound('Car not found');
  }

  return mapCar(result.rows[0]);
}

export async function createCar(data: any, adminId: string, vendorId: string) {
  await assertListableStatus(null, data.status);

  const result = await query(
    `INSERT INTO cars (
      vendor_id, brand, model, year, listing_type, condition, status,
      sale_price_amount, sale_price_currency,
      daily_rent_price_amount, daily_rent_price_currency,
      monthly_rent_price_amount, monthly_rent_price_currency,
      mileage_km, transmission, fuel_type, color, city,
      engine, seats, drivetrain, horsepower, description, updated_by
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24
    ) RETURNING id`,
    [
      vendorId,
      data.brand,
      data.model,
      data.year,
      data.listingType,
      data.condition,
      data.status,
      data.salePrice?.amount,
      data.salePrice?.currency,
      data.dailyRentPrice?.amount,
      data.dailyRentPrice?.currency,
      data.monthlyRentPrice?.amount,
      data.monthlyRentPrice?.currency,
      data.mileageKm,
      data.transmission,
      data.fuelType,
      data.color,
      data.city,
      data.specs.engine,
      data.specs.seats,
      data.specs.drivetrain,
      data.specs.horsepower,
      data.description,
      adminId
    ]
  );

  return getCar(result.rows[0].id, false, vendorId);
}

export async function updateCar(id: string, data: any, adminId: string, vendorScopeId: string) {
  const current = await getCar(id, false, vendorScopeId);
  const merged = { ...current, ...data, specs: { ...current.specs, ...data.specs } };

  await assertListableStatus(id, merged.status);

  await query(
    `UPDATE cars SET
      brand=$1, model=$2, year=$3, listing_type=$4, condition=$5, status=$6,
      sale_price_amount=$7, sale_price_currency=$8,
      daily_rent_price_amount=$9, daily_rent_price_currency=$10,
      monthly_rent_price_amount=$11, monthly_rent_price_currency=$12,
      mileage_km=$13, transmission=$14, fuel_type=$15, color=$16, city=$17,
      engine=$18, seats=$19, drivetrain=$20, horsepower=$21, description=$22,
      updated_by=$23, updated_at=NOW()
     WHERE id=$24 AND vendor_id=$25 AND deleted_at IS NULL`,
    [
      merged.brand,
      merged.model,
      merged.year,
      merged.listingType,
      merged.condition,
      merged.status,
      merged.salePrice?.amount,
      merged.salePrice?.currency,
      merged.dailyRentPrice?.amount,
      merged.dailyRentPrice?.currency,
      merged.monthlyRentPrice?.amount,
      merged.monthlyRentPrice?.currency,
      merged.mileageKm,
      merged.transmission,
      merged.fuelType,
      merged.color,
      merged.city,
      merged.specs.engine,
      merged.specs.seats,
      merged.specs.drivetrain,
      merged.specs.horsepower,
      merged.description,
      adminId,
      id,
      vendorScopeId
    ]
  );

  return getCar(id, false, vendorScopeId);
}

export async function softDeleteCar(id: string, vendorScopeId: string) {
  const result = await query(
    `UPDATE cars SET deleted_at = NOW() WHERE id = $1 AND vendor_id = $2 AND deleted_at IS NULL`,
    [id, vendorScopeId]
  );
  if (!result.rowCount) {
    throw notFound('Car not found');
  }
}

export async function addImage(
  carId: string,
  file: Express.Multer.File,
  isPrimary: boolean,
  position: number,
  vendorScopeId: string
) {
  await getCar(carId, false, vendorScopeId);
  const uploaded = await uploadBuffer(file.buffer, `drivex/cars/${carId}`);

  if (isPrimary) {
    await query(`UPDATE car_images SET is_primary = FALSE WHERE car_id = $1`, [carId]);
  }

  const result = await query(
    `INSERT INTO car_images (car_id, image_url, storage_key, local_path, mime_type, size_bytes, is_primary, position)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING id, image_url AS url, storage_key AS "storageKey", local_path AS "localPath",
       mime_type AS "mimeType", size_bytes AS "sizeBytes", is_primary AS "isPrimary", position`,
    [carId, uploaded.secure_url, uploaded.public_id, null, file.mimetype, uploaded.bytes, isPrimary, position]
  );

  return result.rows[0];
}

export async function deleteImage(carId: string, imageId: string, vendorScopeId: string) {
  await getCar(carId, false, vendorScopeId);

  const result = await query<{ storage_key: string | null }>(
    `DELETE FROM car_images WHERE id = $1 AND car_id = $2 RETURNING storage_key`,
    [imageId, carId]
  );

  if (!result.rows[0]) {
    throw notFound('Image not found');
  }

  if (result.rows[0].storage_key) {
    await cloudinary.uploader.destroy(result.rows[0].storage_key).catch(() => undefined);
  }
}

export async function filtersMeta() {
  const [brands, models, years] = await Promise.all([
    query<{ brand: string }>(`SELECT DISTINCT brand FROM cars WHERE deleted_at IS NULL ORDER BY brand`),
    query<{ model: string }>(`SELECT DISTINCT model FROM cars WHERE deleted_at IS NULL ORDER BY model`),
    query<{ year: number }>(`SELECT DISTINCT year FROM cars WHERE deleted_at IS NULL ORDER BY year DESC`)
  ]);

  return {
    brands: brands.rows.map((row) => row.brand),
    models: models.rows.map((row) => row.model),
    years: years.rows.map((row) => row.year),
    fuelTypes: ['GASOLINE', 'DIESEL', 'HYBRID', 'ELECTRIC'],
    transmissionTypes: ['AUTOMATIC', 'MANUAL'],
    listingTypes: ['SALE', 'RENT', 'BOTH']
  };
}

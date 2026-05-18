import fs from 'fs';
import path from 'path';
import { query } from '../../config/db';
import { env } from '../../config/env';
import { offset, paginationMeta } from '../../shared/pagination';
import { notFound } from '../../shared/errors';

type ListCarsQuery = Record<string, unknown> & { page: number; limit: number; sortBy: string };

const carSelect = `
  SELECT c.*,
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at
  };
}

function buildFilters(filters: ListCarsQuery, publicOnly: boolean) {
  const where: string[] = ['c.deleted_at IS NULL'];
  const params: unknown[] = [];

  if (publicOnly) {
    where.push(`c.status IN ('AVAILABLE', 'RESERVED')`);
  } else if (filters.status) {
    params.push(filters.status);
    where.push(`c.status = $${params.length}`);
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
    where.push(`COALESCE(c.sale_price_amount, c.daily_rent_price_amount, c.monthly_rent_price_amount) >= $${params.length}`);
  }
  if (filters.priceMax) {
    params.push(filters.priceMax);
    where.push(`COALESCE(c.sale_price_amount, c.daily_rent_price_amount, c.monthly_rent_price_amount) <= $${params.length}`);
  }

  return { where: where.join(' AND '), params };
}

function sortClause(sortBy: string) {
  const clauses: Record<string, string> = {
    newest: 'c.created_at DESC',
    price_asc: 'COALESCE(c.sale_price_amount, c.daily_rent_price_amount, c.monthly_rent_price_amount) ASC NULLS LAST',
    price_desc: 'COALESCE(c.sale_price_amount, c.daily_rent_price_amount, c.monthly_rent_price_amount) DESC NULLS LAST',
    year_desc: 'c.year DESC',
    mileage_asc: 'c.mileage_km ASC NULLS LAST'
  };

  return clauses[sortBy] ?? clauses.newest;
}

export async function listCars(filters: ListCarsQuery, publicOnly: boolean) {
  const built = buildFilters(filters, publicOnly);
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

export async function getCar(id: string, publicOnly: boolean) {
  const statusFilter = publicOnly ? `AND c.status IN ('AVAILABLE', 'RESERVED')` : '';
  const result = await query(
    `${carSelect}
     WHERE c.id = $1 AND c.deleted_at IS NULL ${statusFilter}
     GROUP BY c.id`,
    [id]
  );

  if (!result.rows[0]) {
    throw notFound('Car not found');
  }

  return mapCar(result.rows[0]);
}

export async function createCar(data: any, adminId: string) {
  const result = await query(
    `INSERT INTO cars (
      brand, model, year, listing_type, condition, status,
      sale_price_amount, sale_price_currency,
      daily_rent_price_amount, daily_rent_price_currency,
      monthly_rent_price_amount, monthly_rent_price_currency,
      mileage_km, transmission, fuel_type, color, city,
      engine, seats, drivetrain, horsepower, description, updated_by
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23
    ) RETURNING id`,
    [
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

  return getCar(result.rows[0].id, false);
}

export async function updateCar(id: string, data: any, adminId: string) {
  const current = await getCar(id, false);
  const merged = { ...current, ...data, specs: { ...current.specs, ...data.specs } };

  await query(
    `UPDATE cars SET
      brand=$1, model=$2, year=$3, listing_type=$4, condition=$5, status=$6,
      sale_price_amount=$7, sale_price_currency=$8,
      daily_rent_price_amount=$9, daily_rent_price_currency=$10,
      monthly_rent_price_amount=$11, monthly_rent_price_currency=$12,
      mileage_km=$13, transmission=$14, fuel_type=$15, color=$16, city=$17,
      engine=$18, seats=$19, drivetrain=$20, horsepower=$21, description=$22,
      updated_by=$23, updated_at=NOW()
     WHERE id=$24 AND deleted_at IS NULL`,
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
      id
    ]
  );

  return getCar(id, false);
}

export async function softDeleteCar(id: string) {
  const result = await query(`UPDATE cars SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`, [id]);
  if (!result.rowCount) {
    throw notFound('Car not found');
  }
}

export async function addImage(carId: string, file: Express.Multer.File, isPrimary: boolean, position: number) {
  await getCar(carId, false);
  const storageKey = path.join('cars', carId, file.filename).replace(/\\/g, '/');
  const imageUrl = `${env.PUBLIC_BASE_URL}/uploads/${storageKey}`;

  if (isPrimary) {
    await query(`UPDATE car_images SET is_primary = FALSE WHERE car_id = $1`, [carId]);
  }

  const result = await query(
    `INSERT INTO car_images (car_id, image_url, storage_key, local_path, mime_type, size_bytes, is_primary, position)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING id, image_url AS url, storage_key AS "storageKey", local_path AS "localPath",
       mime_type AS "mimeType", size_bytes AS "sizeBytes", is_primary AS "isPrimary", position`,
    [carId, imageUrl, storageKey, file.path, file.mimetype, file.size, isPrimary, position]
  );

  return result.rows[0];
}

export async function deleteImage(carId: string, imageId: string) {
  const result = await query<{ local_path: string }>(
    `DELETE FROM car_images WHERE id = $1 AND car_id = $2 RETURNING local_path`,
    [imageId, carId]
  );

  if (!result.rows[0]) {
    throw notFound('Image not found');
  }

  if (result.rows[0].local_path && fs.existsSync(result.rows[0].local_path)) {
    fs.unlinkSync(result.rows[0].local_path);
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


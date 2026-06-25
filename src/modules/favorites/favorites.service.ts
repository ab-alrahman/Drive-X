import { query } from '../../config/db';
import { notFound } from '../../shared/errors';
import * as carsService from '../cars/cars.service';

export async function listFavorites(customerId: string) {
  const result = await query<{ car_id: string }>(
    `SELECT car_id FROM customer_favorites WHERE customer_user_id = $1 ORDER BY created_at DESC`,
    [customerId]
  );

  const items = await Promise.all(
    result.rows.map(async (row) => {
      try {
        return await carsService.getCar(row.car_id, true);
      } catch {
        return null;
      }
    })
  );

  return { items: items.filter(Boolean), ids: result.rows.map((row) => row.car_id) };
}

export async function addFavorite(customerId: string, carId: string) {
  await carsService.getCar(carId, true);
  await query(
    `INSERT INTO customer_favorites (customer_user_id, car_id)
     VALUES ($1, $2)
     ON CONFLICT (customer_user_id, car_id) DO NOTHING`,
    [customerId, carId]
  );

  return { carId, favorited: true };
}

export async function removeFavorite(customerId: string, carId: string) {
  const result = await query(
    `DELETE FROM customer_favorites WHERE customer_user_id = $1 AND car_id = $2`,
    [customerId, carId]
  );

  if (!result.rowCount) {
    throw notFound('Favorite not found');
  }

  return { carId, favorited: false };
}

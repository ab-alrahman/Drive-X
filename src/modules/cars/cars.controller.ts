import { RequestHandler } from 'express';
import { unauthorized } from '../../shared/errors';
import * as carsService from './cars.service';

function paramValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? '';
}

// undefined = no vendor filter (Platform Admin sees every vendor's cars).
function vendorScope(req: Parameters<RequestHandler>[0]): string | undefined {
  return req.user!.role === 'PLATFORM_ADMIN' ? undefined : (req.user!.vendorId ?? undefined);
}

// OWNER/STAFF always have a vendorId (enforced by the admin_users_role_vendor_check
// constraint) - this only throws if that invariant is ever violated.
function requireVendorId(req: Parameters<RequestHandler>[0]): string {
  const vendorId = req.user!.vendorId;
  if (!vendorId) {
    throw unauthorized('This action requires a vendor-scoped account, not a Platform Admin.');
  }
  return vendorId;
}

export const listPublicCars: RequestHandler = async (req, res, next) => {
  try {
    res.json(await carsService.listCars(req.query as any, true));
  } catch (err) {
    next(err);
  }
};

export const getPublicCar: RequestHandler = async (req, res, next) => {
  try {
    res.json(await carsService.getCar(paramValue(req.params.carId), true));
  } catch (err) {
    next(err);
  }
};

export const filtersMeta: RequestHandler = async (_req, res, next) => {
  try {
    res.json(await carsService.filtersMeta());
  } catch (err) {
    next(err);
  }
};

export const listAdminCars: RequestHandler = async (req, res, next) => {
  try {
    res.json(await carsService.listCars(req.query as any, false, vendorScope(req)));
  } catch (err) {
    next(err);
  }
};

export const getAdminCar: RequestHandler = async (req, res, next) => {
  try {
    res.json(await carsService.getCar(paramValue(req.params.carId), false, vendorScope(req)));
  } catch (err) {
    next(err);
  }
};

export const createCar: RequestHandler = async (req, res, next) => {
  try {
    res.status(201).json(await carsService.createCar(req.body, req.user!.id, requireVendorId(req)));
  } catch (err) {
    next(err);
  }
};

export const updateCar: RequestHandler = async (req, res, next) => {
  try {
    res.json(
      await carsService.updateCar(paramValue(req.params.carId), req.body, req.user!.id, requireVendorId(req))
    );
  } catch (err) {
    next(err);
  }
};

export const deleteCar: RequestHandler = async (req, res, next) => {
  try {
    await carsService.softDeleteCar(paramValue(req.params.carId), requireVendorId(req));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

export const uploadImage: RequestHandler = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'file is required' });
    }

    const carId = paramValue(req.params.carId);
    const image = await carsService.addImage(
      carId,
      req.file,
      req.body.isPrimary === 'true' || req.body.isPrimary === true,
      Number(req.body.position ?? 0),
      requireVendorId(req)
    );

    return res.status(201).json(image);
  } catch (err) {
    return next(err);
  }
};

export const deleteImage: RequestHandler = async (req, res, next) => {
  try {
    await carsService.deleteImage(paramValue(req.params.carId), paramValue(req.params.imageId), requireVendorId(req));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

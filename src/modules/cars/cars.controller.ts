import { RequestHandler } from 'express';
import * as carsService from './cars.service';

function paramValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? '';
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
    res.json(await carsService.listCars(req.query as any, false));
  } catch (err) {
    next(err);
  }
};

export const getAdminCar: RequestHandler = async (req, res, next) => {
  try {
    res.json(await carsService.getCar(paramValue(req.params.carId), false));
  } catch (err) {
    next(err);
  }
};

export const createCar: RequestHandler = async (req, res, next) => {
  try {
    res.status(201).json(await carsService.createCar(req.body, req.user!.id));
  } catch (err) {
    next(err);
  }
};

export const updateCar: RequestHandler = async (req, res, next) => {
  try {
    res.json(await carsService.updateCar(paramValue(req.params.carId), req.body, req.user!.id));
  } catch (err) {
    next(err);
  }
};

export const deleteCar: RequestHandler = async (req, res, next) => {
  try {
    await carsService.softDeleteCar(paramValue(req.params.carId));
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
      Number(req.body.position ?? 0)
    );

    return res.status(201).json(image);
  } catch (err) {
    return next(err);
  }
};

export const deleteImage: RequestHandler = async (req, res, next) => {
  try {
    await carsService.deleteImage(paramValue(req.params.carId), paramValue(req.params.imageId));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

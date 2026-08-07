import { RequestHandler } from 'express';
import * as vendorsService from './vendors.service';

function paramValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? '';
}

export const registerVendor: RequestHandler = async (req, res, next) => {
  try {
    res.status(201).json(await vendorsService.registerVendor(req.body));
  } catch (err) {
    next(err);
  }
};

export const listVendors: RequestHandler = async (_req, res, next) => {
  try {
    res.json(await vendorsService.listVendorsForPlatform());
  } catch (err) {
    next(err);
  }
};

export const suspendVendor: RequestHandler = async (req, res, next) => {
  try {
    res.json(await vendorsService.suspendVendor(paramValue(req.params.vendorId), req.user!.id, req.body.reason));
  } catch (err) {
    next(err);
  }
};

export const unsuspendVendor: RequestHandler = async (req, res, next) => {
  try {
    res.json(await vendorsService.unsuspendVendor(paramValue(req.params.vendorId), req.user!.id));
  } catch (err) {
    next(err);
  }
};

export const hideCar: RequestHandler = async (req, res, next) => {
  try {
    await vendorsService.hideCar(paramValue(req.params.carId), req.user!.id, req.body.reason);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

export const unhideCar: RequestHandler = async (req, res, next) => {
  try {
    await vendorsService.unhideCar(paramValue(req.params.carId), req.user!.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

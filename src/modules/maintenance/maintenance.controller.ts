import { RequestHandler } from 'express';
import * as maintenanceService from './maintenance.service';

function paramValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? '';
}

export const getMyCars: RequestHandler = async (req, res, next) => {
  try {
    res.json(await maintenanceService.getMyCars(req.customer!.id));
  } catch (err) {
    next(err);
  }
};

export const listWorkshops: RequestHandler = async (_req, res, next) => {
  try {
    res.json(await maintenanceService.listActiveWorkshops());
  } catch (err) {
    next(err);
  }
};

export const createCustomerRequest: RequestHandler = async (req, res, next) => {
  try {
    res.status(201).json(await maintenanceService.createCustomerRequest(req.customer!.id, req.body));
  } catch (err) {
    next(err);
  }
};

export const listCustomerRequests: RequestHandler = async (req, res, next) => {
  try {
    res.json(await maintenanceService.listCustomerRequests(req.customer!.id, req.query as any));
  } catch (err) {
    next(err);
  }
};

export const getCustomerRequest: RequestHandler = async (req, res, next) => {
  try {
    res.json(await maintenanceService.getCustomerRequest(req.customer!.id, paramValue(req.params.requestId)));
  } catch (err) {
    next(err);
  }
};

export const cancelCustomerRequest: RequestHandler = async (req, res, next) => {
  try {
    res.json(await maintenanceService.cancelCustomerRequest(req.customer!.id, paramValue(req.params.requestId)));
  } catch (err) {
    next(err);
  }
};

export const approveCustomerQuote: RequestHandler = async (req, res, next) => {
  try {
    res.json(await maintenanceService.approveCustomerQuote(req.customer!.id, paramValue(req.params.requestId)));
  } catch (err) {
    next(err);
  }
};

export const rejectCustomerQuote: RequestHandler = async (req, res, next) => {
  try {
    res.json(await maintenanceService.rejectCustomerQuote(req.customer!.id, paramValue(req.params.requestId), req.body?.note));
  } catch (err) {
    next(err);
  }
};

export const uploadCustomerFile: RequestHandler = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'file is required' });
    }
    return res.status(201).json(
      await maintenanceService.uploadCustomerFile(req.customer!.id, paramValue(req.params.requestId), req.file)
    );
  } catch (err) {
    return next(err);
  }
};

export const listAdminRequests: RequestHandler = async (req, res, next) => {
  try {
    res.json(await maintenanceService.listAdminRequests(req.user!, req.query as any));
  } catch (err) {
    next(err);
  }
};

export const getAdminRequest: RequestHandler = async (req, res, next) => {
  try {
    res.json(await maintenanceService.getAdminRequest(req.user!, paramValue(req.params.requestId)));
  } catch (err) {
    next(err);
  }
};

export const triageRequest: RequestHandler = async (req, res, next) => {
  try {
    res.json(await maintenanceService.triageRequest(req.user!, paramValue(req.params.requestId), req.body));
  } catch (err) {
    next(err);
  }
};

export const assignPartner: RequestHandler = async (req, res, next) => {
  try {
    res.json(await maintenanceService.assignPartner(req.user!, paramValue(req.params.requestId), req.body));
  } catch (err) {
    next(err);
  }
};

export const scheduleRequest: RequestHandler = async (req, res, next) => {
  try {
    res.json(await maintenanceService.scheduleRequest(req.user!, paramValue(req.params.requestId), req.body));
  } catch (err) {
    next(err);
  }
};

export const updateStatus: RequestHandler = async (req, res, next) => {
  try {
    res.json(await maintenanceService.updateStatus(req.user!, paramValue(req.params.requestId), req.body));
  } catch (err) {
    next(err);
  }
};

export const addAdminUpdate: RequestHandler = async (req, res, next) => {
  try {
    res.status(201).json(await maintenanceService.addAdminUpdate(req.user!, paramValue(req.params.requestId), req.body));
  } catch (err) {
    next(err);
  }
};

export const getPublicCarMaintenanceHistory: RequestHandler = async (req, res, next) => {
  try {
    res.json(await maintenanceService.getPublicCarMaintenanceHistory(paramValue(req.params.carId)));
  } catch (err) {
    next(err);
  }
};

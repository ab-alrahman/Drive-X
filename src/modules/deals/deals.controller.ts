import { RequestHandler } from 'express';
import { unauthorized } from '../../shared/errors';
import * as dealsService from './deals.service';

function paramValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? '';
}

function vendorScope(req: Parameters<RequestHandler>[0]): string | undefined {
  return req.user!.role === 'PLATFORM_ADMIN' ? undefined : (req.user!.vendorId ?? undefined);
}

function requireVendorId(req: Parameters<RequestHandler>[0]): string {
  const vendorId = req.user!.vendorId;
  if (!vendorId) {
    throw unauthorized('This action requires a vendor-scoped account, not a Platform Admin.');
  }
  return vendorId;
}

export const listDeals: RequestHandler = async (req, res, next) => {
  try {
    res.json(await dealsService.listDeals(req.query, vendorScope(req)));
  } catch (err) {
    next(err);
  }
};

export const createDeal: RequestHandler = async (req, res, next) => {
  try {
    res.status(201).json(await dealsService.createDeal(req.body, req.user!.id, requireVendorId(req)));
  } catch (err) {
    next(err);
  }
};

export const getDeal: RequestHandler = async (req, res, next) => {
  try {
    res.json(await dealsService.getDeal(paramValue(req.params.dealId), vendorScope(req)));
  } catch (err) {
    next(err);
  }
};

export const updateDeal: RequestHandler = async (req, res, next) => {
  try {
    res.json(
      await dealsService.updateDeal(paramValue(req.params.dealId), req.body, req.user!.id, requireVendorId(req))
    );
  } catch (err) {
    next(err);
  }
};

export const deleteDeal: RequestHandler = async (req, res, next) => {
  try {
    await dealsService.deleteDeal(paramValue(req.params.dealId), req.user!.id, requireVendorId(req));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

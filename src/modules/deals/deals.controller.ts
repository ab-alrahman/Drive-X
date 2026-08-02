import { RequestHandler } from 'express';
import * as dealsService from './deals.service';

function paramValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? '';
}

export const listDeals: RequestHandler = async (req, res, next) => {
  try {
    res.json(await dealsService.listDeals(req.query));
  } catch (err) {
    next(err);
  }
};

export const createDeal: RequestHandler = async (req, res, next) => {
  try {
    res.status(201).json(await dealsService.createDeal(req.body, req.user!.id));
  } catch (err) {
    next(err);
  }
};

export const getDeal: RequestHandler = async (req, res, next) => {
  try {
    res.json(await dealsService.getDeal(paramValue(req.params.dealId)));
  } catch (err) {
    next(err);
  }
};

export const updateDeal: RequestHandler = async (req, res, next) => {
  try {
    res.json(await dealsService.updateDeal(paramValue(req.params.dealId), req.body, req.user!.id));
  } catch (err) {
    next(err);
  }
};

export const deleteDeal: RequestHandler = async (req, res, next) => {
  try {
    await dealsService.deleteDeal(paramValue(req.params.dealId), req.user!.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

import { RequestHandler } from 'express';
import * as dealsService from './deals.service';

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


import { RequestHandler } from 'express';
import * as dashboardService from './dashboard.service';

export const summary: RequestHandler = async (_req, res, next) => {
  try {
    res.json(await dashboardService.summary());
  } catch (err) {
    next(err);
  }
};


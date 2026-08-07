import { RequestHandler } from 'express';
import * as dashboardService from './dashboard.service';

export const summary: RequestHandler = async (req, res, next) => {
  try {
    const vendorScopeId = req.user!.role === 'PLATFORM_ADMIN' ? undefined : (req.user!.vendorId ?? undefined);
    res.json(await dashboardService.summary(vendorScopeId));
  } catch (err) {
    next(err);
  }
};

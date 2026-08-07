import { RequestHandler } from 'express';
import * as leadsService from './leads.service';

function paramValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? '';
}

function vendorScope(req: Parameters<RequestHandler>[0]): string | undefined {
  return req.user!.role === 'PLATFORM_ADMIN' ? undefined : (req.user!.vendorId ?? undefined);
}

export const createLead: RequestHandler = async (req, res, next) => {
  try {
    res.status(201).json(await leadsService.createLead(req.body));
  } catch (err) {
    next(err);
  }
};

export const getMyLeads: RequestHandler = async (req, res, next) => {
  try {
    res.json(await leadsService.getMyLeads(req.customer!.email, req.query));
  } catch (err) {
    next(err);
  }
};

export const listLeads: RequestHandler = async (req, res, next) => {
  try {
    res.json(await leadsService.listLeads(req.query, vendorScope(req)));
  } catch (err) {
    next(err);
  }
};

export const getLead: RequestHandler = async (req, res, next) => {
  try {
    res.json(await leadsService.getLead(paramValue(req.params.leadId), vendorScope(req)));
  } catch (err) {
    next(err);
  }
};

export const updateLead: RequestHandler = async (req, res, next) => {
  try {
    res.json(
      await leadsService.updateLead(paramValue(req.params.leadId), req.body, req.user!.id, vendorScope(req))
    );
  } catch (err) {
    next(err);
  }
};

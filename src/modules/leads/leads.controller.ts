import { RequestHandler } from 'express';
import * as leadsService from './leads.service';

function paramValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? '';
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
    res.json(await leadsService.listLeads(req.query));
  } catch (err) {
    next(err);
  }
};

export const getLead: RequestHandler = async (req, res, next) => {
  try {
    res.json(await leadsService.getLead(paramValue(req.params.leadId)));
  } catch (err) {
    next(err);
  }
};

export const updateLead: RequestHandler = async (req, res, next) => {
  try {
    res.json(await leadsService.updateLead(paramValue(req.params.leadId), req.body, req.user!.id));
  } catch (err) {
    next(err);
  }
};

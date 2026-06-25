import { RequestHandler } from 'express';
import * as customerService from './customers.service';

export const register: RequestHandler = async (req, res, next) => {
  try {
    res.status(201).json(await customerService.register(req.body));
  } catch (err) {
    next(err);
  }
};

export const login: RequestHandler = async (req, res, next) => {
  try {
    res.json(await customerService.login(req.body.email, req.body.password));
  } catch (err) {
    next(err);
  }
};

export const refresh: RequestHandler = async (req, res, next) => {
  try {
    res.json(await customerService.refresh(req.body.refreshToken));
  } catch (err) {
    next(err);
  }
};

export const logout: RequestHandler = async (req, res, next) => {
  try {
    await customerService.logout(req.body.refreshToken);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

export const me: RequestHandler = async (req, res, next) => {
  try {
    res.json(await customerService.getById(req.customer!.id));
  } catch (err) {
    next(err);
  }
};

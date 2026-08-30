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

export const updateProfile: RequestHandler = async (req, res, next) => {
  try {
    res.json(await customerService.updateProfile(req.customer!.id, req.body));
  } catch (err) {
    next(err);
  }
};

export const forgotPassword: RequestHandler = async (req, res, next) => {
  try {
    res.json(await customerService.requestPasswordReset(req.body.email));
  } catch (err) {
    next(err);
  }
};

export const resetPassword: RequestHandler = async (req, res, next) => {
  try {
    res.json(await customerService.resetPassword(req.body.token, req.body.newPassword));
  } catch (err) {
    next(err);
  }
};

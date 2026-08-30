import { RequestHandler } from 'express';
import * as authService from './auth.service';

export const login: RequestHandler = async (req, res, next) => {
  try {
    const tokens = await authService.login(req.body.email, req.body.password);
    res.json(tokens);
  } catch (err) {
    next(err);
  }
};

export const refresh: RequestHandler = async (req, res, next) => {
  try {
    const tokens = await authService.refresh(req.body.refreshToken);
    res.json(tokens);
  } catch (err) {
    next(err);
  }
};

export const logout: RequestHandler = async (req, res, next) => {
  try {
    await authService.logout(req.body.refreshToken);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

export const me: RequestHandler = async (req, res, next) => {
  try {
    const profile = await authService.getProfile(req.user!.id);
    res.json(profile);
  } catch (err) {
    next(err);
  }
};

export const updateProfile: RequestHandler = async (req, res, next) => {
  try {
    const profile = await authService.updateProfile(req.user!.id, req.body.fullName);
    res.json(profile);
  } catch (err) {
    next(err);
  }
};

export const forgotPassword: RequestHandler = async (req, res, next) => {
  try {
    res.json(await authService.requestPasswordReset(req.body.email));
  } catch (err) {
    next(err);
  }
};

export const resetPassword: RequestHandler = async (req, res, next) => {
  try {
    res.json(await authService.resetPassword(req.body.token, req.body.newPassword));
  } catch (err) {
    next(err);
  }
};


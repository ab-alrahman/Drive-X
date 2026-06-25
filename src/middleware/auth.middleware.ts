import { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { forbidden, unauthorized } from '../shared/errors';

export type AdminRole = 'OWNER' | 'STAFF';

export interface AuthUser {
  id: string;
  email: string;
  role: AdminRole;
}

export interface CustomerAuthUser {
  id: string;
  email: string;
  role: 'CUSTOMER';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      customer?: CustomerAuthUser;
    }
  }
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    throw unauthorized();
  }

  try {
    req.user = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthUser;
    next();
  } catch {
    throw unauthorized('Invalid or expired token');
  }
};

export function requireRole(...roles: AdminRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      throw unauthorized();
    }
    if (!roles.includes(req.user.role)) {
      throw forbidden();
    }
    next();
  };
}

export const requireCustomerAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    throw unauthorized();
  }

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as CustomerAuthUser;
    if (payload.role !== 'CUSTOMER') {
      throw unauthorized('Invalid customer token');
    }
    req.customer = payload;
    next();
  } catch {
    throw unauthorized('Invalid or expired token');
  }
};

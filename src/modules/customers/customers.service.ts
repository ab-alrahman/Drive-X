import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { query } from '../../config/db';
import { env } from '../../config/env';
import type { CustomerAuthUser } from '../../middleware/auth.middleware';
import { conflict, unauthorized } from '../../shared/errors';

interface CustomerRow {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  phone: string | null;
}

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function ttlToPostgresInterval(ttl: string) {
  const match = ttl.trim().match(/^(\d+)\s*([smhd])$/i);
  if (!match) return ttl;

  const [, value, unit] = match;
  const units: Record<string, string> = {
    s: 'seconds',
    m: 'minutes',
    h: 'hours',
    d: 'days'
  };

  return `${value} ${units[unit.toLowerCase()]}`;
}

function ttlToSeconds(ttl: string) {
  const match = ttl.trim().match(/^(\d+)\s*([smhd])$/i);
  if (!match) {
    const parsed = Number(ttl);
    return Number.isFinite(parsed) ? parsed : 3600;
  }

  const [, value, unit] = match;
  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 60 * 60,
    d: 24 * 60 * 60
  };

  return Number(value) * multipliers[unit.toLowerCase()];
}

function signAccessToken(user: CustomerAuthUser) {
  return jwt.sign(user, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL as SignOptions['expiresIn']
  });
}

function signRefreshToken(user: CustomerAuthUser) {
  return jwt.sign(user, env.JWT_REFRESH_SECRET, {
    expiresIn: env.REFRESH_TOKEN_TTL as SignOptions['expiresIn']
  });
}

async function storeRefreshToken(customerId: string, refreshToken: string) {
  await query(
    `INSERT INTO customer_refresh_tokens (customer_user_id, token_hash, expires_at)
     VALUES ($1, $2, NOW() + $3::interval)`,
    [customerId, hashToken(refreshToken), ttlToPostgresInterval(env.REFRESH_TOKEN_TTL)]
  );
}

function publicProfile(row: Pick<CustomerRow, 'id' | 'email' | 'full_name' | 'phone'>) {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    phone: row.phone
  };
}

async function tokenResponse(customer: Pick<CustomerRow, 'id' | 'email' | 'full_name' | 'phone'>) {
  const user: CustomerAuthUser = { id: customer.id, email: customer.email, role: 'CUSTOMER' };
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  await storeRefreshToken(user.id, refreshToken);

  return {
    customer: publicProfile(customer),
    accessToken,
    refreshToken,
    tokenType: 'Bearer',
    expiresIn: ttlToSeconds(env.ACCESS_TOKEN_TTL)
  };
}

export async function register(data: { fullName: string; email: string; phone?: string; password: string }) {
  const existing = await query(`SELECT id FROM customer_users WHERE email = $1`, [data.email]);
  if (existing.rowCount) {
    throw conflict('Email is already registered');
  }

  const passwordHash = await bcrypt.hash(data.password, 12);
  const result = await query<CustomerRow>(
    `INSERT INTO customer_users (email, password_hash, full_name, phone)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, password_hash, full_name, phone`,
    [data.email, passwordHash, data.fullName, data.phone]
  );

  return tokenResponse(result.rows[0]);
}

export async function login(email: string, password: string) {
  const result = await query<CustomerRow>(
    `SELECT id, email, password_hash, full_name, phone FROM customer_users WHERE email = $1`,
    [email]
  );
  const customer = result.rows[0];

  if (!customer || !(await bcrypt.compare(password, customer.password_hash))) {
    throw unauthorized('Invalid email or password');
  }

  return tokenResponse(customer);
}

export async function refresh(refreshToken: string) {
  let payload: CustomerAuthUser;

  try {
    payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as CustomerAuthUser;
  } catch {
    throw unauthorized('Invalid refresh token');
  }

  if (payload.role !== 'CUSTOMER') {
    throw unauthorized('Invalid refresh token');
  }

  const tokenHash = hashToken(refreshToken);
  const result = await query(
    `SELECT id FROM customer_refresh_tokens
     WHERE customer_user_id = $1 AND token_hash = $2 AND revoked_at IS NULL AND expires_at > NOW()`,
    [payload.id, tokenHash]
  );

  if (!result.rowCount) {
    throw unauthorized('Invalid refresh token');
  }

  const customer = await getById(payload.id);
  const nextRefreshToken = signRefreshToken(payload);
  const accessToken = signAccessToken(payload);

  await query(`UPDATE customer_refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1`, [tokenHash]);
  await storeRefreshToken(payload.id, nextRefreshToken);

  return {
    customer,
    accessToken,
    refreshToken: nextRefreshToken,
    tokenType: 'Bearer',
    expiresIn: ttlToSeconds(env.ACCESS_TOKEN_TTL)
  };
}

export async function logout(refreshToken: string) {
  await query(`UPDATE customer_refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1`, [
    hashToken(refreshToken)
  ]);
}

export async function getById(customerId: string) {
  const result = await query<CustomerRow>(
    `SELECT id, email, password_hash, full_name, phone FROM customer_users WHERE id = $1`,
    [customerId]
  );

  if (!result.rows[0]) {
    throw unauthorized('Customer account not found');
  }

  return publicProfile(result.rows[0]);
}

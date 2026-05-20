import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { query } from '../../config/db';
import { env } from '../../config/env';
import { AdminRole, AuthUser } from '../../middleware/auth.middleware';
import { unauthorized } from '../../shared/errors';

interface AdminUserRow {
  id: string;
  email: string;
  password_hash: string;
  full_name: string | null;
  role: AdminRole;
}

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function signAccessToken(user: AuthUser) {
  return jwt.sign(user, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL as SignOptions['expiresIn']
  });
}

function signRefreshToken(user: AuthUser) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.REFRESH_TOKEN_TTL as SignOptions['expiresIn']
  });
}

function ttlToPostgresInterval(ttl: string) {
  const match = ttl.trim().match(/^(\d+)\s*([smhd])$/i);
  if (!match) {
    return ttl;
  }

  const [, value, unit] = match;
  const units: Record<string, string> = {
    s: 'seconds',
    m: 'minutes',
    h: 'hours',
    d: 'days'
  };

  return `${value} ${units[unit.toLowerCase()]}`;
}

async function storeRefreshToken(userId: string, refreshToken: string) {
  await query(
    `INSERT INTO refresh_tokens (admin_user_id, token_hash, expires_at)
     VALUES ($1, $2, NOW() + $3::interval)`,
    [userId, hashToken(refreshToken), ttlToPostgresInterval(env.REFRESH_TOKEN_TTL)]
  );
}

export async function login(email: string, password: string) {
  const result = await query<AdminUserRow>(
    `SELECT id, email, password_hash, full_name, role FROM admin_users WHERE email = $1`,
    [email]
  );
  const admin = result.rows[0];

  if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
    throw unauthorized('Invalid email or password');
  }

  const user: AuthUser = { id: admin.id, email: admin.email, role: admin.role };
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  await storeRefreshToken(user.id, refreshToken);

  return { accessToken, refreshToken, tokenType: 'Bearer', expiresIn: env.ACCESS_TOKEN_TTL };
}

export async function refresh(refreshToken: string) {
  let payload: AuthUser;

  try {
    payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as AuthUser;
  } catch {
    throw unauthorized('Invalid refresh token');
  }

  const tokenHash = hashToken(refreshToken);
  const result = await query(
    `SELECT id FROM refresh_tokens
     WHERE admin_user_id = $1 AND token_hash = $2 AND revoked_at IS NULL AND expires_at > NOW()`,
    [payload.id, tokenHash]
  );

  if (!result.rowCount) {
    throw unauthorized('Invalid refresh token');
  }

  const accessToken = signAccessToken(payload);
  const nextRefreshToken = signRefreshToken(payload);

  await query(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1`, [tokenHash]);
  await storeRefreshToken(payload.id, nextRefreshToken);

  return { accessToken, refreshToken: nextRefreshToken, tokenType: 'Bearer', expiresIn: env.ACCESS_TOKEN_TTL };
}

export async function logout(refreshToken: string) {
  await query(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1`, [
    hashToken(refreshToken)
  ]);
}

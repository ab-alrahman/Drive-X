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
  vendor_id: string | null;
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
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, vendorId: user.vendorId },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.REFRESH_TOKEN_TTL as SignOptions['expiresIn'] }
  );
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

async function storeRefreshToken(userId: string, refreshToken: string) {
  await query(
    `INSERT INTO refresh_tokens (admin_user_id, token_hash, expires_at)
     VALUES ($1, $2, NOW() + $3::interval)`,
    [userId, hashToken(refreshToken), ttlToPostgresInterval(env.REFRESH_TOKEN_TTL)]
  );
}

// Shared by login() and by vendors.service.ts's self-serve registration - a brand new vendor
// owner account gets signed in immediately, the same way a login would, without duplicating
// the JWT-signing logic in a second module.
export async function issueTokens(user: AuthUser) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  await storeRefreshToken(user.id, refreshToken);

  return { accessToken, refreshToken, tokenType: 'Bearer', expiresIn: ttlToSeconds(env.ACCESS_TOKEN_TTL) };
}

export async function login(email: string, password: string) {
  const result = await query<AdminUserRow>(
    `SELECT id, email, password_hash, full_name, role, vendor_id FROM admin_users WHERE email = $1`,
    [email]
  );
  const admin = result.rows[0];

  if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
    throw unauthorized('Invalid email or password');
  }

  const user: AuthUser = { id: admin.id, email: admin.email, role: admin.role, vendorId: admin.vendor_id };
  return issueTokens(user);
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

  return { accessToken, refreshToken: nextRefreshToken, tokenType: 'Bearer', expiresIn: ttlToSeconds(env.ACCESS_TOKEN_TTL) };
}

export async function logout(refreshToken: string) {
  await query(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1`, [
    hashToken(refreshToken)
  ]);
}

function generateResetToken() {
  const rawToken = crypto.randomBytes(32).toString('hex');
  return { rawToken, tokenHash: hashToken(rawToken) };
}

export async function requestPasswordReset(email: string) {
  const result = await query<AdminUserRow>(
    `SELECT id, email FROM admin_users WHERE email = $1`,
    [email]
  );
  const admin = result.rows[0];

  if (!admin) {
    return { message: 'If an account exists for that email, a reset link has been generated.' };
  }

  await query(
    `UPDATE admin_password_reset_tokens SET used_at = NOW() WHERE admin_user_id = $1 AND used_at IS NULL`,
    [admin.id]
  );

  const { rawToken, tokenHash } = generateResetToken();

  await query(
    `INSERT INTO admin_password_reset_tokens (admin_user_id, token_hash, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '1 hour')`,
    [admin.id, tokenHash]
  );

  return {
    message: 'If an account exists for that email, a reset link has been generated.',
    resetToken: rawToken,
    email: admin.email
  };
}

export async function resetPassword(token: string, newPassword: string) {
  const tokenHash = hashToken(token);
  const result = await query<{ admin_user_id: string }>(
    `SELECT admin_user_id FROM admin_password_reset_tokens
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()`,
    [tokenHash]
  );

  if (!result.rows[0]) {
    throw unauthorized('Invalid or expired reset token');
  }

  const adminUserId = result.rows[0].admin_user_id;
  const passwordHash = await bcrypt.hash(newPassword, 12);

  await query(`UPDATE admin_users SET password_hash = $1, updated_at = NOW() WHERE id = $2`, [
    passwordHash,
    adminUserId
  ]);

  await query(`UPDATE admin_password_reset_tokens SET used_at = NOW() WHERE token_hash = $1`, [tokenHash]);
  await query(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE admin_user_id = $1 AND revoked_at IS NULL`, [
    adminUserId
  ]);

  return { message: 'Password has been reset successfully.' };
}

export async function getProfile(id: string) {
  const result = await query<AdminUserRow>(
    `SELECT id, email, full_name, role, vendor_id FROM admin_users WHERE id = $1`,
    [id]
  );

  if (!result.rows[0]) {
    throw unauthorized('Admin account not found');
  }

  const admin = result.rows[0];
  return { id: admin.id, email: admin.email, fullName: admin.full_name, role: admin.role, vendorId: admin.vendor_id };
}

export async function updateProfile(id: string, fullName: string) {
  const result = await query<AdminUserRow>(
    `UPDATE admin_users SET full_name = $1, updated_at = NOW() WHERE id = $2
     RETURNING id, email, full_name, role, vendor_id`,
    [fullName, id]
  );

  if (!result.rows[0]) {
    throw unauthorized('Admin account not found');
  }

  const admin = result.rows[0];
  return { id: admin.id, email: admin.email, fullName: admin.full_name, role: admin.role, vendorId: admin.vendor_id };
}

import crypto from 'node:crypto';
import { prisma } from '../db/client.js';
import type { Invite } from '@prisma/client';

const INVITE_EXPIRY_DAYS = 7;

export interface CreatedInvite {
  invite: Invite;
  inviteUrl: string;
}

export class InviteUrlConfigError extends Error {
  constructor() {
    super(
      'Invite links require FRONTEND_URL (or NEXT_PUBLIC_APP_URL) to be configured in the backend environment.'
    );
    this.name = 'InviteUrlConfigError';
  }
}

/**
 * Builds the shareable signup link for an invite token.
 * The frontend base URL is always taken from environment configuration —
 * never hardcoded — so links work across local, staging, and production.
 */
export function buildInviteUrl(token: string): string {
  const frontendBase =
    process.env.FRONTEND_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!frontendBase) {
    throw new InviteUrlConfigError();
  }

  return `${frontendBase.replace(/\/+$/, '')}/signup?invite=${encodeURIComponent(token)}`;
}

/**
 * Creates a single-use invite bound to an organization (tenant).
 * Any previous pending invites for the same email in the same organization
 * are revoked so only one active link exists per recipient.
 */
export async function createInvite(
  organizationId: string,
  invitedBy: string,
  email: string,
  role: 'ADMIN' | 'MEMBER'
): Promise<CreatedInvite> {
  // Revoke stale pending invites for this email + org pair
  await prisma.invite.updateMany({
    where: { organizationId, email: email.toLowerCase(), status: 'PENDING' },
    data: { status: 'REVOKED' },
  });

  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const invite = await prisma.invite.create({
    data: {
      organizationId,
      invitedBy,
      email: email.toLowerCase(),
      role,
      token,
      expiresAt,
    },
  });

  return { invite, inviteUrl: buildInviteUrl(invite.token) };
}

export interface ValidatedInvite {
  valid: boolean;
  reason?: 'NOT_FOUND' | 'REVOKED' | 'EXPIRED' | 'ALREADY_ACCEPTED';
  email?: string;
  role?: string;
  organizationName?: string;
}

/**
 * Public validation for the signup page: resolves an invite token to
 * display metadata without exposing anything tenant-sensitive beyond
 * the organization name and invited role/email.
 */
export async function validateInvite(token: string): Promise<ValidatedInvite> {
  const invite = await prisma.invite.findUnique({
    where: { token },
    include: { organization: { select: { name: true } } },
  });

  if (!invite) {
    return { valid: false, reason: 'NOT_FOUND' };
  }
  if (invite.status === 'ACCEPTED') {
    return { valid: false, reason: 'ALREADY_ACCEPTED' };
  }
  if (invite.status === 'REVOKED') {
    return { valid: false, reason: 'REVOKED' };
  }
  if (invite.expiresAt.getTime() <= Date.now()) {
    return { valid: false, reason: 'EXPIRED' };
  }

  return {
    valid: true,
    email: invite.email,
    role: invite.role,
    organizationName: invite.organization.name,
  };
}

/**
 * Attempts to consume a pending, unexpired invite during signup.
 * Returns null when the token is not redeemable; callers then fall back
 * to standard self-provisioning. On success the invite is marked ACCEPTED
 * and the target tenant/role are returned.
 */
export async function acceptInvite(
  token: string | undefined | null
): Promise<{ organizationId: string; role: Invite['role'] } | null> {
  if (!token) {
    return null;
  }

  const invite = await prisma.invite.findUnique({ where: { token } });

  const isRedeemable =
    invite &&
    invite.status === 'PENDING' &&
    invite.expiresAt.getTime() > Date.now();

  if (!isRedeemable || !invite) {
    return null;
  }

  const updated = await prisma.invite.updateMany({
    where: { id: invite.id, status: 'PENDING' },
    data: { status: 'ACCEPTED' },
  });

  // Lost a concurrent race to another acceptance — treat as consumed.
  if (updated.count === 0) {
    return null;
  }

  return { organizationId: invite.organizationId, role: invite.role };
}

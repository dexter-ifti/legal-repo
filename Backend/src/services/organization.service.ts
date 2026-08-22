import { prisma } from '../db/client.js';

export interface OrganizationDetails {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  memberCount?: number;
}

export interface OrganizationMember {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: Date;
}

export async function createOrganization(
  name: string,
  ownerUserId: string
): Promise<OrganizationDetails> {
  const organization = await prisma.organization.create({
    data: {
      name,
    },
  });

  // Assign owner user to the new organization and set role to ADMIN
  await prisma.user.update({
    where: { id: ownerUserId },
    data: {
      organizationId: organization.id,
      role: 'ADMIN',
    },
  });

  return {
    id: organization.id,
    name: organization.name,
    createdAt: organization.createdAt,
    updatedAt: organization.updatedAt,
    memberCount: 1,
  };
}

export async function getOrganizationById(
  orgId: string
): Promise<OrganizationDetails | null> {
  const organization = await prisma.organization.findUnique({
    where: { id: orgId },
    include: {
      _count: {
        select: { users: true },
      },
    },
  });

  if (!organization) {
    return null;
  }

  return {
    id: organization.id,
    name: organization.name,
    createdAt: organization.createdAt,
    updatedAt: organization.updatedAt,
    memberCount: organization._count.users,
  };
}

export async function updateOrganization(
  orgId: string,
  name: string
): Promise<OrganizationDetails> {
  const organization = await prisma.organization.update({
    where: { id: orgId },
    data: { name },
  });

  const memberCount = await prisma.user.count({
    where: { organizationId: orgId },
  });

  return {
    id: organization.id,
    name: organization.name,
    createdAt: organization.createdAt,
    updatedAt: organization.updatedAt,
    memberCount,
  };
}

export async function getOrganizationMembers(
  orgId: string
): Promise<OrganizationMember[]> {
  const users = await prisma.user.findMany({
    where: { organizationId: orgId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  return users;
}

/**
 * Updates a member's role within a tenant. Tenant-scoped: the target user
 * must belong to the same organization. Admins cannot demote themselves,
 * preventing organizations from being left without an admin.
 */
export async function updateMemberRole(
  organizationId: string,
  userId: string,
  role: 'ADMIN' | 'MEMBER',
  requestingUserId: string
): Promise<OrganizationMember> {
  const targetUser = await prisma.user.findFirst({
    where: { id: userId, organizationId },
  });

  if (!targetUser) {
    throw new Error('Member not found in this organization');
  }

  if (targetUser.id === requestingUserId && role !== 'ADMIN') {
    throw new Error('You cannot change your own admin role');
  }

  const updated = await prisma.user.update({
    where: { id: targetUser.id },
    data: { role },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
  });

  return updated;
}

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

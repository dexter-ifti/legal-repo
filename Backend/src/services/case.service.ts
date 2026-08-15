import { prisma } from '../db/client.js';
import { buildTenantWhereClause } from '../utils/authorization.js';

export interface CreateCaseDTO {
  title: string;
  caseNumber?: string;
  cnrNumber?: string;
  court?: string;
  judge?: string;
  clientName?: string;
  opposingParty?: string;
  caseType?: string;
  status?: string;
  notes?: string;
}

export interface UpdateCaseDTO {
  title?: string;
  caseNumber?: string;
  cnrNumber?: string;
  court?: string;
  judge?: string;
  clientName?: string;
  opposingParty?: string;
  caseType?: string;
  status?: string;
  notes?: string;
}

export interface GetCasesQuery {
  search?: string;
  status?: string;
  caseType?: string;
  page?: number;
  limit?: number;
}

export async function createCase(
  orgId: string,
  userId: string,
  data: CreateCaseDTO
) {
  const newCase = await prisma.case.create({
    data: {
      organizationId: orgId,
      createdBy: userId,
      title: data.title,
      caseNumber: data.caseNumber,
      cnrNumber: data.cnrNumber,
      court: data.court,
      judge: data.judge,
      clientName: data.clientName,
      opposingParty: data.opposingParty,
      caseType: data.caseType,
      status: data.status || 'ACTIVE',
      notes: data.notes,
    },
    include: {
      creator: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return newCase;
}

export async function getCases(
  orgId: string,
  params: GetCasesQuery = {}
) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const skip = (page - 1) * limit;

  const filters: Record<string, unknown>[] = [];

  if (params.status) {
    filters.push({ status: params.status });
  }

  if (params.caseType) {
    filters.push({ caseType: params.caseType });
  }

  if (params.search) {
    const searchString = params.search.trim();
    filters.push({
      OR: [
        { title: { contains: searchString, mode: 'insensitive' } },
        { caseNumber: { contains: searchString, mode: 'insensitive' } },
        { cnrNumber: { contains: searchString, mode: 'insensitive' } },
        { clientName: { contains: searchString, mode: 'insensitive' } },
        { court: { contains: searchString, mode: 'insensitive' } },
      ],
    });
  }

  const baseWhere = buildTenantWhereClause(orgId);
  const finalWhere = filters.length > 0 ? { AND: [baseWhere, ...filters] } : baseWhere;

  const [cases, total] = await Promise.all([
    prisma.case.findMany({
      where: finalWhere,
      skip,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { documents: true },
        },
      },
    }),
    prisma.case.count({ where: finalWhere }),
  ]);

  return {
    cases,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

export async function getCaseById(caseId: string, orgId: string) {
  const whereClause = buildTenantWhereClause(orgId, { id: caseId });
  const caseItem = await prisma.case.findFirst({
    where: whereClause,
    include: {
      creator: {
        select: { id: true, name: true, email: true },
      },
      documents: {
        select: {
          id: true,
          originalFilename: true,
          mimeType: true,
          fileSize: true,
          documentType: true,
          processingStatus: true,
          uploadedAt: true,
        },
        orderBy: { uploadedAt: 'desc' },
      },
    },
  });

  return caseItem;
}

export async function updateCase(
  caseId: string,
  orgId: string,
  data: UpdateCaseDTO
) {
  const whereClause = buildTenantWhereClause(orgId, { id: caseId });
  const existingCase = await prisma.case.findFirst({ where: whereClause });

  if (!existingCase) {
    return null;
  }

  const updatedCase = await prisma.case.update({
    where: { id: caseId },
    data,
    include: {
      creator: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return updatedCase;
}

export async function deleteCase(caseId: string, orgId: string) {
  const whereClause = buildTenantWhereClause(orgId, { id: caseId });
  const existingCase = await prisma.case.findFirst({ where: whereClause });

  if (!existingCase) {
    return false;
  }

  await prisma.case.delete({
    where: { id: caseId },
  });

  return true;
}

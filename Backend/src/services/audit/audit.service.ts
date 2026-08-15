import { prisma } from '../../db/client.js';
import { buildTenantWhereClause, TenantAccessDeniedError } from '../../utils/authorization.js';
import { Prisma } from '@prisma/client';

export interface AuditLogQueryOptions {
  organizationId: string;
  eventType?: string;
  entityType?: string;
  entityId?: string;
  page?: number;
  limit?: number;
}

export interface AuditLogItem {
  id: string;
  organizationId: string;
  userId: string | null;
  eventType: string;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  user?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface AuditLogPaginatedResponse {
  results: AuditLogItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class AuditService {
  /**
   * Records an immutable audit log event for an organization.
   */
  async logEvent(params: {
    organizationId: string;
    eventType: string;
    entityType: string;
    entityId: string;
    userId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    if (!params.organizationId || !params.eventType || !params.entityType || !params.entityId) {
      throw new Error('organizationId, eventType, entityType, and entityId are required for audit logging');
    }

    await prisma.auditEvent.create({
      data: {
        organizationId: params.organizationId,
        eventType: params.eventType,
        entityType: params.entityType,
        entityId: params.entityId,
        userId: params.userId || null,
        metadata: (params.metadata as Prisma.InputJsonValue) || undefined,
      },
    });
  }

  /**
   * Retrieves tenant-isolated audit events with pagination and filtering.
   */
  async getAuditLogs(options: AuditLogQueryOptions): Promise<AuditLogPaginatedResponse> {
    const { organizationId, eventType, entityType, entityId, page = 1, limit = 20 } = options;

    if (!organizationId) {
      throw new TenantAccessDeniedError('organizationId is required for audit logs query', 400);
    }

    const skip = (page - 1) * limit;
    const whereClause: Prisma.AuditEventWhereInput = buildTenantWhereClause(organizationId);

    if (eventType) whereClause.eventType = eventType;
    if (entityType) whereClause.entityType = entityType;
    if (entityId) whereClause.entityId = entityId;

    const [events, total] = await Promise.all([
      prisma.auditEvent.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditEvent.count({ where: whereClause }),
    ]);

    const results: AuditLogItem[] = events.map((evt) => ({
      id: evt.id,
      organizationId: evt.organizationId,
      userId: evt.userId,
      eventType: evt.eventType,
      entityType: evt.entityType,
      entityId: evt.entityId,
      metadata: evt.metadata as Record<string, unknown> | null,
      createdAt: evt.createdAt,
      user: evt.user,
    }));

    return {
      results,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}

export const defaultAuditService = new AuditService();

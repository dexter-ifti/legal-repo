import { prisma } from '../../db/client.js';
import { buildTenantWhereClause } from '../../utils/authorization.js';

export interface SearchQueryOptions {
  query: string;
  documentType?: string;
  caseId?: string;
  page?: number;
  limit?: number;
}

export interface SearchResultItem {
  id: string;
  originalFilename: string;
  documentType: string | null;
  processingStatus: string;
  matchStatus: string;
  uploadedAt: Date;
  case: {
    id: string;
    title: string;
    caseNumber: string | null;
    cnrNumber: string | null;
    court: string | null;
  } | null;
  excerpt: string | null;
  matchedFields: string[];
}

export interface SearchResponse {
  results: SearchResultItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class SearchIndexService {
  /**
   * Generates a context snippet around matching query terms in text content
   */
  generateSnippet(text: string | null | undefined, query: string, maxLength: number = 180): string | null {
    if (!text || !query) return null;
    const cleanText = text.replace(/\s+/g, ' ').trim();
    const queryTerms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 1);

    if (queryTerms.length === 0) return cleanText.slice(0, maxLength) + '...';

    const lowerText = cleanText.toLowerCase();
    let bestIndex = -1;

    for (const term of queryTerms) {
      const idx = lowerText.indexOf(term);
      if (idx !== -1) {
        bestIndex = idx;
        break;
      }
    }

    if (bestIndex === -1) {
      return cleanText.slice(0, maxLength) + (cleanText.length > maxLength ? '...' : '');
    }

    const start = Math.max(0, bestIndex - 40);
    const end = Math.min(cleanText.length, start + maxLength);
    const prefix = start > 0 ? '...' : '';
    const suffix = end < cleanText.length ? '...' : '';

    return `${prefix}${cleanText.substring(start, end)}${suffix}`;
  }

  /**
   * Tenant-isolated full search across document metadata, case details, and extracted text
   */
  async search(organizationId: string, options: SearchQueryOptions): Promise<SearchResponse> {
    if (!organizationId) {
      throw new Error('organizationId is required for tenant search');
    }

    const queryStr = (options.query || '').trim();
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 10));
    const skip = (page - 1) * limit;

    // Build multi-tenant document query filter
    const tenantDocWhere: Record<string, unknown> = buildTenantWhereClause(organizationId, {
      ...(options.documentType ? { documentType: options.documentType } : {}),
      ...(options.caseId ? { caseId: options.caseId } : {}),
    });

    if (queryStr) {
      tenantDocWhere.OR = [
        { originalFilename: { contains: queryStr, mode: 'insensitive' } },
        { documentType: { contains: queryStr, mode: 'insensitive' } },
        {
          case: {
            OR: [
              { title: { contains: queryStr, mode: 'insensitive' } },
              { caseNumber: { contains: queryStr, mode: 'insensitive' } },
              { cnrNumber: { contains: queryStr, mode: 'insensitive' } },
              { clientName: { contains: queryStr, mode: 'insensitive' } },
              { opposingParty: { contains: queryStr, mode: 'insensitive' } },
              { court: { contains: queryStr, mode: 'insensitive' } },
            ],
          },
        },
        {
          metadata: {
            some: {
              fieldValue: { contains: queryStr, mode: 'insensitive' },
            },
          },
        },
      ];
    }

    // Retrieve documents matching criteria
    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where: tenantDocWhere,
        include: {
          case: true,
          metadata: true,
        },
        orderBy: { uploadedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.document.count({
        where: tenantDocWhere,
      }),
    ]);

    const results: SearchResultItem[] = documents.map((doc) => {
      const matchedFields: string[] = [];
      const lowerQuery = queryStr.toLowerCase();

      if (doc.originalFilename.toLowerCase().includes(lowerQuery)) matchedFields.push('filename');
      if (doc.documentType?.toLowerCase().includes(lowerQuery)) matchedFields.push('documentType');
      if (doc.case) {
        if (doc.case.title.toLowerCase().includes(lowerQuery)) matchedFields.push('caseTitle');
        if (doc.case.caseNumber?.toLowerCase().includes(lowerQuery)) matchedFields.push('caseNumber');
        if (doc.case.cnrNumber?.toLowerCase().includes(lowerQuery)) matchedFields.push('cnrNumber');
        if (doc.case.court?.toLowerCase().includes(lowerQuery)) matchedFields.push('court');
      }

      const textMeta = doc.metadata.find((m) => m.fieldName === 'extracted_text' || m.fieldName === 'text');
      const extractedText = textMeta?.fieldValue || null;
      if (extractedText && extractedText.toLowerCase().includes(lowerQuery)) {
        matchedFields.push('extractedText');
      }

      const excerpt = this.generateSnippet(extractedText || doc.originalFilename, queryStr);

      return {
        id: doc.id,
        originalFilename: doc.originalFilename,
        documentType: doc.documentType,
        processingStatus: doc.processingStatus,
        matchStatus: doc.matchStatus,
        uploadedAt: doc.uploadedAt,
        case: doc.case
          ? {
              id: doc.case.id,
              title: doc.case.title,
              caseNumber: doc.case.caseNumber,
              cnrNumber: doc.case.cnrNumber,
              court: doc.case.court,
            }
          : null,
        excerpt,
        matchedFields: matchedFields.length > 0 ? matchedFields : ['filename'],
      };
    });

    return {
      results,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}

export const defaultSearchIndexService = new SearchIndexService();

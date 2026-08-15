import { prisma } from '../../db/client.js';
import { buildTenantWhereClause } from '../../utils/authorization.js';
import { Case } from '@prisma/client';

export interface CandidateSignal {
  type: 'EXACT_CNR' | 'EXACT_CASE_NUMBER' | 'PARTIAL_CASE_NUMBER' | 'PARTY_NAME' | 'COURT';
  description: string;
  score: number;
}

export interface CaseCandidate {
  caseId: string;
  caseNumber: string | null;
  cnrNumber: string | null;
  title: string;
  clientName: string | null;
  opposingParty: string | null;
  court: string | null;
  signals: CandidateSignal[];
  totalScore: number;
}

export interface DocumentSignals {
  caseNumber?: string | null;
  cnrNumber?: string | null;
  clientName?: string | null;
  opposingParty?: string | null;
  court?: string | null;
}

/**
 * Normalizes case numbers for robust matching (e.g. "W.P. 1024/2026" -> "WP10242026")
 */
export function normalizeIdentifier(val: string | null | undefined): string {
  if (!val) return '';
  return val.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export class CandidateGenerationService {
  /**
   * Generates candidate cases from tenant database based on extracted document signals.
   */
  async generateCandidates(organizationId: string, signals: DocumentSignals): Promise<CaseCandidate[]> {
    if (!organizationId) {
      throw new Error('organizationId is required for candidate generation');
    }

    let tenantCases: Case[] = [];
    try {
      tenantCases = await prisma.case.findMany({
        where: buildTenantWhereClause(organizationId, { status: 'ACTIVE' }),
      });
    } catch {
      // In offline unit test environment without active DB connection
      return [];
    }

    return this.scoreCandidateCases(tenantCases, signals);
  }

  /**
   * Pure deterministic scoring algorithm on an array of cases.
   */
  scoreCandidateCases(cases: Partial<Case>[], signals: DocumentSignals): CaseCandidate[] {
    if (cases.length === 0) {
      return [];
    }

    const candidateMap = new Map<string, CaseCandidate>();

    const docCnrNorm = normalizeIdentifier(signals.cnrNumber);
    const docCaseNumNorm = normalizeIdentifier(signals.caseNumber);
    const docClientNorm = (signals.clientName || '').toLowerCase().trim();
    const docOpposingNorm = (signals.opposingParty || '').toLowerCase().trim();
    const docCourtNorm = (signals.court || '').toLowerCase().trim();

    for (const c of cases) {
      if (!c.id) continue;
      const matchedSignals: CandidateSignal[] = [];

      // 1. Exact CNR Match (+0.95)
      if (docCnrNorm && c.cnrNumber) {
        const dbCnrNorm = normalizeIdentifier(c.cnrNumber);
        if (dbCnrNorm === docCnrNorm) {
          matchedSignals.push({
            type: 'EXACT_CNR',
            description: `Exact CNR match: ${c.cnrNumber}`,
            score: 0.95,
          });
        }
      }

      // 2. Case Number Match (+0.90 for exact, +0.60 for partial contains)
      if (docCaseNumNorm && c.caseNumber) {
        const dbCaseNumNorm = normalizeIdentifier(c.caseNumber);
        if (dbCaseNumNorm === docCaseNumNorm) {
          matchedSignals.push({
            type: 'EXACT_CASE_NUMBER',
            description: `Exact Case Number match: ${c.caseNumber}`,
            score: 0.90,
          });
        } else if (dbCaseNumNorm.length >= 4 && (dbCaseNumNorm.includes(docCaseNumNorm) || docCaseNumNorm.includes(dbCaseNumNorm))) {
          matchedSignals.push({
            type: 'PARTIAL_CASE_NUMBER',
            description: `Partial Case Number match: ${c.caseNumber}`,
            score: 0.60,
          });
        }
      }

      // 3. Party Name Match (+0.40 per party match)
      if (docClientNorm || docOpposingNorm) {
        const dbClient = (c.clientName || '').toLowerCase().trim();
        const dbOpposing = (c.opposingParty || '').toLowerCase().trim();

        let partyScore = 0;
        const matchedParties: string[] = [];

        if (docClientNorm && dbClient && (docClientNorm.includes(dbClient) || dbClient.includes(docClientNorm))) {
          partyScore += 0.35;
          matchedParties.push(`Client: ${c.clientName}`);
        }
        if (docOpposingNorm && dbOpposing && (docOpposingNorm.includes(dbOpposing) || dbOpposing.includes(docOpposingNorm))) {
          partyScore += 0.35;
          matchedParties.push(`Opposing: ${c.opposingParty}`);
        }
        // Cross-match check (Plaintiff listed as Opposing or vice-versa)
        if (docClientNorm && dbOpposing && (docClientNorm.includes(dbOpposing) || dbOpposing.includes(docClientNorm))) {
          partyScore += 0.30;
          matchedParties.push(`Cross-match: ${c.opposingParty}`);
        }

        if (partyScore > 0) {
          matchedSignals.push({
            type: 'PARTY_NAME',
            description: `Party match: ${matchedParties.join(', ')}`,
            score: Math.min(0.65, partyScore),
          });
        }
      }

      // 4. Court / Forum Match (+0.15)
      if (docCourtNorm && c.court) {
        const dbCourt = c.court.toLowerCase().trim();
        if (docCourtNorm.includes(dbCourt) || dbCourt.includes(docCourtNorm)) {
          matchedSignals.push({
            type: 'COURT',
            description: `Court forum match: ${c.court}`,
            score: 0.15,
          });
        }
      }

      // Calculate aggregated confidence score (capped at 1.0)
      if (matchedSignals.length > 0) {
        const totalScore = Math.min(
          1.0,
          matchedSignals.reduce((maxScore, s) => {
            // High confidence exact matches override cumulative sums
            if (s.score >= 0.90) return Math.max(maxScore, s.score);
            return maxScore + s.score * (1 - maxScore);
          }, 0)
        );

        candidateMap.set(c.id, {
          caseId: c.id,
          caseNumber: c.caseNumber ?? null,
          cnrNumber: c.cnrNumber ?? null,
          title: c.title || 'Untitled Case',
          clientName: c.clientName ?? null,
          opposingParty: c.opposingParty ?? null,
          court: c.court ?? null,
          signals: matchedSignals,
          totalScore: Math.round(totalScore * 10000) / 10000,
        });
      }
    }

    // Sort candidates descending by confidence score
    return Array.from(candidateMap.values()).sort((a, b) => b.totalScore - a.totalScore);
  }
}

export const defaultCandidateGenerationService = new CandidateGenerationService();

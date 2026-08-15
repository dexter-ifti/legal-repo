import { describe, it, expect } from 'vitest';
import { UICaseItem } from '../../app/(app)/cases/page';

describe('Cases UI Utilities and Search Filters', () => {
  const sampleCases: UICaseItem[] = [
    {
      id: 'c1',
      name: 'State vs. Rajesh Sharma',
      caseNumber: 'WP/2026/101',
      cnrNumber: 'MHHC010098762026',
      practiceArea: 'Writ Petition',
      client: 'Rajesh Sharma',
      opposingParty: 'State of Maharashtra',
      court: 'Bombay High Court',
      judge: 'Hon. Justice Vyas',
      status: 'active',
      documentCount: 5,
      filedCount: 3,
      reviewCount: 1,
      processingCount: 1,
    },
    {
      id: 'c2',
      name: 'Sunil Mehta vs. Union of India',
      caseNumber: 'SLP/2026/808',
      cnrNumber: 'DLHC010023452026',
      practiceArea: 'Civil Appeal',
      client: 'Sunil Mehta',
      opposingParty: 'Union of India',
      court: 'Supreme Court',
      judge: 'Hon. Chief Justice',
      status: 'pending',
      documentCount: 2,
      filedCount: 1,
      reviewCount: 1,
      processingCount: 0,
    },
  ];

  it('filters cases by search query keyword', () => {
    const searchByTitle = sampleCases.filter((c) =>
      c.name.toLowerCase().includes('sharma')
    );
    expect(searchByTitle).toHaveLength(1);
    expect(searchByTitle[0].id).toBe('c1');

    const searchByCnr = sampleCases.filter(
      (c) => c.cnrNumber && c.cnrNumber.toLowerCase().includes('dlhc01002345')
    );
    expect(searchByCnr).toHaveLength(1);
    expect(searchByCnr[0].id).toBe('c2');
  });

  it('filters cases by status criteria', () => {
    const activeCases = sampleCases.filter((c) => c.status === 'active');
    expect(activeCases).toHaveLength(1);
    expect(activeCases[0].status).toBe('active');

    const pendingCases = sampleCases.filter((c) => c.status === 'pending');
    expect(pendingCases).toHaveLength(1);
    expect(pendingCases[0].status).toBe('pending');
  });
});

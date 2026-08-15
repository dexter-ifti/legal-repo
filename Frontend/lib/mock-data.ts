import type {
  ActivityItem,
  Case,
  DashboardStats,
  Document,
  Template,
  User,
} from './types';

export const currentUser: User = {
  id: 'u1',
  name: 'Sarah Mitchell',
  email: 'sarah.mitchell@lexflow.app',
  role: 'Senior Paralegal',
  initials: 'SM',
};

export const cases: Case[] = [
  {
    id: 'c1',
    name: 'Henderson v. Apex Corp',
    caseNumber: '2024-CV-00342',
    client: 'David Henderson',
    practiceArea: 'Personal Injury',
    status: 'active',
    documentCount: 47,
    filedCount: 31,
    reviewCount: 8,
    processingCount: 3,
    nextHearing: '2026-08-22',
    createdAt: '2024-03-15',
    updatedAt: '2026-08-14',
  },
  {
    id: 'c2',
    name: 'Estate of Whitfield',
    caseNumber: '2024-PR-00118',
    client: 'Whitfield Family Trust',
    practiceArea: 'Estate Planning',
    status: 'active',
    documentCount: 89,
    filedCount: 72,
    reviewCount: 10,
    processingCount: 2,
    nextHearing: '2026-09-05',
    createdAt: '2023-11-02',
    updatedAt: '2026-08-13',
  },
  {
    id: 'c3',
    name: 'Meridian Partners v. TechFlow Inc',
    caseNumber: '2025-CH-00087',
    client: 'Meridian Partners LLC',
    practiceArea: 'Commercial Litigation',
    status: 'active',
    documentCount: 156,
    filedCount: 98,
    reviewCount: 24,
    processingCount: 5,
    nextHearing: '2026-08-28',
    createdAt: '2025-01-20',
    updatedAt: '2026-08-14',
  },
  {
    id: 'c4',
    name: 'Re: Patel Immigration Petition',
    caseNumber: '2026-IM-00044',
    client: 'Rajesh Patel',
    practiceArea: 'Immigration',
    status: 'pending',
    documentCount: 23,
    filedCount: 12,
    reviewCount: 6,
    processingCount: 1,
    createdAt: '2026-06-10',
    updatedAt: '2026-08-12',
  },
  {
    id: 'c5',
    name: 'Caldwell Divorce Proceedings',
    caseNumber: '2025-FAM-00231',
    client: 'Jennifer Caldwell',
    practiceArea: 'Family Law',
    status: 'active',
    documentCount: 34,
    filedCount: 19,
    reviewCount: 7,
    processingCount: 2,
    nextHearing: '2026-08-30',
    createdAt: '2025-09-14',
    updatedAt: '2026-08-11',
  },
  {
    id: 'c6',
    name: 'Northgate Realty Lease Dispute',
    caseNumber: '2024-CV-00998',
    client: 'Northgate Realty Group',
    practiceArea: 'Real Estate',
    status: 'closed',
    documentCount: 62,
    filedCount: 62,
    reviewCount: 0,
    processingCount: 0,
    createdAt: '2023-06-01',
    updatedAt: '2025-12-15',
  },
];

const docTitles = [
  'Motion to Dismiss',
  'Plaintiff Complaint',
  'Discovery Request',
  'Settlement Agreement',
  'Expert Witness Report',
  'Affidavit of Service',
  'Subpoena Duces Tecum',
  'Memorandum of Law',
  'Interrogatories',
  'Request for Production',
  'Deposition Transcript',
  'Case Management Order',
  'Pre-Trial Brief',
  'Witness Statement',
  'Financial Disclosure',
  'Medical Records Summary',
  'Correspondence — Opposing Counsel',
  'Notice of Appearance',
  'Motion for Summary Judgment',
  'Stipulation of Continuance',
];

const categories: Document['category'][] = [
  'Pleading',
  'Contract',
  'Correspondence',
  'Discovery',
  'Court Filing',
  'Evidence',
  'Memo',
  'Financial',
  'Other',
];

const statuses: Document['status'][] = [
  'filed',
  'filed',
  'filed',
  'review',
  'review',
  'processing',
  'uploaded',
  'rejected',
];

const priorities: Document['priority'][] = [
  'low',
  'medium',
  'high',
  'urgent',
];

const fileTypes = ['pdf', 'pdf', 'pdf', 'docx', 'tiff', 'jpg'];
const users = ['Sarah Mitchell', 'James Chen', 'Priya Sharma', 'Robert Lee'];

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.floor(seededRandom(seed) * arr.length)];
}

function randomDate(seed: number): string {
  const days = Math.floor(seededRandom(seed) * 60);
  const d = new Date('2026-08-14');
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

export const documents: Document[] = Array.from({ length: 48 }, (_, i) => {
  const c = cases[i % cases.length];
  const title = pick(docTitles, i + 1);
  const status = pick(statuses, i + 7);
  const category = pick(categories, i + 13);
  const priority = pick(priorities, i + 17);
  const fileType = pick(fileTypes, i + 19);
  const uploadedBy = pick(users, i + 23);
  const pageCount = Math.floor(seededRandom(i + 29) * 40) + 1;
  const fileSize = Math.floor(seededRandom(i + 31) * 15000000) + 50000;
  const ocrConfidence =
    status === 'processing' || status === 'uploaded'
      ? undefined
      : Math.floor(seededRandom(i + 37) * 20) + 80;

  return {
    id: `d${i + 1}`,
    caseId: c.id,
    caseName: c.name,
    title: `${title}`,
    category,
    status,
    priority,
    fileName: `${title.toLowerCase().replace(/[^a-z]+/g, '_')}.${fileType}`,
    fileType,
    fileSize,
    pageCount,
    uploadedAt: randomDate(i + 41),
    uploadedBy,
    ocrConfidence,
    matchedTemplate:
      status === 'filed' || status === 'review'
        ? `${category} Template v2`
        : undefined,
    summary:
      status === 'filed' || status === 'review'
        ? `This ${category.toLowerCase()} document pertains to ${c.name}. Key provisions include jurisdictional basis, party obligations, and filing requirements relevant to the ${c.practiceArea.toLowerCase()} matter.`
        : undefined,
    tags:
      seededRandom(i + 43) > 0.5
        ? [c.practiceArea, category]
        : [category, priority === 'urgent' ? 'urgent' : 'standard'],
    preview: undefined,
  };
});

export const activity: ActivityItem[] = [
  {
    id: 'a1',
    type: 'file',
    documentTitle: 'Motion to Dismiss',
    caseName: 'Henderson v. Apex Corp',
    user: 'Sarah Mitchell',
    timestamp: '2026-08-14T09:32:00',
  },
  {
    id: 'a2',
    type: 'process',
    documentTitle: 'Discovery Request',
    caseName: 'Meridian Partners v. TechFlow Inc',
    user: 'System',
    timestamp: '2026-08-14T08:15:00',
  },
  {
    id: 'a3',
    type: 'upload',
    documentTitle: 'Expert Witness Report',
    caseName: 'Henderson v. Apex Corp',
    user: 'James Chen',
    timestamp: '2026-08-13T16:45:00',
  },
  {
    id: 'a4',
    type: 'review',
    documentTitle: 'Settlement Agreement',
    caseName: 'Estate of Whitfield',
    user: 'Priya Sharma',
    timestamp: '2026-08-13T14:20:00',
  },
  {
    id: 'a5',
    type: 'file',
    documentTitle: 'Affidavit of Service',
    caseName: 'Caldwell Divorce Proceedings',
    user: 'Sarah Mitchell',
    timestamp: '2026-08-13T11:08:00',
  },
  {
    id: 'a6',
    type: 'reject',
    documentTitle: 'Unidentified Scan',
    caseName: 'Meridian Partners v. TechFlow Inc',
    user: 'System',
    timestamp: '2026-08-12T17:55:00',
  },
  {
    id: 'a7',
    type: 'create',
    documentTitle: 'New Case',
    caseName: 'Re: Patel Immigration Petition',
    user: 'Robert Lee',
    timestamp: '2026-08-12T10:30:00',
  },
];

export const templates: Template[] = [
  { id: 't1', name: 'Motion Template v3', category: 'Pleading', fields: 24, matchRate: 94 },
  { id: 't2', name: 'Discovery Request Template', category: 'Discovery', fields: 18, matchRate: 91 },
  { id: 't3', name: 'Settlement Agreement Template', category: 'Contract', fields: 32, matchRate: 88 },
  { id: 't4', name: 'Correspondence Template', category: 'Correspondence', fields: 12, matchRate: 96 },
  { id: 't5', name: 'Court Filing Cover Sheet', category: 'Court Filing', fields: 8, matchRate: 99 },
  { id: 't6', name: 'Financial Disclosure Template', category: 'Financial', fields: 28, matchRate: 85 },
  { id: 't7', name: 'Evidence Log Template', category: 'Evidence', fields: 15, matchRate: 92 },
  { id: 't8', name: 'Internal Memo Template', category: 'Memo', fields: 10, matchRate: 97 },
];

export const dashboardStats: DashboardStats = {
  totalDocuments: documents.length,
  filedDocuments: documents.filter((d) => d.status === 'filed').length,
  inReview: documents.filter((d) => d.status === 'review').length,
  processing: documents.filter((d) => d.status === 'processing').length,
  automationRate: 87,
  hoursSaved: 142,
  weeklyUploads: [
    { day: 'Mon', count: 12 },
    { day: 'Tue', count: 19 },
    { day: 'Wed', count: 8 },
    { day: 'Thu', count: 24 },
    { day: 'Fri', count: 16 },
    { day: 'Sat', count: 5 },
    { day: 'Sun', count: 3 },
  ],
  categoryBreakdown: [
    { category: 'Pleading', count: 12, fill: 'hsl(199 89% 30%)' },
    { category: 'Discovery', count: 9, fill: 'hsl(142 71% 38%)' },
    { category: 'Correspondence', count: 7, fill: 'hsl(38 92% 50%)' },
    { category: 'Court Filing', count: 8, fill: 'hsl(215 28% 35%)' },
    { category: 'Evidence', count: 5, fill: 'hsl(0 72% 51%)' },
    { category: 'Other', count: 7, fill: 'hsl(215 16% 47%)' },
  ],
};

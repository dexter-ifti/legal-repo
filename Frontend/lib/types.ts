export type DocStatus =
  | 'uploaded'
  | 'processing'
  | 'review'
  | 'filed'
  | 'rejected';

export type DocCategory =
  | 'Pleading'
  | 'Contract'
  | 'Correspondence'
  | 'Discovery'
  | 'Court Filing'
  | 'Evidence'
  | 'Memo'
  | 'Financial'
  | 'Other';

export type DocPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Case {
  id: string;
  name: string;
  caseNumber: string;
  client: string;
  practiceArea: string;
  status: 'active' | 'closed' | 'pending';
  documentCount: number;
  filedCount: number;
  reviewCount: number;
  processingCount: number;
  nextHearing?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: string;
  caseId: string;
  caseName: string;
  title: string;
  category: DocCategory;
  status: DocStatus;
  priority: DocPriority;
  fileName: string;
  fileType: string;
  fileSize: number;
  pageCount: number;
  uploadedAt: string;
  uploadedBy: string;
  ocrConfidence?: number;
  matchedTemplate?: string;
  summary?: string;
  tags: string[];
  preview?: string;
}

export interface ActivityItem {
  id: string;
  type: 'upload' | 'process' | 'review' | 'file' | 'reject' | 'create';
  documentTitle: string;
  caseName: string;
  user: string;
  timestamp: string;
}

export interface Template {
  id: string;
  name: string;
  category: DocCategory;
  fields: number;
  matchRate: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  initials: string;
}

export interface DashboardStats {
  totalDocuments: number;
  filedDocuments: number;
  inReview: number;
  processing: number;
  automationRate: number;
  hoursSaved: number;
  weeklyUploads: { day: string; count: number }[];
  categoryBreakdown: { category: string; count: number; fill: string }[];
}

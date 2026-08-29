'use client';

import Link from 'next/link';
import {
  FileText,
  CheckCircle2,
  Clock,
  Loader2,
  TrendingUp,
  Hourglass,
  ArrowRight,
  Upload as UploadIcon,
  Activity as ActivityIcon,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import type { DocStatus } from '@/lib/types';
import {
  dashboardStats,
  activity,
  cases,
  documents,
} from '@/lib/mock-data';
import { formatRelativeTime } from '@/lib/format';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

import { useEffect, useMemo, useState } from 'react';
import { useUserProfile } from '@/lib/use-user';

const activityIconMap = {
  upload: { icon: UploadIcon, color: 'text-brand', bg: 'bg-brand-soft' },
  process: { icon: Loader2, color: 'text-brand', bg: 'bg-brand-soft' },
  review: { icon: Clock, color: 'text-warning', bg: 'bg-warning-soft' },
  file: { icon: CheckCircle2, color: 'text-success', bg: 'bg-success-soft' },
  reject: { icon: FileText, color: 'text-error', bg: 'bg-error-soft' },
  create: { icon: FileText, color: 'text-neutral-status', bg: 'bg-neutral-soft' },
};

const CATEGORY_PALETTE = [
  'hsl(200 75% 32%)',
  'hsl(152 60% 32%)',
  'hsl(32 90% 44%)',
  'hsl(215 28% 35%)',
  'hsl(0 70% 48%)',
  'hsl(215 18% 42%)',
];

export default function DashboardPage() {
  const { user, loading: userLoading } = useUserProfile();
  const [realDocs, setRealDocs] = useState<any[]>([]);
  const [realCases, setRealCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userLoading || user.isDemo || typeof window === 'undefined') {
      return;
    }

    const token = localStorage.getItem('token');
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    setLoading(true);

    Promise.all([
      fetch(`${baseUrl}/api/v1/documents`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      }).then((res) => (res.ok ? res.json() : null)),
      fetch(`${baseUrl}/api/v1/cases`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      }).then((res) => (res.ok ? res.json() : null)),
    ])
      .then(([docRes, caseRes]) => {
        if (docRes?.data) setRealDocs(docRes.data);
        if (caseRes?.data?.cases) setRealCases(caseRes.data.cases);
      })
      .catch((err) => console.warn('Error fetching dashboard real data:', err))
      .finally(() => setLoading(false));
  }, [user.isDemo, userLoading]);

  const isDemo = user.isDemo;

  const totalDocCount = isDemo ? dashboardStats.totalDocuments : realDocs.length;
  const filedDocCount = isDemo
    ? dashboardStats.filedDocuments
    : realDocs.filter(
        (d) =>
          d.matchStatus === 'AUTO_MATCHED' ||
          d.matchStatus === 'CONFIRMED' ||
          d.status === 'filed'
      ).length;
  const inReviewCount = isDemo
    ? dashboardStats.inReview
    : realDocs.filter(
        (d) =>
          d.matchStatus === 'CONFIRMATION_REQUIRED' ||
          d.status === 'review'
      ).length;
  const hoursSavedCount = isDemo
    ? dashboardStats.hoursSaved
    : Math.round(realDocs.length * 1.5);

  const formattedRealDocs = realDocs.map((d) => ({
    id: d.id,
    title: d.originalFilename || 'Document',
    caseName: d.case?.title || 'Unassigned case',
    fileType: (d.mimeType || 'pdf').split('/').pop() || 'pdf',
    uploadedAt: d.uploadedAt || new Date().toISOString(),
    status:
      d.matchStatus === 'AUTO_MATCHED' || d.matchStatus === 'CONFIRMED'
        ? 'filed'
        : d.matchStatus === 'CONFIRMATION_REQUIRED'
        ? 'review'
        : ('uploaded' as DocStatus),
  }));

  const displayDocs =
    realDocs.length > 0
      ? formattedRealDocs.slice(0, 5)
      : isDemo
      ? documents.slice(0, 5)
      : [];

  const displayCases = isDemo
    ? cases.filter((c) => c.status === 'active').slice(0, 4)
    : realCases.slice(0, 4).map((c) => ({
        id: c.id,
        name: c.title,
        caseNumber: c.caseNumber || '—',
        practiceArea: c.caseType || 'General',
        documentCount: c._count?.documents || 0,
      }));

  const firstName = user.name ? user.name.trim().split(' ')[0] : 'there';

  const realWeeklyUploads = useMemo(() => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const buckets: Array<{ key: string; day: string; count: number }> = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      buckets.push({
        key: `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`,
        day: dayNames[d.getDay()],
        count: 0,
      });
    }
    const byKey = new Map(buckets.map((b) => [b.key, b]));
    for (const doc of realDocs) {
      if (!doc.uploadedAt) continue;
      const u = new Date(doc.uploadedAt);
      if (Number.isNaN(u.getTime())) continue;
      const bucket = byKey.get(
        `${u.getFullYear()}-${u.getMonth()}-${u.getDate()}`
      );
      if (bucket) bucket.count += 1;
    }
    return buckets;
  }, [realDocs]);

  const realCategoryBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    for (const doc of realDocs) {
      const category = doc.documentType?.trim() || 'Not classified';
      counts.set(category, (counts.get(category) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([category, count], i) => ({
        category,
        count,
        fill: CATEGORY_PALETTE[i % CATEGORY_PALETTE.length],
      }));
  }, [realDocs]);

  const weeklyUploadData = isDemo ? dashboardStats.weeklyUploads : realWeeklyUploads;
  const categoryData = isDemo ? dashboardStats.categoryBreakdown : realCategoryBreakdown;

  return (
    <div className="page-shell-wide space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Welcome back</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Good to see you, {firstName}.
          </h1>
          <p className="mt-2 text-[15px] text-muted-foreground">
            Here’s what’s happening across your cases.
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/upload">
            <UploadIcon className="h-4 w-4" />
            Upload a document
          </Link>
        </Button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={FileText}
          label="Documents"
          value={totalDocCount}
          sublabel={isDemo ? '+12 this week' : 'across all your cases'}
          trendUp={isDemo}
        />
        <StatCard
          icon={CheckCircle2}
          label="Filed automatically"
          value={filedDocCount}
          sublabel={
            isDemo
              ? `${dashboardStats.automationRate}% of uploads`
              : 'without needing your help'
          }
          trendUp
        />
        <StatCard
          icon={Clock}
          label="Needs your review"
          value={inReviewCount}
          sublabel={inReviewCount > 0 ? 'waiting for confirmation' : 'all clear'}
        />
        <StatCard
          icon={Hourglass}
          label="Time saved"
          value={hoursSavedCount}
          suffix="h"
          sublabel={isDemo ? '+18 this month' : 'estimated'}
          trendUp
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>This week’s activity</CardTitle>
            <CardDescription>Documents added each day</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={weeklyUploadData}
                  margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                >
                  <XAxis
                    dataKey="day"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    contentStyle={{
                      borderRadius: '0.5rem',
                      border: '1px solid hsl(var(--border))',
                      fontSize: '0.75rem',
                    }}
                  />
                  <Bar
                    dataKey="count"
                    radius={[6, 6, 0, 0]}
                    fill="hsl(var(--brand))"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What you’re filing</CardTitle>
            <CardDescription>By document type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={
                      categoryData.length > 0
                        ? categoryData
                        : [{ category: 'Nothing yet', count: 1, fill: 'hsl(var(--muted))' }]
                    }
                    dataKey="count"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={2}
                  >
                    {(categoryData.length > 0
                      ? categoryData
                      : [{ fill: 'hsl(var(--muted))' }]
                    ).map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: '0.5rem',
                      border: '1px solid hsl(var(--border))',
                      fontSize: '0.75rem',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-1.5">
              {categoryData.map((cat) => (
                <div
                  key={cat.category}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: cat.fill }}
                    />
                    <span className="text-muted-foreground">{cat.category}</span>
                  </div>
                  <span className="font-medium text-foreground">{cat.count}</span>
                </div>
              ))}
              {categoryData.length === 0 && (
                <p className="py-2 text-center text-xs text-muted-foreground">
                  No documents yet.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Recent documents</CardTitle>
              <CardDescription>Latest uploads across your cases</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/documents">
                View all
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {displayDocs.length > 0 ? (
              displayDocs.map((doc) => (
                <Link
                  key={doc.id}
                  href={`/documents/${doc.id}`}
                  className="flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-secondary"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-xs font-semibold uppercase text-brand">
                    {doc.fileType}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {doc.title}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {doc.caseName} · {formatRelativeTime(doc.uploadedAt)}
                    </p>
                  </div>
                  <StatusBadge status={doc.status} />
                </Link>
              ))
            ) : (
              <div className="px-2 py-10 text-center">
                <FileText className="mx-auto h-8 w-8 text-muted-foreground opacity-50" />
                <p className="mt-3 text-sm font-medium text-foreground">
                  No documents yet
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Drop your first PDF and we’ll file it for you.
                </p>
                <Button size="sm" className="mt-4" asChild>
                  <Link href="/upload">Upload your first document</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>What’s happened lately</CardTitle>
            <ActivityIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-4">
            {isDemo ? (
              activity.slice(0, 6).map((item) => {
                const config = activityIconMap[item.type];
                return (
                  <div key={item.id} className="flex gap-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${config.bg}`}
                    >
                      <config.icon className={`h-4 w-4 ${config.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground">
                        <span className="font-medium">{item.user}</span>{' '}
                        <span className="text-muted-foreground">
                          {item.type === 'file' && 'filed'}
                          {item.type === 'upload' && 'uploaded'}
                          {item.type === 'process' && 'processed'}
                          {item.type === 'review' && 'reviewed'}
                          {item.type === 'reject' && 'rejected'}
                          {item.type === 'create' && 'created'}
                        </span>{' '}
                        <span className="font-medium">{item.documentTitle}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.caseName} · {formatRelativeTime(item.timestamp)}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : realDocs.length > 0 ? (
              realDocs.slice(0, 5).map((doc) => (
                <div key={doc.id} className="flex gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft">
                    <UploadIcon className="h-4 w-4 text-brand" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground">
                      <span className="font-medium">{user.name}</span>{' '}
                      <span className="text-muted-foreground">uploaded</span>{' '}
                      <span className="font-medium">{doc.originalFilename}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeTime(doc.uploadedAt)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-xs text-muted-foreground">
                Nothing’s happened yet — once you upload a document, you’ll see it here.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Your active cases</CardTitle>
            <CardDescription>Cases with the most recent work</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/cases">
              All cases
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {displayCases.length > 0 ? (
            displayCases.map((c) => (
              <Link
                key={c.id}
                href={`/cases/${c.id}`}
                className="group rounded-xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft text-brand">
                  <FileText className="h-5 w-5" />
                </div>
                <h3 className="mt-3 line-clamp-2 text-sm font-semibold text-foreground group-hover:text-brand">
                  {c.name}
                </h3>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {c.caseNumber} · {c.practiceArea}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  {c.documentCount} {c.documentCount === 1 ? 'document' : 'documents'}
                </p>
              </Link>
            ))
          ) : (
            <div className="col-span-full px-2 py-8 text-center">
              <p className="text-sm font-medium text-foreground">
                No active cases yet
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Create your first case — or upload a document and we’ll set one up for you.
              </p>
              <Button size="sm" variant="outline" className="mt-4" asChild>
                <Link href="/cases">Create a case</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
  sublabel,
  trendUp,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  suffix?: string;
  sublabel?: string;
  trendUp?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <Icon className="h-5 w-5" />
          </div>
          {trendUp && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
              <TrendingUp className="h-3 w-3" />
            </span>
          )}
        </div>
        <p className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
          {value}
          {suffix}
        </p>
        <p className="mt-1 text-sm font-medium text-foreground">{label}</p>
        {sublabel && (
          <p className="mt-0.5 text-xs text-muted-foreground">{sublabel}</p>
        )}
      </CardContent>
    </Card>
  );
}
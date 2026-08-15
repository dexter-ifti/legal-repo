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

const activityIconMap = {
  upload: { icon: UploadIcon, color: 'text-brand', bg: 'bg-brand-soft' },
  process: { icon: Loader2, color: 'text-brand', bg: 'bg-brand-soft' },
  review: { icon: Clock, color: 'text-warning', bg: 'bg-warning-soft' },
  file: { icon: CheckCircle2, color: 'text-success', bg: 'bg-success-soft' },
  reject: { icon: FileText, color: 'text-error', bg: 'bg-error-soft' },
  create: { icon: FileText, color: 'text-neutral-status', bg: 'bg-neutral-soft' },
};

export default function DashboardPage() {
  const recentDocs = documents.slice(0, 5);
  const activeCases = cases.filter((c) => c.status === 'active').slice(0, 4);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome back, Sarah. Here&apos;s what&apos;s happening across your cases.
          </p>
        </div>
        <Button asChild>
          <Link href="/upload">
            <UploadIcon className="mr-2 h-4 w-4" />
            Upload Documents
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={FileText}
          label="Total Documents"
          value={dashboardStats.totalDocuments}
          trend="+12 this week"
          trendUp
        />
        <StatCard
          icon={CheckCircle2}
          label="Filed"
          value={dashboardStats.filedDocuments}
          trend={`${dashboardStats.automationRate}% automation`}
          trendUp
        />
        <StatCard
          icon={Clock}
          label="In Review"
          value={dashboardStats.inReview}
          trend="Needs attention"
        />
        <StatCard
          icon={Hourglass}
          label="Hours Saved"
          value={dashboardStats.hoursSaved}
          suffix="h"
          trend="+18 this month"
          trendUp
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Weekly Upload Activity</CardTitle>
            <CardDescription>Documents processed over the past week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboardStats.weeklyUploads} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
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
                  />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    contentStyle={{
                      borderRadius: '0.5rem',
                      border: '1px solid hsl(var(--border))',
                      fontSize: '0.75rem',
                    }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="hsl(var(--brand))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Document Categories</CardTitle>
            <CardDescription>Distribution by type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dashboardStats.categoryBreakdown}
                    dataKey="count"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={2}
                  >
                    {dashboardStats.categoryBreakdown.map((entry, i) => (
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
              {dashboardStats.categoryBreakdown.map((cat) => (
                <div key={cat.category} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cat.fill }} />
                    <span className="text-muted-foreground">{cat.category}</span>
                  </div>
                  <span className="font-medium text-foreground">{cat.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Recent Documents</CardTitle>
              <CardDescription>Latest uploads across all cases</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/documents">
                View all
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {recentDocs.map((doc) => (
              <Link
                key={doc.id}
                href={`/documents/${doc.id}`}
                className="flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-secondary"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-xs font-semibold uppercase text-muted-foreground">
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
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Activity Feed</CardTitle>
            <ActivityIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            {activity.slice(0, 6).map((item) => {
              const config = activityIconMap[item.type];
              return (
                <div key={item.id} className="flex gap-3">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${config.bg}`}>
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
            })}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Active Cases</CardTitle>
            <CardDescription>Cases with pending work</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/cases">
              All cases
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {activeCases.map((c) => (
            <Link
              key={c.id}
              href={`/cases/${c.id}`}
              className="group rounded-xl border bg-card p-4 transition-all hover:border-brand hover:shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft text-brand">
                  <FileText className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success">
                  Active
                </span>
              </div>
              <h3 className="mt-3 truncate text-sm font-semibold text-foreground group-hover:text-brand">
                {c.name}
              </h3>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {c.caseNumber} · {c.practiceArea}
              </p>
              <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                <span>{c.documentCount} docs</span>
                <span>·</span>
                <span>{c.filedCount} filed</span>
                {c.reviewCount > 0 && (
                  <>
                    <span>·</span>
                    <span className="text-warning">{c.reviewCount} review</span>
                  </>
                )}
              </div>
            </Link>
          ))}
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
  trend,
  trendUp,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  suffix?: string;
  trend?: string;
  trendUp?: boolean;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <Icon className="h-5 w-5" />
          </div>
          {trend && (
            <span
              className={`flex items-center gap-1 text-xs font-medium ${
                trendUp ? 'text-success' : 'text-muted-foreground'
              }`}
            >
              {trendUp && <TrendingUp className="h-3 w-3" />}
              {trend}
            </span>
          )}
        </div>
        <p className="mt-4 text-2xl font-bold tracking-tight text-foreground">
          {value}
          {suffix}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

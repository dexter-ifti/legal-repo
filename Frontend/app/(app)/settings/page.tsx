'use client';

import { useState, useEffect, useCallback } from 'react';
import { User, Building2, Bell, Shield, Zap, Save, Check, Loader2, Users } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUserProfile } from '@/lib/use-user';
import { toast } from 'sonner';

interface OrgMember {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt?: string;
}

export default function SettingsPage() {
  const { user } = useUserProfile();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);

  useEffect(() => {
    setName(user.name);
    setEmail(user.email);
  }, [user]);

  const [notifications, setNotifications] = useState({
    uploadComplete: true,
    reviewReady: true,
    filingConfirm: true,
    weeklyDigest: false,
    securityAlerts: true,
  });
  const [autoClassify, setAutoClassify] = useState(true);
  const [autoFile, setAutoFile] = useState(false);
  const [ocrHighAccuracy, setOcrHighAccuracy] = useState(true);

  function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    toast.success('Profile updated successfully');
  }

  function saveNotifications() {
    toast.success('Notification preferences saved');
  }

  function saveAutomation() {
    toast.success('Automation settings saved');
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account, preferences, and automation rules
        </p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile" className="gap-1.5">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="organization" className="gap-1.5">
            <Building2 className="h-4 w-4" />
            Organization
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="automation" className="gap-1.5">
            <Zap className="h-4 w-4" />
            Automation
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profile Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={saveProfile} className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[hsl(199_89%_30%)] to-[hsl(205_80%_20%)] text-xl font-bold text-white">
                    {user.initials}
                  </div>
                  <div>
                    <Button type="button" variant="outline" size="sm">
                      Change Photo
                    </Button>
                    <p className="mt-1 text-xs text-muted-foreground">
                      JPG or PNG, max 2MB
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Input id="role" value={user.role} disabled />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="flex justify-end">
                  <Button type="submit">
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="organization" className="mt-4">
          <OrganizationSettings />
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notification Preferences</CardTitle>
              <CardDescription>Choose what you want to be notified about</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <NotificationToggle
                label="Upload complete"
                description="When document uploads finish processing"
                checked={notifications.uploadComplete}
                onChange={(v) => setNotifications({ ...notifications, uploadComplete: v })}
              />
              <NotificationToggle
                label="Review ready"
                description="When a document is ready for your review"
                checked={notifications.reviewReady}
                onChange={(v) => setNotifications({ ...notifications, reviewReady: v })}
              />
              <NotificationToggle
                label="Filing confirmation"
                description="When documents are successfully filed"
                checked={notifications.filingConfirm}
                onChange={(v) => setNotifications({ ...notifications, filingConfirm: v })}
              />
              <NotificationToggle
                label="Weekly digest"
                description="A weekly summary of activity across your cases"
                checked={notifications.weeklyDigest}
                onChange={(v) => setNotifications({ ...notifications, weeklyDigest: v })}
              />
              <NotificationToggle
                label="Security alerts"
                description="Important security and access notifications"
                checked={notifications.securityAlerts}
                onChange={(v) => setNotifications({ ...notifications, securityAlerts: v })}
              />
              <Separator className="my-4" />
              <div className="flex justify-end">
                <Button onClick={saveNotifications}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automation" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">AI Automation Rules</CardTitle>
              <CardDescription>Configure how LexFlow handles documents automatically</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <NotificationToggle
                label="Auto-classify documents"
                description="Use AI to categorize documents on upload"
                checked={autoClassify}
                onChange={setAutoClassify}
              />
              <NotificationToggle
                label="Auto-file low-risk documents"
                description="Automatically file documents with 95%+ match confidence"
                checked={autoFile}
                onChange={setAutoFile}
              />
              <NotificationToggle
                label="High-accuracy OCR mode"
                description="Use enhanced OCR for scanned documents (slower but more accurate)"
                checked={ocrHighAccuracy}
                onChange={setOcrHighAccuracy}
              />
              <Separator className="my-4" />
              <div className="flex justify-end">
                <Button onClick={saveAutomation}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Rules
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Template Library</CardTitle>
              <CardDescription>Document templates used for matching</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { name: 'Motion Template v3', category: 'Pleading', rate: 94 },
                  { name: 'Discovery Request Template', category: 'Discovery', rate: 91 },
                  { name: 'Settlement Agreement Template', category: 'Contract', rate: 88 },
                  { name: 'Court Filing Cover Sheet', category: 'Court Filing', rate: 99 },
                ].map((t) => (
                  <div key={t.name} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.category}</p>
                    </div>
                    <Badge variant="outline" className={t.rate >= 90 ? 'border-success/30 text-success' : 'border-warning/30 text-warning'}>
                      {t.rate}% match rate
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Security Settings</CardTitle>
              <CardDescription>Manage authentication and access</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Two-factor authentication</p>
                  <p className="text-xs text-muted-foreground">Add an extra layer of security to your account</p>
                </div>
                <Badge className="bg-success-soft text-success">
                  <Check className="mr-1 h-3 w-3" />
                  Enabled
                </Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Password</p>
                  <p className="text-xs text-muted-foreground">Last changed 3 months ago</p>
                </div>
                <Button variant="outline" size="sm">Change</Button>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Active sessions</p>
                  <p className="text-xs text-muted-foreground">2 devices currently signed in</p>
                </div>
                <Button variant="outline" size="sm">View</Button>
              </div>
              <Separator />
              <div>
                <p className="mb-2 text-sm font-medium text-foreground">Recent activity</p>
                <div className="space-y-2">
                  {[
                    { action: 'Sign in from Chrome on macOS', time: '2 hours ago' },
                    { action: 'Sign in from iPhone app', time: '1 day ago' },
                    { action: 'Password changed', time: '3 months ago' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{item.action}</span>
                      <span className="text-xs text-muted-foreground">{item.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function NotificationToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg p-3 transition-colors hover:bg-secondary/50">
      <div className="pr-4">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function OrganizationSettings() {
  const { user } = useUserProfile();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  const [loading, setLoading] = useState(true);
  const [orgName, setOrgName] = useState('');
  const [memberCount, setMemberCount] = useState(0);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [savingName, setSavingName] = useState(false);
  const [roleUpdatingId, setRoleUpdatingId] = useState<string | null>(null);

  // Per PRD ("MVP Roles"): simplified Admin / Member. Only ADMIN sees controls.
  const isAdmin = !user.isDemo && user.role === 'ADMIN';

  const authHeaders = useCallback((): Record<string, string> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const loadOrganization = useCallback(async () => {
    if (user.isDemo) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [orgRes, membersRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/organizations/me`, { headers: authHeaders() }),
        fetch(`${API_URL}/api/v1/organizations/me/members`, { headers: authHeaders() }),
      ]);

      if (orgRes.ok) {
        const body = await orgRes.json();
        setOrgName(body.data?.organization?.name || '');
        setMemberCount(body.data?.organization?.memberCount ?? 0);
      }
      if (membersRes.ok) {
        const body = await membersRes.json();
        setMembers(body.data?.members || []);
      }
    } catch (err: unknown) {
      console.error('Failed to load organization:', err);
    } finally {
      setLoading(false);
    }
  }, [API_URL, user.isDemo, authHeaders]);

  useEffect(() => {
    loadOrganization();
  }, [loadOrganization]);

  const saveOrgName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSavingName(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/organizations/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ name: orgName }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error?.message || 'Failed to update organization');
      toast.success('Organization updated');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update organization');
    } finally {
      setSavingName(false);
    }
  };

  const changeMemberRole = async (memberId: string, role: string) => {
    setRoleUpdatingId(memberId);
    try {
      const res = await fetch(`${API_URL}/api/v1/organizations/me/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ role }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error?.message || 'Failed to update role');

      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: body.data.member.role } : m))
      );
      toast.success(`Role updated to ${role.toLowerCase()}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update role');
      // Re-sync on failure
      loadOrganization();
    } finally {
      setRoleUpdatingId(null);
    }
  };

  if (user.isDemo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Organization</CardTitle>
          <CardDescription>Tenant and member management</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            You are in demo mode. Sign in with a real account to manage your organization and team roles.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Organization profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Organization Details</CardTitle>
          <CardDescription>Your firm&apos;s tenant profile</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveOrgName} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firm">Firm name</Label>
                <Input
                  id="firm"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  disabled={!isAdmin}
                />
              </div>
              <div className="space-y-2">
                <Label>Team size</Label>
                <div className="flex h-10 items-center justify-between rounded-md border px-3">
                  <span className="text-sm font-medium">
                    {memberCount} member{memberCount === 1 ? '' : 's'}
                  </span>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>
            {isAdmin && (
              <div className="flex justify-end">
                <Button type="submit" disabled={savingName}>
                  {savingName ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Invite members (Admin only) */}
      {isAdmin && <InviteMemberCard onMemberJoined={loadOrganization} />}

      {/* Members & roles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Members &amp; Roles</CardTitle>
          <CardDescription>
            {isAdmin
              ? 'Manage your team. Members can upload, search, and view; Admins manage the organization.'
              : 'Team roster for your organization. Only Admins can change roles.'}
          </CardDescription>
        </CardHeader>        <CardContent className="space-y-1">
          {members.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No members found.
            </p>
          ) : (
            members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold uppercase text-muted-foreground">
                    {member.name
                      ? member.name.trim().split(' ').slice(0, 2).map((p) => p[0]).join('')
                      : '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {member.name || 'Unnamed member'}
                      {member.id === user.id && (
                        <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                  </div>
                </div>

                {isAdmin ? (
                  <Select
                    value={member.role}
                    onValueChange={(value) => changeMemberRole(member.id, value)}
                    disabled={roleUpdatingId === member.id}
                  >
                    <SelectTrigger className="w-[120px] shrink-0">
                      {roleUpdatingId === member.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <SelectValue />
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="MEMBER">Member</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant={member.role === 'ADMIN' ? 'default' : 'outline'} className="shrink-0">
                    {member.role}
                  </Badge>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InviteMemberCard({ onMemberJoined }: { onMemberJoined: () => void }) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');
  const [generating, setGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [generatedEmail, setGeneratedEmail] = useState('');
  const [copied, setCopied] = useState(false);

  const generateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setCopied(false);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(`${API_URL}/api/v1/organizations/me/invites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error?.message || 'Failed to create invite');

      setGeneratedLink(body.data.inviteUrl);
      setGeneratedEmail(body.data.invite.email);
      toast.success('Invite link generated');
      onMemberJoined();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create invite');
    } finally {
      setGenerating(false);
    }
  };

  const copyLink = async () => {
    if (!generatedLink) return;
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      toast.success('Invite link copied to clipboard');
    } catch {
      // Clipboard API can be unavailable; the link remains visible to copy manually.
      toast.error('Copy failed — select and copy the link manually.');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Invite Member</CardTitle>
        <CardDescription>
          Generate a single-use signup link. It expires in 7 days.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={generateInvite} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="invite-email">Email address</Label>
            <Input
              id="invite-email"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@chambers.com"
              required
            />
          </div>
          <div className="space-y-2 sm:w-[140px]">
            <Label>Role</Label>
            <Select value={inviteRole} onValueChange={setInviteRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MEMBER">Member</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={generating}>
            {generating ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Invite Link'
            )}
          </Button>
        </form>

        {generatedLink && (
          <div className="space-y-2 rounded-lg border border-success/30 bg-success-soft/30 p-3">
            <p className="text-xs text-muted-foreground">
              Invite for <span className="font-medium text-foreground">{generatedEmail}</span> —
              share this link with them:
            </p>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-md bg-background px-2 py-1.5 text-xs text-muted-foreground">
                {generatedLink}
              </code>
              <Button type="button" size="sm" variant="outline" onClick={copyLink}>
                {copied ? (
                  <>
                    <Check className="mr-1.5 h-3.5 w-3.5 text-success" />
                    Copied
                  </>
                ) : (
                  'Copy'
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

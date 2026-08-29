'use client';

import { useState, useEffect } from 'react';
import { User, Building2, Bell, Shield, Save, Check, Loader2, Users } from 'lucide-react';
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
import { formatDate } from '@/lib/format';
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
    toast.success('Your details were saved.');
  }

  function saveNotifications() {
    toast.success('Notification preferences saved.');
  }

  function saveAutomation() {
    toast.success('Automation settings saved.');
  }

  return (
    <div className="page-shell space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Settings
        </h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Manage your account, your team, and how documents are handled.
        </p>
      </header>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile" className="gap-1.5">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="organization" className="gap-1.5">
            <Building2 className="h-4 w-4" />
            Team
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="automation" className="gap-1.5">
            <Shield className="h-4 w-4" />
            Automation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Your details</CardTitle>
              <CardDescription>How you appear to your team</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={saveProfile} className="space-y-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand text-xl font-semibold text-brand-foreground">
                    {user.initials}
                  </div>
                  <div>
                    <Button type="button" variant="outline" size="sm">
                      Change photo
                    </Button>
                    <p className="mt-1 text-xs text-muted-foreground">
                      JPG or PNG, up to 2 MB
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
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="flex justify-end">
                  <Button type="submit">
                    <Save className="h-4 w-4" />
                    Save changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="organization" className="mt-6">
          <OrganizationSettings />
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Choose what you’d like to hear about</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <NotificationToggle
                label="Upload complete"
                description="When a document finishes processing"
                checked={notifications.uploadComplete}
                onChange={(v) => setNotifications({ ...notifications, uploadComplete: v })}
              />
              <NotificationToggle
                label="Needs your review"
                description="When a document is waiting for your confirmation"
                checked={notifications.reviewReady}
                onChange={(v) => setNotifications({ ...notifications, reviewReady: v })}
              />
              <NotificationToggle
                label="Filing complete"
                description="When documents get filed automatically"
                checked={notifications.filingConfirm}
                onChange={(v) => setNotifications({ ...notifications, filingConfirm: v })}
              />
              <NotificationToggle
                label="Weekly summary"
                description="A short recap of activity in your workspace"
                checked={notifications.weeklyDigest}
                onChange={(v) => setNotifications({ ...notifications, weeklyDigest: v })}
              />
              <NotificationToggle
                label="Security alerts"
                description="Important access and security notifications"
                checked={notifications.securityAlerts}
                onChange={(v) => setNotifications({ ...notifications, securityAlerts: v })}
              />
              <Separator className="my-4" />
              <div className="flex justify-end">
                <Button onClick={saveNotifications}>
                  <Save className="h-4 w-4" />
                  Save preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automation" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>How LexFlow handles documents</CardTitle>
              <CardDescription>Adjust how much we do automatically</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <NotificationToggle
                label="Auto-classify documents"
                description="Try to identify the document type on upload"
                checked={autoClassify}
                onChange={setAutoClassify}
              />
              <NotificationToggle
                label="Auto-file when very confident"
                description="Skip asking you when we’re 95%+ sure of the case"
                checked={autoFile}
                onChange={setAutoFile}
              />
              <NotificationToggle
                label="High-accuracy reading"
                description="Use the slower but more accurate reader for scanned pages"
                checked={ocrHighAccuracy}
                onChange={setOcrHighAccuracy}
              />
              <Separator className="my-4" />
              <div className="flex justify-end">
                <Button onClick={saveAutomation}>
                  <Save className="h-4 w-4" />
                  Save
                </Button>
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

  const isAdmin = !user.isDemo && user.role === 'ADMIN';

  const authHeaders = (): Record<string, string> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    if (user.isDemo) {
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
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
      } catch (err) {
        console.error('Failed to load team:', err);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.isDemo]);

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
      if (!res.ok) throw new Error(body?.error?.message || 'Couldn’t save.');
      toast.success('Team details updated.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Couldn’t save.');
    } finally {
      setSavingName(false);
    }
  };

  if (user.isDemo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team</CardTitle>
          <CardDescription>Members of your workspace</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            You’re in demo mode. Sign in with a real account to manage your team.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Workspace details</CardTitle>
          <CardDescription>Your firm’s profile</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveOrgName} className="space-y-5">
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
                <div className="flex h-11 items-center justify-between rounded-lg border bg-background px-3.5">
                  <span className="text-[15px] font-medium">
                    {memberCount} {memberCount === 1 ? 'member' : 'members'}
                  </span>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>
            {isAdmin && (
              <div className="flex justify-end">
                <Button type="submit" disabled={savingName}>
                  {savingName ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {isAdmin && <InviteMemberCard />}

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>
            {isAdmin
              ? 'Manage who can upload, search, and view documents.'
              : 'Team roster. Only Admins can change roles.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {members.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No members yet.
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
                      ? member.name
                          .trim()
                          .split(' ')
                          .slice(0, 2)
                          .map((p) => p[0])
                          .join('')
                      : '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {member.name || 'Unnamed member'}
                      {member.id === user.id && (
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          (you)
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {member.email}
                    </p>
                  </div>
                </div>

                {isAdmin ? (
                  <MemberRoleSelect
                    memberId={member.id}
                    role={member.role}
                    onChange={async (newRole) => {
                      try {
                        const res = await fetch(
                          `${API_URL}/api/v1/organizations/me/members/${member.id}`,
                          {
                            method: 'PATCH',
                            headers: {
                              'Content-Type': 'application/json',
                              ...authHeaders(),
                            },
                            body: JSON.stringify({ role: newRole }),
                          }
                        );
                        const body = await res.json().catch(() => null);
                        if (!res.ok)
                          throw new Error(
                            body?.error?.message || 'Couldn’t change role.'
                          );
                        setMembers((prev) =>
                          prev.map((m) =>
                            m.id === member.id ? { ...m, role: newRole } : m
                          )
                        );
                        toast.success(`Role updated to ${newRole.toLowerCase()}.`);
                      } catch (err) {
                        toast.error(
                          err instanceof Error
                            ? err.message
                            : 'Couldn’t change role.'
                        );
                      }
                    }}
                  />
                ) : (
                  <Badge
                    variant={member.role === 'ADMIN' ? 'default' : 'outline'}
                    className="shrink-0"
                  >
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

function MemberRoleSelect({
  memberId,
  role,
  onChange,
}: {
  memberId: string;
  role: string;
  onChange: (role: string) => Promise<void> | void;
}) {
  const [updating, setUpdating] = useState(false);

  return (
    <Select
      value={role}
      onValueChange={async (value) => {
        setUpdating(true);
        try {
          await onChange(value);
        } finally {
          setUpdating(false);
        }
      }}
      disabled={updating}
    >
      <SelectTrigger className="w-[120px] shrink-0">
        {updating ? (
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
  );
}

interface OrgInvite {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt?: string;
}

function InviteMemberCard() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');
  const [generating, setGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [generatedEmail, setGeneratedEmail] = useState('');
  const [copied, setCopied] = useState(false);
  const [invites, setInvites] = useState<OrgInvite[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(true);

  const authHeaders = (): Record<string, string> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/v1/organizations/me/invites`, {
          headers: authHeaders(),
        });
        if (res.ok) {
          const body = await res.json();
          setInvites(body.data?.invites || []);
        }
      } catch (err) {
        console.error('Failed to load invites:', err);
      } finally {
        setInvitesLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setCopied(false);
    try {
      const res = await fetch(`${API_URL}/api/v1/organizations/me/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error?.message || 'Couldn’t create invite.');

      setGeneratedLink(body.data.inviteUrl);
      setGeneratedEmail(body.data.invite.email);
      toast.success('Invite link ready — copy and share it.');
      setInviteEmail('');
      // refresh invites list
      const invitesRes = await fetch(`${API_URL}/api/v1/organizations/me/invites`, {
        headers: authHeaders(),
      });
      if (invitesRes.ok) {
        const b = await invitesRes.json();
        setInvites(b.data?.invites || []);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Couldn’t create invite.');
    } finally {
      setGenerating(false);
    }
  };

  const copyLink = async () => {
    if (!generatedLink) return;
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      toast.success('Link copied.');
    } catch {
      toast.error('Copy failed — please select and copy manually.');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite a teammate</CardTitle>
        <CardDescription>
          A one-time link that expires in 7 days.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          onSubmit={generateInvite}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="flex-1 space-y-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@firm.com"
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
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating…
              </>
            ) : (
              'Generate link'
            )}
          </Button>
        </form>

        {generatedLink && (
          <div className="space-y-2 rounded-lg border border-success/30 bg-success-soft/30 p-3">
            <p className="text-sm text-muted-foreground">
              Invite for <span className="font-medium text-foreground">{generatedEmail}</span> — share this link with them:
            </p>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-md bg-background px-2 py-1.5 text-xs text-muted-foreground">
                {generatedLink}
              </code>
              <Button type="button" size="sm" variant="outline" onClick={copyLink}>
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-success" />
                    Copied
                  </>
                ) : (
                  'Copy'
                )}
              </Button>
            </div>
          </div>
        )}

        <Separator />
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Recent invites</p>
          {invitesLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : invites.length === 0 ? (
            <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
              No invites yet.
            </p>
          ) : (
            <div className="space-y-1">
              {invites.map((invite) => {
                const isPending = invite.status === 'PENDING';
                const isExpired =
                  isPending && new Date(invite.expiresAt).getTime() <= Date.now();
                return (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between gap-3 rounded-lg border p-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {invite.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {isPending
                          ? isExpired
                            ? 'Expired'
                            : `Expires ${formatDate(invite.expiresAt)}`
                          : invite.status === 'ACCEPTED'
                          ? 'Accepted'
                          : 'Revoked'}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {invite.role.toLowerCase()}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          isPending && !isExpired
                            ? 'border-warning/40 text-warning'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {isPending && isExpired ? 'EXPIRED' : invite.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
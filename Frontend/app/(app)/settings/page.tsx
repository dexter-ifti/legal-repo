'use client';

import { useState } from 'react';
import { User, Building2, Bell, Shield, Zap, Save, Check } from 'lucide-react';
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
import { currentUser } from '@/lib/mock-data';
import { toast } from 'sonner';

export default function SettingsPage() {
  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
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
                    {currentUser.initials}
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
                    <Input id="role" value={currentUser.role} disabled />
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
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Organization Details</CardTitle>
              <CardDescription>Firm-wide settings and branding</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firm">Firm name</Label>
                  <Input id="firm" defaultValue="Mitchell & Associates" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plan">Subscription plan</Label>
                  <div className="flex h-10 items-center justify-between rounded-md border px-3">
                    <span className="text-sm font-medium">Professional</span>
                    <Badge variant="outline" className="text-success">Active</Badge>
                  </div>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="seats">Team seats</Label>
                  <Input id="seats" type="number" defaultValue="12" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="storage">Storage used</Label>
                  <div className="flex h-10 items-center justify-between rounded-md border px-3">
                    <span className="text-sm text-muted-foreground">8.4 GB of 50 GB</span>
                    <span className="text-xs font-medium text-brand">17%</span>
                  </div>
                </div>
              </div>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Practice areas</p>
                    <p className="text-xs text-muted-foreground">Areas your firm handles</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {['Personal Injury', 'Estate Planning', 'Commercial Litigation', 'Immigration', 'Family Law', 'Real Estate'].map((area) => (
                    <Badge key={area} variant="secondary">{area}</Badge>
                  ))}
                </div>
              </div>
              <div className="flex justify-end">
                <Button>
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </Button>
              </div>
            </CardContent>
          </Card>
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

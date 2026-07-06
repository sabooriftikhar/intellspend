'use client';

import { useState, useEffect } from 'react';
import {
  User, Lock, LogOut, Loader2, Check, AlertCircle,
  Eye, EyeOff, Shield, Bell, Trash2, Sliders, BookOpen,
  Globe, LayoutDashboard,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useBook } from '@/contexts/BookContext';
import { usePreferences } from '@/contexts/PreferencesContext';
import { DISPLAY_CURRENCIES } from '@/lib/preferences';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';

type SettingsTab = 'profile' | 'security' | 'preferences' | 'data';

const TABS: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'preferences', label: 'Preferences', icon: Sliders },
  { id: 'data', label: 'Data', icon: Trash2 },
];

function Section({
  icon: Icon, title, description, children,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden">
      <div className="px-6 py-4 border-b border-border bg-secondary/20">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function Feedback({ type, message }: { type: 'success' | 'error'; message: string }) {
  return (
    <div className={cn(
      'flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm',
      type === 'success'
        ? 'bg-accent-green/10 text-accent-green border border-accent-green/20'
        : 'bg-destructive/8 text-destructive border border-destructive/20'
    )}>
      {type === 'success'
        ? <Check className="h-4 w-4 shrink-0" />
        : <AlertCircle className="h-4 w-4 shrink-0" />}
      {message}
    </div>
  );
}

function Toggle({
  checked, onChange, label, description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
          checked ? 'bg-primary' : 'bg-secondary'
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0'
          )}
        />
      </button>
    </div>
  );
}

function formatMemberSince(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long', year: 'numeric',
    });
  } catch {
    return null;
  }
}

function ProfileSection() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    setName(user?.name ?? '');
    setEmail(user?.email ?? '');
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() && !email.trim()) return;
    setSaving(true);
    setFeedback(null);
    try {
      const res = await api.put('/users/me', {
        name: name.trim() || null,
        email: email.trim() || user?.email,
      });
      setUser(res.data);
      setFeedback({ type: 'success', message: 'Profile updated successfully.' });
    } catch (err: unknown) {
      const detail = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
        : undefined;
      setFeedback({ type: 'error', message: typeof detail === 'string' ? detail : 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  };

  const initials = name
    ? name.slice(0, 2).toUpperCase()
    : user?.email ? user.email.slice(0, 2).toUpperCase() : '?';
  const memberSince = formatMemberSince(user?.created_at);

  return (
    <Section icon={User} title="Profile" description="Your display name and email address">
      <div className="flex items-center gap-4 mb-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-lg font-bold shrink-0">
          {initials}
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            {name || user?.email?.split('@')[0] || 'No name set'}
          </p>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
          {memberSince && (
            <p className="text-[11px] text-muted-foreground mt-0.5">Member since {memberSince}</p>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-medium text-muted-foreground">
              Display name
            </Label>
            <Input
              id="name"
              placeholder="e.g. James"
              value={name}
              onChange={e => setName(e.target.value)}
              className="rounded-xl h-10"
            />
            <p className="text-[11px] text-muted-foreground">
              Used for greetings on the dashboard.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">
              Email address
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="rounded-xl h-10"
            />
            <p className="text-[11px] text-muted-foreground">
              Used for login. Must be unique.
            </p>
          </div>
        </div>

        {feedback && <Feedback type={feedback.type} message={feedback.message} />}

        <div className="flex justify-end">
          <Button type="submit" disabled={saving} className="rounded-xl h-9 px-5 text-sm">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />}
            Save changes
          </Button>
        </div>
      </form>
    </Section>
  );
}

function PasswordSection() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const strength = next.length === 0 ? 0
    : next.length < 8 ? 1
    : next.length < 12 && !/[^a-zA-Z0-9]/.test(next) ? 2
    : 3;

  const strengthLabel = ['', 'Weak', 'Fair', 'Strong'];
  const strengthColor = ['', 'bg-destructive', 'bg-accent-yellow', 'bg-accent-green'];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (next !== confirm) {
      setFeedback({ type: 'error', message: "New passwords don't match." });
      return;
    }
    if (next.length < 8) {
      setFeedback({ type: 'error', message: 'Password must be at least 8 characters.' });
      return;
    }
    setSaving(true);
    try {
      await api.post('/users/me/change-password', {
        current_password: current,
        new_password: next,
      });
      setFeedback({ type: 'success', message: 'Password changed successfully.' });
      setCurrent(''); setNext(''); setConfirm('');
    } catch (err: unknown) {
      const detail = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
        : undefined;
      setFeedback({ type: 'error', message: typeof detail === 'string' ? detail : 'Failed to change password.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section icon={Lock} title="Password" description="Keep your account secure with a strong password">
      <form onSubmit={handleSave} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="current-pw" className="text-xs font-medium text-muted-foreground">
            Current password
          </Label>
          <div className="relative">
            <Input
              id="current-pw"
              type={showCurrent ? 'text' : 'password'}
              value={current}
              onChange={e => setCurrent(e.target.value)}
              required
              placeholder="Enter current password"
              className="rounded-xl h-10 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowCurrent(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="new-pw" className="text-xs font-medium text-muted-foreground">
            New password
          </Label>
          <div className="relative">
            <Input
              id="new-pw"
              type={showNext ? 'text' : 'password'}
              value={next}
              onChange={e => setNext(e.target.value)}
              required
              placeholder="Min. 8 characters"
              className="rounded-xl h-10 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowNext(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showNext ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {next.length > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <div className="flex gap-1 flex-1">
                {[1, 2, 3].map(i => (
                  <div
                    key={i}
                    className={cn(
                      'h-1 flex-1 rounded-full transition-all',
                      i <= strength ? strengthColor[strength] : 'bg-secondary'
                    )}
                  />
                ))}
              </div>
              <span className={cn(
                'text-[11px] font-medium',
                strength === 1 ? 'text-destructive' :
                strength === 2 ? 'text-amber-600' : 'text-accent-green'
              )}>
                {strengthLabel[strength]}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirm-pw" className="text-xs font-medium text-muted-foreground">
            Confirm new password
          </Label>
          <Input
            id="confirm-pw"
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
            placeholder="Repeat new password"
            className={cn(
              'rounded-xl h-10',
              confirm && next !== confirm ? 'border-destructive' : ''
            )}
          />
          {confirm && next !== confirm && (
            <p className="text-[11px] text-destructive">Passwords don&apos;t match</p>
          )}
        </div>

        {feedback && <Feedback type={feedback.type} message={feedback.message} />}

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={saving || !current || !next || next !== confirm}
            className="rounded-xl h-9 px-5 text-sm"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />}
            Change password
          </Button>
        </div>
      </form>
    </Section>
  );
}

function SessionSection() {
  const { logout, user } = useAuth();
  return (
    <Section icon={Shield} title="Session" description="Manage your active login session">
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/30 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">Current session</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Signed in as <span className="font-medium">{user?.email}</span>
            </p>
          </div>
          <span className="flex items-center gap-1.5 text-xs font-medium text-accent-green">
            <span className="h-2 w-2 rounded-full bg-accent-green" />
            Active
          </span>
        </div>

        <Button
          variant="outline"
          onClick={logout}
          className="rounded-xl h-9 gap-2 text-sm border-destructive/30 text-destructive hover:bg-destructive/8 hover:border-destructive"
        >
          <LogOut className="h-4 w-4" />
          Sign out of this device
        </Button>
      </div>
    </Section>
  );
}

function PreferencesSection() {
  const { books, activeBook, setActiveBookId } = useBook();
  const { preferences, updatePreferences } = usePreferences();
  const [saved, setSaved] = useState(false);

  const showSaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-5">
      <Section icon={BookOpen} title="Default book" description="Which book opens when you log in">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="default-book" className="text-xs font-medium text-muted-foreground">
              Active book
            </Label>
            <Select
              id="default-book"
              value={activeBook?.id ?? ''}
              onChange={(e) => {
                setActiveBookId(Number(e.target.value));
                showSaved();
              }}
              className="rounded-xl h-10"
            >
              {books.length === 0 && <option value="">No books yet</option>}
              {books.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Filters the dashboard, transactions, and bills to this book.
            </p>
          </div>
        </div>
      </Section>

      <Section icon={Globe} title="Display" description="How amounts and summaries are shown">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="display-currency" className="text-xs font-medium text-muted-foreground">
              Primary display currency
            </Label>
            <Select
              id="display-currency"
              value={preferences.displayCurrency}
              onChange={(e) => {
                updatePreferences({ displayCurrency: e.target.value });
                showSaved();
              }}
              className="rounded-xl h-10"
            >
              {DISPLAY_CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Used for combined totals when accounts use different currencies (Phase 8).
            </p>
          </div>

          <Toggle
            checked={preferences.compactDashboard}
            onChange={(v) => { updatePreferences({ compactDashboard: v }); showSaved(); }}
            label="Compact dashboard"
            description="Show smaller cards with less padding on the dashboard."
          />
        </div>
      </Section>

      <Section icon={Bell} title="Bill reminders" description="In-app notifications for upcoming bills">
        <div className="space-y-4">
          <Toggle
            checked={preferences.billReminders}
            onChange={(v) => { updatePreferences({ billReminders: v }); showSaved(); }}
            label="Bill due reminders"
            description="Highlight overdue and upcoming bills on the dashboard."
          />

          {preferences.billReminders && (
            <div className="space-y-1.5 pl-1">
              <Label htmlFor="reminder-days" className="text-xs font-medium text-muted-foreground">
                Remind me before due date
              </Label>
              <Select
                id="reminder-days"
                value={String(preferences.reminderDaysBefore)}
                onChange={(e) => {
                  updatePreferences({ reminderDaysBefore: Number(e.target.value) });
                  showSaved();
                }}
                className="rounded-xl h-10 max-w-xs"
              >
                <option value="1">1 day before</option>
                <option value="3">3 days before</option>
                <option value="7">7 days before</option>
                <option value="14">14 days before</option>
              </Select>
            </div>
          )}
        </div>
      </Section>

      {saved && (
        <Feedback type="success" message="Preferences saved." />
      )}
    </div>
  );
}

function DataSection() {
  const { activeBook } = useBook();

  return (
    <div className="space-y-5">
      <Section icon={LayoutDashboard} title="Export" description="Download your financial data">
        <div className="rounded-xl border border-border bg-secondary/20 px-4 py-4">
          <p className="text-sm font-medium text-foreground mb-0.5">Export transactions</p>
          <p className="text-xs text-muted-foreground mb-3">
            Download {activeBook ? `"${activeBook.name}"` : 'your'} transactions, accounts, and bills as CSV.
            Full export arrives in Phase 8.
          </p>
          <Button variant="outline" size="sm" disabled className="rounded-xl h-8 text-xs gap-1.5 opacity-50">
            Export CSV — coming soon
          </Button>
        </div>
      </Section>

      <Section icon={Trash2} title="Danger zone" description="Irreversible account actions">
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-4">
          <p className="text-sm font-medium text-destructive mb-0.5">Delete account</p>
          <p className="text-xs text-muted-foreground mb-3">
            Permanently delete your account and all books, accounts, transactions, and bills.
            This cannot be undone.
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled
            className="rounded-xl h-8 text-xs gap-1.5 border-destructive/40 text-destructive opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete account — coming soon
          </Button>
        </div>
      </Section>
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  const tabContent: Record<SettingsTab, React.ReactNode> = {
    profile: (
      <div className="space-y-5">
        <ProfileSection />
      </div>
    ),
    security: (
      <div className="space-y-5">
        <PasswordSection />
        <SessionSection />
      </div>
    ),
    preferences: <PreferencesSection />,
    data: <DataSection />,
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your profile, security, app preferences, and data.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tab nav */}
        <nav className="flex lg:flex-col gap-1 lg:w-44 shrink-0 overflow-x-auto custom-scrollbar pb-1 lg:pb-0">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-all text-left',
                activeTab === id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {tabContent[activeTab]}
        </div>
      </div>
    </div>
  );
}

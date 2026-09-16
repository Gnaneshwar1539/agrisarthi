'use client';

// Profile — user account page showing avatar/initials, name/phone,
// account details, preferences, language switcher, and logout with
// confirmation dialog.  Full i18n, ARIA labels, loading/error states.

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Bell,
  Globe,
  Languages,
  Loader2,
  LogOut,
  Phone,
  Shield,
  User as UserIcon,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import AuthGuard from '@/components/AuthGuard';
import { useLanguage, LANGUAGES } from '@/lib/language';
import { useAuth, clearSession } from '@/lib/auth';
import { LOGOUT } from '@/lib/constants/testIds/auth';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name) {
  if (!name) return '?';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

// ---------------------------------------------------------------------------
// Skeleton (loading state)
// ---------------------------------------------------------------------------

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      {/* Avatar skeleton */}
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="h-20 w-20 rounded-full" />
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-32" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>

      <Skeleton className="h-24 rounded-xl" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------

function ProfileError({ message, onRetry }) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-800"
    >
      <p className="font-semibold">Failed to load profile</p>
      <p className="mt-1">{message || 'Please try again.'}</p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-4 border-rose-300 text-rose-700 hover:bg-rose-100"
          aria-label="Retry loading profile"
        >
          Retry
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Logout confirmation dialog
// ---------------------------------------------------------------------------

function LogoutDialog({ onConfirm }) {
  const { tr: t } = useLanguage();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="destructive"
          className="w-full"
          data-testid={LOGOUT.button}
          aria-label="Log out of your account"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Log Out
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Log out of AgriSarthi?</AlertDialogTitle>
          <AlertDialogDescription>
            You will need to log in again to access your farm details and recommendations.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel aria-label="Cancel logout">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            aria-label="Confirm logout"
          >
            Log Out
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ---------------------------------------------------------------------------
// Main content
// ---------------------------------------------------------------------------

function ProfileContent() {
  const router = useRouter();
  const { tr: t, lang, setLang } = useLanguage();
  const { user, logout, loading: authLoading } = useAuth({ redirectIfUnauthenticated: false });

  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState(null);

  // ---- Load additional profile data from API ----
  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    setProfileError(null);
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setProfile(data);
    } catch (err) {
      setProfileError(err.message || 'Failed to load profile');
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // The user data from the auth hook is the source of truth for display
  const displayUser = profile || user;

  // ---- Handle language change ----
  function handleLanguageChange(code) {
    setLang(code);
  }

  // ---- Handle logout ----
  function handleLogout() {
    logout();
  }

  // ---- Show loading state ----
  if (authLoading || profileLoading) return <ProfileSkeleton />;

  // ---- Show error state ----
  if (profileError && !displayUser) {
    return <ProfileError message={profileError} onRetry={loadProfile} />;
  }

  // ---- Empty / fallback ----
  if (!displayUser) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
          <UserIcon className="h-8 w-8 text-slate-400" />
        </div>
        <h2 className="text-lg font-bold text-slate-700">Not logged in</h2>
        <p className="mt-2 text-sm text-slate-500">Please log in to view your profile.</p>
        <Button onClick={() => router.push('/login')} className="mt-6">
          Go to Login
        </Button>
      </div>
    );
  }

  const initials = getInitials(displayUser.name);
  const currentLangLabel = LANGUAGES.find((l) => l.code === lang)?.label || 'English';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-emerald-900" id="profile-page-title">
            My Profile
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your account and preferences
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push('/')}
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Dashboard
        </Button>
      </div>

      {/* Avatar and name */}
      <div
        className="flex flex-col items-center gap-4 py-4"
        aria-label="User avatar and name"
      >
        <Avatar className="h-20 w-20 ring-4 ring-emerald-100">
          <AvatarFallback
            className="bg-gradient-to-br from-emerald-500 to-lime-500 text-2xl font-bold text-white"
            aria-label={`${displayUser.name} initials: ${initials}`}
          >
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="text-center">
          <h2 className="text-xl font-bold text-emerald-900">{displayUser.name}</h2>
          <p className="text-sm text-slate-500">{displayUser.phone || ''}</p>
        </div>
      </div>

      {/* Account details */}
      <Card aria-labelledby="account-card-title">
        <CardHeader className="pb-2">
          <CardTitle
            id="account-card-title"
            className="flex items-center gap-2 text-base"
          >
            <Shield className="h-4 w-4 text-emerald-600" />
            Account
          </CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
              <dt className="flex items-center gap-2 font-medium text-slate-600">
                <UserIcon className="h-4 w-4 text-slate-400" />
                Full Name
              </dt>
              <dd className="font-semibold text-emerald-900">{displayUser.name || '-'}</dd>
            </div>
            <Separator />
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
              <dt className="flex items-center gap-2 font-medium text-slate-600">
                <Phone className="h-4 w-4 text-slate-400" />
                Phone Number
              </dt>
              <dd className="font-semibold text-emerald-900">
                {displayUser.phone || '-'}
              </dd>
            </div>
            <Separator />
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
              <dt className="flex items-center gap-2 font-medium text-slate-600">
                <Badge variant="outline" className="h-4 w-4 rounded-sm p-0 text-[8px]">
                  ID
                </Badge>
                User ID
              </dt>
              <dd className="font-mono text-xs text-slate-500">
                {displayUser.id || '-'}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card aria-labelledby="preferences-card-title">
        <CardHeader className="pb-2">
          <CardTitle
            id="preferences-card-title"
            className="flex items-center gap-2 text-base"
          >
            <Bell className="h-4 w-4 text-amber-600" />
            Preferences
          </CardTitle>
          <CardDescription>Customise your experience</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Language switcher */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-700">Language</span>
            </div>
            <div className="flex items-center gap-2">
              <Select value={lang} onValueChange={handleLanguageChange}>
                <SelectTrigger
                  className="w-40"
                  aria-label="Select application language"
                >
                  <Languages className="mr-1 h-3.5 w-3.5" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.code} value={l.code}>
                      {l.label} ({l.sub})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Current language display */}
          <div className="rounded-lg bg-emerald-50 px-4 py-2 text-xs text-emerald-800">
            Current language: <span className="font-semibold">{currentLangLabel}</span>
          </div>
        </CardContent>
      </Card>

      {/* Account actions */}
      <Card aria-labelledby="actions-card-title">
        <CardHeader className="pb-2">
          <CardTitle
            id="actions-card-title"
            className="flex items-center gap-2 text-base"
          >
            <LogOut className="h-4 w-4 text-rose-600" />
            Account Actions
          </CardTitle>
          <CardDescription>Manage your session</CardDescription>
        </CardHeader>
        <CardContent>
          <LogoutDialog onConfirm={handleLogout} />

          <p className="mt-3 text-center text-xs text-slate-400">
            Logging out will clear your session. You can log back in anytime.
          </p>
        </CardContent>
      </Card>

      {/* App info */}
      <footer className="text-center text-xs text-slate-400">
        <p>AgriSarthi AI v1.0</p>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exported page
// ---------------------------------------------------------------------------

export default function ProfilePage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-lime-50 to-amber-50">
        <main
          className="container mx-auto px-4 py-8"
          role="main"
          aria-labelledby="profile-page-title"
        >
          <ProfileContent />
        </main>
      </div>
    </AuthGuard>
  );
}

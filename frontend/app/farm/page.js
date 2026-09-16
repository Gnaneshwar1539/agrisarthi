'use client';

// My Farm — profile page showing farm details in a card layout.
// Supports loading, error, empty, and success states. Fully i18n with ARIA.

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Droplets, Edit3, Loader2, MapPin, Ruler, Sprout, Wallet } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import AuthGuard from '@/components/AuthGuard';
import { useLanguage } from '@/lib/language';
import { useAuth } from '@/lib/auth';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SOIL_TYPES = ['red_loam', 'black', 'clay', 'sandy_loam', 'alluvial', 'loam'];
const SOIL_LABELS = {
  red_loam: 'Red Loam',
  black: 'Black Soil',
  clay: 'Clay',
  sandy_loam: 'Sandy Loam',
  alluvial: 'Alluvial',
  loam: 'Loam',
};

const WATER_LEVELS = ['low', 'medium', 'high'];
const BUDGET_LEVELS = ['low', 'medium', 'high'];
const SEASONS = ['kharif', 'rabi', 'summer'];

// ---------------------------------------------------------------------------
// Skeleton placeholder (loading state)
// ---------------------------------------------------------------------------

function FarmSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-9 w-24 rounded-xl" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state (no farm profile yet)
// ---------------------------------------------------------------------------

function EmptyFarm({ onStartSetup }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
        <Sprout className="h-10 w-10 text-emerald-600" />
      </div>
      <h2 className="text-xl font-bold text-emerald-900">No farm profile yet</h2>
      <p className="mt-2 max-w-xs text-sm text-slate-500">
        Set up your farm details to get personalised crop recommendations, irrigation plans, and mandi prices.
      </p>
      <Button onClick={onStartSetup} className="mt-6 bg-emerald-600 hover:bg-emerald-700">
        <Sprout className="mr-2 h-4 w-4" />
        Set up your farm
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error banner
// ---------------------------------------------------------------------------

function ErrorBanner({ message, onRetry }) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
    >
      <p className="font-semibold">Failed to load farm data</p>
      <p className="mt-1">{message}</p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-3 border-rose-300 text-rose-700 hover:bg-rose-100"
          aria-label="Retry loading farm data"
        >
          <Loader2 className="mr-1 h-3 w-3" />
          Retry
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main content
// ---------------------------------------------------------------------------

function FarmContent() {
  const router = useRouter();
  const { tr: t, lang } = useLanguage();
  const { user } = useAuth({ redirectIfUnauthenticated: false });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [dirty, setDirty] = useState(false);

  const [farm, setFarm] = useState(null);

  // Farm form fields
  const [soil, setSoil] = useState('red_loam');
  const [water, setWater] = useState('medium');
  const [budget, setBudget] = useState('medium');
  const [farmSize, setFarmSize] = useState('');
  const [season, setSeason] = useState('kharif');
  const [village, setVillage] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');

  // ---- Load farm profile ----
  const loadFarm = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/profile');
      if (!res.ok) {
        if (res.status === 404) {
          setFarm(null);
          setLoading(false);
          return;
        }
        throw new Error(`Server error: ${res.status}`);
      }
      const data = await res.json();
      setFarm(data);
      if (data) {
        setSoil(data.soilType || 'red_loam');
        setWater(data.water || 'medium');
        setBudget(data.budget || 'medium');
        setFarmSize(data.farmSize != null ? String(data.farmSize) : '');
        setSeason(data.season || 'kharif');
        setVillage(data.village || '');
        setDistrict(data.district || '');
        setState(data.state || '');
      }
    } catch (err) {
      setError(err.message || 'Failed to load farm data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFarm();
  }, [loadFarm]);

  // ---- Save farm profile ----
  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        soilType: soil,
        water,
        budget,
        farmSize: farmSize ? parseFloat(farmSize) : null,
        season,
        village,
        district,
        state,
      };

      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to save farm profile');
      }

      const saved = await res.json();
      setFarm(saved);
      setDirty(false);
    } catch (err) {
      setError(err.message || 'Failed to save farm profile');
    } finally {
      setSaving(false);
    }
  }

  function markDirty() {
    if (!dirty) setDirty(true);
  }

  // ---- Render ----

  if (loading) return <FarmSkeleton />;

  if (error && !farm) {
    return (
      <ErrorBanner
        message={error}
        onRetry={loadFarm}
      />
    );
  }

  if (!farm && !error) {
    return <EmptyFarm onStartSetup={() => router.push('/?step=1')} />;
  }

  const soilLabel = SOIL_LABELS[soil] || soil;
  const waterLabel = t(water);
  const budgetLabel = t(budget);
  const seasonLabel = t(season);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-emerald-900" id="farm-page-title">
            My Farm
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Your farm profile — used for all recommendations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push('/')}
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Dashboard
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="bg-emerald-600 hover:bg-emerald-700"
            aria-label="Save farm profile"
          >
            {saving ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Edit3 className="mr-1 h-4 w-4" />
            )}
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Error banner (inline when editing) */}
      {error && <ErrorBanner message={error} onRetry={handleSave} />}

      {/* Farm detail cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Soil Type */}
        <Card aria-labelledby="soil-card-title">
          <CardHeader className="pb-2">
            <CardTitle id="soil-card-title" className="flex items-center gap-2 text-base">
              <Sprout className="h-4 w-4 text-emerald-600" />
              Soil Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={soil}
              onValueChange={(v) => {
                setSoil(v);
                markDirty();
              }}
            >
              <SelectTrigger aria-label="Select soil type" className="w-full">
                <SelectValue placeholder="Select soil type" />
              </SelectTrigger>
              <SelectContent>
                {SOIL_TYPES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {SOIL_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Water Availability */}
        <Card aria-labelledby="water-card-title">
          <CardHeader className="pb-2">
            <CardTitle id="water-card-title" className="flex items-center gap-2 text-base">
              <Droplets className="h-4 w-4 text-sky-600" />
              Water Availability
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={water}
              onValueChange={(v) => {
                setWater(v);
                markDirty();
              }}
            >
              <SelectTrigger aria-label="Select water availability" className="w-full">
                <SelectValue placeholder="Select water level" />
              </SelectTrigger>
              <SelectContent>
                {WATER_LEVELS.map((w) => (
                  <SelectItem key={w} value={w}>
                    {t(w)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Budget */}
        <Card aria-labelledby="budget-card-title">
          <CardHeader className="pb-2">
            <CardTitle id="budget-card-title" className="flex items-center gap-2 text-base">
              <Wallet className="h-4 w-4 text-amber-600" />
              Budget
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={budget}
              onValueChange={(v) => {
                setBudget(v);
                markDirty();
              }}
            >
              <SelectTrigger aria-label="Select budget level" className="w-full">
                <SelectValue placeholder="Select budget" />
              </SelectTrigger>
              <SelectContent>
                {BUDGET_LEVELS.map((b) => (
                  <SelectItem key={b} value={b}>
                    {t(b)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Farm Size */}
        <Card aria-labelledby="size-card-title">
          <CardHeader className="pb-2">
            <CardTitle id="size-card-title" className="flex items-center gap-2 text-base">
              <Ruler className="h-4 w-4 text-indigo-600" />
              Farm Size (Acres)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="number"
              min="0"
              step="0.5"
              value={farmSize}
              onChange={(e) => {
                setFarmSize(e.target.value);
                markDirty();
              }}
              placeholder="e.g. 2.5"
              aria-label="Farm size in acres"
            />
          </CardContent>
        </Card>

        {/* Season */}
        <Card aria-labelledby="season-card-title">
          <CardHeader className="pb-2">
            <CardTitle id="season-card-title" className="flex items-center gap-2 text-base">
              <Sprout className="h-4 w-4 text-emerald-600" />
              Season
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={season}
              onValueChange={(v) => {
                setSeason(v);
                markDirty();
              }}
            >
              <SelectTrigger aria-label="Select season" className="w-full">
                <SelectValue placeholder="Select season" />
              </SelectTrigger>
              <SelectContent>
                {SEASONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Location */}
        <Card aria-labelledby="location-card-title">
          <CardHeader className="pb-2">
            <CardTitle id="location-card-title" className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4 text-rose-600" />
              Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label htmlFor="farm-village" className="text-xs font-medium text-slate-500">
                Village / Town
              </label>
              <Input
                id="farm-village"
                value={village}
                onChange={(e) => {
                  setVillage(e.target.value);
                  markDirty();
                }}
                placeholder="Your village"
                aria-label="Village or town"
              />
            </div>
            <div>
              <label htmlFor="farm-district" className="text-xs font-medium text-slate-500">
                District
              </label>
              <Input
                id="farm-district"
                value={district}
                onChange={(e) => {
                  setDistrict(e.target.value);
                  markDirty();
                }}
                placeholder="Your district"
                aria-label="District"
              />
            </div>
            <div>
              <label htmlFor="farm-state" className="text-xs font-medium text-slate-500">
                State
              </label>
              <Input
                id="farm-state"
                value={state}
                onChange={(e) => {
                  setState(e.target.value);
                  markDirty();
                }}
                placeholder="Your state"
                aria-label="State"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary card (read-only snapshot) */}
      <Card aria-labelledby="summary-card-title">
        <CardHeader className="pb-2">
          <CardTitle id="summary-card-title" className="flex items-center gap-2 text-base">
            <Sprout className="h-4 w-4 text-emerald-600" />
            Farm Summary
          </CardTitle>
          <CardDescription>Current values used for recommendations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3 lg:grid-cols-6">
            <div>
              <span className="text-xs font-medium text-slate-500">Soil</span>
              <p className="mt-0.5 font-semibold text-emerald-900">{soilLabel}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-500">Water</span>
              <p className="mt-0.5 font-semibold text-emerald-900">{waterLabel}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-500">Budget</span>
              <p className="mt-0.5 font-semibold text-emerald-900">{budgetLabel}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-500">Size</span>
              <p className="mt-0.5 font-semibold text-emerald-900">
                {farmSize ? `${farmSize} acres` : 'Not set'}
              </p>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-500">Season</span>
              <p className="mt-0.5 font-semibold text-emerald-900">{seasonLabel}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-500">Location</span>
              <p className="mt-0.5 font-semibold text-emerald-900">
                {[village, district, state].filter(Boolean).join(', ') || 'Not set'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save button at bottom as well for convenience */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving || !dirty}
          className="bg-emerald-600 hover:bg-emerald-700"
          aria-label="Save farm profile changes"
        >
          {saving ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Edit3 className="mr-1 h-4 w-4" />
          )}
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exported page
// ---------------------------------------------------------------------------

export default function FarmPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-lime-50 to-amber-50">
        <main
          className="container mx-auto px-4 py-8"
          role="main"
          aria-labelledby="farm-page-title"
        >
          <FarmContent />
        </main>
      </div>
    </AuthGuard>
  );
}

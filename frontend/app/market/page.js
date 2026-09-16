'use client';

// Market Prices — mandi prices for crops by state with selector dropdown,
// price cards, and nearby markets list. i18n, loading/error/empty states.

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Loader2,
  MapPin,
  Minus,
  Search,
  ShoppingBag,
  Store,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AuthGuard from '@/components/AuthGuard';
import { useLanguage } from '@/lib/language';

// ---------------------------------------------------------------------------
// Crop list (common Indian crops)
// ---------------------------------------------------------------------------

const CROPS = [
  { id: 'paddy', label: 'Paddy (Rice)', labelTe: 'వరి', labelHi: 'धान' },
  { id: 'cotton', label: 'Cotton', labelTe: 'పత్తి', labelHi: 'कपास' },
  { id: 'chilli', label: 'Chilli', labelTe: 'మిరప', labelHi: 'मिर्च' },
  { id: 'maize', label: 'Maize', labelTe: 'మొక్కజొన్న', labelHi: 'मक्का' },
  { id: 'groundnut', label: 'Groundnut', labelTe: 'వేరుశెనగ', labelHi: 'मूंगफली' },
  { id: 'sugarcane', label: 'Sugarcane', labelTe: 'చెరకు', labelHi: 'गन्ना' },
  { id: 'tur', label: 'Tur (Arhar)', labelTe: 'కంది', labelHi: 'अरहर' },
  { id: 'soybean', label: 'Soybean', labelTe: 'సోయాబీన్', labelHi: 'सोयाबीन' },
  { id: 'wheat', label: 'Wheat', labelTe: 'గోధుమ', labelHi: 'गेहूं' },
  { id: 'onion', label: 'Onion', labelTe: 'ఉల్లి', labelHi: 'प्याज' },
  { id: 'potato', label: 'Potato', labelTe: 'బంగాళదుంప', labelHi: 'आलू' },
  { id: 'tomato', label: 'Tomato', labelTe: 'టమాటో', labelHi: 'टमाटर' },
];

function getCropLabel(crop, lang) {
  if (lang === 'te') return crop.labelTe;
  if (lang === 'hi') return crop.labelHi;
  return crop.label;
}

// ---------------------------------------------------------------------------
// Trend icon helper
// ---------------------------------------------------------------------------

function TrendIcon({ trend }) {
  if (trend === 'up')
    return <ArrowUp className="h-4 w-4 text-emerald-600" aria-label="Price rising" />;
  if (trend === 'down')
    return <ArrowDown className="h-4 w-4 text-rose-600" aria-label="Price falling" />;
  return <Minus className="h-4 w-4 text-slate-400" aria-label="Price stable" />;
}

// ---------------------------------------------------------------------------
// MandiPriceCard
// ---------------------------------------------------------------------------

function MandiPriceCard({ price, lang }) {
  if (!price) return null;

  const trendLabel =
    price.trend === 'up' ? 'Rising' : price.trend === 'down' ? 'Falling' : 'Stable';

  return (
    <Card aria-label={`Mandi price card for ${price.market || 'primary market'}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Store className="h-4 w-4 text-emerald-600" />
            {price.market || 'Primary Market'}
          </CardTitle>
          <Badge
            variant="outline"
            className={
              price.trend === 'up'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : price.trend === 'down'
                  ? 'border-rose-200 bg-rose-50 text-rose-700'
                  : 'border-slate-200 bg-slate-50 text-slate-600'
            }
          >
            <TrendIcon trend={price.trend} />
            <span className="ml-1 text-xs">{trendLabel}</span>
          </Badge>
        </div>
        <CardDescription>
          {price.state} &middot; {price.district || ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <span className="text-3xl font-bold text-emerald-900">
            &#8377;{price.modal?.toLocaleString('en-IN')}
          </span>
          <span className="text-xs text-slate-500">per quintal</span>
        </div>
        <div className="mt-2 flex justify-between text-sm text-slate-600">
          <span>
            Min: &#8377;{price.min?.toLocaleString('en-IN')}
          </span>
          <span>
            Max: &#8377;{price.max?.toLocaleString('en-IN')}
          </span>
        </div>
        {price.arrivals != null && (
          <p className="mt-2 text-xs text-slate-500">
            Arrivals: {price.arrivals.toLocaleString('en-IN')} quintals
          </p>
        )}
        {price.source && (
          <p className="mt-1 text-[10px] text-slate-400">Source: {price.source}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function MarketSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-10 w-40 rounded-xl" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
      <Skeleton className="h-60 rounded-xl" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyMarket({ crop, stateName, onSearch }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
        <ShoppingBag className="h-8 w-8 text-amber-600" />
      </div>
      <h2 className="text-lg font-bold text-emerald-900">No mandi prices found</h2>
      <p className="mt-2 max-w-xs text-sm text-slate-500">
        {crop
          ? `We could not find prices for ${crop}${stateName ? ` in ${stateName}` : ''}. Try selecting a different crop or state.`
          : 'Select a crop and state above to see mandi prices.'}
      </p>
      {!crop && (
        <Button onClick={onSearch} className="mt-6 bg-emerald-600 hover:bg-emerald-700">
          <Search className="mr-2 h-4 w-4" />
          Browse crops
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main content
// ---------------------------------------------------------------------------

function MarketContent() {
  const router = useRouter();
  const { tr: t, lang } = useLanguage();

  const [crop, setCrop] = useState('');
  const [stateName, setStateName] = useState('');
  const [stateInput, setStateInput] = useState('');

  const [primaryPrice, setPrimaryPrice] = useState(null);
  const [nearbyMarkets, setNearbyMarkets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);

  // ---- Fetch mandi prices ----
  const fetchPrices = useCallback(async () => {
    if (!crop) return;

    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const body = { crop };
      if (stateName) body.state = stateName;

      const res = await fetch('/api/mandi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error: ${res.status}`);
      }

      const data = await res.json();
      setPrimaryPrice(data.primary || null);
      setNearbyMarkets(data.nearby || []);
    } catch (err) {
      setError(err.message || 'Failed to load mandi prices');
    } finally {
      setLoading(false);
    }
  }, [crop, stateName]);

  function handleSearch() {
    setStateName(stateInput.trim());
    fetchPrices();
  }

  const selectedCrop = CROPS.find((c) => c.id === crop);

  // ---- Render ----

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-emerald-900" id="market-page-title">
            Market Prices
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Check mandi prices for crops in your state
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

      {/* Search controls */}
      <div
        className="flex flex-wrap items-end gap-3"
        role="search"
        aria-label="Search mandi prices"
      >
        <div className="min-w-[180px] flex-1 sm:flex-none">
          <label htmlFor="crop-select" className="mb-1 block text-xs font-medium text-slate-500">
            Select Crop
          </label>
          <Select value={crop} onValueChange={setCrop}>
            <SelectTrigger id="crop-select" aria-label="Select a crop" className="w-full sm:w-48">
              <SelectValue placeholder="Choose a crop" />
            </SelectTrigger>
            <SelectContent>
              {CROPS.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {getCropLabel(c, lang)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-[160px] flex-1 sm:flex-none">
          <label htmlFor="state-input" className="mb-1 block text-xs font-medium text-slate-500">
            State (optional)
          </label>
          <Input
            id="state-input"
            value={stateInput}
            onChange={(e) => setStateInput(e.target.value)}
            placeholder="e.g. Telangana"
            aria-label="Enter state name"
            className="w-full sm:w-40"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch();
            }}
          />
        </div>

        <Button
          onClick={handleSearch}
          disabled={!crop || loading}
          className="bg-emerald-600 hover:bg-emerald-700"
          aria-label="Fetch mandi prices"
        >
          {loading ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <TrendingUp className="mr-1 h-4 w-4" />
          )}
          {loading ? 'Loading...' : 'Check Prices'}
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
        >
          <p className="font-semibold">Failed to load prices</p>
          <p className="mt-1">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPrices}
            className="mt-3 border-rose-300 text-rose-700 hover:bg-rose-100"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && <MarketSkeleton />}

      {/* Empty state */}
      {!loading && searched && !error && !primaryPrice && nearbyMarkets.length === 0 && (
        <EmptyMarket
          crop={selectedCrop ? getCropLabel(selectedCrop, lang) : null}
          stateName={stateName}
          onSearch={() => document.getElementById('crop-select')?.focus()}
        />
      )}

      {/* Results */}
      {!loading && primaryPrice && (
        <section aria-label="Primary market price">
          <MandiPriceCard price={primaryPrice} lang={lang} />
        </section>
      )}

      {!loading && nearbyMarkets.length > 0 && (
        <section aria-label="Nearby market prices">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4 text-rose-600" />
                Nearby Markets
              </CardTitle>
              <CardDescription>
                {nearbyMarkets.length} market{nearbyMarkets.length !== 1 ? 's' : ''} found
                {stateName ? ` in ${stateName}` : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-slate-100">
                {nearbyMarkets.map((m, idx) => (
                  <div
                    key={m.market || idx}
                    className="flex items-center justify-between py-3 text-sm"
                  >
                    <div>
                      <span className="font-medium text-emerald-900">{m.market}</span>
                      {m.district && (
                        <span className="ml-2 text-xs text-slate-500">{m.district}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-emerald-800">
                        &#8377;{m.modal?.toLocaleString('en-IN')}
                      </span>
                      {m.trend && <TrendIcon trend={m.trend} />}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Disclaimer */}
      <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 p-3 text-xs text-slate-600">
        <b className="text-amber-800">Note:</b> Mandi prices are indicative and may vary by
        market, grade, and season. Always check with your local mandi board for the latest
        rates before selling.
      </div>

      {/* State display chip */}
      {stateName && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <MapPin className="h-4 w-4 text-slate-400" />
          Showing prices for: <Badge variant="secondary">{stateName}</Badge>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exported page
// ---------------------------------------------------------------------------

export default function MarketPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-lime-50 to-amber-50">
        <main
          className="container mx-auto px-4 py-8"
          role="main"
          aria-labelledby="market-page-title"
        >
          <MarketContent />
        </main>
      </div>
    </AuthGuard>
  );
}

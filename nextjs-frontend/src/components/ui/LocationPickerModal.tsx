'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { MapPin, Search, Locate, X, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LocationResult {
  lat: number;
  lng: number;
  /** Specific place / landmark / building name (may be empty) */
  placeName: string;
  /** Neighbourhood / suburb / village */
  town: string;
  /** City / municipality */
  city: string;
  /** County / state / province */
  county: string;
  /** Country full name */
  country: string;
  /** ISO 3166-1 alpha-2 country code (lowercase) */
  countryCode: string;
  /** Continent name */
  continent: string;
  /** Full human-readable address string */
  formattedAddress: string;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address: {
    country?: string;
    country_code?: string;
    state?: string;
    county?: string;
    city?: string;
    town?: string;
    village?: string;
    suburb?: string;
    neighbourhood?: string;
    road?: string;
    house_number?: string;
    postcode?: string;
    amenity?: string;
    building?: string;
    tourism?: string;
    historic?: string;
  };
}

// ── Continent lookup (ISO 3166-1 alpha-2 lowercase → continent) ───────────────

const CC_CONTINENT: Record<string, string> = {
  // Africa
  dz:'Africa',ao:'Africa',bj:'Africa',bw:'Africa',bf:'Africa',bi:'Africa',
  cm:'Africa',cv:'Africa',cf:'Africa',td:'Africa',km:'Africa',cg:'Africa',
  cd:'Africa',ci:'Africa',dj:'Africa',eg:'Africa',gq:'Africa',er:'Africa',
  et:'Africa',ga:'Africa',gm:'Africa',gh:'Africa',gn:'Africa',gw:'Africa',
  ke:'Africa',ls:'Africa',lr:'Africa',ly:'Africa',mg:'Africa',mw:'Africa',
  ml:'Africa',mr:'Africa',mu:'Africa',ma:'Africa',mz:'Africa',na:'Africa',
  ne:'Africa',ng:'Africa',rw:'Africa',st:'Africa',sn:'Africa',sl:'Africa',
  so:'Africa',za:'Africa',ss:'Africa',sd:'Africa',sz:'Africa',tz:'Africa',
  tg:'Africa',tn:'Africa',ug:'Africa',zm:'Africa',zw:'Africa',
  // Asia
  af:'Asia',am:'Asia',az:'Asia',bh:'Asia',bd:'Asia',bt:'Asia',bn:'Asia',
  kh:'Asia',cn:'Asia',ge:'Asia',in:'Asia',id:'Asia',ir:'Asia',iq:'Asia',
  il:'Asia',jp:'Asia',jo:'Asia',kz:'Asia',kw:'Asia',kg:'Asia',la:'Asia',
  lb:'Asia',my:'Asia',mv:'Asia',mn:'Asia',mm:'Asia',np:'Asia',kp:'Asia',
  om:'Asia',pk:'Asia',ps:'Asia',ph:'Asia',qa:'Asia',sa:'Asia',sg:'Asia',
  kr:'Asia',lk:'Asia',sy:'Asia',tw:'Asia',tj:'Asia',th:'Asia',tl:'Asia',
  tr:'Asia',tm:'Asia',ae:'Asia',uz:'Asia',vn:'Asia',ye:'Asia',
  // Europe
  al:'Europe',ad:'Europe',at:'Europe',by:'Europe',be:'Europe',ba:'Europe',
  bg:'Europe',hr:'Europe',cy:'Europe',cz:'Europe',dk:'Europe',ee:'Europe',
  fi:'Europe',fr:'Europe',de:'Europe',gr:'Europe',hu:'Europe',is:'Europe',
  ie:'Europe',it:'Europe',xk:'Europe',lv:'Europe',li:'Europe',lt:'Europe',
  lu:'Europe',mt:'Europe',md:'Europe',mc:'Europe',me:'Europe',nl:'Europe',
  mk:'Europe',no:'Europe',pl:'Europe',pt:'Europe',ro:'Europe',ru:'Europe',
  sm:'Europe',rs:'Europe',sk:'Europe',si:'Europe',es:'Europe',se:'Europe',
  ch:'Europe',ua:'Europe',gb:'Europe',va:'Europe',
  // Americas
  ag:'Americas',ar:'Americas',bs:'Americas',bb:'Americas',bz:'Americas',
  bo:'Americas',br:'Americas',ca:'Americas',cl:'Americas',co:'Americas',
  cr:'Americas',cu:'Americas',dm:'Americas',do:'Americas',ec:'Americas',
  sv:'Americas',gd:'Americas',gt:'Americas',gy:'Americas',ht:'Americas',
  hn:'Americas',jm:'Americas',mx:'Americas',ni:'Americas',pa:'Americas',
  py:'Americas',pe:'Americas',kn:'Americas',lc:'Americas',vc:'Americas',
  sr:'Americas',tt:'Americas',us:'Americas',uy:'Americas',ve:'Americas',
  // Oceania
  au:'Oceania',fj:'Oceania',ki:'Oceania',mh:'Oceania',fm:'Oceania',
  nr:'Oceania',nz:'Oceania',pw:'Oceania',pg:'Oceania',ws:'Oceania',
  sb:'Oceania',to:'Oceania',tv:'Oceania',vu:'Oceania',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function nominatimToResult(n: NominatimResult): LocationResult {
  const a = n.address;
  const cc = (a.country_code ?? '').toLowerCase();
  const placeName =
    a.amenity ?? a.tourism ?? a.historic ?? a.building ?? a.road ?? '';
  const town =
    a.neighbourhood ?? a.suburb ?? a.village ?? a.town ?? '';
  const city =
    a.city ?? a.town ?? a.village ?? a.county ?? '';
  const county = a.state ?? a.county ?? '';
  const country = a.country ?? '';
  const continent = CC_CONTINENT[cc] ?? 'Unknown';
  // Build clean display address
  const parts = [placeName, town, city, county, country]
    .map((s) => s.trim())
    .filter(Boolean);
  // De-duplicate consecutive identical parts
  const deduped = parts.filter((p, i) => i === 0 || p !== parts[i - 1]);
  return {
    lat: parseFloat(n.lat),
    lng: parseFloat(n.lon),
    placeName,
    town,
    city,
    county,
    country,
    countryCode: cc,
    continent,
    formattedAddress: deduped.join(', '),
  };
}

const NOMINATIM = 'https://nominatim.openstreetmap.org';

async function reverseGeocode(lat: number, lng: number): Promise<LocationResult | null> {
  try {
    const url = `${NOMINATIM}/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
    const res = await fetch(url, {
      headers: { 'Accept-Language': 'en', 'User-Agent': 'INFRA-Platform/1.0' },
    });
    if (!res.ok) return null;
    const data: NominatimResult = await res.json();
    return nominatimToResult(data);
  } catch {
    return null;
  }
}

async function searchPlaces(query: string): Promise<NominatimResult[]> {
  try {
    const q = encodeURIComponent(query);
    const url = `${NOMINATIM}/search?q=${q}&format=json&limit=6&addressdetails=1`;
    const res = await fetch(url, {
      headers: { 'Accept-Language': 'en', 'User-Agent': 'INFRA-Platform/1.0' },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

// ── Lazy-loaded Leaflet map (no SSR) ─────────────────────────────────────────

const LeafletMap = dynamic(() => import('./LocationPickerMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center rounded-xl bg-gray-100">
      <Loader2 className="h-7 w-7 animate-spin text-gray-400" />
    </div>
  ),
});

// ── Modal component ───────────────────────────────────────────────────────────

export interface LocationPickerModalProps {
  open: boolean;
  initial?: Partial<LocationResult>;
  onSelect: (result: LocationResult) => void;
  onClose: () => void;
}

const DEFAULT_LAT = -1.2921; // Nairobi
const DEFAULT_LNG = 36.8219;

export default function LocationPickerModal({
  open,
  initial,
  onSelect,
  onClose,
}: LocationPickerModalProps) {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [reversing, setReversing] = useState(false);
  const [mapMoving, setMapMoving] = useState(false);
  const [pin, setPin] = useState<{ lat: number; lng: number }>({
    lat: initial?.lat ?? DEFAULT_LAT,
    lng: initial?.lng ?? DEFAULT_LNG,
  });
  const [resolved, setResolved] = useState<LocationResult | null>(null);
  // Increments each time the modal opens → forces a fresh Leaflet DOM node,
  // preventing "Map container is already initialized" from React Strict Mode
  const [mapKey, setMapKey] = useState(0);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setMapKey((k) => k + 1);
      const lat = initial?.lat ?? DEFAULT_LAT;
      const lng = initial?.lng ?? DEFAULT_LNG;
      setPin({ lat, lng });
      setQuery('');
      setSearchResults([]);
      if (initial?.formattedAddress) {
        setResolved({
          lat,
          lng,
          placeName: initial.placeName ?? '',
          town: initial.town ?? '',
          city: initial.city ?? '',
          county: initial.county ?? '',
          country: initial.country ?? '',
          countryCode: initial.countryCode ?? '',
          continent: initial.continent ?? '',
          formattedAddress: initial.formattedAddress,
        });
      } else {
        setResolved(null);
      }
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const doReverse = useCallback(async (lat: number, lng: number) => {
    setReversing(true);
    const result = await reverseGeocode(lat, lng);
    setReversing(false);
    if (result) setResolved(result);
  }, []);

  const handlePin = useCallback(
    (lat: number, lng: number) => {
      setPin({ lat, lng });
      doReverse(lat, lng);
    },
    [doReverse],
  );

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.length < 3) {
      setSearchResults([]);
      return;
    }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      const results = await searchPlaces(query);
      setSearching(false);
      setSearchResults(results);
    }, 500);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [query]);

  const handleSelectResult = useCallback(
    (r: NominatimResult) => {
      const result = nominatimToResult(r);
      setPin({ lat: result.lat, lng: result.lng });
      setResolved(result);
      setQuery(result.formattedAddress);
      setSearchResults([]);
    },
    [],
  );

  const handleDetect = useCallback(async () => {
    if (!navigator.geolocation) return;
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setPin({ lat, lng });
        await doReverse(lat, lng);
        setDetecting(false);
      },
      () => setDetecting(false),
      { timeout: 10_000 },
    );
  }, [doReverse]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative flex w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2 text-infra-primary">
            <MapPin className="h-5 w-5" />
            <h2 className="text-lg font-semibold text-gray-900">Pick a Location</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Search bar */}
          <div className="relative px-5 pt-4 pb-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search for a city, landmark, address…"
                  className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-infra-primary focus:outline-none focus:ring-2 focus:ring-infra-primary/20"
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
                )}
              </div>
              <button
                type="button"
                onClick={handleDetect}
                disabled={detecting}
                title="Use my current location"
                className={cn(
                  'flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-infra-primary/5 hover:border-infra-primary/30 hover:text-infra-primary',
                  detecting && 'cursor-not-allowed opacity-60',
                )}
              >
                {detecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Locate className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">My location</span>
              </button>
            </div>

            {/* Search results dropdown */}
            {searchResults.length > 0 && (
              <ul className="absolute left-5 right-5 top-full z-10 mt-1 max-h-52 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                {searchResults.map((r) => (
                  <li key={r.place_id}>
                    <button
                      type="button"
                      onClick={() => handleSelectResult(r)}
                      className="flex w-full items-start gap-2 px-4 py-3 text-left text-sm hover:bg-infra-primary/5 transition-colors"
                    >
                      <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-infra-secondary" />
                      <span className="leading-snug text-gray-700 line-clamp-2">
                        {r.display_name}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Map */}
          <div className="px-5 pb-3">
            <p className="mb-1.5 text-xs text-gray-500">
              {mapMoving
                ? '📍 Release to confirm position…'
                : 'Drag the map to position the pin precisely over your location'}
            </p>
            <div className="h-96 w-full rounded-xl border border-gray-200" style={{ position: 'relative' }}>
              <LeafletMap key={mapKey} lat={pin.lat} lng={pin.lng} onPin={handlePin} onMoving={setMapMoving} />
            </div>
            <p className="mt-1.5 flex items-center gap-1 text-xs text-gray-400">
              {(reversing || mapMoving) ? (
                <><Loader2 className="h-3 w-3 animate-spin" /><span>Locating…</span></>
              ) : (
                <><span className="font-mono">{pin.lat.toFixed(6)}, {pin.lng.toFixed(6)}</span></>
              )}
            </p>
          </div>

          {/* Resolved location details */}
          {resolved && (
            <div className="mx-5 mb-4 rounded-xl border border-infra-primary/15 bg-infra-primary/5 p-4">
              <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-infra-primary">
                <Check className="h-3.5 w-3.5" />
                Detected Location
              </p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {resolved.continent && (
                  <LocationRow label="Continent" value={resolved.continent} />
                )}
                {resolved.country && (
                  <LocationRow label="Country" value={resolved.country} />
                )}
                {resolved.county && (
                  <LocationRow label="County / State" value={resolved.county} />
                )}
                {resolved.city && (
                  <LocationRow label="City" value={resolved.city} />
                )}
                {resolved.town && resolved.town !== resolved.city && (
                  <LocationRow label="Town / Suburb" value={resolved.town} />
                )}
                {resolved.placeName && (
                  <LocationRow label="Place / Landmark" value={resolved.placeName} className="col-span-2" />
                )}
              </div>
              <p className="mt-3 text-xs text-infra-secondary font-medium line-clamp-2">
                {resolved.formattedAddress}
              </p>
            </div>
          )}

          {!resolved && !reversing && !mapMoving && (
            <p className="px-5 pb-4 text-center text-sm text-gray-400">
              Search for a place, drag the map to pin it, or tap &ldquo;My location&rdquo; to auto-detect.
            </p>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!resolved}
            onClick={() => resolved && onSelect(resolved)}
            className={cn(
              'flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold transition-colors',
              resolved
                ? 'bg-infra-primary text-white hover:bg-infra-primary/90'
                : 'cursor-not-allowed bg-gray-200 text-gray-400',
            )}
          >
            <Check className="h-4 w-4" />
            Confirm Location
          </button>
        </div>
      </div>
    </div>
  );
}

function LocationRow({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col', className)}>
      <span className="text-xs text-infra-secondary">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}

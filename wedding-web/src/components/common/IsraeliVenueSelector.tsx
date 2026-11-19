'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, MapPin, Navigation, Search } from 'lucide-react';
import {
  buildVenueGoogleMapsUrl,
  buildVenueWazeUrl,
  findVenueByNameOrAddress,
  ISRAELI_REGIONS,
  ISRAELI_WEDDING_VENUES,
  type IsraeliRegion,
  type IsraeliWeddingVenue,
} from '@/data/israeli-venues';

interface IsraeliVenueSelectorProps {
  venueName: string;
  venueAddress: string;
  onSelectVenue: (selection: {
    venueName: string;
    venueAddress: string;
    venueCity: string;
    wazeUrl: string;
    googleMapsUrl: string;
  }) => void;
  compact?: boolean;
}

export function IsraeliVenueSelector({
  venueName,
  venueAddress,
  onSelectVenue,
  compact = false,
}: IsraeliVenueSelectorProps) {
  const matchedVenue = useMemo(
    () => findVenueByNameOrAddress(venueName, venueAddress) || ISRAELI_WEDDING_VENUES[0],
    [venueName, venueAddress]
  );

  const [selectedRegion, setSelectedRegion] = useState<IsraeliRegion | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState(matchedVenue.name);
  const [isOpen, setIsOpen] = useState(false);
  const [hebrewWarning, setHebrewWarning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const found = findVenueByNameOrAddress(venueName, venueAddress);
    if (found) {
      setSearchQuery(found.name);
    }
  }, [venueName, venueAddress]);

  // Ensure initial value is synced to a valid Israeli venue from the closed list
  useEffect(() => {
    const found = findVenueByNameOrAddress(venueName, venueAddress);
    if (!found) {
      const def = ISRAELI_WEDDING_VENUES[0];
      onSelectVenue({
        venueName: def.name,
        venueAddress: def.address,
        venueCity: def.city,
        wazeUrl: buildVenueWazeUrl(def),
        googleMapsUrl: buildVenueGoogleMapsUrl(def),
      });
    }
  }, [venueName, venueAddress, onSelectVenue]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        // Enforce closed list: snap input back to the selected valid venue
        setSearchQuery(matchedVenue.name);
        setHebrewWarning(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [matchedVenue]);

  const filteredVenues = useMemo(() => {
    const q = searchQuery.trim();
    const isExactCurrentName = q === matchedVenue.name;

    return ISRAELI_WEDDING_VENUES.filter((v) => {
      const regionMatch = selectedRegion === 'ALL' || v.region === selectedRegion;
      if (!regionMatch) return false;
      if (!q || isExactCurrentName) return true;
      return (
        v.name.includes(q) ||
        v.city.includes(q) ||
        v.address.includes(q) ||
        v.region.includes(q)
      );
    });
  }, [searchQuery, selectedRegion, matchedVenue.name]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Block Latin/English letters - strictly Hebrew, numbers, spaces, and punctuation
    if (/[a-zA-Z]/.test(raw)) {
      setHebrewWarning(true);
      const stripped = raw.replace(/[a-zA-Z]/g, '');
      setSearchQuery(stripped);
      setIsOpen(true);
      return;
    }
    setHebrewWarning(false);
    setSearchQuery(raw);
    setIsOpen(true);
  };

  const handleChooseVenue = (venue: IsraeliWeddingVenue) => {
    setSearchQuery(venue.name);
    setIsOpen(false);
    setHebrewWarning(false);
    onSelectVenue({
      venueName: venue.name,
      venueAddress: venue.address,
      venueCity: venue.city,
      wazeUrl: buildVenueWazeUrl(venue),
      googleMapsUrl: buildVenueGoogleMapsUrl(venue),
    });
  };

  const handleAddressSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedAddr = e.target.value;
    const venue = ISRAELI_WEDDING_VENUES.find((v) => v.address === selectedAddr);
    if (venue) {
      handleChooseVenue(venue);
    }
  };

  const regionVenuesForAddressList = useMemo(() => {
    return ISRAELI_WEDDING_VENUES.filter(
      (v) => selectedRegion === 'ALL' || v.region === selectedRegion || v.id === matchedVenue.id
    );
  }, [selectedRegion, matchedVenue.id]);

  return (
    <div ref={containerRef} dir="rtl" className="space-y-2.5 text-xs">
      {/* 1. Closed-List Region Filter */}
      <div>
        <label className="font-semibold text-stone-700">סינון לפי אזור בישראל</label>
        <select
          value={selectedRegion}
          onChange={(e) => {
            const nextReg = e.target.value as IsraeliRegion | 'ALL';
            setSelectedRegion(nextReg);
            setIsOpen(true);
          }}
          className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 font-medium text-stone-900 focus:border-amber-600 focus:outline-none"
        >
          <option value="ALL">כל האזורים בישראל ({ISRAELI_WEDDING_VENUES.length} מתחמים)</option>
          {ISRAELI_REGIONS.map((region) => (
            <option key={region} value={region}>
              {region}
            </option>
          ))}
        </select>
      </div>

      {/* 2. Hebrew-Only Autocomplete Combobox (Closed List of Real Israeli Venues) */}
      <div className="relative">
        <label className="font-semibold text-stone-700">
          שם האולם / גן האירועים (השלמה אוטומטית מרשימה סגורה — עברית בלבד)
        </label>
        <div className="relative mt-1">
          <Search className="pointer-events-none absolute top-2.5 right-3 h-4 w-4 text-stone-400" />
          <input
            type="text"
            required
            value={searchQuery}
            onFocus={() => setIsOpen(true)}
            onChange={handleInputChange}
            placeholder="הקלידו שם אולם או עיר בעברית (למשל: חוות רונית, עלמה, לאגו, ראשון לציון)..."
            className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2 pr-9 pl-8 font-bold text-stone-900 focus:border-amber-600 focus:bg-white focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-label="פתיחת רשימת האולמות"
            className="absolute top-2 left-2.5 rounded-md p-0.5 text-stone-500 hover:bg-stone-200/60"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>

        {hebrewWarning && (
          <p className="mt-1 text-[11px] font-semibold text-amber-700">
            ⚠️ החיפוש והבחירה בעברית בלבד מתוך רשימת האולמות בישראל
          </p>
        )}

        {isOpen && (
          <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-2xl border border-stone-200 bg-white p-1.5 shadow-2xl">
            {filteredVenues.length === 0 ? (
              <div className="p-3 text-center text-xs text-stone-500">
                לא נמצא אולם תואם בחיפוש. נסו להקליד שם עיר או לבחור &quot;כל האזורים בישראל&quot;.
              </div>
            ) : (
              filteredVenues.map((venue) => {
                const isSelected = venue.id === matchedVenue.id;
                return (
                  <button
                    key={venue.id}
                    type="button"
                    onClick={() => handleChooseVenue(venue)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-right transition ${
                      isSelected
                        ? 'bg-amber-50 font-bold text-amber-950'
                        : 'hover:bg-stone-100 text-stone-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold">{venue.name}</span>
                        <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] font-semibold text-stone-600">
                          {venue.city}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[11px] text-stone-500">📍 {venue.address}</div>
                    </div>
                    {isSelected && <Check className="h-4 w-4 shrink-0 text-amber-700" />}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* 3. Closed-List Verified Israeli Address Dropdown */}
      <div>
        <label className="font-semibold text-stone-700">
          כתובת מאומתת בישראל (רשימה סגורה מסונכרנת עם האולם)
        </label>
        <div className="relative mt-1">
          <select
            value={matchedVenue.address}
            onChange={handleAddressSelectChange}
            className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 font-medium text-stone-900 focus:border-amber-600 focus:outline-none"
          >
            {regionVenuesForAddressList.map((v) => (
              <option key={v.id} value={v.address}>
                {v.address} ({v.name})
              </option>
            ))}
          </select>
        </div>
      </div>

      {!compact && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-[11px] text-emerald-900">
          <span className="flex items-center gap-1.5 font-semibold">
            <MapPin className="h-3.5 w-3.5 text-emerald-700" />
            נבחר: {matchedVenue.name} — {matchedVenue.address}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-[10px] font-bold text-sky-700 shadow-2xs">
            <Navigation className="h-3 w-3" />
            Waze מסונכרן
          </span>
        </div>
      )}
    </div>
  );
}

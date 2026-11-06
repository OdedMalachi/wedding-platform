'use client';

import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Gift,
  Heart,
  MapPin,
  Navigation,
  Sparkles,
  Users,
  Utensils,
  MessageSquareHeart,
  QrCode,
  Globe,
} from 'lucide-react';
import type {
  Greeting,
  Guest,
  Locale,
  MealPreferences,
  RsvpStatus,
  Wedding,
} from '@/types/wedding';
import { DICTIONARIES } from '@/i18n/dictionaries';

interface GuestInvitationViewProps {
  wedding: Wedding;
  guest: Guest;
  greetings: Greeting[];
  isPreview?: boolean;
  onRsvpUpdated?: (updatedGuest: Guest) => void;
  onGreetingAdded?: (greeting: Greeting) => void;
}

export function GuestInvitationView({
  wedding,
  guest,
  greetings: initialGreetings,
  isPreview = false,
  onRsvpUpdated,
  onGreetingAdded,
}: GuestInvitationViewProps) {
  const [locale, setLocale] = useState<Locale>(wedding.defaultLocale || 'he');
  const dict = DICTIONARIES[locale];

  const [rsvpStatus, setRsvpStatus] = useState<RsvpStatus>(guest.invitation.rsvpStatus);
  const [confirmedAdults, setConfirmedAdults] = useState<number>(
    guest.invitation.confirmedAdults || Math.min(2, guest.maxInvitedCount)
  );
  const [confirmedChildren, setConfirmedChildren] = useState<number>(
    guest.invitation.confirmedChildren || 0
  );
  const [meals, setMeals] = useState<MealPreferences>(
    guest.invitation.mealPreferences || {
      regular: Math.min(2, guest.maxInvitedCount),
      vegetarian: 0,
      vegan: 0,
      kids: 0,
      glatt: 0,
    }
  );
  const [dietaryNotes, setDietaryNotes] = useState<string>(
    guest.invitation.guestDietaryNotes || ''
  );
  const [submittingRsvp, setSubmittingRsvp] = useState(false);
  const [rsvpSuccess, setRsvpSuccess] = useState(false);
  const [rsvpError, setRsvpError] = useState<string | null>(null);

  const [greetings, setGreetings] = useState<Greeting[]>(initialGreetings);
  const [blessingAuthor, setBlessingAuthor] = useState(guest.fullName);
  const [blessingRelation, setBlessingRelation] = useState(guest.groupName || '');
  const [blessingText, setBlessingText] = useState('');
  const [blessingGiftAmount, setBlessingGiftAmount] = useState('');
  const [blessingSaved, setBlessingSaved] = useState(false);

  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0 });

  useEffect(() => {
    setLocale(wedding.defaultLocale || 'he');
  }, [wedding.defaultLocale]);

  useEffect(() => {
    const computeCountdown = () => {
      const diff = Math.max(0, new Date(wedding.eventDate).getTime() - Date.now());
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      setCountdown({ days, hours, minutes });
    };
    computeCountdown();
    const timer = setInterval(computeCountdown, 30000);
    return () => clearInterval(timer);
  }, [wedding.eventDate]);

  const maxAllowed = guest.maxInvitedCount;
  const currentTotal = confirmedAdults + confirmedChildren;

  const handleAdultChange = (delta: number) => {
    const next = Math.max(1, confirmedAdults + delta);
    if (next + confirmedChildren <= maxAllowed) {
      setConfirmedAdults(next);
      setMeals((prev) => ({ ...prev, regular: Math.max(0, prev.regular + delta) }));
    }
  };

  const handleChildChange = (delta: number) => {
    const next = Math.max(0, confirmedChildren + delta);
    if (confirmedAdults + next <= maxAllowed) {
      setConfirmedChildren(next);
      setMeals((prev) => ({ ...prev, kids: Math.max(0, prev.kids + delta) }));
    }
  };

  const handleSubmitRsvp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingRsvp(true);
    setRsvpError(null);
    setRsvpSuccess(false);

    try {
      const res = await fetch(`/api/invitations/${guest.invitation.shortCode}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rsvpStatus,
          confirmedAdults: rsvpStatus === 'DECLINED' ? 0 : confirmedAdults,
          confirmedChildren: rsvpStatus === 'DECLINED' ? 0 : confirmedChildren,
          mealPreferences: meals,
          guestDietaryNotes: dietaryNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save RSVP');
      }
      setRsvpSuccess(true);
      onRsvpUpdated?.(data.guest);
    } catch (err) {
      setRsvpError(err instanceof Error ? err.message : 'Error saving RSVP');
    } finally {
      setSubmittingRsvp(false);
    }
  };

  const handlePostBlessing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blessingText.trim()) return;
    try {
      const res = await fetch('/api/greetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weddingId: wedding.id,
          guestId: guest.id,
          authorName: blessingAuthor || guest.fullName,
          relationship: blessingRelation,
          message: blessingText,
          giftAmountReported: blessingGiftAmount ? Number(blessingGiftAmount) : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.greeting) {
        setGreetings((prev) => [data.greeting, ...prev]);
        setBlessingText('');
        setBlessingGiftAmount('');
        setBlessingSaved(true);
        onGreetingAdded?.(data.greeting);
      }
    } catch {
      // ignore error in preview
    }
  };

  const handleDownloadIcs = () => {
    const start = new Date(wedding.eventDate);
    const end = new Date(start.getTime() + 5 * 60 * 60 * 1000);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `SUMMARY:${wedding.partner1Name} & ${wedding.partner2Name} Wedding`,
      `DTSTART:${fmt(start)}`,
      `DTEND:${fmt(end)}`,
      `LOCATION:${wedding.venueName} - ${wedding.venueAddress}`,
      `DESCRIPTION:${wedding.themeConfig.heroSubtitle}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${wedding.slug}-wedding.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isMidnight = wedding.themeConfig.templateId === 'midnight-velvet';
  const formattedEventDate = new Date(wedding.eventDate).toLocaleDateString(
    locale === 'he' ? 'he-IL' : 'en-US',
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
  );

  return (
    <div
      dir="rtl"
      style={{
        backgroundColor: isMidnight ? '#0f172a' : wedding.themeConfig.backgroundColor,
        color: isMidnight ? '#f8fafc' : '#1c1917',
      }}
      className={`min-h-full w-full transition-colors duration-300 ${
        wedding.themeConfig.fontFamily === 'serif' ? 'font-serif' : 'font-sans'
      }`}
    >
      <div className="mx-auto max-w-md pb-16 shadow-2xl">
        {/* Top Floating Language Switcher */}
        <div className="sticky top-0 z-20 flex items-center justify-between bg-black/40 px-4 py-2.5 text-xs text-white backdrop-blur-md">
          <span className="flex items-center gap-1.5 font-medium">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            {wedding.partner1Name} &amp; {wedding.partner2Name}
          </span>
          <div className="flex items-center gap-1">
            <Globe className="h-3.5 w-3.5 opacity-80" />
            {(['he', 'en'] as Locale[]).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setLocale(lang)}
                className={`rounded-full px-2 py-0.5 transition ${
                  locale === lang
                    ? 'bg-white font-semibold text-stone-900'
                    : 'text-white/80 hover:bg-white/20'
                }`}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Hero Cover Section */}
        <div className="relative h-96 w-full overflow-hidden">
          <img
            src={wedding.themeConfig.coverImageUrl}
            alt={`${wedding.partner1Name} & ${wedding.partner2Name}`}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 text-center text-white">
            <p className="mb-2 text-xs tracking-[0.25em] uppercase text-amber-200">
              {dict.invitation.saveTheDate}
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {wedding.partner1Name} <span className="text-amber-300">&amp;</span>{' '}
              {wedding.partner2Name}
            </h1>
            <p className="mt-2 text-sm text-stone-200">{wedding.themeConfig.heroSubtitle}</p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-medium backdrop-blur-sm">
              <Calendar className="h-3.5 w-3.5 text-amber-300" />
              {formattedEventDate}
            </div>
          </div>
        </div>

        <div className="space-y-6 px-5 pt-6">
          {/* Custom Couple Note */}
          <div
            className={`rounded-2xl border p-5 text-center shadow-sm ${
              isMidnight
                ? 'border-slate-700 bg-slate-800/80 text-slate-100'
                : 'border-stone-200/80 bg-white/90 text-stone-700'
            }`}
          >
            <Heart
              className="mx-auto mb-2 h-5 w-5"
              style={{ color: wedding.themeConfig.accentColor }}
            />
            <p className="text-sm leading-relaxed">
              {wedding.themeConfig.customInvitationMessage}
            </p>
          </div>

          {/* Live Countdown Timer */}
          {wedding.themeConfig.showCountdown && (
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: dict.invitation.days, value: countdown.days },
                { label: dict.invitation.hours, value: countdown.hours },
                { label: dict.invitation.minutes, value: countdown.minutes },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`rounded-2xl border p-3.5 shadow-sm ${
                    isMidnight
                      ? 'border-slate-700 bg-slate-800 text-white'
                      : 'border-stone-200 bg-white text-stone-900'
                  }`}
                >
                  <div
                    className="text-2xl font-bold"
                    style={{ color: wedding.themeConfig.primaryColor }}
                  >
                    {item.value}
                  </div>
                  <div className="mt-0.5 text-xs opacity-75">{item.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Event Timeline & Venue Navigation */}
          <div
            className={`rounded-2xl border p-5 shadow-sm ${
              isMidnight ? 'border-slate-700 bg-slate-800' : 'border-stone-200 bg-white'
            }`}
          >
            <div className="grid grid-cols-2 gap-4 border-b border-stone-200/60 pb-4 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
                  style={{ backgroundColor: wedding.themeConfig.primaryColor }}
                >
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs opacity-70">{dict.invitation.reception}</div>
                  <div className="text-base font-bold">{wedding.receptionTime}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
                  style={{ backgroundColor: wedding.themeConfig.accentColor }}
                >
                  <Heart className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs opacity-70">{dict.invitation.ceremony}</div>
                  <div className="text-base font-bold">{wedding.ceremonyTime}</div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-start gap-3">
              <MapPin
                className="mt-1 h-5 w-5 shrink-0"
                style={{ color: wedding.themeConfig.primaryColor }}
              />
              <div>
                <div className="font-bold">{wedding.venueName}</div>
                <div className="text-xs opacity-75">{wedding.venueAddress}</div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-xs font-medium">
              <a
                href={wedding.wazeUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 rounded-xl bg-sky-500 px-3 py-2.5 text-white shadow-sm transition hover:bg-sky-600"
              >
                <Navigation className="h-3.5 w-3.5" />
                Waze
              </a>
              <a
                href={wedding.googleMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2.5 text-white shadow-sm transition hover:bg-emerald-700"
              >
                <MapPin className="h-3.5 w-3.5" />
                Maps
              </a>
              <button
                type="button"
                onClick={handleDownloadIcs}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-stone-300 bg-stone-100 px-3 py-2.5 text-stone-800 transition hover:bg-stone-200"
              >
                <Calendar className="h-3.5 w-3.5" />
                {dict.invitation.addToCalendar}
              </button>
            </div>
          </div>

          {/* Personalized RSVP Form */}
          <form
            onSubmit={handleSubmitRsvp}
            className={`rounded-2xl border p-5 shadow-md ${
              isMidnight ? 'border-slate-700 bg-slate-800' : 'border-stone-200 bg-white'
            }`}
          >
            <div className="mb-4 text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
                <Users className="h-3.5 w-3.5" />
                {guest.fullName}
              </span>
              <h2 className="mt-2 text-xl font-bold">{dict.invitation.rsvpTitle}</h2>
              <p className="mt-1 text-xs opacity-75">
                {dict.invitation.personalGreeting} <strong>{guest.maxInvitedCount}</strong>
              </p>
            </div>

            {/* Attendance Status Selector */}
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { status: 'ATTENDING', label: dict.invitation.attending, activeBg: 'bg-emerald-600 text-white border-emerald-600' },
                  { status: 'MAYBE', label: dict.invitation.maybe, activeBg: 'bg-amber-500 text-white border-amber-500' },
                  { status: 'DECLINED', label: dict.invitation.declined, activeBg: 'bg-rose-600 text-white border-rose-600' },
                ] as const
              ).map((option) => (
                <button
                  key={option.status}
                  type="button"
                  onClick={() => setRsvpStatus(option.status)}
                  className={`rounded-xl border px-2.5 py-3 text-xs font-semibold transition ${
                    rsvpStatus === option.status
                      ? option.activeBg
                      : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {/* Headcount & Meal Preferences when Attending or Maybe */}
            {rsvpStatus !== 'DECLINED' && (
              <div className="mt-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-stone-200 p-3 text-center">
                    <div className="text-xs opacity-70">{dict.invitation.adultsCount}</div>
                    <div className="mt-2 flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleAdultChange(-1)}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-200 text-stone-800 font-bold"
                      >
                        -
                      </button>
                      <span className="text-lg font-bold">{confirmedAdults}</span>
                      <button
                        type="button"
                        onClick={() => handleAdultChange(1)}
                        disabled={currentTotal >= maxAllowed}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-800 text-white font-bold disabled:opacity-30"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-stone-200 p-3 text-center">
                    <div className="text-xs opacity-70">{dict.invitation.childrenCount}</div>
                    <div className="mt-2 flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleChildChange(-1)}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-200 text-stone-800 font-bold"
                      >
                        -
                      </button>
                      <span className="text-lg font-bold">{confirmedChildren}</span>
                      <button
                        type="button"
                        onClick={() => handleChildChange(1)}
                        disabled={currentTotal >= maxAllowed}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-800 text-white font-bold disabled:opacity-30"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Meal Preferences */}
                <div className="rounded-xl border border-stone-200/80 p-3.5">
                  <div className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold">
                    <Utensils className="h-3.5 w-3.5" />
                    {dict.invitation.mealPreferences}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {(['regular', 'vegetarian', 'vegan', 'kids', 'glatt'] as const).map((mealKey) => (
                      <div
                        key={mealKey}
                        className="flex items-center justify-between rounded-lg bg-stone-50 px-2.5 py-1.5 text-stone-800"
                      >
                        <span>{dict.invitation.meals[mealKey]}</span>
                        <input
                          type="number"
                          min={0}
                          max={maxAllowed}
                          value={meals[mealKey]}
                          onChange={(e) =>
                            setMeals((prev) => ({
                              ...prev,
                              [mealKey]: Math.max(0, Number(e.target.value) || 0),
                            }))
                          }
                          className="w-12 rounded border border-stone-300 bg-white px-1.5 py-0.5 text-center font-semibold"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <textarea
              rows={2}
              value={dietaryNotes}
              onChange={(e) => setDietaryNotes(e.target.value)}
              placeholder={dict.invitation.dietaryNotesPlaceholder}
              className="mt-4 w-full rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none"
            />

            {rsvpError && (
              <p className="mt-2 text-center text-xs font-medium text-rose-600">{rsvpError}</p>
            )}
            {rsvpSuccess && (
              <div className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-50 p-2.5 text-xs font-semibold text-emerald-800">
                <CheckCircle2 className="h-4 w-4" />
                {dict.invitation.rsvpSaved}
              </div>
            )}

            <button
              type="submit"
              disabled={submittingRsvp}
              style={{ backgroundColor: wedding.themeConfig.primaryColor }}
              className="mt-4 w-full rounded-xl py-3 text-sm font-bold text-white shadow-md transition hover:opacity-95 disabled:opacity-50"
            >
              {submittingRsvp ? '...' : dict.invitation.submitRsvp}
            </button>
          </form>

          {/* Express Reception QR Pass & Assigned Table */}
          {rsvpStatus === 'ATTENDING' && (
            <div
              className={`rounded-2xl border p-5 text-center shadow-sm ${
                isMidnight ? 'border-slate-700 bg-slate-800' : 'border-stone-200 bg-white'
              }`}
            >
              <div className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                <QrCode className="h-4 w-4" />
                {dict.invitation.qrPassTitle}
              </div>
              <p className="text-xs opacity-75">{dict.invitation.qrPassSubtitle}</p>

              <div className="my-4 inline-block rounded-2xl border border-stone-200 bg-white p-4 shadow-inner">
                <QRCodeSVG
                  value={`WEDDING_CHECKIN:${guest.invitation.shortCode}`}
                  size={148}
                  level="M"
                />
              </div>

              <div className="flex items-center justify-center gap-4 text-xs">
                <div className="rounded-xl bg-amber-50 px-3.5 py-2 text-amber-900">
                  <span className="block text-[10px] uppercase opacity-75">
                    {dict.invitation.assignedTable}
                  </span>
                  <strong className="text-sm">
                    {guest.tableName || 'יפורסם ביום האירוע / TBA'}
                  </strong>
                </div>
                <div className="rounded-xl bg-stone-100 px-3.5 py-2 text-stone-800">
                  <span className="block text-[10px] uppercase opacity-75">Code</span>
                  <strong className="font-mono text-sm">{guest.invitation.shortCode}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Digital Wedding Gift Links */}
          {wedding.themeConfig.showGiftLinks && (
            <div
              className={`rounded-2xl border p-5 text-center shadow-sm ${
                isMidnight ? 'border-slate-700 bg-slate-800' : 'border-stone-200 bg-white'
              }`}
            >
              <Gift
                className="mx-auto mb-2 h-6 w-6"
                style={{ color: wedding.themeConfig.accentColor }}
              />
              <h3 className="text-base font-bold">{dict.invitation.giftSectionTitle}</h3>
              <p className="mt-1 text-xs opacity-75">{dict.invitation.giftSectionSubtitle}</p>

              <div className="mt-4 grid grid-cols-2 gap-2.5 text-xs font-semibold">
                {wedding.giftConfig.bitUrl && (
                  <a
                    href={wedding.giftConfig.bitUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl bg-cyan-600 py-2.5 text-white shadow-sm hover:bg-cyan-700"
                  >
                    {dict.invitation.bitButton}
                  </a>
                )}
                {wedding.giftConfig.payboxUrl && (
                  <a
                    href={wedding.giftConfig.payboxUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl bg-indigo-600 py-2.5 text-white shadow-sm hover:bg-indigo-700"
                  >
                    {dict.invitation.payboxButton}
                  </a>
                )}
              </div>
              {wedding.giftConfig.bankDetails && (
                <p className="mt-3 rounded-lg bg-stone-100 p-2 text-[11px] text-stone-700">
                  {wedding.giftConfig.bankDetails}
                </p>
              )}
            </div>
          )}

          {/* Couple's Greeting Wall */}
          {wedding.themeConfig.showGreetingWall && (
            <div
              className={`rounded-2xl border p-5 shadow-sm ${
                isMidnight ? 'border-slate-700 bg-slate-800' : 'border-stone-200 bg-white'
              }`}
            >
              <div className="mb-3 flex items-center gap-2">
                <MessageSquareHeart
                  className="h-5 w-5"
                  style={{ color: wedding.themeConfig.primaryColor }}
                />
                <h3 className="text-base font-bold">{dict.invitation.greetingWallTitle}</h3>
              </div>

              <form onSubmit={handlePostBlessing} className="space-y-2.5 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={blessingAuthor}
                    onChange={(e) => setBlessingAuthor(e.target.value)}
                    placeholder={dict.invitation.yourName}
                    className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-stone-900"
                  />
                  <input
                    type="text"
                    value={blessingRelation}
                    onChange={(e) => setBlessingRelation(e.target.value)}
                    placeholder={dict.invitation.yourRelationship}
                    className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-stone-900"
                  />
                </div>
                <textarea
                  rows={2}
                  value={blessingText}
                  onChange={(e) => setBlessingText(e.target.value)}
                  placeholder={dict.invitation.yourBlessing}
                  className="w-full rounded-lg border border-stone-200 bg-stone-50 p-3 text-stone-900"
                />
                <button
                  type="submit"
                  style={{ backgroundColor: wedding.themeConfig.accentColor }}
                  className="w-full rounded-xl py-2.5 font-semibold text-white shadow-sm hover:opacity-95"
                >
                  {dict.invitation.sendBlessing}
                </button>
                {blessingSaved && (
                  <p className="text-center text-emerald-600 font-medium">✨ תודה על הברכה!</p>
                )}
              </form>

              {greetings.length > 0 && (
                <div className="mt-4 space-y-2.5 border-t border-stone-200/70 pt-4">
                  {greetings.slice(0, isPreview ? 2 : 8).map((gr) => (
                    <div
                      key={gr.id}
                      className="rounded-xl bg-stone-50/90 p-3 text-xs text-stone-800"
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span>{gr.authorName}</span>
                        {gr.relationship && (
                          <span className="text-[10px] font-normal text-stone-500">
                            {gr.relationship}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 leading-relaxed text-stone-600">{gr.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

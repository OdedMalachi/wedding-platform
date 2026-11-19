'use client';

import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Calendar,
  Check,
  Clock,
  Gift,
  MapPin,
  Navigation,
  QrCode,
  Utensils,
} from 'lucide-react';
import type {
  Greeting,
  Guest,
  MealPreferences,
  RsvpStatus,
  Wedding,
} from '@/types/wedding';
import { HEBREW_DICT } from '@/i18n/dictionaries';

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
  const dict = HEBREW_DICT;

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
  const [blessingSaved, setBlessingSaved] = useState(false);

  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0 });

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
    if (isPreview) {
      setRsvpSuccess(true);
      return;
    }
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
        throw new Error(data.error || 'שגיאה בשמירת אישור ההגעה');
      }
      setRsvpSuccess(true);
      onRsvpUpdated?.(data.guest);
    } catch (err) {
      setRsvpError(err instanceof Error ? err.message : 'שגיאה בשמירת אישור ההגעה');
    } finally {
      setSubmittingRsvp(false);
    }
  };

  const handlePostBlessing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blessingText.trim()) return;
    if (isPreview) {
      setBlessingSaved(true);
      setBlessingText('');
      return;
    }
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
        }),
      });
      const data = await res.json();
      if (res.ok && data.greeting) {
        setGreetings((prev) => [data.greeting, ...prev]);
        setBlessingText('');
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
      `SUMMARY:החתונה של ${wedding.partner1Name} ו${wedding.partner2Name}`,
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
  const formattedEventDate = new Date(wedding.eventDate).toLocaleDateString('he-IL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const cardClass = isMidnight
    ? 'border-slate-800 bg-slate-900 text-slate-100'
    : 'border-stone-200/90 bg-white text-stone-900';

  return (
    <div
      dir="rtl"
      style={{
        backgroundColor: isMidnight ? '#0b1120' : wedding.themeConfig.backgroundColor,
        color: isMidnight ? '#f8fafc' : '#1c1917',
      }}
      className="min-h-full w-full font-sans transition-colors duration-200"
    >
      <div className="mx-auto max-w-md pb-16">
        {/* Hero Cover Section */}
        <div className="relative h-96 w-full overflow-hidden bg-stone-900">
          <img
            src={wedding.themeConfig.coverImageUrl}
            alt={`${wedding.partner1Name} ו${wedding.partner2Name}`}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/15" />

          <div className="absolute top-4 right-5 text-[11px] font-medium text-white/80">
            בס״ד
          </div>

          <div className="absolute inset-x-0 bottom-0 p-7 text-center text-white">
            <p className="mb-2 text-xs font-medium tracking-widest text-stone-300">
              קול ששון וקול שמחה קול חתן וקול כלה
            </p>
            <h1
              className="text-3xl font-bold tracking-tight sm:text-4xl"
              style={{ fontFamily: 'var(--font-frank), serif' }}
            >
              {wedding.partner1Name} <span className="mx-1 font-normal opacity-80">&amp;</span>{' '}
              {wedding.partner2Name}
            </h1>
            <p className="mt-2.5 text-xs leading-relaxed text-stone-200">
              {wedding.themeConfig.heroSubtitle}
            </p>
            <div className="mt-4 inline-flex items-center gap-2 border-y border-white/25 px-5 py-1.5 text-xs font-semibold tracking-wide">
              {formattedEventDate}
            </div>
          </div>
        </div>

        <div className="space-y-5 px-4 pt-6">
          {/* Formal Couple Invitation Card */}
          <div className={`rounded-xl border p-6 text-center shadow-xs ${cardClass}`}>
            <p className="text-xs font-semibold text-stone-500">לכבוד</p>
            <h2
              className="mt-1 text-xl font-bold"
              style={{
                color: isMidnight ? '#f8fafc' : wedding.themeConfig.primaryColor,
                fontFamily: 'var(--font-frank), serif',
              }}
            >
              {guest.fullName}
            </h2>
            <div className="mx-auto my-3 h-px w-12 bg-stone-200" />
            <p className="text-sm leading-relaxed opacity-90">
              {wedding.themeConfig.customInvitationMessage}
            </p>
          </div>

          {/* Minimalist Countdown */}
          {wedding.themeConfig.showCountdown && (
            <div className="grid grid-cols-3 gap-2.5 text-center">
              {[
                { label: dict.invitation.days, value: countdown.days },
                { label: dict.invitation.hours, value: countdown.hours },
                { label: dict.invitation.minutes, value: countdown.minutes },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`rounded-xl border py-3 px-2 shadow-2xs ${cardClass}`}
                >
                  <div
                    className="text-xl font-bold tabular-nums"
                    style={{ color: isMidnight ? '#f8fafc' : wedding.themeConfig.primaryColor }}
                  >
                    {item.value}
                  </div>
                  <div className="mt-0.5 text-[11px] text-stone-500">{item.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Event Schedule & Verified Venue Navigation */}
          <div className={`rounded-xl border p-5 shadow-xs ${cardClass}`}>
            <div className="grid grid-cols-2 gap-4 border-b border-stone-200/70 pb-4">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
                  style={{ backgroundColor: wedding.themeConfig.primaryColor }}
                >
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[11px] text-stone-500">{dict.invitation.reception}</div>
                  <div className="text-sm font-bold tabular-nums">{wedding.receptionTime}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
                  style={{ backgroundColor: wedding.themeConfig.accentColor }}
                >
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[11px] text-stone-500">{dict.invitation.ceremony}</div>
                  <div className="text-sm font-bold tabular-nums">{wedding.ceremonyTime}</div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-start gap-2.5">
              <MapPin
                className="mt-0.5 h-4 w-4 shrink-0"
                style={{ color: wedding.themeConfig.primaryColor }}
              />
              <div>
                <div className="text-sm font-bold">{wedding.venueName}</div>
                <div className="mt-0.5 text-xs text-stone-500">{wedding.venueAddress}</div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-xs font-semibold">
              <a
                href={wedding.wazeUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 text-stone-800 transition hover:bg-stone-100"
              >
                <Navigation className="h-3.5 w-3.5 text-sky-600" />
                ניווט ב-Waze
              </a>
              <a
                href={wedding.googleMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 text-stone-800 transition hover:bg-stone-100"
              >
                <MapPin className="h-3.5 w-3.5 text-emerald-700" />
                מפות גוגל
              </a>
              <button
                type="button"
                onClick={handleDownloadIcs}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 text-stone-800 transition hover:bg-stone-100"
              >
                <Calendar className="h-3.5 w-3.5 text-stone-600" />
                {dict.invitation.addToCalendar}
              </button>
            </div>
          </div>

          {/* Personalized RSVP Form */}
          <form
            onSubmit={handleSubmitRsvp}
            className={`rounded-xl border p-5 shadow-xs ${cardClass}`}
          >
            <div className="mb-4 border-b border-stone-100 pb-3">
              <h2 className="text-base font-bold">{dict.invitation.rsvpTitle}</h2>
              <p className="mt-0.5 text-xs text-stone-500">
                {dict.invitation.personalGreeting} <strong>{guest.maxInvitedCount}</strong> אורחים
              </p>
            </div>

            {/* Attendance Status Selector */}
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  {
                    status: 'ATTENDING',
                    label: dict.invitation.attending,
                    activeClass: 'border-emerald-700 bg-emerald-700 text-white',
                  },
                  {
                    status: 'MAYBE',
                    label: dict.invitation.maybe,
                    activeClass: 'border-amber-700 bg-amber-700 text-white',
                  },
                  {
                    status: 'DECLINED',
                    label: dict.invitation.declined,
                    activeClass: 'border-stone-800 bg-stone-800 text-white',
                  },
                ] as const
              ).map((option) => (
                <button
                  key={option.status}
                  type="button"
                  onClick={() => setRsvpStatus(option.status)}
                  className={`rounded-lg border px-2.5 py-2.5 text-xs font-semibold transition ${
                    rsvpStatus === option.status
                      ? option.activeClass
                      : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {/* Headcount & Meal Preferences when Attending or Maybe */}
            {rsvpStatus !== 'DECLINED' && (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-stone-200 p-3 text-center">
                    <div className="text-xs font-medium text-stone-500">
                      {dict.invitation.adultsCount}
                    </div>
                    <div className="mt-2 flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleAdultChange(-1)}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-stone-300 bg-stone-50 text-stone-800 font-bold"
                      >
                        -
                      </button>
                      <span className="w-5 text-base font-bold tabular-nums">{confirmedAdults}</span>
                      <button
                        type="button"
                        onClick={() => handleAdultChange(1)}
                        disabled={currentTotal >= maxAllowed}
                        className="flex h-7 w-7 items-center justify-center rounded-md bg-stone-900 text-white font-bold disabled:opacity-30"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="rounded-lg border border-stone-200 p-3 text-center">
                    <div className="text-xs font-medium text-stone-500">
                      {dict.invitation.childrenCount}
                    </div>
                    <div className="mt-2 flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleChildChange(-1)}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-stone-300 bg-stone-50 text-stone-800 font-bold"
                      >
                        -
                      </button>
                      <span className="w-5 text-base font-bold tabular-nums">
                        {confirmedChildren}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleChildChange(1)}
                        disabled={currentTotal >= maxAllowed}
                        className="flex h-7 w-7 items-center justify-center rounded-md bg-stone-900 text-white font-bold disabled:opacity-30"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Meal Preferences */}
                <div className="rounded-lg border border-stone-200 p-3.5">
                  <div className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold text-stone-700">
                    <Utensils className="h-3.5 w-3.5" />
                    {dict.invitation.mealPreferences}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {(['regular', 'vegetarian', 'vegan', 'kids', 'glatt'] as const).map(
                      (mealKey) => (
                        <div
                          key={mealKey}
                          className="flex items-center justify-between rounded-md bg-stone-50 px-2.5 py-1.5 text-stone-800"
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
                            className="w-12 rounded border border-stone-300 bg-white px-1.5 py-0.5 text-center font-semibold tabular-nums"
                          />
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            )}

            <textarea
              rows={2}
              value={dietaryNotes}
              onChange={(e) => setDietaryNotes(e.target.value)}
              placeholder={dict.invitation.dietaryNotesPlaceholder}
              className="mt-4 w-full rounded-lg border border-stone-200 bg-stone-50 p-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-400 focus:outline-none"
            />

            {rsvpError && (
              <p className="mt-2 text-center text-xs font-medium text-rose-600">{rsvpError}</p>
            )}
            {rsvpSuccess && (
              <div className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs font-semibold text-emerald-900">
                <Check className="h-4 w-4" />
                {dict.invitation.rsvpSaved}
              </div>
            )}

            <button
              type="submit"
              disabled={submittingRsvp}
              style={{ backgroundColor: wedding.themeConfig.primaryColor }}
              className="mt-4 w-full rounded-lg py-2.5 text-sm font-bold text-white shadow-xs transition hover:opacity-95 disabled:opacity-50"
            >
              {submittingRsvp ? 'שומר...' : dict.invitation.submitRsvp}
            </button>
          </form>

          {/* Reception QR Pass & Assigned Table */}
          {rsvpStatus === 'ATTENDING' && (
            <div className={`rounded-xl border p-5 text-center shadow-xs ${cardClass}`}>
              <div className="mb-1 inline-flex items-center gap-1.5 text-xs font-bold text-stone-800">
                <QrCode className="h-4 w-4" />
                {dict.invitation.qrPassTitle}
              </div>
              <p className="text-xs text-stone-500">{dict.invitation.qrPassSubtitle}</p>

              <div className="my-4 inline-block rounded-xl border border-stone-200 bg-white p-3.5">
                <QRCodeSVG
                  value={`WEDDING_CHECKIN:${guest.invitation.shortCode}`}
                  size={136}
                  level="M"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-stone-900">
                  <span className="block text-[11px] text-stone-500">
                    {dict.invitation.assignedTable}
                  </span>
                  <strong className="text-sm">{guest.tableName || 'יימסר בכניסה לאולם'}</strong>
                </div>
                <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-stone-900">
                  <span className="block text-[11px] text-stone-500">קוד הזמנה</span>
                  <strong className="font-mono text-sm">{guest.invitation.shortCode}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Digital Wedding Gift Links */}
          {wedding.themeConfig.showGiftLinks && (
            <div className={`rounded-xl border p-5 text-center shadow-xs ${cardClass}`}>
              <div className="flex items-center justify-center gap-1.5 text-sm font-bold">
                <Gift className="h-4 w-4 text-stone-700" />
                <h3>{dict.invitation.giftSectionTitle}</h3>
              </div>
              <p className="mt-1 text-xs text-stone-500">{dict.invitation.giftSectionSubtitle}</p>

              <div className="mt-3.5 grid grid-cols-2 gap-2.5 text-xs font-semibold">
                {wedding.giftConfig.bitUrl && (
                  <a
                    href={wedding.giftConfig.bitUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-stone-300 bg-stone-900 py-2.5 text-white transition hover:bg-stone-800"
                  >
                    {dict.invitation.bitButton}
                  </a>
                )}
                {wedding.giftConfig.payboxUrl && (
                  <a
                    href={wedding.giftConfig.payboxUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-stone-300 bg-white py-2.5 text-stone-900 transition hover:bg-stone-50"
                  >
                    {dict.invitation.payboxButton}
                  </a>
                )}
              </div>
              {wedding.giftConfig.bankDetails && (
                <p className="mt-3 rounded-lg border border-stone-200 bg-stone-50 p-2.5 text-xs text-stone-700">
                  {wedding.giftConfig.bankDetails}
                </p>
              )}
            </div>
          )}

          {/* Couple's Greeting Book */}
          {wedding.themeConfig.showGreetingWall && (
            <div className={`rounded-xl border p-5 shadow-xs ${cardClass}`}>
              <h3 className="mb-3 text-sm font-bold">{dict.invitation.greetingWallTitle}</h3>

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
                  className="w-full rounded-lg border border-stone-200 bg-stone-50 p-2.5 text-stone-900"
                />
                <button
                  type="submit"
                  className="w-full rounded-lg border border-stone-300 bg-stone-900 py-2 font-semibold text-white transition hover:bg-stone-800"
                >
                  {dict.invitation.sendBlessing}
                </button>
                {blessingSaved && (
                  <p className="text-center font-medium text-emerald-700">הברכה נשמרה בספר האורחים</p>
                )}
              </form>

              {greetings.length > 0 && (
                <div className="mt-4 space-y-2 border-t border-stone-200 pt-3.5">
                  {greetings.slice(0, isPreview ? 2 : 8).map((gr) => (
                    <div
                      key={gr.id}
                      className="rounded-lg border border-stone-100 bg-stone-50 p-3 text-xs text-stone-800"
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span>{gr.authorName}</span>
                        {gr.relationship && (
                          <span className="text-[11px] font-normal text-stone-500">
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

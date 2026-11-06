'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Gift,
  Globe,
  Heart,
  LayoutGrid,
  MessageCircle,
  Palette,
  Plus,
  QrCode,
  Search,
  Send,
  Sparkles,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  Utensils,
} from 'lucide-react';
import type {
  CampaignType,
  Greeting,
  Guest,
  GuestGroup,
  InvitationTemplateId,
  Locale,
  MessageLog,
  RsvpStatus,
  SeatAssignment,
  SeatingTable,
  Wedding,
  WeddingSide,
  WeddingStatistics,
} from '@/types/wedding';
import { DICTIONARIES } from '@/i18n/dictionaries';
import {
  buildWhatsAppInvitationLink,
  getDefaultCampaignTemplate,
} from '@/services/whatsapp';
import { GuestInvitationView } from '@/components/invitation/GuestInvitationView';

type DashboardTab =
  | 'overview'
  | 'guests'
  | 'studio'
  | 'whatsapp'
  | 'seating'
  | 'checkin'
  | 'greetings';

const TEMPLATE_PRESETS: Record<
  InvitationTemplateId,
  {
    name: string;
    primaryColor: string;
    accentColor: string;
    backgroundColor: string;
    coverImageUrl: string;
  }
> = {
  'editorial-gold': {
    name: 'Editorial Gold',
    primaryColor: '#92400e',
    accentColor: '#d97706',
    backgroundColor: '#fffbeb',
    coverImageUrl:
      'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80',
  },
  'mediterranean-olive': {
    name: 'Mediterranean Olive',
    primaryColor: '#365314',
    accentColor: '#65a30d',
    backgroundColor: '#f7fee7',
    coverImageUrl:
      'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=80',
  },
  'modern-minimal': {
    name: 'Modern Minimal',
    primaryColor: '#1c1917',
    accentColor: '#78716c',
    backgroundColor: '#fafaf9',
    coverImageUrl:
      'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1200&q=80',
  },
  'midnight-velvet': {
    name: 'Midnight Velvet',
    primaryColor: '#e11d48',
    accentColor: '#f59e0b',
    backgroundColor: '#0f172a',
    coverImageUrl:
      'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1200&q=80',
  },
};

export function WeddingPlatformApp() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [uiLocale, setUiLocale] = useState<Locale>('he');
  const dict = DICTIONARIES[uiLocale];

  const [allWeddings, setAllWeddings] = useState<Wedding[]>([]);
  const [wedding, setWedding] = useState<Wedding | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [groups, setGroups] = useState<GuestGroup[]>([]);
  const [tables, setTables] = useState<SeatingTable[]>([]);
  const [assignments, setAssignments] = useState<SeatAssignment[]>([]);
  const [greetings, setGreetings] = useState<Greeting[]>([]);
  const [messageLogs, setMessageLogs] = useState<MessageLog[]>([]);
  const [statistics, setStatistics] = useState<WeddingStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  // Guest filtering & creation state
  const [guestSearch, setGuestSearch] = useState('');
  const [rsvpFilter, setRsvpFilter] = useState<RsvpStatus | 'ALL'>('ALL');
  const [sideFilter, setSideFilter] = useState<WeddingSide | 'ALL'>('ALL');
  const [newGuestName, setNewGuestName] = useState('');
  const [newGuestPhone, setNewGuestPhone] = useState('');
  const [newGuestMax, setNewGuestMax] = useState(2);
  const [newGuestGroup, setNewGuestGroup] = useState('משפחה קרובה');
  const [newGuestSide, setNewGuestSide] = useState<WeddingSide>('BOTH');
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvText, setCsvText] = useState(
    'Full Name,Phone,Max Invited,Group,Side,Notes\nמשפחת אלמוג,054-9123456,3,משפחה קרובה,PARTNER_1,צמחונים\nעמית וירדן גולן,052-8234567,2,חברים מהאוניברסיטה,PARTNER_2,'
  );

  // New wedding modal state
  const [showNewWeddingModal, setShowNewWeddingModal] = useState(false);
  const [nwPartner1, setNwPartner1] = useState('');
  const [nwPartner2, setNwPartner2] = useState('');
  const [nwDate, setNwDate] = useState('2026-12-28');
  const [nwVenue, setNwVenue] = useState('');
  const [nwAddress, setNwAddress] = useState('');
  const [nwLocale, setNwLocale] = useState<Locale>('he');

  // WhatsApp campaign state
  const [campaignType, setCampaignType] = useState<CampaignType>('INITIAL_INVITATION');
  const [customTemplate, setCustomTemplate] = useState('');
  const [waFilterStatus, setWaFilterStatus] = useState<'ALL' | 'PENDING'>('ALL');

  // Seating table creation state
  const [newTableName, setNewTableName] = useState('');
  const [newTableCategory, setNewTableCategory] = useState('משפחה קרובה');
  const [newTableShape, setNewTableShape] = useState<'ROUND' | 'RECTANGLE' | 'SQUARE'>('ROUND');
  const [newTableCapacity, setNewTableCapacity] = useState(12);
  const [seatingError, setSeatingError] = useState<string | null>(null);

  // Check-in search & QR code input
  const [checkinQuery, setCheckinQuery] = useState('');

  const showNotification = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const [apiError, setApiError] = useState<string | null>(null);

  const fetchWeddingBundle = useCallback(async (weddingId?: string) => {
    setLoading(true);
    setApiError(null);
    try {
      const url = weddingId
        ? `/api/weddings?weddingId=${encodeURIComponent(weddingId)}`
        : '/api/weddings';
      const res = await fetch(url);
      const text = await res.text();
      let data: Record<string, any> = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(
          'Backend API server (wedding-api on port 4000) is not reachable. Run "npm run dev" from the root folder to start both wedding-api and wedding-web.'
        );
      }
      if (!res.ok) {
        throw new Error(data.error || `API Error (${res.status})`);
      }
      setAllWeddings(data.allWeddings || []);
      setWedding(data.wedding);
      setGuests(data.guests || []);
      setGroups(data.groups || []);
      setTables(data.tables || []);
      setAssignments(data.assignments || []);
      setGreetings(data.greetings || []);
      setMessageLogs(data.messageLogs || []);
      setStatistics(data.statistics || null);
      if (data.wedding) {
        setCustomTemplate(
          getDefaultCampaignTemplate('INITIAL_INVITATION', data.wedding.defaultLocale)
        );
      }
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Failed to connect to wedding-api');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWeddingBundle();
  }, [fetchWeddingBundle]);

  useEffect(() => {
    if (wedding) {
      setCustomTemplate(getDefaultCampaignTemplate(campaignType, wedding.defaultLocale));
    }
  }, [campaignType, wedding]);

  const filteredGuests = useMemo(() => {
    return guests.filter((g) => {
      const matchesQuery =
        !guestSearch.trim() ||
        g.fullName.toLowerCase().includes(guestSearch.toLowerCase()) ||
        g.phoneE164.includes(guestSearch) ||
        g.groupName.toLowerCase().includes(guestSearch.toLowerCase()) ||
        g.invitation.shortCode.toLowerCase().includes(guestSearch.toLowerCase());
      const matchesRsvp = rsvpFilter === 'ALL' || g.invitation.rsvpStatus === rsvpFilter;
      const matchesSide = sideFilter === 'ALL' || g.side === sideFilter;
      return matchesQuery && matchesRsvp && matchesSide;
    });
  }, [guests, guestSearch, rsvpFilter, sideFilter]);

  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wedding || !newGuestName.trim() || !newGuestPhone.trim()) return;
    const res = await fetch('/api/guests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        weddingId: wedding.id,
        fullName: newGuestName,
        phone: newGuestPhone,
        maxInvitedCount: newGuestMax,
        groupName: newGuestGroup,
        side: newGuestSide,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setNewGuestName('');
      setNewGuestPhone('');
      await fetchWeddingBundle(wedding.id);
      showNotification(`נוסף מוזמן חדש: ${data.guest.fullName}`);
    } else {
      showNotification(data.error || 'שגיאה בהוספת מוזמן');
    }
  };

  const handleImportCsv = async () => {
    if (!wedding || !csvText.trim()) return;
    const res = await fetch('/api/guests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'csv',
        weddingId: wedding.id,
        csvText,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setShowCsvModal(false);
      await fetchWeddingBundle(wedding.id);
      showNotification(`יובאו בהצלחה ${data.importedCount} רשומות מוזמנים!`);
    }
  };

  const handleDeleteGuest = async (guestId: string) => {
    if (!wedding) return;
    await fetch(`/api/guests?guestId=${encodeURIComponent(guestId)}`, { method: 'DELETE' });
    await fetchWeddingBundle(wedding.id);
    showNotification('המוזמן הוסר מהרשימה');
  };

  const handleCreateWedding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nwPartner1.trim() || !nwPartner2.trim() || !nwVenue.trim()) return;
    const res = await fetch('/api/weddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partner1Name: nwPartner1,
        partner2Name: nwPartner2,
        eventDate: nwDate,
        venueName: nwVenue,
        venueAddress: nwAddress || nwVenue,
        defaultLocale: nwLocale,
      }),
    });
    const data = await res.json();
    if (res.ok && data.wedding) {
      setShowNewWeddingModal(false);
      setNwPartner1('');
      setNwPartner2('');
      setNwVenue('');
      setNwAddress('');
      await fetchWeddingBundle(data.wedding.id);
      showNotification(`נוצר אירוע חדש: ${data.wedding.partner1Name} & ${data.wedding.partner2Name}`);
    }
  };

  const handleSaveWeddingSettings = async () => {
    if (!wedding) return;
    const res = await fetch('/api/weddings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wedding),
    });
    if (res.ok) {
      showNotification('הגדרות העיצוב והאירוע נשמרו בהצלחה ✨');
      await fetchWeddingBundle(wedding.id);
    }
  };

  const handleAssignTable = async (guestId: string, tableId: string | null) => {
    if (!wedding) return;
    setSeatingError(null);
    const res = await fetch('/api/seating', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'assign_seat',
        weddingId: wedding.id,
        guestId,
        tableId,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setSeatingError(data.error || 'שגיאה בשיוך לשולחן');
      return;
    }
    await fetchWeddingBundle(wedding.id);
    showNotification('סידור ההושבה עודכן');
  };

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wedding || !newTableName.trim()) return;
    const res = await fetch('/api/seating', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_table',
        weddingId: wedding.id,
        tableNumber: newTableName,
        category: newTableCategory,
        tableShape: newTableShape,
        capacity: newTableCapacity,
      }),
    });
    if (res.ok) {
      setNewTableName('');
      await fetchWeddingBundle(wedding.id);
      showNotification('נוסף שולחן חדש לסידור ההושבה');
    }
  };

  const handleCheckInToggle = async (guest: Guest) => {
    if (!wedding) return;
    const nextState = !guest.invitation.checkedIn;
    await fetch('/api/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guestId: guest.id,
        checkedIn: nextState,
      }),
    });
    await fetchWeddingBundle(wedding.id);
    showNotification(
      nextState
        ? `${guest.fullName} סומנו כנכנסו לאולם (${guest.tableName || 'ללא שולחן'})`
        : `בוטל צ׳ק-אין עבור ${guest.fullName}`
    );
  };

  const handleSendWhatsApp = async (
    guest: Guest,
    channel: 'WHATSAPP_LINK' | 'WHATSAPP_API' = 'WHATSAPP_LINK'
  ) => {
    if (!wedding) return;
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const { renderedMessage, whatsappUrl } = buildWhatsAppInvitationLink({
      template: customTemplate,
      wedding,
      guest,
      baseUrl,
    });

    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        weddingId: wedding.id,
        guestId: guest.id,
        campaignType,
        channel,
        renderedMessage,
      }),
    });

    if (channel === 'WHATSAPP_LINK' && typeof window !== 'undefined') {
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    }

    await fetchWeddingBundle(wedding.id);
  };

  const handleBatchWhatsAppApi = async (targetGuests: Guest[]) => {
    if (!wedding || targetGuests.length === 0) return;
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

    for (const guest of targetGuests) {
      const { renderedMessage } = buildWhatsAppInvitationLink({
        template: customTemplate,
        wedding,
        guest,
        baseUrl,
      });
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weddingId: wedding.id,
          guestId: guest.id,
          campaignType,
          channel: 'WHATSAPP_API',
          renderedMessage,
        }),
      });
    }
    await fetchWeddingBundle(wedding.id);
    showNotification(`נשלחו ${targetGuests.length} הודעות דרך WhatsApp Business API!`);
  };

  const handleExportSeatingCsv = () => {
    if (!wedding) return;
    const header = 'Guest Name,Phone,RSVP Status,Confirmed Seats,Table Assigned,Dietary Notes\n';
    const rows = guests
      .map(
        (g) =>
          `"${g.fullName}","${g.phoneE164}","${g.invitation.rsvpStatus}",${
            g.invitation.confirmedAdults + g.invitation.confirmedChildren
          },"${g.tableName || 'Unassigned'}","${g.invitation.guestDietaryNotes || ''}"`
      )
      .join('\n');
    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${wedding.slug}-seating-and-rsvp.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading && !wedding) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50 text-stone-600">
        <div className="flex items-center gap-3 text-sm font-medium">
          <Sparkles className="h-5 w-5 animate-spin text-amber-600" />
          טוען מערכת ניהול חתונות...
        </div>
      </div>
    );
  }

  if (apiError && !wedding) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-100 p-6">
        <div className="max-w-md rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-lg">
          <h2 className="text-lg font-bold text-rose-700">Backend Connection Error</h2>
          <p className="mt-2 text-xs leading-relaxed text-stone-600">{apiError}</p>
          <button
            type="button"
            onClick={() => fetchWeddingBundle()}
            className="mt-4 rounded-xl bg-amber-700 px-4 py-2 text-xs font-bold text-white hover:bg-amber-800"
          >
            נסה שוב (Retry)
          </button>
        </div>
      </div>
    );
  }

  if (!wedding || !statistics) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-stone-100 p-6">
        <form
          onSubmit={handleCreateWedding}
          className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-8 shadow-lg space-y-3 text-xs"
        >
          <div className="text-center">
            <Heart className="mx-auto h-10 w-10 text-amber-600" />
            <h2 className="mt-2 text-xl font-bold text-stone-900">
              פתיחת חתונה חדשה ב-PostgreSQL
            </h2>
            <p className="mt-1 text-xs text-stone-500">
              מסד הנתונים מחובר ומוכן. מלאו את פרטי הזוג כדי ליצור את האירוע הראשון.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="font-medium text-stone-600">שם בן/בת זוג 1</label>
              <input
                type="text"
                required
                value={nwPartner1}
                onChange={(e) => setNwPartner1(e.target.value)}
                placeholder="למשל: דנה"
                className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2"
              />
            </div>
            <div>
              <label className="font-medium text-stone-600">שם בן/בת זוג 2</label>
              <input
                type="text"
                required
                value={nwPartner2}
                onChange={(e) => setNwPartner2(e.target.value)}
                placeholder="למשל: עומר"
                className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2"
              />
            </div>
          </div>
          <div>
            <label className="font-medium text-stone-600">תאריך החתונה</label>
            <input
              type="date"
              required
              value={nwDate}
              onChange={(e) => setNwDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2"
            />
          </div>
          <div>
            <label className="font-medium text-stone-600">שם האולם / גן האירועים</label>
            <input
              type="text"
              required
              value={nwVenue}
              onChange={(e) => setNwVenue(e.target.value)}
              placeholder="למשל: עלמה - אבן יהודה"
              className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2"
            />
          </div>
          <button
            type="submit"
            className="mt-4 w-full rounded-xl bg-amber-700 py-3 font-bold text-white hover:bg-amber-800"
          >
            + צור חתונה ושמור ב-PostgreSQL
          </button>
        </form>
      </div>
    );
  }

  const sampleGuest = guests[0] || {
    id: 'preview-guest',
    weddingId: wedding.id,
    groupId: 'preview',
    groupName: 'Family & Friends',
    side: 'BOTH',
    fullName: 'אורח לדוגמה (תצוגה מקדימה)',
    phoneE164: '+972500000000',
    maxInvitedCount: 3,
    notes: '',
    createdAt: new Date().toISOString(),
    tableName: 'שולחן 1',
    invitation: {
      id: 'inv-preview',
      guestId: 'preview-guest',
      tokenHash: 'preview',
      shortCode: 'preview',
      deliveryStatus: 'OPENED',
      rsvpStatus: 'ATTENDING',
      confirmedAdults: 2,
      confirmedChildren: 0,
      mealPreferences: { regular: 2, vegetarian: 0, vegan: 0, kids: 0, glatt: 0 },
      guestDietaryNotes: '',
      checkedIn: false,
      checkedInCount: 0,
    },
  };

  const whatsappCandidates = guests.filter((g) =>
    waFilterStatus === 'PENDING' ? g.invitation.rsvpStatus === 'PENDING' : true
  );

  const checkinFilteredGuests = guests.filter((g) => {
    if (!checkinQuery.trim()) return true;
    const q = checkinQuery.toLowerCase().replace('wedding_checkin:', '');
    return (
      g.fullName.toLowerCase().includes(q) ||
      g.phoneE164.includes(q) ||
      g.invitation.shortCode.toLowerCase().includes(q) ||
      (g.tableName && g.tableName.toLowerCase().includes(q))
    );
  });

  const totalGiftsReported = greetings.reduce(
    (sum, gr) => sum + (Number(gr.giftAmountReported) || 0),
    0
  );

  return (
    <div dir={dict.dir} className="min-h-screen bg-stone-100 text-stone-900">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-2xl bg-stone-900 px-5 py-3 text-xs font-semibold text-white shadow-xl">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          {toast}
        </div>
      )}

      {/* Top Multi-Wedding Header Bar */}
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-600 to-amber-800 text-white shadow-sm">
              <Heart className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-wider uppercase text-amber-700">
                  Wedding Platform SaaS
                </span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                  Multi-Tenant
                </span>
              </div>

              {/* Multi-Wedding Switcher */}
              <div className="mt-0.5 flex items-center gap-2">
                <select
                  aria-label="Select active wedding"
                  value={wedding.id}
                  onChange={(e) => fetchWeddingBundle(e.target.value)}
                  className="rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1 text-sm font-bold text-stone-900 focus:outline-none"
                >
                  {allWeddings.map((w) => (
                    <option key={w.id} value={w.id}>
                      💍 {w.partner1Name} &amp; {w.partner2Name} ({w.venueName})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewWeddingModal(true)}
                  className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900 transition hover:bg-amber-100"
                >
                  {dict.nav.newWedding}
                </button>
              </div>
            </div>
          </div>

          {/* Right Header Controls: Live Guest Link & RTL/LTR Language Selector */}
          <div className="flex items-center gap-2.5">
            {guests[0] && (
              <Link
                href={`/i/${guests[0].invitation.shortCode}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-stone-800"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {dict.nav.previewInvitation}
              </Link>
            )}

            <div className="flex items-center gap-1 rounded-xl border border-stone-200 bg-stone-50 p-1 text-xs">
              <Globe className="mx-1.5 h-3.5 w-3.5 text-stone-500" />
              {(['he', 'en'] as Locale[]).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setUiLocale(lang)}
                  className={`rounded-lg px-2.5 py-1 font-medium transition ${
                    uiLocale === lang
                      ? 'bg-white font-bold text-amber-800 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {DICTIONARIES[lang].langName}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mx-auto max-w-7xl overflow-x-auto px-4 sm:px-6">
          <nav className="flex gap-1 border-t border-stone-100 pt-2">
            {(
              [
                { id: 'overview', label: dict.nav.overview, icon: BarChart3 },
                { id: 'guests', label: `${dict.nav.guests} (${guests.length})`, icon: Users },
                { id: 'studio', label: dict.nav.studio, icon: Palette },
                { id: 'whatsapp', label: dict.nav.whatsapp, icon: MessageCircle },
                { id: 'seating', label: `${dict.nav.seating} (${tables.length})`, icon: LayoutGrid },
                { id: 'checkin', label: dict.nav.checkin, icon: QrCode },
                { id: 'greetings', label: `${dict.nav.greetings} (${greetings.length})`, icon: Gift },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
                    isActive
                      ? 'border-amber-700 text-amber-800 bg-amber-50/50'
                      : 'border-transparent text-stone-600 hover:border-stone-300 hover:text-stone-900'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* TAB 1: OVERVIEW & ANALYTICS */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Hero Wedding Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-stone-900 p-6 text-white shadow-lg sm:p-8">
              <img
                src={wedding.themeConfig.coverImageUrl}
                alt={wedding.venueName}
                className="absolute inset-0 h-full w-full object-cover opacity-30"
              />
              <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-semibold text-amber-300">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(wedding.eventDate).toLocaleDateString('he-IL', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}{' '}
                    • {wedding.receptionTime}
                  </span>
                  <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
                    {wedding.partner1Name} &amp; {wedding.partner2Name}
                  </h1>
                  <p className="mt-1 text-sm text-stone-300">
                    📍 {wedding.venueName} — {wedding.venueAddress}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={() => setActiveTab('guests')}
                    className="rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-stone-950 shadow-sm hover:bg-amber-400"
                  >
                    + הוספת / ייבוא מוזמנים
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('whatsapp')}
                    className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-500"
                  >
                    שליחת הזמנות בוואטסאפ
                  </button>
                </div>
              </div>
            </div>

            {/* 6 KPI Stat Cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-xs">
                <div className="text-xs font-medium text-stone-500">סה״כ מוזמנים</div>
                <div className="mt-1 text-2xl font-bold text-stone-900">
                  {statistics.totalInvitedPeople}
                </div>
                <div className="mt-1 text-[11px] text-stone-500">
                  ב-{statistics.totalHouseholds} בתי אב / הזמנות
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-xs">
                <div className="text-xs font-medium text-emerald-800">אישרו הגעה (מגיעים)</div>
                <div className="mt-1 text-2xl font-bold text-emerald-700">
                  {statistics.totalConfirmedPeople}
                </div>
                <div className="mt-1 text-[11px] text-emerald-700">
                  {statistics.confirmedAdults} מבוגרים + {statistics.confirmedChildren} ילדים
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-xs">
                <div className="text-xs font-medium text-amber-800">ממתינים למענה / אולי</div>
                <div className="mt-1 text-2xl font-bold text-amber-700">
                  {statistics.pendingHouseholds + statistics.maybeHouseholds}
                </div>
                <div className="mt-1 text-[11px] text-amber-700">
                  {statistics.declinedHouseholds} הודיעו שלא יגיעו
                </div>
              </div>

              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 shadow-xs">
                <div className="text-xs font-medium text-indigo-800">משובצים לשולחנות</div>
                <div className="mt-1 text-2xl font-bold text-indigo-700">
                  {statistics.seatedPeople} / {statistics.totalConfirmedPeople}
                </div>
                <div className="mt-1 text-[11px] text-indigo-700">
                  {statistics.unseatedConfirmedPeople} ממתינים לשיבוץ
                </div>
              </div>

              <div className="rounded-2xl border border-sky-200 bg-sky-50/50 p-4 shadow-xs">
                <div className="text-xs font-medium text-sky-800">צ׳ק-אין ביום האירוע</div>
                <div className="mt-1 text-2xl font-bold text-sky-700">
                  {statistics.checkedInPeople}
                </div>
                <div className="mt-1 text-[11px] text-sky-700">
                  {statistics.checkedInHouseholds} הזמנות נכנסו לאולם
                </div>
              </div>

              <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 shadow-xs">
                <div className="text-xs font-medium text-rose-800">מתנות וברכות שדווחו</div>
                <div className="mt-1 text-2xl font-bold text-rose-700">
                  ₪{totalGiftsReported.toLocaleString()}
                </div>
                <div className="mt-1 text-[11px] text-rose-700">
                  {greetings.length} ברכות בקיר הזוג
                </div>
              </div>
            </div>

            {/* Breakdown Cards: Side, Meals, and WhatsApp Delivery Funnel */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Side Breakdown */}
              <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
                <h3 className="flex items-center gap-2 text-sm font-bold text-stone-900">
                  <Users className="h-4 w-4 text-amber-600" />
                  התפלגות לפי צדדים
                </h3>
                <div className="mt-4 space-y-3 text-xs">
                  {(
                    [
                      { key: 'PARTNER_1', label: `צד ${wedding.partner1Name}` },
                      { key: 'PARTNER_2', label: `צד ${wedding.partner2Name}` },
                      { key: 'BOTH', label: 'מוזמנים משותפים' },
                    ] as const
                  ).map((row) => {
                    const stats = statistics.sideBreakdown[row.key];
                    const pct =
                      stats.invited > 0 ? Math.round((stats.confirmed / stats.invited) * 100) : 0;
                    return (
                      <div key={row.key} className="space-y-1">
                        <div className="flex justify-between font-medium">
                          <span>{row.label}</span>
                          <span>
                            <strong>{stats.confirmed}</strong> מאושרים מתוך {stats.invited} ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100">
                          <div
                            className="h-full rounded-full bg-amber-600"
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Meal Preferences Summary */}
              <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
                <h3 className="flex items-center gap-2 text-sm font-bold text-stone-900">
                  <Utensils className="h-4 w-4 text-emerald-600" />
                  סיכום העדפות מנות (לאולם / קייטרינג)
                </h3>
                <div className="mt-4 grid grid-cols-2 gap-2.5 text-xs">
                  {(
                    [
                      { key: 'regular', label: 'מנה רגילה' },
                      { key: 'vegetarian', label: 'צמחוני' },
                      { key: 'vegan', label: 'טבעוני 🌱' },
                      { key: 'kids', label: 'מנות ילדים' },
                      { key: 'glatt', label: 'גלאט כשר' },
                    ] as const
                  ).map((m) => (
                    <div
                      key={m.key}
                      className="flex items-center justify-between rounded-xl bg-stone-50 px-3 py-2.5"
                    >
                      <span className="text-stone-600">{m.label}</span>
                      <span className="text-sm font-bold text-stone-900">
                        {statistics.mealTotals[m.key]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* WhatsApp Delivery Funnel */}
              <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
                <h3 className="flex items-center gap-2 text-sm font-bold text-stone-900">
                  <MessageCircle className="h-4 w-4 text-sky-600" />
                  סטטוס שליחה ופתיחת הזמנות בוואטסאפ
                </h3>
                <div className="mt-4 grid grid-cols-2 gap-2.5 text-xs">
                  <div className="rounded-xl bg-stone-50 p-3">
                    <div className="text-stone-500">טרם נשלחו</div>
                    <div className="mt-1 text-lg font-bold text-stone-800">
                      {statistics.deliveryBreakdown.NOT_SENT}
                    </div>
                  </div>
                  <div className="rounded-xl bg-sky-50 p-3">
                    <div className="text-sky-700">נשלחו / נמסרו</div>
                    <div className="mt-1 text-lg font-bold text-sky-900">
                      {statistics.deliveryBreakdown.SENT + statistics.deliveryBreakdown.DELIVERED}
                    </div>
                  </div>
                  <div className="col-span-2 rounded-xl bg-emerald-50 p-3 flex items-center justify-between">
                    <div>
                      <div className="text-emerald-800 font-medium">פתחו את ההזמנה הדיגיטלית</div>
                      <div className="text-[11px] text-emerald-600">
                        מעקב בזמן אמת אחר כניסת אורחים לקישור האישי
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-emerald-700">
                      {statistics.deliveryBreakdown.OPENED}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: GUEST LIST & CSV IMPORT */}
        {activeTab === 'guests' && (
          <div className="space-y-6">
            {/* Add Guest Form + CSV Import Button */}
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-base font-bold">
                  <UserPlus className="h-5 w-5 text-amber-700" />
                  הוספת מוזמן חדש וניהול רשימות
                </h2>
                <button
                  type="button"
                  onClick={() => setShowCsvModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-600 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  ייבוא מהיר מ-Excel / CSV
                </button>
              </div>

              <form onSubmit={handleAddGuest} className="grid gap-3 sm:grid-cols-6">
                <input
                  type="text"
                  required
                  value={newGuestName}
                  onChange={(e) => setNewGuestName(e.target.value)}
                  placeholder="שם מלא (למשל: משפחת כהן)"
                  className="rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-xs sm:col-span-2"
                />
                <input
                  type="text"
                  required
                  value={newGuestPhone}
                  onChange={(e) => setNewGuestPhone(e.target.value)}
                  placeholder="טלפון נייד (054-0000000)"
                  className="rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-xs"
                />
                <input
                  type="text"
                  value={newGuestGroup}
                  onChange={(e) => setNewGuestGroup(e.target.value)}
                  placeholder="קבוצה (משפחה, עבודה...)"
                  className="rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-xs"
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={newGuestMax}
                    onChange={(e) => setNewGuestMax(Number(e.target.value) || 1)}
                    title="כמות מוזמנים מקסימלית"
                    className="w-16 rounded-xl border border-stone-200 bg-stone-50 px-2.5 py-2 text-center text-xs font-bold"
                  />
                  <select
                    value={newGuestSide}
                    onChange={(e) => setNewGuestSide(e.target.value as WeddingSide)}
                    className="flex-1 rounded-xl border border-stone-200 bg-stone-50 px-2 py-2 text-xs"
                  >
                    <option value="PARTNER_1">צד {wedding.partner1Name}</option>
                    <option value="PARTNER_2">צד {wedding.partner2Name}</option>
                    <option value="BOTH">משותף</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-800"
                >
                  + הוסף מוזמן
                </button>
              </form>
            </div>

            {/* Search & Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-xs">
              <div className="relative flex-1 min-w-[240px]">
                <Search className=" absolute top-2.5 right-3 h-4 w-4 text-stone-400" />
                <input
                  type="text"
                  value={guestSearch}
                  onChange={(e) => setGuestSearch(e.target.value)}
                  placeholder="חיפוש לפי שם, טלפון, קבוצה או קוד הזמנה..."
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2 pr-9 pl-3 text-xs"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <select
                  value={rsvpFilter}
                  onChange={(e) => setRsvpFilter(e.target.value as RsvpStatus | 'ALL')}
                  className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2"
                >
                  <option value="ALL">כל סטטוסי ההגעה</option>
                  <option value="ATTENDING">מגיעים בלבד 🎉</option>
                  <option value="PENDING">ממתינים למענה ⏳</option>
                  <option value="MAYBE">אולי 🤔</option>
                  <option value="DECLINED">לא מגיעים 💔</option>
                </select>

                <select
                  value={sideFilter}
                  onChange={(e) => setSideFilter(e.target.value as WeddingSide | 'ALL')}
                  className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2"
                >
                  <option value="ALL">כל הצדדים</option>
                  <option value="PARTNER_1">צד {wedding.partner1Name}</option>
                  <option value="PARTNER_2">צד {wedding.partner2Name}</option>
                  <option value="BOTH">משותף</option>
                </select>
              </div>
            </div>

            {/* High-Density Guest Table */}
            <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="border-b border-stone-200 bg-stone-50 text-stone-600">
                    <tr>
                      <th className="px-4 py-3 font-bold">שם המוזמן</th>
                      <th className="px-4 py-3 font-bold">טלפון (E.164)</th>
                      <th className="px-4 py-3 font-bold">קבוצה / צד</th>
                      <th className="px-4 py-3 font-bold">סטטוס RSVP</th>
                      <th className="px-4 py-3 font-bold">כמות מאושרת</th>
                      <th className="px-4 py-3 font-bold">שולחן</th>
                      <th className="px-4 py-3 font-bold">קישור אישי ופעולות</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredGuests.map((g) => {
                      const confirmedCount =
                        g.invitation.confirmedAdults + g.invitation.confirmedChildren;
                      return (
                        <tr key={g.id} className="hover:bg-stone-50/80">
                          <td className="px-4 py-3">
                            <div className="font-bold text-stone-900">{g.fullName}</div>
                            {g.invitation.guestDietaryNotes && (
                              <div className="mt-0.5 text-[11px] text-amber-700">
                                🍽️ {g.invitation.guestDietaryNotes}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono text-stone-600">{g.phoneE164}</td>
                          <td className="px-4 py-3">
                            <span className="inline-block rounded-lg bg-stone-100 px-2 py-0.5 font-medium text-stone-700">
                              {g.groupName}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                                g.invitation.rsvpStatus === 'ATTENDING'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : g.invitation.rsvpStatus === 'DECLINED'
                                    ? 'bg-rose-100 text-rose-800'
                                    : g.invitation.rsvpStatus === 'MAYBE'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-stone-100 text-stone-600'
                              }`}
                            >
                              {g.invitation.rsvpStatus === 'ATTENDING'
                                ? 'מגיעים 🎉'
                                : g.invitation.rsvpStatus === 'DECLINED'
                                  ? 'לא מגיעים'
                                  : g.invitation.rsvpStatus === 'MAYBE'
                                    ? 'אולי 🤔'
                                    : 'ממתין למענה'}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-bold">
                            {g.invitation.rsvpStatus === 'ATTENDING'
                              ? `${confirmedCount} מתוך ${g.maxInvitedCount}`
                              : `עד ${g.maxInvitedCount}`}
                          </td>
                          <td className="px-4 py-3">
                            {g.tableName ? (
                              <span className="rounded-lg bg-indigo-50 px-2 py-1 font-semibold text-indigo-800">
                                {g.tableName}
                              </span>
                            ) : (
                              <span className="text-stone-400">לא שובץ</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleSendWhatsApp(g, 'WHATSAPP_LINK')}
                                title="שליחת הזמנה בוואטסאפ"
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700"
                              >
                                <Send className="h-3 w-3" />
                                WhatsApp
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const link = `${window.location.origin}/i/${g.invitation.shortCode}`;
                                  navigator.clipboard?.writeText(link);
                                  showNotification(`הועתק קישור הזמנה: ${link}`);
                                }}
                                title="העתק קישור אישי"
                                className="rounded-lg border border-stone-200 bg-white p-1.5 text-stone-700 hover:bg-stone-100"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                              <Link
                                href={`/i/${g.invitation.shortCode}`}
                                target="_blank"
                                title="פתיחת ההזמנה של האורח"
                                className="rounded-lg border border-stone-200 bg-white p-1.5 text-stone-700 hover:bg-stone-100"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleDeleteGuest(g.id)}
                                title="מחיקת מוזמן"
                                className="rounded-lg border border-rose-200 bg-rose-50 p-1.5 text-rose-600 hover:bg-rose-100"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: VISUAL INVITATION STUDIO (THEME BUILDER) */}
        {activeTab === 'studio' && (
          <div className="grid gap-8 lg:grid-cols-12">
            {/* Left Panel: Theme & Wedding Customizer */}
            <div className="space-y-5 lg:col-span-6">
              <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
                <h2 className="flex items-center gap-2 text-base font-bold">
                  <Palette className="h-5 w-5 text-amber-700" />
                  בחירת תבנית עיצוב (Templates)
                </h2>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {(Object.keys(TEMPLATE_PRESETS) as InvitationTemplateId[]).map((tplId) => {
                    const preset = TEMPLATE_PRESETS[tplId];
                    const active = wedding.themeConfig.templateId === tplId;
                    return (
                      <button
                        key={tplId}
                        type="button"
                        onClick={() =>
                          setWedding({
                            ...wedding,
                            themeConfig: {
                              ...wedding.themeConfig,
                              templateId: tplId,
                              primaryColor: preset.primaryColor,
                              accentColor: preset.accentColor,
                              backgroundColor: preset.backgroundColor,
                              coverImageUrl: preset.coverImageUrl,
                            },
                          })
                        }
                        className={`flex items-center justify-between rounded-xl border p-3 text-right text-xs font-bold transition ${
                          active
                            ? 'border-amber-600 bg-amber-50/70 ring-2 ring-amber-500/30'
                            : 'border-stone-200 bg-stone-50 hover:bg-stone-100'
                        }`}
                      >
                        <span>{preset.name}</span>
                        <span className="flex gap-1">
                          <span
                            className="h-4 w-4 rounded-full border border-black/10"
                            style={{ backgroundColor: preset.primaryColor }}
                          />
                          <span
                            className="h-4 w-4 rounded-full border border-black/10"
                            style={{ backgroundColor: preset.accentColor }}
                          />
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Color & Typography Pickers */}
                <div className="mt-5 grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block font-medium text-stone-600">צבע ראשי</label>
                    <input
                      type="color"
                      value={wedding.themeConfig.primaryColor}
                      onChange={(e) =>
                        setWedding({
                          ...wedding,
                          themeConfig: { ...wedding.themeConfig, primaryColor: e.target.value },
                        })
                      }
                      className="mt-1 h-9 w-full cursor-pointer rounded-lg border border-stone-200"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-stone-600">צבע הדגשה</label>
                    <input
                      type="color"
                      value={wedding.themeConfig.accentColor}
                      onChange={(e) =>
                        setWedding({
                          ...wedding,
                          themeConfig: { ...wedding.themeConfig, accentColor: e.target.value },
                        })
                      }
                      className="mt-1 h-9 w-full cursor-pointer rounded-lg border border-stone-200"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-stone-600">שפת ברירת מחדל</label>
                    <select
                      value={wedding.defaultLocale}
                      onChange={(e) =>
                        setWedding({ ...wedding, defaultLocale: e.target.value as Locale })
                      }
                      className="mt-1 h-9 w-full rounded-lg border border-stone-200 bg-stone-50 px-2"
                    >
                      <option value="he">עברית (RTL)</option>
                      <option value="en">English (RTL)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Event Details & Texts */}
              <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-3 text-xs">
                <h3 className="text-sm font-bold">פרטי החתונה וטקסטים בהזמנה</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-medium text-stone-600">שם בן/בת זוג 1</label>
                    <input
                      type="text"
                      value={wedding.partner1Name}
                      onChange={(e) => setWedding({ ...wedding, partner1Name: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-stone-600">שם בן/בת זוג 2</label>
                    <input
                      type="text"
                      value={wedding.partner2Name}
                      onChange={(e) => setWedding({ ...wedding, partner2Name: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-medium text-stone-600">שעת קבלת פנים</label>
                    <input
                      type="text"
                      value={wedding.receptionTime}
                      onChange={(e) => setWedding({ ...wedding, receptionTime: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-stone-600">שעת חופה</label>
                    <input
                      type="text"
                      value={wedding.ceremonyTime}
                      onChange={(e) => setWedding({ ...wedding, ceremonyTime: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-medium text-stone-600">שם האולם / גן האירועים</label>
                  <input
                    type="text"
                    value={wedding.venueName}
                    onChange={(e) => setWedding({ ...wedding, venueName: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="font-medium text-stone-600">תמונת נושא (URL)</label>
                  <input
                    type="text"
                    value={wedding.themeConfig.coverImageUrl}
                    onChange={(e) =>
                      setWedding({
                        ...wedding,
                        themeConfig: { ...wedding.themeConfig, coverImageUrl: e.target.value },
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="font-medium text-stone-600">משפט פתיחה אישי לזוג</label>
                  <textarea
                    rows={2}
                    value={wedding.themeConfig.customInvitationMessage}
                    onChange={(e) =>
                      setWedding({
                        ...wedding,
                        themeConfig: {
                          ...wedding.themeConfig,
                          customInvitationMessage: e.target.value,
                        },
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-stone-200 bg-stone-50 p-2.5"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="font-medium text-stone-600">קישור מתנה ב-Bit</label>
                    <input
                      type="text"
                      value={wedding.giftConfig.bitUrl}
                      onChange={(e) =>
                        setWedding({
                          ...wedding,
                          giftConfig: { ...wedding.giftConfig, bitUrl: e.target.value },
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-stone-600">קישור מתנה ב-PayBox</label>
                    <input
                      type="text"
                      value={wedding.giftConfig.payboxUrl}
                      onChange={(e) =>
                        setWedding({
                          ...wedding,
                          giftConfig: { ...wedding.giftConfig, payboxUrl: e.target.value },
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSaveWeddingSettings}
                  className="mt-4 w-full rounded-xl bg-amber-700 py-3 text-sm font-bold text-white shadow-sm hover:bg-amber-800"
                >
                  שמירת שינויים ועדכון הזמנות חיות
                </button>
              </div>
            </div>

            {/* Right Panel: Live Mobile Invitation Preview */}
            <div className="lg:col-span-6 flex flex-col items-center">
              <div className="mb-3 flex items-center gap-2 text-xs font-bold text-stone-600">
                <Sparkles className="h-4 w-4 text-amber-600" />
                תצוגה מקדימה חיה בנייד (Live Mobile Preview)
              </div>
              <div className="h-[760px] w-full max-w-[410px] overflow-y-auto rounded-[40px] border-[10px] border-stone-900 bg-white shadow-2xl">
                <GuestInvitationView
                  wedding={wedding}
                  guest={sampleGuest}
                  greetings={greetings}
                  isPreview
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: WHATSAPP & AUTOMATION CAMPAIGN CENTER */}
        {activeTab === 'whatsapp' && (
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="space-y-5 lg:col-span-5">
              <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
                <h2 className="flex items-center gap-2 text-base font-bold">
                  <MessageCircle className="h-5 w-5 text-emerald-600" />
                  מרכז שליחת הודעות וואטסאפ ואוטומציה
                </h2>
                <p className="mt-1 text-xs text-stone-500">
                  בחרו סוג קמפיין, ערכו את תבנית ההודעה ושלחו בלחיצה או דרך ה-API הרשמי.
                </p>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  {(
                    [
                      { id: 'SAVE_THE_DATE', label: '1. Save the Date' },
                      { id: 'INITIAL_INVITATION', label: '2. הזמנה רשמית + קישור' },
                      { id: 'RSVP_REMINDER', label: '3. תזכורת לממתינים' },
                      { id: 'DAY_OF_TABLE', label: '4. ביום האירוע + מספר שולחן' },
                      { id: 'THANK_YOU', label: '5. תודה שהשתתפתם ❤️' },
                    ] as const
                  ).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCampaignType(c.id)}
                      className={`rounded-xl border px-3 py-2.5 text-right font-semibold transition ${
                        campaignType === c.id
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                          : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>

                <div className="mt-4">
                  <label className="block text-xs font-bold text-stone-700">
                    תבנית ההודעה (כולל משתנים דינמיים):
                  </label>
                  <textarea
                    rows={4}
                    value={customTemplate}
                    onChange={(e) => setCustomTemplate(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs leading-relaxed"
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                    {[
                      '{{guest_name}}',
                      '{{couple_names}}',
                      '{{event_date}}',
                      '{{venue_name}}',
                      '{{rsvp_link}}',
                      '{{table_number}}',
                    ].map((variable) => (
                      <button
                        key={variable}
                        type="button"
                        onClick={() => setCustomTemplate((prev) => `${prev} ${variable}`)}
                        className="rounded-md bg-stone-200/80 px-2 py-0.5 font-mono text-stone-700 hover:bg-stone-300"
                      >
                        {variable}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-5 border-t border-stone-100 pt-4">
                  <button
                    type="button"
                    onClick={() => handleBatchWhatsAppApi(whatsappCandidates)}
                    className="w-full rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
                  >
                    🚀 שליחה אוטומטית מרוכזת ({whatsappCandidates.length} נמענים) — WhatsApp Cloud API
                  </button>
                </div>
              </div>
            </div>

            {/* Recipient Queue */}
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs lg:col-span-7">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-bold">תור הודעות מותאמות אישית לאורחים</h3>
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setWaFilterStatus('ALL')}
                    className={`rounded-lg px-3 py-1 font-semibold ${
                      waFilterStatus === 'ALL'
                        ? 'bg-stone-900 text-white'
                        : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    כל האורחים ({guests.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setWaFilterStatus('PENDING')}
                    className={`rounded-lg px-3 py-1 font-semibold ${
                      waFilterStatus === 'PENDING'
                        ? 'bg-amber-600 text-white'
                        : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    טרם ענו בלבד ({guests.filter((g) => g.invitation.rsvpStatus === 'PENDING').length})
                  </button>
                </div>
              </div>

              <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1">
                {whatsappCandidates.map((g) => {
                  const baseUrl =
                    typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
                  const { renderedMessage } = buildWhatsAppInvitationLink({
                    template: customTemplate,
                    wedding,
                    guest: g,
                    baseUrl,
                  });
                  return (
                    <div
                      key={g.id}
                      className="rounded-xl border border-stone-200 bg-stone-50/70 p-3.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-stone-900">{g.fullName}</span>
                          <span className="mx-2 font-mono text-stone-500">{g.phoneE164}</span>
                          <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[10px] font-semibold">
                            {g.invitation.deliveryStatus}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSendWhatsApp(g, 'WHATSAPP_LINK')}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 font-bold text-white shadow-xs hover:bg-emerald-700"
                        >
                          <Send className="h-3.5 w-3.5" />
                          פתיחה ושליחה בוואטסאפ
                        </button>
                      </div>
                      <p className="mt-2 rounded-lg bg-white p-2.5 text-stone-600 border border-stone-200/60">
                        {renderedMessage}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: INTERACTIVE SEATING CHART & TABLE MANAGEMENT */}
        {activeTab === 'seating' && (
          <div className="space-y-6">
            {/* Top Bar: Create Table + Export Venue CSV */}
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="flex items-center gap-2 text-base font-bold">
                    <LayoutGrid className="h-5 w-5 text-indigo-600" />
                    סידורי הושבה וניהול שולחנות
                  </h2>
                  <p className="text-xs text-stone-500">
                    שייכו אורחים שאישרו הגעה לשולחנות ובדקו תפוסה בזמן אמת לפני העברה למנהל האירוע.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportSeatingCsv}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-bold text-white hover:bg-stone-800"
                >
                  <Download className="h-4 w-4" />
                  ייצוא דוח הושבה ומנות לאולם (CSV)
                </button>
              </div>

              <form onSubmit={handleCreateTable} className="grid gap-3 sm:grid-cols-5">
                <input
                  type="text"
                  required
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  placeholder="שם/מספר שולחן (למשל: שולחן 5 - חברים)"
                  className="rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-xs sm:col-span-2"
                />
                <input
                  type="text"
                  value={newTableCategory}
                  onChange={(e) => setNewTableCategory(e.target.value)}
                  placeholder="קטגוריה"
                  className="rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-xs"
                />
                <div className="flex gap-2">
                  <select
                    value={newTableShape}
                    onChange={(e) =>
                      setNewTableShape(e.target.value as 'ROUND' | 'RECTANGLE' | 'SQUARE')
                    }
                    className="flex-1 rounded-xl border border-stone-200 bg-stone-50 px-2.5 py-2 text-xs"
                  >
                    <option value="ROUND">שולחן עגול</option>
                    <option value="RECTANGLE">שולחן אבירים (מלבני)</option>
                    <option value="SQUARE">שולחן מרובע</option>
                  </select>
                  <input
                    type="number"
                    min={2}
                    max={30}
                    value={newTableCapacity}
                    onChange={(e) => setNewTableCapacity(Number(e.target.value) || 12)}
                    className="w-16 rounded-xl border border-stone-200 bg-stone-50 px-2 py-2 text-center text-xs font-bold"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
                >
                  + הוסף שולחן
                </button>
              </form>

              {seatingError && (
                <div className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                  ⚠️ {seatingError}
                </div>
              )}
            </div>

            <div className="grid gap-6 lg:grid-cols-12">
              {/* Left Sidebar: Unseated Guests Queue */}
              <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs lg:col-span-4">
                <h3 className="text-sm font-bold text-stone-900">
                  אורחים הממתינים לשיבוץ שולחן ({guests.filter((g) => !g.tableId && g.invitation.rsvpStatus !== 'DECLINED').length})
                </h3>
                <div className="mt-3 space-y-2.5 max-h-[520px] overflow-y-auto">
                  {guests
                    .filter((g) => !g.tableId && g.invitation.rsvpStatus !== 'DECLINED')
                    .map((g) => {
                      const seats =
                        g.invitation.rsvpStatus === 'ATTENDING'
                          ? g.invitation.confirmedAdults + g.invitation.confirmedChildren
                          : g.maxInvitedCount;
                      return (
                        <div
                          key={g.id}
                          className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs"
                        >
                          <div className="flex items-center justify-between font-bold">
                            <span>{g.fullName}</span>
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-900">
                              {seats} מקומות
                            </span>
                          </div>
                          <div className="mt-1 text-[11px] text-stone-500">{g.groupName}</div>
                          <select
                            aria-label={`Assign ${g.fullName} to table`}
                            value={g.tableId || ''}
                            onChange={(e) => handleAssignTable(g.id, e.target.value || null)}
                            className="mt-2 w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium"
                          >
                            <option value="">בחרו שולחן לשיבוץ...</option>
                            {tables.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.tableNumber} (קיבולת {t.capacity})
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Right Canvas: Visual Table Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:col-span-8">
                {tables.map((table) => {
                  const tableAssignments = assignments.filter((a) => a.tableId === table.id);
                  const occupiedSeats = tableAssignments.reduce(
                    (sum, a) => sum + a.seatsAllocated,
                    0
                  );
                  const pct = Math.min(100, Math.round((occupiedSeats / table.capacity) * 100));
                  const seatedGuests = guests.filter((g) => g.tableId === table.id);

                  return (
                    <div
                      key={table.id}
                      className="flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-5 shadow-xs"
                    >
                      <div>
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="inline-block rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                              {table.tableShape === 'ROUND'
                                ? '⭕ שולחן עגול'
                                : table.tableShape === 'RECTANGLE'
                                  ? '▭ שולחן אבירים'
                                  : '⬜ שולחן מרובע'}
                            </span>
                            <h4 className="mt-1 text-sm font-bold text-stone-900">
                              {table.tableNumber}
                            </h4>
                          </div>
                          <span
                            className={`rounded-xl px-2.5 py-1 text-xs font-bold ${
                              occupiedSeats >= table.capacity
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-stone-100 text-stone-800'
                            }`}
                          >
                            {occupiedSeats} / {table.capacity} מושבים
                          </span>
                        </div>

                        {/* Capacity Bar */}
                        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-stone-100">
                          <div
                            className="h-full rounded-full bg-indigo-600 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>

                        {/* Seated Guests List */}
                        <div className="mt-4 space-y-2">
                          {seatedGuests.length === 0 ? (
                            <p className="py-4 text-center text-xs text-stone-400">
                              השולחן פנוי — בחרו אורחים מהרשימה לשיבוץ
                            </p>
                          ) : (
                            seatedGuests.map((sg) => {
                              const alloc =
                                tableAssignments.find((a) => a.guestId === sg.id)?.seatsAllocated ||
                                1;
                              return (
                                <div
                                  key={sg.id}
                                  className="flex items-center justify-between rounded-xl bg-stone-50 px-3 py-2 text-xs"
                                >
                                  <div>
                                    <span className="font-semibold text-stone-900">
                                      {sg.fullName}
                                    </span>
                                    <span className="mx-1.5 text-stone-500">({alloc} מקומות)</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleAssignTable(sg.id, null)}
                                    className="text-[11px] font-semibold text-rose-600 hover:underline"
                                  >
                                    הסר
                                  </button>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: EVENT-DAY RECEPTION CHECK-IN DESK */}
        {activeTab === 'checkin' && (
          <div className="space-y-6">
            <div className="rounded-3xl bg-stone-900 p-6 text-white shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300">
                    <UserCheck className="h-4 w-4" />
                    עמדת קבלת פנים וצ׳ק-אין מהיר
                  </span>
                  <h2 className="mt-2 text-2xl font-bold">
                    נכנסו לאולם: {statistics.checkedInPeople} מתוך {statistics.totalConfirmedPeople}{' '}
                    אורחים מאושרים
                  </h2>
                </div>
                <div className="w-full max-w-md">
                  <input
                    type="text"
                    value={checkinQuery}
                    onChange={(e) => setCheckinQuery(e.target.value)}
                    placeholder="סרקו קוד QR או הקלידו שם אורח / טלפון..."
                    className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-stone-400 focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {checkinFilteredGuests.map((g) => {
                const count =
                  g.invitation.rsvpStatus === 'ATTENDING'
                    ? g.invitation.confirmedAdults + g.invitation.confirmedChildren
                    : g.maxInvitedCount;
                return (
                  <div
                    key={g.id}
                    className={`flex flex-col justify-between rounded-2xl border p-5 shadow-xs transition ${
                      g.invitation.checkedIn
                        ? 'border-emerald-300 bg-emerald-50/70'
                        : 'border-stone-200 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-base font-bold text-stone-900">{g.fullName}</h3>
                          <p className="text-xs text-stone-500">
                            {g.groupName} • {g.phoneE164}
                          </p>
                        </div>
                        <span className="rounded-xl bg-stone-900 px-3 py-1 text-xs font-bold text-white">
                          {count} אורחים
                        </span>
                      </div>

                      {/* Giant Table Number Display for Reception Host */}
                      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-center">
                        <div className="text-[10px] font-bold uppercase text-amber-700">
                          שולחן שמור באולם
                        </div>
                        <div className="mt-0.5 text-lg font-extrabold text-amber-950">
                          {g.tableName || 'טרם שובץ שולחן'}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCheckInToggle(g)}
                      className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold shadow-xs transition ${
                        g.invitation.checkedIn
                          ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                          : 'bg-stone-900 text-white hover:bg-stone-800'
                      }`}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {g.invitation.checkedIn
                        ? `נכנסו לאולם (${g.invitation.checkedInCount}) — לחצו לביטול`
                        : 'סמן כניסה לאולם (Check-In)'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 7: GREETING WALL & DIGITAL GIFTS */}
        {activeTab === 'greetings' && (
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs lg:col-span-4 space-y-4">
              <h2 className="flex items-center gap-2 text-base font-bold">
                <Gift className="h-5 w-5 text-rose-600" />
                ריכוז מתנות דיגיטליות וברכות
              </h2>
              <div className="rounded-2xl bg-rose-50 p-4 text-rose-950">
                <div className="text-xs opacity-80">סה״כ מתנות שדווחו ע״י האורחים</div>
                <div className="mt-1 text-3xl font-extrabold">
                  ₪{totalGiftsReported.toLocaleString()}
                </div>
                <div className="mt-1 text-xs opacity-75">מתוך {greetings.length} ברכות שהתקבלו</div>
              </div>
              <div className="space-y-2 text-xs text-stone-600">
                <div>
                  <strong>Bit:</strong> {wedding.giftConfig.bitUrl || 'לא הוגדר'}
                </div>
                <div>
                  <strong>PayBox:</strong> {wedding.giftConfig.payboxUrl || 'לא הוגדר'}
                </div>
                <div>
                  <strong>פרטי העברה בנקאית:</strong> {wedding.giftConfig.bankDetails || 'לא הוגדר'}
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:col-span-8">
              {greetings.map((gr) => (
                <div
                  key={gr.id}
                  className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-stone-900">{gr.authorName}</h4>
                      <span className="text-xs text-stone-500">{gr.relationship}</span>
                    </div>
                    {gr.giftAmountReported && (
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                        🎁 ₪{gr.giftAmountReported}
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-stone-700">“{gr.message}”</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* MODAL 1: CSV / EXCEL BULK GUEST IMPORT */}
      {showCsvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-stone-900">
              ייבוא מוזמנים מ-CSV / Excel
            </h3>
            <p className="mt-1 text-xs text-stone-500">
              הדביקו שורות מ-Excel או CSV בפורמט: שם מלא, טלפון, מקסימום מוזמנים, קבוצה, צד
            </p>
            <textarea
              rows={6}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              dir="ltr"
              className="mt-3 w-full rounded-xl border border-stone-200 bg-stone-50 p-3 font-mono text-xs"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCsvModal(false)}
                className="rounded-xl border border-stone-200 px-4 py-2 text-xs font-semibold"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={handleImportCsv}
                className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700"
              >
                ייבוא מוזמנים עכשיו
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE NEW WEDDING (MULTI-TENANT) */}
      {showNewWeddingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <form
            onSubmit={handleCreateWedding}
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-3 text-xs"
          >
            <h3 className="text-lg font-bold text-stone-900">פתיחת אירוע / חתונה חדשה</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-medium text-stone-600">שם בן/בת זוג 1</label>
                <input
                  type="text"
                  required
                  value={nwPartner1}
                  onChange={(e) => setNwPartner1(e.target.value)}
                  placeholder="למשל: נועה"
                  className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2"
                />
              </div>
              <div>
                <label className="font-medium text-stone-600">שם בן/בת זוג 2</label>
                <input
                  type="text"
                  required
                  value={nwPartner2}
                  onChange={(e) => setNwPartner2(e.target.value)}
                  placeholder="למשל: איתי"
                  className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2"
                />
              </div>
            </div>
            <div>
              <label className="font-medium text-stone-600">תאריך החתונה</label>
              <input
                type="date"
                required
                value={nwDate}
                onChange={(e) => setNwDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2"
              />
            </div>
            <div>
              <label className="font-medium text-stone-600">שם האולם / גן האירועים</label>
              <input
                type="text"
                required
                value={nwVenue}
                onChange={(e) => setNwVenue(e.target.value)}
                placeholder="למשל: חוות רונית"
                className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2"
              />
            </div>
            <div>
              <label className="font-medium text-stone-600">כתובת האולם</label>
              <input
                type="text"
                value={nwAddress}
                onChange={(e) => setNwAddress(e.target.value)}
                placeholder="געש / השרון"
                className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2"
              />
            </div>
            <div>
              <label className="font-medium text-stone-600">שפת ההזמנה הראשית</label>
              <select
                value={nwLocale}
                onChange={(e) => setNwLocale(e.target.value as Locale)}
                className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2"
              >
                <option value="he">עברית (RTL)</option>
                <option value="en">English (RTL)</option>
              </select>
            </div>
            <div className="mt-4 flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewWeddingModal(false)}
                className="rounded-xl border border-stone-200 px-4 py-2 font-semibold"
              >
                ביטול
              </button>
              <button
                type="submit"
                className="rounded-xl bg-amber-700 px-5 py-2 font-bold text-white hover:bg-amber-800"
              >
                צור חתונה חדשה
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

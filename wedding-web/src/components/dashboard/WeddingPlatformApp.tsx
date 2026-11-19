'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Calendar,
  Check,
  ClipboardList,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  FileSpreadsheet,
  Gift,
  ImagePlus,
  LayoutGrid,
  Lock,
  LogOut,
  MessageCircle,
  Palette,
  Pause,
  Play,
  QrCode,
  Search,
  Send,
  SkipForward,
  Square,
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
  MessageLog,
  RsvpStatus,
  SeatAssignment,
  SeatingTable,
  User,
  Wedding,
  WeddingSide,
  WeddingStatistics,
} from '@/types/wedding';
import { HEBREW_DICT } from '@/i18n/dictionaries';
import {
  buildWhatsAppInvitationLink,
  getDefaultCampaignTemplate,
} from '@/services/whatsapp';
import { GuestInvitationView } from '@/components/invitation/GuestInvitationView';
import { IsraeliVenueSelector } from '@/components/common/IsraeliVenueSelector';
import { WeddingManagementPage } from '@/components/dashboard/WeddingManagementPage';
import {
  buildVenueGoogleMapsUrl,
  buildVenueWazeUrl,
  ISRAELI_WEDDING_VENUES,
} from '@/data/israeli-venues';

export type DashboardTab =
  | 'overview'
  | 'management'
  | 'guests'
  | 'studio'
  | 'whatsapp'
  | 'seating'
  | 'checkin'
  | 'greetings';

const TOKEN_STORAGE_KEY = 'wedding_platform_auth_token';

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
    name: 'זהב קלאסי',
    primaryColor: '#78350f',
    accentColor: '#b45309',
    backgroundColor: '#faf8f5',
    coverImageUrl:
      'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80',
  },
  'mediterranean-olive': {
    name: 'ירוק זית כפרי',
    primaryColor: '#365314',
    accentColor: '#4d7c0f',
    backgroundColor: '#f7f9f4',
    coverImageUrl:
      'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=80',
  },
  'modern-minimal': {
    name: 'לבן נקי ומודרני',
    primaryColor: '#171717',
    accentColor: '#525252',
    backgroundColor: '#fafafa',
    coverImageUrl:
      'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1200&q=80',
  },
  'midnight-velvet': {
    name: 'כחול לילה יוקרתי',
    primaryColor: '#1e293b',
    accentColor: '#ca8a04',
    backgroundColor: '#0f172a',
    coverImageUrl:
      'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1200&q=80',
  },
};

async function compressImageFile(file: File, maxWidth = 1200, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function WeddingPlatformApp({
  initialTab = 'overview',
}: {
  initialTab?: DashboardTab;
} = {}) {
  const [activeTab, setActiveTab] = useState<DashboardTab>(initialTab);
  const dict = HEBREW_DICT;

  const defaultVenue = ISRAELI_WEDDING_VENUES[0];

  // Auth State
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [regPartner1, setRegPartner1] = useState('');
  const [regPartner2, setRegPartner2] = useState('');
  const [regDate, setRegDate] = useState('2026-11-24');
  const [regVenue, setRegVenue] = useState(defaultVenue.name);
  const [regAddress, setRegAddress] = useState(defaultVenue.address);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Wedding Data State
  const [allWeddings, setAllWeddings] = useState<Wedding[]>([]);
  const [wedding, setWedding] = useState<Wedding | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [, setGroups] = useState<GuestGroup[]>([]);
  const [tables, setTables] = useState<SeatingTable[]>([]);
  const [assignments, setAssignments] = useState<SeatAssignment[]>([]);
  const [greetings, setGreetings] = useState<Greeting[]>([]);
  const [, setMessageLogs] = useState<MessageLog[]>([]);
  const [statistics, setStatistics] = useState<WeddingStatistics | null>(null);
  const [loading, setLoading] = useState(false);
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
    'שם מלא,טלפון,כמות מוזמנים,קבוצה,צד,הערות\nמשפחת אלמוג,054-9123456,3,משפחה קרובה,PARTNER_1,מנה צמחונית\nעמית וירדן גולן,052-8234567,2,חברים,PARTNER_2,'
  );

  // Guest Edit Modal State
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [editGuestName, setEditGuestName] = useState('');
  const [editGuestPhone, setEditGuestPhone] = useState('');
  const [editGuestMax, setEditGuestMax] = useState(2);
  const [editGuestGroup, setEditGuestGroup] = useState('');
  const [editGuestSide, setEditGuestSide] = useState<WeddingSide>('BOTH');
  const [editGuestRsvp, setEditGuestRsvp] = useState<RsvpStatus>('PENDING');
  const [editGuestAdults, setEditGuestAdults] = useState(0);
  const [editGuestChildren, setEditGuestChildren] = useState(0);
  const [editGuestDietary, setEditGuestDietary] = useState('');

  // New wedding modal state
  const [showNewWeddingModal, setShowNewWeddingModal] = useState(false);
  const [nwPartner1, setNwPartner1] = useState('');
  const [nwPartner2, setNwPartner2] = useState('');
  const [nwDate, setNwDate] = useState('2026-12-28');
  const [nwVenue, setNwVenue] = useState(defaultVenue.name);
  const [nwAddress, setNwAddress] = useState(defaultVenue.address);

  // WhatsApp campaign & Automatic Personal Batch Dispatcher State (No WhatsApp Business needed)
  const [campaignType, setCampaignType] = useState<CampaignType>('INITIAL_INVITATION');
  const [customTemplate, setCustomTemplate] = useState('');
  const [waFilterStatus, setWaFilterStatus] = useState<'ALL' | 'PENDING' | 'NOT_SENT'>('ALL');
  const [batchMethod, setBatchMethod] = useState<'DESKTOP_APP' | 'WEB_TAB'>('DESKTOP_APP');
  const [batchIntervalSec, setBatchIntervalSec] = useState<number>(5);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchPaused, setBatchPaused] = useState(false);
  const [batchIndex, setBatchIndex] = useState(0);
  const [batchCountdown, setBatchCountdown] = useState(0);
  const batchQueueRef = useRef<Guest[]>([]);

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

  const apiFetch = useCallback(async (input: string, init?: RequestInit) => {
    const token =
      typeof window !== 'undefined' ? window.localStorage.getItem(TOKEN_STORAGE_KEY) : null;
    const headers = new Headers(init?.headers || {});
    if (token && !headers.has('Authorization')) {
      try {
        headers.set('Authorization', `Bearer ${token.trim()}`);
      } catch {
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        }
      }
    }
    return fetch(input, {
      ...init,
      headers,
      credentials: 'include',
    });
  }, []);

  const safeReadJson = async (res: Response): Promise<Record<string, any>> => {
    const text = await res.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`תגובת שרת לא תקינה (${res.status})`);
    }
  };

  const fetchWeddingBundle = useCallback(
    async (weddingId?: string) => {
      setLoading(true);
      setApiError(null);
      try {
        const url = weddingId
          ? `/api/weddings?weddingId=${encodeURIComponent(weddingId)}`
          : '/api/weddings';
        const res = await apiFetch(url);
        if (res.status === 401) {
          setAuthUser(null);
          return;
        }
        const text = await res.text();
        let data: Record<string, any> = {};
        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          throw new Error('שגיאת חיבור לשרת המערכת. אנא נסו לרענן את העמוד.');
        }
        if (!res.ok) {
          throw new Error(data.error || `שגיאת שרת (${res.status})`);
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
          setCustomTemplate(getDefaultCampaignTemplate('INITIAL_INVITATION', 'he'));
        }
      } catch (err) {
        setApiError(err instanceof Error ? err.message : 'שגיאת תקשורת לשרת');
      } finally {
        setLoading(false);
      }
    },
    [apiFetch]
  );

  // Check session on startup
  useEffect(() => {
    let active = true;
    apiFetch('/api/auth/me')
      .then(async (res) => {
        if (!active) return;
        if (res.ok) {
          const data = await res.json();
          setAuthUser(data.user);
          await fetchWeddingBundle();
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setAuthChecking(false);
      });
    return () => {
      active = false;
    };
  }, [apiFetch, fetchWeddingBundle]);

  useEffect(() => {
    if (wedding) {
      setCustomTemplate(getDefaultCampaignTemplate(campaignType, 'he'));
    }
  }, [campaignType, wedding]);

  const handleLoginSubmit = async (
    e: React.FormEvent,
    overrideEmail?: string,
    overridePass?: string
  ) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSubmitting(true);
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: overrideEmail ?? authEmail,
          password: overridePass ?? authPassword,
        }),
      });
      const data = await safeReadJson(res);
      if (!res.ok) {
        throw new Error(data.error || 'שגיאה בהתחברות');
      }
      if (data.token && typeof window !== 'undefined') {
        window.localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
      }
      setAuthUser(data.user);
      await fetchWeddingBundle();
      showNotification(`שלום, ${data.user.fullName}`);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'שגיאה בהתחברות');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSubmitting(true);
    try {
      const res = await apiFetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: authEmail,
          password: authPassword,
          fullName: `${regPartner1} ו${regPartner2}`,
          partner1Name: regPartner1,
          partner2Name: regPartner2,
          eventDate: regDate,
          venueName: regVenue,
          venueAddress: regAddress,
          defaultLocale: 'he',
        }),
      });
      const data = await safeReadJson(res);
      if (!res.ok) {
        throw new Error(data.error || 'שגיאה בהרשמה');
      }
      if (data.token && typeof window !== 'undefined') {
        window.localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
      }
      setAuthUser(data.user);
      await fetchWeddingBundle(data.wedding?.id);
      showNotification('החשבון והאירוע הוקמו בהצלחה');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'שגיאה בהרשמה');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
    setAuthUser(null);
    setWedding(null);
    setAllWeddings([]);
    setGuests([]);
  };

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
    const res = await apiFetch('/api/guests', {
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
      showNotification(`נוסף מוזמן: ${data.guest.fullName}`);
    } else {
      showNotification(data.error || 'שגיאה בהוספת מוזמן');
    }
  };

  const openEditGuestModal = (g: Guest) => {
    setEditingGuest(g);
    setEditGuestName(g.fullName);
    setEditGuestPhone(g.phoneE164);
    setEditGuestMax(g.maxInvitedCount);
    setEditGuestGroup(g.groupName);
    setEditGuestSide(g.side);
    setEditGuestRsvp(g.invitation.rsvpStatus);
    setEditGuestAdults(g.invitation.confirmedAdults);
    setEditGuestChildren(g.invitation.confirmedChildren);
    setEditGuestDietary(g.invitation.guestDietaryNotes || '');
  };

  const handleSaveEditedGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wedding || !editingGuest) return;
    const res = await apiFetch('/api/guests', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guestId: editingGuest.id,
        fullName: editGuestName,
        phone: editGuestPhone,
        maxInvitedCount: editGuestMax,
        groupName: editGuestGroup,
        side: editGuestSide,
        rsvpStatus: editGuestRsvp,
        confirmedAdults: editGuestAdults,
        confirmedChildren: editGuestChildren,
        guestDietaryNotes: editGuestDietary,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setEditingGuest(null);
      await fetchWeddingBundle(wedding.id);
      showNotification(`עודכנו פרטי המוזמן: ${data.guest.fullName}`);
    } else {
      showNotification(data.error || 'שגיאה בעדכון מוזמן');
    }
  };

  const handleImportCsv = async () => {
    if (!wedding || !csvText.trim()) return;
    const res = await apiFetch('/api/guests', {
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
      showNotification(`נקלטו ${data.importedCount} רשומות מוזמנים`);
    } else {
      showNotification(data.error || 'שגיאה בייבוא הקובץ');
    }
  };

  const handleDeleteGuest = async (guestId: string) => {
    if (!wedding) return;
    await apiFetch(`/api/guests?guestId=${encodeURIComponent(guestId)}`, { method: 'DELETE' });
    await fetchWeddingBundle(wedding.id);
    showNotification('המוזמן הוסר מהרשימה');
  };

  const handleCreateWedding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nwPartner1.trim() || !nwPartner2.trim() || !nwVenue.trim()) return;
    const res = await apiFetch('/api/weddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partner1Name: nwPartner1,
        partner2Name: nwPartner2,
        eventDate: nwDate,
        venueName: nwVenue,
        venueAddress: nwAddress,
        defaultLocale: 'he',
      }),
    });
    const data = await res.json();
    if (res.ok && data.wedding) {
      setShowNewWeddingModal(false);
      setNwPartner1('');
      setNwPartner2('');
      await fetchWeddingBundle(data.wedding.id);
      showNotification(`נפתח אירוע חדש: ${data.wedding.partner1Name} ו${data.wedding.partner2Name}`);
    }
  };

  const handleSaveWeddingSettings = async () => {
    if (!wedding) return;
    const res = await apiFetch('/api/weddings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...wedding, defaultLocale: 'he' }),
    });
    if (res.ok) {
      showNotification('פרטי האירוע וההזמנה נשמרו');
      await fetchWeddingBundle(wedding.id);
    } else {
      const data = await res.json().catch(() => ({}));
      showNotification(data.error || 'שגיאה בשמירת הגדרות האירוע');
    }
  };

  const handleCoverPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !wedding) return;
    try {
      const dataUrl = await compressImageFile(file);
      setWedding({
        ...wedding,
        themeConfig: {
          ...wedding.themeConfig,
          coverImageUrl: dataUrl,
        },
      });
      showNotification('התמונה נטענה. לחצו על "שמירת שינויים" לעדכון ההזמנה.');
    } catch {
      showNotification('שגיאה בטעינת קובץ התמונה');
    }
  };

  const handleAssignTable = async (guestId: string, tableId: string | null) => {
    if (!wedding) return;
    setSeatingError(null);
    const res = await apiFetch('/api/seating', {
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
    const res = await apiFetch('/api/seating', {
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
      showNotification('נוסף שולחן חדש');
    }
  };

  const handleDeleteTable = async (tableId: string) => {
    if (!wedding) return;
    const res = await apiFetch('/api/seating', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete_table',
        weddingId: wedding.id,
        tableId,
      }),
    });
    if (res.ok) {
      await fetchWeddingBundle(wedding.id);
      showNotification('השולחן הוסר');
    }
  };

  const handleDeleteGreeting = async (greetingId: string) => {
    if (!wedding) return;
    const res = await apiFetch(
      `/api/greetings?weddingId=${encodeURIComponent(wedding.id)}&greetingId=${encodeURIComponent(greetingId)}`,
      { method: 'DELETE' }
    );
    if (res.ok) {
      await fetchWeddingBundle(wedding.id);
      showNotification('הברכה הוסרה');
    }
  };

  const handleCheckInToggle = async (guest: Guest) => {
    if (!wedding) return;
    const nextState = !guest.invitation.checkedIn;
    await apiFetch('/api/checkin', {
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
        ? `${guest.fullName} נקלטו בכניסה (${guest.tableName || 'ללא שולחן'})`
        : `בוטלה קליטה עבור ${guest.fullName}`
    );
  };

  // Single WhatsApp dispatch (Personal WhatsApp - no WhatsApp Business needed)
  const dispatchSinglePersonalWhatsApp = useCallback(
    async (guest: Guest, mode: 'DESKTOP_APP' | 'WEB_TAB' | 'WA_ME' = 'WA_ME') => {
      if (!wedding) return;
      const baseUrl =
        typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const { renderedMessage, whatsappUrl, desktopAppUrl, webAppUrl } =
        buildWhatsAppInvitationLink({
          template: customTemplate,
          wedding,
          guest,
          baseUrl,
        });

      await apiFetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weddingId: wedding.id,
          guestId: guest.id,
          campaignType,
          channel: 'WHATSAPP_LINK',
          renderedMessage,
        }),
      });

      if (typeof window !== 'undefined') {
        if (mode === 'DESKTOP_APP') {
          window.location.href = desktopAppUrl;
        } else if (mode === 'WEB_TAB') {
          window.open(webAppUrl, 'whatsapp_batch_sender_tab');
        } else {
          window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
        }
      }
    },
    [apiFetch, campaignType, customTemplate, wedding]
  );

  const handleSendWhatsApp = async (guest: Guest) => {
    if (!wedding) return;
    await dispatchSinglePersonalWhatsApp(guest, 'WA_ME');
    await fetchWeddingBundle(wedding.id);
  };

  // Automatic Sequential Personal WhatsApp Batch Runner (Zero WhatsApp Business Required)
  const startAutomaticPersonalBatch = (targetList: Guest[]) => {
    if (!wedding || targetList.length === 0) {
      showNotification('אין נמענים ברשימת התפוצה שנבחרה');
      return;
    }
    batchQueueRef.current = targetList;
    setBatchIndex(0);
    setBatchPaused(false);
    setBatchRunning(true);
    setBatchCountdown(1);
  };

  const stopAutomaticPersonalBatch = useCallback(async () => {
    setBatchRunning(false);
    setBatchPaused(false);
    if (wedding) {
      await fetchWeddingBundle(wedding.id);
    }
  }, [fetchWeddingBundle, wedding]);

  const advanceBatchNow = useCallback(async () => {
    const queue = batchQueueRef.current;
    if (batchIndex >= queue.length) {
      await stopAutomaticPersonalBatch();
      showNotification(`הסתיימה הפצת ${queue.length} הודעות וואטסאפ`);
      return;
    }
    const currentGuest = queue[batchIndex];
    await dispatchSinglePersonalWhatsApp(currentGuest, batchMethod);

    if (batchIndex + 1 >= queue.length) {
      await stopAutomaticPersonalBatch();
      showNotification(`הסתיימה הפצת ${queue.length} הודעות וואטסאפ`);
    } else {
      setBatchIndex((prev) => prev + 1);
      setBatchCountdown(batchIntervalSec);
    }
  }, [
    batchIndex,
    batchIntervalSec,
    batchMethod,
    dispatchSinglePersonalWhatsApp,
    stopAutomaticPersonalBatch,
  ]);

  useEffect(() => {
    if (!batchRunning || batchPaused) return;
    const timer = setInterval(() => {
      setBatchCountdown((prev) => {
        if (prev <= 1) {
          void advanceBatchNow();
          return batchIntervalSec;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [advanceBatchNow, batchIntervalSec, batchPaused, batchRunning]);

  const handleExportSeatingCsv = () => {
    if (!wedding) return;
    const header =
      'שם המוזמן,טלפון,קבוצה,סטטוס הגעה,מבוגרים,ילדים,סה"כ מגיעים,שולחן משובץ,הערות תזונה\n';
    const statusMap: Record<RsvpStatus, string> = {
      ATTENDING: 'מגיעים',
      DECLINED: 'לא מגיעים',
      MAYBE: 'מתלבטים',
      PENDING: 'ממתין למענה',
    };
    const rows = guests
      .map(
        (g) =>
          `"${g.fullName}","${g.phoneE164}","${g.groupName}","${statusMap[g.invitation.rsvpStatus]}",${g.invitation.confirmedAdults},${g.invitation.confirmedChildren},${
            g.invitation.confirmedAdults + g.invitation.confirmedChildren
          },"${g.tableName || 'לא שובץ'}","${g.invitation.guestDietaryNotes || ''}"`
      )
      .join('\n');
    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `דוח-הושבה-ומוזמנים-${wedding.partner1Name}-${wedding.partner2Name}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (authChecking) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-neutral-100 text-neutral-600">
        <div className="text-xs font-medium">טוען מערכת ניהול אירוע...</div>
      </div>
    );
  }

  // AUTHENTICATION PORTAL (100% HEBREW, PROFESSIONAL EDITORIAL DESIGN)
  if (!authUser) {
    return (
      <div
        dir="rtl"
        className="flex min-h-screen flex-col items-center justify-center bg-neutral-100 p-4 text-neutral-900"
      >
        <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-7 shadow-sm">
          <div className="border-b border-neutral-100 pb-4 text-center">
            <h1 className="text-xl font-bold text-neutral-900">מערכת ניהול חתונה והזמנות</h1>
            <p className="mt-1 text-xs text-neutral-500">
              ניהול ספר מוזמנים, אישורי הגעה, הפצה בוואטסאפ וסידורי הושבה
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="mt-5 grid grid-cols-2 gap-1 rounded-xl bg-neutral-100 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setAuthError(null);
              }}
              className={`rounded-lg py-2 transition ${
                authMode === 'login' ? 'bg-white text-neutral-900 shadow-2xs' : 'text-neutral-600'
              }`}
            >
              כניסה לחשבון קיים
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setAuthError(null);
              }}
              className={`rounded-lg py-2 transition ${
                authMode === 'register' ? 'bg-white text-neutral-900 shadow-2xs' : 'text-neutral-600'
              }`}
            >
              הקמת אירוע חדש
            </button>
          </div>

          {authError && (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-center text-xs font-semibold text-rose-700">
              {authError}
            </div>
          )}

          {authMode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="mt-5 space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-neutral-700">כתובת דוא״ל</label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="name@domain.co.il"
                  dir="ltr"
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-neutral-900 focus:border-neutral-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-neutral-700">סיסמה</label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  dir="ltr"
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-neutral-900 focus:border-neutral-900 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={authSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 py-2.5 text-xs font-bold text-white transition hover:bg-neutral-800 disabled:opacity-50"
              >
                <Lock className="h-3.5 w-3.5" />
                {authSubmitting ? 'מתחבר...' : 'כניסה למערכת'}
              </button>

              <div className="border-t border-neutral-100 pt-3">
                <button
                  type="button"
                  onClick={(e) => handleLoginSubmit(e, 'demo@wedding.co.il', 'Wedding2026!')}
                  className="w-full rounded-lg border border-neutral-300 bg-neutral-50 py-2 text-xs font-semibold text-neutral-800 transition hover:bg-neutral-100"
                >
                  כניסה מהירה לסביבת הדגמה (דנה ועומר)
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="mt-5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-semibold text-neutral-700">שם הכלה / צד א׳</label>
                  <input
                    type="text"
                    required
                    value={regPartner1}
                    onChange={(e) => setRegPartner1(e.target.value)}
                    placeholder="למשל: נועה כהן"
                    className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2"
                  />
                </div>
                <div>
                  <label className="font-semibold text-neutral-700">שם החתן / צד ב׳</label>
                  <input
                    type="text"
                    required
                    value={regPartner2}
                    onChange={(e) => setRegPartner2(e.target.value)}
                    placeholder="למשל: איתי לוי"
                    className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="font-semibold text-neutral-700">תאריך החתונה</label>
                <input
                  type="date"
                  required
                  value={regDate}
                  onChange={(e) => setRegDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2"
                />
              </div>

              {/* Closed-List Israeli Venue & Address Selector */}
              <div className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-3">
                <IsraeliVenueSelector
                  venueName={regVenue}
                  venueAddress={regAddress}
                  compact
                  onSelectVenue={(sel) => {
                    setRegVenue(sel.venueName);
                    setRegAddress(sel.venueAddress);
                  }}
                />
              </div>

              <div>
                <label className="font-semibold text-neutral-700">דוא״ל מנהל האירוע</label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="family@domain.co.il"
                  dir="ltr"
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2"
                />
              </div>
              <div>
                <label className="font-semibold text-neutral-700">סיסמה (לפחות 6 תווים)</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  dir="ltr"
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2"
                />
              </div>
              <button
                type="submit"
                disabled={authSubmitting}
                className="mt-2 w-full rounded-lg bg-neutral-900 py-2.5 text-xs font-bold text-white transition hover:bg-neutral-800 disabled:opacity-50"
              >
                {authSubmitting ? 'מקים אירוע...' : 'הקמת אירוע וכניסה למערכת'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  if (loading && !wedding) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-neutral-100 text-neutral-600">
        <div className="text-xs font-medium">טוען נתוני אירוע...</div>
      </div>
    );
  }

  if (apiError && !wedding) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-neutral-100 p-6">
        <div className="max-w-md rounded-xl border border-rose-200 bg-white p-6 text-center shadow-xs">
          <h2 className="text-base font-bold text-rose-700">שגיאת תקשורת לשרת</h2>
          <p className="mt-2 text-xs leading-relaxed text-neutral-600">{apiError}</p>
          <div className="mt-4 flex justify-center gap-2">
            <button
              type="button"
              onClick={() => fetchWeddingBundle()}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-xs font-bold text-white hover:bg-neutral-800"
            >
              ניסיון חוזר
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-neutral-300 px-4 py-2 text-xs font-semibold text-neutral-700"
            >
              התנתקות
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!wedding || !statistics) return null;

  const sampleGuest = guests[0] || {
    id: 'preview-guest',
    weddingId: wedding.id,
    groupId: 'preview',
    groupName: 'משפחה קרובה',
    side: 'BOTH',
    fullName: 'משפחת ישראלי',
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

  const whatsappCandidates = guests.filter((g) => {
    if (waFilterStatus === 'PENDING') return g.invitation.rsvpStatus === 'PENDING';
    if (waFilterStatus === 'NOT_SENT') return g.invitation.deliveryStatus === 'NOT_SENT';
    return true;
  });

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
    <div dir="rtl" className="min-h-screen bg-neutral-100 text-neutral-900">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 left-5 z-50 flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2.5 text-xs font-medium text-white shadow-lg">
          <Check className="h-3.5 w-3.5 text-emerald-400" />
          {toast}
        </div>
      )}

      {/* Top Navigation Header */}
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-neutral-500">
                  ניהול אירוע ומוזמנים
                </span>
                <span className="text-neutral-300">|</span>
                <span className="text-[11px] font-medium text-neutral-600">
                  {authUser.fullName}
                </span>
              </div>

              {/* Event Switcher */}
              <div className="mt-1 flex items-center gap-2">
                <select
                  aria-label="בחירת אירוע פעיל"
                  value={wedding.id}
                  onChange={(e) => fetchWeddingBundle(e.target.value)}
                  className="rounded-lg border border-neutral-300 bg-neutral-50 px-2.5 py-1 text-xs font-bold text-neutral-900 focus:outline-none"
                >
                  {allWeddings.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.partner1Name} ו{w.partner2Name} — {w.venueName}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewWeddingModal(true)}
                  className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50"
                >
                  + {dict.nav.newWedding}
                </button>
              </div>
            </div>
          </div>

          {/* Right Header Controls: Live Guest Link & Logout (No English Toggle) */}
          <div className="flex items-center gap-2">
            {guests[0] && (
              <Link
                href={`/i/${guests[0].invitation.shortCode}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-neutral-800"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {dict.nav.previewInvitation}
              </Link>
            )}

            <button
              type="button"
              onClick={handleLogout}
              title="התנתקות מהמערכת"
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50"
            >
              <LogOut className="h-3.5 w-3.5" />
              התנתקות
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mx-auto max-w-7xl overflow-x-auto px-4 sm:px-6">
          <nav className="flex gap-1 border-t border-neutral-100">
            {(
              [
                { id: 'overview', label: dict.nav.overview, icon: BarChart3 },
                { id: 'management', label: 'ניהול החתונה', icon: ClipboardList },
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
                      ? 'border-neutral-900 text-neutral-900'
                      : 'border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-800'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
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
            {/* Clean Event Summary Header Card */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-white p-6 shadow-2xs">
              <div>
                <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    {new Date(wedding.eventDate).toLocaleDateString('he-IL', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                  <span>•</span>
                  <span>קבלת פנים: {wedding.receptionTime}</span>
                  <span>•</span>
                  <span>חופה: {wedding.ceremonyTime}</span>
                </div>
                <h1 className="mt-1.5 text-2xl font-bold text-neutral-900">
                  החתונה של {wedding.partner1Name} ו{wedding.partner2Name}
                </h1>
                <p className="mt-1 text-xs text-neutral-600">
                  {wedding.venueName} — {wedding.venueAddress}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('management')}
                  className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-xs font-semibold text-neutral-800 hover:bg-neutral-50"
                >
                  דף ניהול החתונה (תקציב ומשימות)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('guests')}
                  className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-xs font-semibold text-neutral-800 hover:bg-neutral-50"
                >
                  ניהול ספר מוזמנים
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('whatsapp')}
                  className="rounded-lg bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800"
                >
                  הפצת הזמנות בוואטסאפ
                </button>
              </div>
            </div>

            {/* 6 KPI Stat Cards */}
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
              <div className="rounded-xl border border-neutral-200 bg-white p-4">
                <div className="text-xs font-medium text-neutral-500">סה״כ מוזמנים</div>
                <div className="mt-1 text-2xl font-bold tabular-nums text-neutral-900">
                  {statistics.totalInvitedPeople}
                </div>
                <div className="mt-1 text-[11px] text-neutral-500">
                  {statistics.totalHouseholds} בתי אב
                </div>
              </div>

              <div className="rounded-xl border border-neutral-200 bg-white p-4">
                <div className="text-xs font-medium text-neutral-500">אישרו הגעה</div>
                <div className="mt-1 text-2xl font-bold tabular-nums text-emerald-700">
                  {statistics.totalConfirmedPeople}
                </div>
                <div className="mt-1 text-[11px] text-neutral-500">
                  {statistics.confirmedAdults} מבוגרים, {statistics.confirmedChildren} ילדים
                </div>
              </div>

              <div className="rounded-xl border border-neutral-200 bg-white p-4">
                <div className="text-xs font-medium text-neutral-500">ממתינים למענה</div>
                <div className="mt-1 text-2xl font-bold tabular-nums text-amber-700">
                  {statistics.pendingHouseholds + statistics.maybeHouseholds}
                </div>
                <div className="mt-1 text-[11px] text-neutral-500">
                  {statistics.declinedHouseholds} הודיעו שלא יגיעו
                </div>
              </div>

              <div className="rounded-xl border border-neutral-200 bg-white p-4">
                <div className="text-xs font-medium text-neutral-500">שובצו לשולחנות</div>
                <div className="mt-1 text-2xl font-bold tabular-nums text-neutral-900">
                  {statistics.seatedPeople} / {statistics.totalConfirmedPeople}
                </div>
                <div className="mt-1 text-[11px] text-neutral-500">
                  {statistics.unseatedConfirmedPeople} טרם שובצו
                </div>
              </div>

              <div className="rounded-xl border border-neutral-200 bg-white p-4">
                <div className="text-xs font-medium text-neutral-500">נקלטו באולם</div>
                <div className="mt-1 text-2xl font-bold tabular-nums text-neutral-900">
                  {statistics.checkedInPeople}
                </div>
                <div className="mt-1 text-[11px] text-neutral-500">
                  {statistics.checkedInHouseholds} הזמנות נכנסו
                </div>
              </div>

              <div className="rounded-xl border border-neutral-200 bg-white p-4">
                <div className="text-xs font-medium text-neutral-500">ספר ברכות</div>
                <div className="mt-1 text-2xl font-bold tabular-nums text-neutral-900">
                  {greetings.length}
                </div>
                <div className="mt-1 text-[11px] text-neutral-500">
                  ברכות שהתקבלו מהאורחים
                </div>
              </div>
            </div>

            {/* Breakdown Cards: Side, Meals, and WhatsApp Delivery Funnel */}
            <div className="grid gap-5 lg:grid-cols-3">
              {/* Side Breakdown */}
              <div className="rounded-xl border border-neutral-200 bg-white p-5">
                <h3 className="text-xs font-bold text-neutral-800">התפלגות מוזמנים לפי צדדים</h3>
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
                          <span className="tabular-nums text-neutral-600">
                            <strong>{stats.confirmed}</strong> מתוך {stats.invited} ({pct}%)
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                          <div
                            className="h-full rounded-full bg-neutral-800"
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Meal Preferences Summary */}
              <div className="rounded-xl border border-neutral-200 bg-white p-5">
                <h3 className="text-xs font-bold text-neutral-800">
                  ריכוז העדפות כשרות ומנות לקייטרינג
                </h3>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  {(
                    [
                      { key: 'regular', label: 'מנה רגילה' },
                      { key: 'vegetarian', label: 'צמחוני' },
                      { key: 'vegan', label: 'טבעוני' },
                      { key: 'kids', label: 'מנות ילדים' },
                      { key: 'glatt', label: 'גלאט מהדרין' },
                    ] as const
                  ).map((m) => (
                    <div
                      key={m.key}
                      className="flex items-center justify-between rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2"
                    >
                      <span className="text-neutral-600">{m.label}</span>
                      <span className="text-sm font-bold tabular-nums text-neutral-900">
                        {statistics.mealTotals[m.key]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* WhatsApp Delivery Funnel */}
              <div className="rounded-xl border border-neutral-200 bg-white p-5">
                <h3 className="text-xs font-bold text-neutral-800">מעקב הפצה וצפייה בהזמנה</h3>
                <div className="mt-4 grid grid-cols-2 gap-2.5 text-xs">
                  <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-3">
                    <div className="text-neutral-500">טרם נשלחו</div>
                    <div className="mt-1 text-lg font-bold tabular-nums text-neutral-900">
                      {statistics.deliveryBreakdown.NOT_SENT}
                    </div>
                  </div>
                  <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-3">
                    <div className="text-neutral-500">נשלחו בוואטסאפ</div>
                    <div className="mt-1 text-lg font-bold tabular-nums text-neutral-900">
                      {statistics.deliveryBreakdown.SENT + statistics.deliveryBreakdown.DELIVERED}
                    </div>
                  </div>
                  <div className="col-span-2 flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                    <div>
                      <div className="font-semibold text-neutral-800">פתחו וצפו בהזמנה</div>
                      <div className="text-[11px] text-neutral-500">
                        נספר אוטומטית בעת כניסת האורח לקישור האישי
                      </div>
                    </div>
                    <div className="text-xl font-bold tabular-nums text-emerald-700">
                      {statistics.deliveryBreakdown.OPENED}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1.5: WEDDING MANAGEMENT PAGE (BUDGET, VENDORS, RESERVE CALCULATOR, TASKS & TIMELINE) */}
        {activeTab === 'management' && (
          <WeddingManagementPage
            wedding={wedding}
            statistics={statistics}
            totalGiftsReported={totalGiftsReported}
            onUpdateWedding={async (updatedWedding, saveToServer) => {
              setWedding(updatedWedding);
              if (saveToServer) {
                const res = await apiFetch('/api/weddings', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ ...updatedWedding, defaultLocale: 'he' }),
                });
                if (res.ok) {
                  showNotification('נתוני ניהול החתונה נשמרו');
                  await fetchWeddingBundle(updatedWedding.id);
                } else {
                  showNotification('שגיאה בשמירת נתוני ניהול החתונה');
                }
              }
            }}
          />
        )}

        {/* TAB 2: GUEST LIST & CSV IMPORT */}
        {activeTab === 'guests' && (
          <div className="space-y-5">
            {/* Add Guest Form + CSV Import Button */}
            <div className="rounded-xl border border-neutral-200 bg-white p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-sm font-bold text-neutral-900">
                  <UserPlus className="h-4 w-4 text-neutral-700" />
                  הוספת מוזמן לספר האורחים
                </h2>
                <button
                  type="button"
                  onClick={() => setShowCsvModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-1.5 text-xs font-semibold text-neutral-800 transition hover:bg-neutral-100"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  ייבוא מרשימת אקסל / CSV
                </button>
              </div>

              <form onSubmit={handleAddGuest} className="grid gap-2.5 sm:grid-cols-6">
                <input
                  type="text"
                  required
                  value={newGuestName}
                  onChange={(e) => setNewGuestName(e.target.value)}
                  placeholder="שם המוזמן / משפחה (למשל: משפחת כהן)"
                  className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs sm:col-span-2"
                />
                <input
                  type="text"
                  required
                  value={newGuestPhone}
                  onChange={(e) => setNewGuestPhone(e.target.value)}
                  placeholder="טלפון נייד (054-0000000)"
                  className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs"
                />
                <input
                  type="text"
                  value={newGuestGroup}
                  onChange={(e) => setNewGuestGroup(e.target.value)}
                  placeholder="קבוצה (משפחה, חברים, עבודה)"
                  className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs"
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={newGuestMax}
                    onChange={(e) => setNewGuestMax(Number(e.target.value) || 1)}
                    title="כמות מוזמנים בהזמנה"
                    className="w-16 rounded-lg border border-neutral-300 bg-white px-2 py-2 text-center text-xs font-bold tabular-nums"
                  />
                  <select
                    value={newGuestSide}
                    onChange={(e) => setNewGuestSide(e.target.value as WeddingSide)}
                    className="flex-1 rounded-lg border border-neutral-300 bg-white px-2 py-2 text-xs"
                  >
                    <option value="PARTNER_1">צד {wedding.partner1Name}</option>
                    <option value="PARTNER_2">צד {wedding.partner2Name}</option>
                    <option value="BOTH">משותף</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="rounded-lg bg-neutral-900 px-4 py-2 text-xs font-bold text-white hover:bg-neutral-800"
                >
                  הוספת מוזמן
                </button>
              </form>
            </div>

            {/* Search & Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-4">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute top-2.5 right-3 h-4 w-4 text-neutral-400" />
                <input
                  type="text"
                  value={guestSearch}
                  onChange={(e) => setGuestSearch(e.target.value)}
                  placeholder="חיפוש לפי שם, טלפון, קבוצה או קוד הזמנה..."
                  className="w-full rounded-lg border border-neutral-300 bg-neutral-50 py-2 pr-9 pl-3 text-xs focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <select
                  value={rsvpFilter}
                  onChange={(e) => setRsvpFilter(e.target.value as RsvpStatus | 'ALL')}
                  className="rounded-lg border border-neutral-300 bg-white px-3 py-2"
                >
                  <option value="ALL">כל סטטוסי ההגעה</option>
                  <option value="ATTENDING">אישרו הגעה</option>
                  <option value="PENDING">טרם השיבו</option>
                  <option value="MAYBE">מתלבטים</option>
                  <option value="DECLINED">לא מגיעים</option>
                </select>

                <select
                  value={sideFilter}
                  onChange={(e) => setSideFilter(e.target.value as WeddingSide | 'ALL')}
                  className="rounded-lg border border-neutral-300 bg-white px-3 py-2"
                >
                  <option value="ALL">כל הצדדים</option>
                  <option value="PARTNER_1">צד {wedding.partner1Name}</option>
                  <option value="PARTNER_2">צד {wedding.partner2Name}</option>
                  <option value="BOTH">משותף</option>
                </select>
              </div>
            </div>

            {/* Guest Table */}
            <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
                    <tr>
                      <th className="px-4 py-3 font-semibold">שם המוזמן</th>
                      <th className="px-4 py-3 font-semibold">טלפון נייד</th>
                      <th className="px-4 py-3 font-semibold">קבוצה</th>
                      <th className="px-4 py-3 font-semibold">סטטוס הגעה</th>
                      <th className="px-4 py-3 font-semibold">כמות מאושרת</th>
                      <th className="px-4 py-3 font-semibold">שולחן</th>
                      <th className="px-4 py-3 font-semibold">פעולות</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {filteredGuests.map((g) => {
                      const confirmedCount =
                        g.invitation.confirmedAdults + g.invitation.confirmedChildren;
                      return (
                        <tr key={g.id} className="hover:bg-neutral-50">
                          <td className="px-4 py-3">
                            <div className="font-bold text-neutral-900">{g.fullName}</div>
                            {g.invitation.guestDietaryNotes && (
                              <div className="mt-0.5 text-[11px] text-neutral-500">
                                הערת תזונה: {g.invitation.guestDietaryNotes}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono text-neutral-600" dir="ltr">
                            {g.phoneE164}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-block rounded-md border border-neutral-200 bg-neutral-50 px-2 py-0.5 font-medium text-neutral-700">
                              {g.groupName}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                                g.invitation.rsvpStatus === 'ATTENDING'
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : g.invitation.rsvpStatus === 'DECLINED'
                                    ? 'bg-neutral-100 text-neutral-600 border border-neutral-200'
                                    : g.invitation.rsvpStatus === 'MAYBE'
                                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                      : 'bg-neutral-50 text-neutral-600 border border-neutral-200'
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  g.invitation.rsvpStatus === 'ATTENDING'
                                    ? 'bg-emerald-600'
                                    : g.invitation.rsvpStatus === 'DECLINED'
                                      ? 'bg-neutral-500'
                                      : g.invitation.rsvpStatus === 'MAYBE'
                                        ? 'bg-amber-500'
                                        : 'bg-neutral-400'
                                }`}
                              />
                              {g.invitation.rsvpStatus === 'ATTENDING'
                                ? 'מגיעים'
                                : g.invitation.rsvpStatus === 'DECLINED'
                                  ? 'לא מגיעים'
                                  : g.invitation.rsvpStatus === 'MAYBE'
                                    ? 'מתלבטים'
                                    : 'ממתין למענה'}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold tabular-nums">
                            {g.invitation.rsvpStatus === 'ATTENDING'
                              ? `${confirmedCount} מתוך ${g.maxInvitedCount}`
                              : `עד ${g.maxInvitedCount}`}
                          </td>
                          <td className="px-4 py-3">
                            {g.tableName ? (
                              <span className="rounded-md border border-neutral-200 bg-neutral-50 px-2 py-0.5 font-semibold text-neutral-800">
                                {g.tableName}
                              </span>
                            ) : (
                              <span className="text-neutral-400">לא שובץ</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleSendWhatsApp(g)}
                                title="שליחת הזמנה בוואטסאפ"
                                className="inline-flex items-center gap-1 rounded-md bg-emerald-700 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-800"
                              >
                                <Send className="h-3 w-3" />
                                שליחה בוואטסאפ
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditGuestModal(g)}
                                title="עריכת מוזמן ועדכון הגעה"
                                className="rounded-md border border-neutral-200 bg-white p-1.5 text-neutral-700 hover:bg-neutral-100"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const link = `${window.location.origin}/i/${g.invitation.shortCode}`;
                                  navigator.clipboard?.writeText(link);
                                  showNotification('קישור ההזמנה האישי הועתק');
                                }}
                                title="העתקת קישור אישי"
                                className="rounded-md border border-neutral-200 bg-white p-1.5 text-neutral-700 hover:bg-neutral-100"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                              <Link
                                href={`/i/${g.invitation.shortCode}`}
                                target="_blank"
                                title="צפייה בהזמנה של האורח"
                                className="rounded-md border border-neutral-200 bg-white p-1.5 text-neutral-700 hover:bg-neutral-100"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleDeleteGuest(g.id)}
                                title="מחיקת מוזמן"
                                className="rounded-md border border-neutral-200 bg-white p-1.5 text-rose-600 hover:bg-rose-50"
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

        {/* TAB 3: VISUAL INVITATION STUDIO (WITH CLOSED-LIST ISRAELI VENUES) */}
        {activeTab === 'studio' && (
          <div className="grid gap-8 lg:grid-cols-12">
            {/* Left Panel: Theme & Wedding Customizer */}
            <div className="space-y-5 lg:col-span-6">
              <div className="rounded-xl border border-neutral-200 bg-white p-5">
                <h2 className="text-sm font-bold text-neutral-900">סגנון עיצוב וצבעי ההזמנה</h2>
                <div className="mt-3.5 grid grid-cols-2 gap-2.5">
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
                        className={`flex items-center justify-between rounded-lg border p-3 text-right text-xs font-semibold transition ${
                          active
                            ? 'border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900'
                            : 'border-neutral-200 bg-white hover:bg-neutral-50'
                        }`}
                      >
                        <span>{preset.name}</span>
                        <span className="flex gap-1">
                          <span
                            className="h-3.5 w-3.5 rounded-full border border-black/15"
                            style={{ backgroundColor: preset.primaryColor }}
                          />
                          <span
                            className="h-3.5 w-3.5 rounded-full border border-black/15"
                            style={{ backgroundColor: preset.accentColor }}
                          />
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Color Pickers */}
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-medium text-neutral-600">צבע כותרות וכפתורים</label>
                    <input
                      type="color"
                      value={wedding.themeConfig.primaryColor}
                      onChange={(e) =>
                        setWedding({
                          ...wedding,
                          themeConfig: { ...wedding.themeConfig, primaryColor: e.target.value },
                        })
                      }
                      className="mt-1 h-8 w-full cursor-pointer rounded border border-neutral-300"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-neutral-600">צבע משני</label>
                    <input
                      type="color"
                      value={wedding.themeConfig.accentColor}
                      onChange={(e) =>
                        setWedding({
                          ...wedding,
                          themeConfig: { ...wedding.themeConfig, accentColor: e.target.value },
                        })
                      }
                      className="mt-1 h-8 w-full cursor-pointer rounded border border-neutral-300"
                    />
                  </div>
                </div>
              </div>

              {/* Event Details, Closed-List Israeli Venue Selector & Texts */}
              <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3.5 text-xs">
                <h3 className="text-sm font-bold text-neutral-900">
                  פרטי הזוג, מועד האירוע ומיקום בישראל
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-neutral-700">שם הכלה / צד א׳</label>
                    <input
                      type="text"
                      value={wedding.partner1Name}
                      onChange={(e) => setWedding({ ...wedding, partner1Name: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-neutral-700">שם החתן / צד ב׳</label>
                    <input
                      type="text"
                      value={wedding.partner2Name}
                      onChange={(e) => setWedding({ ...wedding, partner2Name: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-neutral-700">תאריך האירוע</label>
                    <input
                      type="date"
                      value={wedding.eventDate ? wedding.eventDate.slice(0, 10) : ''}
                      onChange={(e) =>
                        setWedding({
                          ...wedding,
                          eventDate: new Date(e.target.value).toISOString(),
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-2.5 py-2"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-neutral-700">שעת קבלת פנים</label>
                    <input
                      type="text"
                      value={wedding.receptionTime}
                      onChange={(e) => setWedding({ ...wedding, receptionTime: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-neutral-700">שעת חופה</label>
                    <input
                      type="text"
                      value={wedding.ceremonyTime}
                      onChange={(e) => setWedding({ ...wedding, ceremonyTime: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 tabular-nums"
                    />
                  </div>
                </div>

                {/* Closed-List Israeli Venue & Address Autocomplete */}
                <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-3.5">
                  <IsraeliVenueSelector
                    venueName={wedding.venueName}
                    venueAddress={wedding.venueAddress}
                    onSelectVenue={(sel) =>
                      setWedding({
                        ...wedding,
                        venueName: sel.venueName,
                        venueAddress: sel.venueAddress,
                        venueCity: sel.venueCity,
                        wazeUrl: sel.wazeUrl,
                        googleMapsUrl: sel.googleMapsUrl,
                      })
                    }
                  />
                </div>

                {/* Cover Photo Upload & URL */}
                <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="font-semibold text-neutral-700">תמונת הזוג בראש ההזמנה</label>
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-neutral-800">
                      <ImagePlus className="h-3.5 w-3.5" />
                      בחירת תמונה מהמחשב / מהטלפון
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCoverPhotoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <input
                    type="text"
                    dir="ltr"
                    value={wedding.themeConfig.coverImageUrl}
                    onChange={(e) =>
                      setWedding({
                        ...wedding,
                        themeConfig: { ...wedding.themeConfig, coverImageUrl: e.target.value },
                      })
                    }
                    placeholder="https://..."
                    className="mt-2 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2"
                  />
                </div>

                <div>
                  <label className="font-semibold text-neutral-700">נוסח ההזמנה האישי</label>
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
                    className="mt-1 w-full rounded-lg border border-neutral-300 bg-white p-2.5"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="font-semibold text-neutral-700">קישור מתנה ב-Bit</label>
                    <input
                      type="text"
                      dir="ltr"
                      value={wedding.giftConfig.bitUrl}
                      onChange={(e) =>
                        setWedding({
                          ...wedding,
                          giftConfig: { ...wedding.giftConfig, bitUrl: e.target.value },
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-neutral-700">קישור מתנה ב-PayBox</label>
                    <input
                      type="text"
                      dir="ltr"
                      value={wedding.giftConfig.payboxUrl}
                      onChange={(e) =>
                        setWedding({
                          ...wedding,
                          giftConfig: { ...wedding.giftConfig, payboxUrl: e.target.value },
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSaveWeddingSettings}
                  className="mt-3 w-full rounded-lg bg-neutral-900 py-2.5 text-xs font-bold text-white transition hover:bg-neutral-800"
                >
                  שמירת שינויים ועדכון ההזמנה
                </button>
              </div>
            </div>

            {/* Right Panel: Live Mobile Invitation Preview */}
            <div className="lg:col-span-6 flex flex-col items-center">
              <div className="mb-2.5 text-xs font-semibold text-neutral-600">
                תצוגת ההזמנה כפי שתופיע בטלפון של האורחים
              </div>
              <div className="h-[760px] w-full max-w-[400px] overflow-y-auto rounded-[32px] border-[8px] border-neutral-900 bg-white shadow-lg">
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

        {/* TAB 4: AUTOMATIC PERSONAL WHATSAPP BATCH SENDER (NO WHATSAPP BUSINESS NEEDED) */}
        {activeTab === 'whatsapp' && (
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="space-y-5 lg:col-span-5">
              <div className="rounded-xl border border-neutral-200 bg-white p-5">
                <h2 className="text-sm font-bold text-neutral-900">
                  הפצת הזמנות בוואטסאפ אישי (ללא צורך בחשבון עסקי)
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                  שליחת הזמנות אישיות ישירות מהוואטסאפ הפרטי שלכם במחשב או בטלפון — בלחיצה בודדת או
                  ברצף אוטומטי לכל רשימת המוזמנים.
                </p>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  {(
                    [
                      { id: 'SAVE_THE_DATE', label: '1. הודעת שמרו את התאריך' },
                      { id: 'INITIAL_INVITATION', label: '2. הזמנה רשמית וקישור אישור' },
                      { id: 'RSVP_REMINDER', label: '3. תזכורת לממתינים למענה' },
                      { id: 'DAY_OF_TABLE', label: '4. בוקר האירוע ומספר שולחן' },
                      { id: 'THANK_YOU', label: '5. הודעת תודה לאחר האירוע' },
                    ] as const
                  ).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCampaignType(c.id)}
                      className={`rounded-lg border px-3 py-2 text-right font-semibold transition ${
                        campaignType === c.id
                          ? 'border-neutral-900 bg-neutral-900 text-white'
                          : 'border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-neutral-100'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>

                <div className="mt-4">
                  <label className="block text-xs font-bold text-neutral-700">
                    נוסח ההודעה האישית:
                  </label>
                  <textarea
                    rows={4}
                    value={customTemplate}
                    onChange={(e) => setCustomTemplate(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white p-3 text-xs leading-relaxed"
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                    {[
                      { code: '{{guest_name}}', label: 'שם האורח' },
                      { code: '{{couple_names}}', label: 'שמות הזוג' },
                      { code: '{{event_date}}', label: 'תאריך' },
                      { code: '{{venue_name}}', label: 'שם האולם' },
                      { code: '{{rsvp_link}}', label: 'קישור אישי' },
                      { code: '{{table_number}}', label: 'מספר שולחן' },
                    ].map((variable) => (
                      <button
                        key={variable.code}
                        type="button"
                        onClick={() => setCustomTemplate((prev) => `${prev} ${variable.code}`)}
                        className="rounded border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-neutral-700 hover:bg-neutral-100"
                      >
                        + {variable.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* AUTOMATIC BATCH DISPATCH CONTROLLER (NO WHATSAPP BUSINESS REQUIRED) */}
                <div className="mt-5 rounded-xl border border-neutral-200 bg-neutral-50 p-4 space-y-3 text-xs">
                  <div className="font-bold text-neutral-900">
                    משגר תפוצה אוטומטי ברצף (מהוואטסאפ האישי שלכם)
                  </div>
                  <p className="text-[11px] leading-relaxed text-neutral-600">
                    המשגר פותח אוטומטית את ההודעה המוכנה של כל אורח בתורו באפליקציית וואטסאפ במחשב
                    (ללא פתיחת לשוניות חדשות), כך שנותר לכם רק ללחוץ אנטר לשליחה.
                  </p>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="font-semibold text-neutral-700">אופן פתיחה</label>
                      <select
                        value={batchMethod}
                        onChange={(e) =>
                          setBatchMethod(e.target.value as 'DESKTOP_APP' | 'WEB_TAB')
                        }
                        className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs"
                      >
                        <option value="DESKTOP_APP">אפליקציית וואטסאפ במחשב / נייד</option>
                        <option value="WEB_TAB">וואטסאפ ווב בדפדפן (לשונית קבועה)</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-semibold text-neutral-700">השהיה בין אורחים</label>
                      <select
                        value={batchIntervalSec}
                        onChange={(e) => setBatchIntervalSec(Number(e.target.value) || 5)}
                        className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs"
                      >
                        <option value={4}>כל 4 שניות</option>
                        <option value={6}>כל 6 שניות (מומלץ)</option>
                        <option value={8}>כל 8 שניות</option>
                        <option value={10}>כל 10 שניות</option>
                      </select>
                    </div>
                  </div>

                  {!batchRunning ? (
                    <button
                      type="button"
                      onClick={() => startAutomaticPersonalBatch(whatsappCandidates)}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-800"
                    >
                      <Play className="h-3.5 w-3.5" />
                      הפעלת שליחה אוטומטית ברצף ({whatsappCandidates.length} נמענים)
                    </button>
                  ) : (
                    <div className="space-y-3 rounded-lg border border-emerald-300 bg-white p-3.5">
                      <div className="flex items-center justify-between font-bold text-neutral-900">
                        <span>
                          שולח כעת: {batchIndex + 1} מתוך {batchQueueRef.current.length}
                        </span>
                        <span className="text-emerald-700 tabular-nums">
                          {batchPaused ? 'מושהה' : `הבא בעוד ${batchCountdown} שניות`}
                        </span>
                      </div>
                      <div className="text-xs text-neutral-700">
                        נמען נוכחי:{' '}
                        <strong>{batchQueueRef.current[batchIndex]?.fullName || ''}</strong> (
                        <span dir="ltr">{batchQueueRef.current[batchIndex]?.phoneE164 || ''}</span>)
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                        <div
                          className="h-full bg-emerald-600 transition-all"
                          style={{
                            width: `${Math.round(
                              ((batchIndex + 1) / Math.max(1, batchQueueRef.current.length)) * 100
                            )}%`,
                          }}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setBatchPaused((p) => !p)}
                          className="flex items-center justify-center gap-1 rounded-lg border border-neutral-300 bg-neutral-50 py-1.5 font-semibold text-neutral-800 hover:bg-neutral-100"
                        >
                          {batchPaused ? (
                            <>
                              <Play className="h-3.5 w-3.5" /> המשך
                            </>
                          ) : (
                            <>
                              <Pause className="h-3.5 w-3.5" /> השהה
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => void advanceBatchNow()}
                          className="flex items-center justify-center gap-1 rounded-lg bg-emerald-700 py-1.5 font-semibold text-white hover:bg-emerald-800"
                        >
                          <SkipForward className="h-3.5 w-3.5" />
                          הבא מיד
                        </button>
                        <button
                          type="button"
                          onClick={() => void stopAutomaticPersonalBatch()}
                          className="flex items-center justify-center gap-1 rounded-lg border border-rose-200 bg-rose-50 py-1.5 font-semibold text-rose-700 hover:bg-rose-100"
                        >
                          <Square className="h-3.5 w-3.5" />
                          עצור
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Recipient Queue */}
            <div className="rounded-xl border border-neutral-200 bg-white p-5 lg:col-span-7">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-neutral-900">רשימת נמענים להפצה</h3>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setWaFilterStatus('ALL')}
                    className={`rounded-lg px-3 py-1 font-semibold ${
                      waFilterStatus === 'ALL'
                        ? 'bg-neutral-900 text-white'
                        : 'bg-neutral-100 text-neutral-600'
                    }`}
                  >
                    כל המוזמנים ({guests.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setWaFilterStatus('NOT_SENT')}
                    className={`rounded-lg px-3 py-1 font-semibold ${
                      waFilterStatus === 'NOT_SENT'
                        ? 'bg-neutral-900 text-white'
                        : 'bg-neutral-100 text-neutral-600'
                    }`}
                  >
                    טרם נשלחה הזמנה (
                    {guests.filter((g) => g.invitation.deliveryStatus === 'NOT_SENT').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setWaFilterStatus('PENDING')}
                    className={`rounded-lg px-3 py-1 font-semibold ${
                      waFilterStatus === 'PENDING'
                        ? 'bg-neutral-900 text-white'
                        : 'bg-neutral-100 text-neutral-600'
                    }`}
                  >
                    ממתינים למענה (
                    {guests.filter((g) => g.invitation.rsvpStatus === 'PENDING').length})
                  </button>
                </div>
              </div>

              <div className="space-y-2.5 max-h-[560px] overflow-y-auto pr-1">
                {whatsappCandidates.map((g) => {
                  const baseUrl =
                    typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
                  const { renderedMessage } = buildWhatsAppInvitationLink({
                    template: customTemplate,
                    wedding,
                    guest: g,
                    baseUrl,
                  });
                  const deliveryLabel =
                    g.invitation.deliveryStatus === 'OPENED'
                      ? 'נצפתה ההזמנה'
                      : g.invitation.deliveryStatus === 'NOT_SENT'
                        ? 'טרם נשלח'
                        : 'נשלחה הודעה';

                  return (
                    <div
                      key={g.id}
                      className="rounded-lg border border-neutral-200 bg-neutral-50/70 p-3.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-neutral-900">{g.fullName}</span>
                          <span className="font-mono text-neutral-500" dir="ltr">
                            {g.phoneE164}
                          </span>
                          <span className="rounded border border-neutral-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-neutral-600">
                            {deliveryLabel}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSendWhatsApp(g)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 font-semibold text-white hover:bg-emerald-800"
                        >
                          <Send className="h-3 w-3" />
                          שליחה בוואטסאפ
                        </button>
                      </div>
                      <p className="mt-2 rounded border border-neutral-200 bg-white p-2.5 text-neutral-600 leading-relaxed">
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
          <div className="space-y-5">
            {/* Top Bar: Create Table + Export Venue CSV */}
            <div className="rounded-xl border border-neutral-200 bg-white p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-neutral-900">
                    סידורי הושבה וניהול שולחנות באולם
                  </h2>
                  <p className="text-xs text-neutral-500">
                    שיבוץ אורחים שאישרו הגעה לשולחנות וייצוא קובץ מרוכז למנהל האירוע.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportSeatingCsv}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800"
                >
                  <Download className="h-3.5 w-3.5" />
                  ייצוא דוח הושבה ומנות לאולם (אקסל / CSV)
                </button>
              </div>

              <form onSubmit={handleCreateTable} className="grid gap-2.5 sm:grid-cols-5">
                <input
                  type="text"
                  required
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  placeholder="שם/מספר שולחן (למשל: שולחן 3 - משפחת החתן)"
                  className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs sm:col-span-2"
                />
                <input
                  type="text"
                  value={newTableCategory}
                  onChange={(e) => setNewTableCategory(e.target.value)}
                  placeholder="קבוצת ישיבה"
                  className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs"
                />
                <div className="flex gap-2">
                  <select
                    value={newTableShape}
                    onChange={(e) =>
                      setNewTableShape(e.target.value as 'ROUND' | 'RECTANGLE' | 'SQUARE')
                    }
                    className="flex-1 rounded-lg border border-neutral-300 bg-white px-2.5 py-2 text-xs"
                  >
                    <option value="ROUND">שולחן עגול</option>
                    <option value="RECTANGLE">שולחן אבירים</option>
                    <option value="SQUARE">שולחן מרובע</option>
                  </select>
                  <input
                    type="number"
                    min={2}
                    max={30}
                    value={newTableCapacity}
                    onChange={(e) => setNewTableCapacity(Number(e.target.value) || 12)}
                    className="w-16 rounded-lg border border-neutral-300 bg-white px-2 py-2 text-center text-xs font-bold tabular-nums"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-lg bg-neutral-900 px-4 py-2 text-xs font-bold text-white hover:bg-neutral-800"
                >
                  הוספת שולחן
                </button>
              </form>

              {seatingError && (
                <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                  {seatingError}
                </div>
              )}
            </div>

            <div className="grid gap-5 lg:grid-cols-12">
              {/* Left Sidebar: Unseated Guests Queue */}
              <div className="rounded-xl border border-neutral-200 bg-white p-5 lg:col-span-4">
                <h3 className="text-xs font-bold text-neutral-900">
                  ממתינים לשיבוץ שולחן (
                  {
                    guests.filter(
                      (g) => !g.tableId && g.invitation.rsvpStatus !== 'DECLINED'
                    ).length
                  }
                  )
                </h3>
                <div className="mt-3 space-y-2 max-h-[520px] overflow-y-auto">
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
                          className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs"
                        >
                          <div className="flex items-center justify-between font-bold">
                            <span>{g.fullName}</span>
                            <span className="rounded border border-neutral-200 bg-white px-2 py-0.5 text-[11px] text-neutral-700">
                              {seats} מקומות
                            </span>
                          </div>
                          <div className="mt-1 text-[11px] text-neutral-500">{g.groupName}</div>
                          <select
                            aria-label={`שיבוץ ${g.fullName} לשולחן`}
                            value={g.tableId || ''}
                            onChange={(e) => handleAssignTable(g.id, e.target.value || null)}
                            className="mt-2 w-full rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-medium"
                          >
                            <option value="">בחירת שולחן לשיבוץ...</option>
                            {tables.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.tableNumber} (עד {t.capacity} מקומות)
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
                      className="flex flex-col justify-between rounded-xl border border-neutral-200 bg-white p-5"
                    >
                      <div>
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="inline-block rounded border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[10px] font-semibold text-neutral-600">
                              {table.tableShape === 'ROUND'
                                ? 'שולחן עגול'
                                : table.tableShape === 'RECTANGLE'
                                  ? 'שולחן אבירים'
                                  : 'שולחן מרובע'}
                            </span>
                            <h4 className="mt-1 text-sm font-bold text-neutral-900">
                              {table.tableNumber}
                            </h4>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`rounded-md px-2.5 py-1 text-xs font-bold tabular-nums ${
                                occupiedSeats >= table.capacity
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-neutral-100 text-neutral-800'
                              }`}
                            >
                              {occupiedSeats} / {table.capacity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteTable(table.id)}
                              title="מחיקת שולחן"
                              className="rounded-md border border-neutral-200 bg-white p-1 text-rose-600 hover:bg-rose-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Capacity Bar */}
                        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                          <div
                            className="h-full rounded-full bg-neutral-800 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>

                        {/* Seated Guests List */}
                        <div className="mt-4 space-y-1.5">
                          {seatedGuests.length === 0 ? (
                            <p className="py-4 text-center text-xs text-neutral-400">
                              השולחן פנוי — בחרו אורחים מרשימת ההמתנה
                            </p>
                          ) : (
                            seatedGuests.map((sg) => {
                              const alloc =
                                tableAssignments.find((a) => a.guestId === sg.id)?.seatsAllocated ||
                                1;
                              return (
                                <div
                                  key={sg.id}
                                  className="flex items-center justify-between rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2 text-xs"
                                >
                                  <div>
                                    <span className="font-semibold text-neutral-900">
                                      {sg.fullName}
                                    </span>
                                    <span className="mx-1.5 text-neutral-500">
                                      ({alloc} מקומות)
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleAssignTable(sg.id, null)}
                                    className="text-[11px] font-semibold text-rose-600 hover:underline"
                                  >
                                    הסרה
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
          <div className="space-y-5">
            <div className="rounded-xl border border-neutral-200 bg-white p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500">
                    <UserCheck className="h-4 w-4" />
                    עמדת קליטת אורחים בכניסה לאולם
                  </span>
                  <h2 className="mt-1 text-xl font-bold text-neutral-900">
                    נקלטו בכניסה: {statistics.checkedInPeople} מתוך {statistics.totalConfirmedPeople}{' '}
                    אורחים מאושרים
                  </h2>
                </div>
                <div className="w-full max-w-md">
                  <input
                    type="text"
                    value={checkinQuery}
                    onChange={(e) => setCheckinQuery(e.target.value)}
                    placeholder="חיפוש מהיר לפי שם משפחה, טלפון או סריקת קוד..."
                    className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-4 py-2.5 text-xs text-neutral-900 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {checkinFilteredGuests.map((g) => {
                const count =
                  g.invitation.rsvpStatus === 'ATTENDING'
                    ? g.invitation.confirmedAdults + g.invitation.confirmedChildren
                    : g.maxInvitedCount;
                return (
                  <div
                    key={g.id}
                    className={`flex flex-col justify-between rounded-xl border p-5 transition ${
                      g.invitation.checkedIn
                        ? 'border-emerald-300 bg-emerald-50/40'
                        : 'border-neutral-200 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-bold text-neutral-900">{g.fullName}</h3>
                          <p className="mt-0.5 text-xs text-neutral-500">
                            {g.groupName} • <span dir="ltr">{g.phoneE164}</span>
                          </p>
                        </div>
                        <span className="rounded-md bg-neutral-900 px-2.5 py-1 text-xs font-bold tabular-nums text-white">
                          {count} אורחים
                        </span>
                      </div>

                      {/* Table Number Display for Reception Host */}
                      <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-center">
                        <div className="text-[11px] font-medium text-neutral-500">
                          שולחן משובץ באולם
                        </div>
                        <div className="mt-0.5 text-base font-bold text-neutral-900">
                          {g.tableName || 'טרם שובץ שולחן'}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCheckInToggle(g)}
                      className={`mt-4 flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold transition ${
                        g.invitation.checkedIn
                          ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                          : 'bg-neutral-900 text-white hover:bg-neutral-800'
                      }`}
                    >
                      <Check className="h-3.5 w-3.5" />
                      {g.invitation.checkedIn
                        ? `נקלטו באולם (${g.invitation.checkedInCount}) — לחצו לביטול`
                        : 'רישום כניסה לאולם'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 7: GREETING WALL & DIGITAL GIFTS */}
        {activeTab === 'greetings' && (
          <div className="grid gap-5 lg:grid-cols-12">
            <div className="rounded-xl border border-neutral-200 bg-white p-5 lg:col-span-4 space-y-4">
              <h2 className="text-sm font-bold text-neutral-900">ספר ברכות ומתנות דיגיטליות</h2>
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                <div className="text-xs text-neutral-500">סה״כ ברכות שהתקבלו מהאורחים</div>
                <div className="mt-1 text-2xl font-bold tabular-nums text-neutral-900">
                  {greetings.length}
                </div>
                {totalGiftsReported > 0 && (
                  <div className="mt-1 text-xs text-neutral-600">
                    סכום מתנות שדווח: ₪{totalGiftsReported.toLocaleString()} (גלוי רק לכם)
                  </div>
                )}
              </div>
              <div className="space-y-2 text-xs text-neutral-600">
                <div>
                  <strong>קישור Bit:</strong> {wedding.giftConfig.bitUrl || 'לא הוגדר'}
                </div>
                <div>
                  <strong>קישור PayBox:</strong> {wedding.giftConfig.payboxUrl || 'לא הוגדר'}
                </div>
                <div>
                  <strong>פרטי העברה בנקאית:</strong> {wedding.giftConfig.bankDetails || 'לא הוגדר'}
                </div>
              </div>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2 lg:col-span-8">
              {greetings.map((gr) => (
                <div
                  key={gr.id}
                  className="rounded-xl border border-neutral-200 bg-white p-5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-neutral-900">{gr.authorName}</h4>
                      <span className="text-xs text-neutral-500">{gr.relationship}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {gr.giftAmountReported && (
                        <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                          ₪{gr.giftAmountReported}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteGreeting(gr.id)}
                        title="מחיקת ברכה"
                        className="rounded-md border border-neutral-200 bg-white p-1.5 text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-neutral-700">{gr.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* MODAL 1: CSV / EXCEL BULK GUEST IMPORT */}
      {showCsvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-neutral-900">
              ייבוא רשימת מוזמנים מקובץ אקסל / CSV
            </h3>
            <p className="mt-1 text-xs text-neutral-500">
              הדביקו שורות בפורמט: שם מלא, טלפון, כמות מוזמנים, קבוצה, צד, הערות
            </p>
            <textarea
              rows={6}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              dir="rtl"
              className="mt-3 w-full rounded-lg border border-neutral-300 bg-neutral-50 p-3 font-mono text-xs"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCsvModal(false)}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-xs font-semibold"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={handleImportCsv}
                className="rounded-lg bg-neutral-900 px-5 py-2 text-xs font-bold text-white hover:bg-neutral-800"
              >
                ביצוע ייבוא מוזמנים
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE NEW WEDDING (WITH CLOSED-LIST ISRAELI VENUES) */}
      {showNewWeddingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleCreateWedding}
            className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl space-y-3 text-xs"
          >
            <h3 className="text-base font-bold text-neutral-900">הקמת אירוע חדש</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-neutral-700">שם הכלה / צד א׳</label>
                <input
                  type="text"
                  required
                  value={nwPartner1}
                  onChange={(e) => setNwPartner1(e.target.value)}
                  placeholder="למשל: נועה כהן"
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2"
                />
              </div>
              <div>
                <label className="font-semibold text-neutral-700">שם החתן / צד ב׳</label>
                <input
                  type="text"
                  required
                  value={nwPartner2}
                  onChange={(e) => setNwPartner2(e.target.value)}
                  placeholder="למשל: איתי לוי"
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2"
                />
              </div>
            </div>
            <div>
              <label className="font-semibold text-neutral-700">תאריך האירוע</label>
              <input
                type="date"
                required
                value={nwDate}
                onChange={(e) => setNwDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2"
              />
            </div>

            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
              <IsraeliVenueSelector
                venueName={nwVenue}
                venueAddress={nwAddress}
                compact
                onSelectVenue={(sel) => {
                  setNwVenue(sel.venueName);
                  setNwAddress(sel.venueAddress);
                }}
              />
            </div>

            <div className="mt-4 flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewWeddingModal(false)}
                className="rounded-lg border border-neutral-300 px-4 py-2 font-semibold"
              >
                ביטול
              </button>
              <button
                type="submit"
                className="rounded-lg bg-neutral-900 px-5 py-2 font-bold text-white hover:bg-neutral-800"
              >
                שמירה והקמת אירוע
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: EDIT GUEST & MANUAL RSVP OVERRIDE */}
      {editingGuest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleSaveEditedGuest}
            className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl space-y-3 text-xs"
          >
            <h3 className="text-base font-bold text-neutral-900">
              עריכת פרטי מוזמן — {editingGuest.fullName}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-neutral-700">שם מלא</label>
                <input
                  type="text"
                  required
                  value={editGuestName}
                  onChange={(e) => setEditGuestName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2"
                />
              </div>
              <div>
                <label className="font-semibold text-neutral-700">טלפון נייד</label>
                <input
                  type="text"
                  required
                  value={editGuestPhone}
                  onChange={(e) => setEditGuestPhone(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="font-semibold text-neutral-700">מקסימום מוזמנים</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={editGuestMax}
                  onChange={(e) => setEditGuestMax(Number(e.target.value) || 1)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2"
                />
              </div>
              <div>
                <label className="font-semibold text-neutral-700">קבוצה</label>
                <input
                  type="text"
                  value={editGuestGroup}
                  onChange={(e) => setEditGuestGroup(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2"
                />
              </div>
              <div>
                <label className="font-semibold text-neutral-700">צד</label>
                <select
                  value={editGuestSide}
                  onChange={(e) => setEditGuestSide(e.target.value as WeddingSide)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-2 py-2"
                >
                  <option value="PARTNER_1">צד {wedding.partner1Name}</option>
                  <option value="PARTNER_2">צד {wedding.partner2Name}</option>
                  <option value="BOTH">משותף</option>
                </select>
              </div>
            </div>

            <div className="border-t border-neutral-100 pt-3">
              <label className="font-bold text-neutral-700">סטטוס אישור הגעה</label>
              <select
                value={editGuestRsvp}
                onChange={(e) => {
                  const next = e.target.value as RsvpStatus;
                  setEditGuestRsvp(next);
                  if (next === 'ATTENDING' && editGuestAdults === 0) {
                    setEditGuestAdults(editGuestMax);
                  }
                }}
                className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 font-semibold"
              >
                <option value="PENDING">ממתין למענה</option>
                <option value="ATTENDING">מגיעים</option>
                <option value="MAYBE">מתלבטים</option>
                <option value="DECLINED">לא מגיעים</option>
              </select>
            </div>

            {editGuestRsvp !== 'DECLINED' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-neutral-700">מבוגרים מאושרים</label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={editGuestAdults}
                    onChange={(e) => setEditGuestAdults(Number(e.target.value) || 0)}
                    className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2"
                  />
                </div>
                <div>
                  <label className="font-semibold text-neutral-700">ילדים מאושרים</label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={editGuestChildren}
                    onChange={(e) => setEditGuestChildren(Number(e.target.value) || 0)}
                    className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="font-semibold text-neutral-700">הערות תזונה / כשרות</label>
              <input
                type="text"
                value={editGuestDietary}
                onChange={(e) => setEditGuestDietary(e.target.value)}
                placeholder="צמחוני, טבעוני, ללא גלוטן..."
                className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2"
              />
            </div>

            <div className="mt-4 flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingGuest(null)}
                className="rounded-lg border border-neutral-300 px-4 py-2 font-semibold"
              >
                ביטול
              </button>
              <button
                type="submit"
                className="rounded-lg bg-neutral-900 px-5 py-2 font-bold text-white hover:bg-neutral-800"
              >
                שמירת שינויים
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

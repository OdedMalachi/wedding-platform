'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Calculator,
  Calendar,
  Check,
  ClipboardList,
  Clock,
  Download,
  Phone,
  Plus,
  Save,
  Trash2,
  Wallet,
} from 'lucide-react';
import type {
  ManagementConfig,
  Wedding,
  WeddingStatistics,
  WeddingTaskItem,
  WeddingTimelineItem,
  WeddingVendorItem,
} from '@/types/wedding';
import { IsraeliVenueSelector } from '@/components/common/IsraeliVenueSelector';

export const ISRAELI_VENDOR_CATEGORIES = [
  'צילום סטילס ווידאו',
  'דיג׳יי ומוזיקה',
  'שמלת כלה והתארגנות',
  'איפור ועיצוב שיער',
  'חליפת חתן ואביזרים',
  'עיצוב אולם וחופה',
  'רבנות, רב וכתובה',
  'בר אלכוהול ושדרוגים',
  'טבעות נישואין',
  'צילום מגנטים ואטרקציות',
  'הסעות לאורחים',
  'טיפים לצוות האולם ומלצרים',
] as const;

export function getDefaultManagementConfig(wedding: Wedding): ManagementConfig {
  return {
    cateringPricePerPlate: 380,
    reservePercentage: 10,
    eventManagerName: 'מנהל האירוע באולם',
    eventManagerPhone: '050-0000000',
    bestManName: 'אחראי מטעם המשפחה (רזרבות וספקים)',
    bestManPhone: '054-0000000',
    vendors: [
      {
        id: 'v-photo',
        category: 'צילום סטילס ווידאו',
        vendorName: 'סטודיו צילום אירועים',
        phone: '054-2003000',
        totalPrice: 11500,
        paidAmount: 3000,
        status: 'DEPOSIT_PAID',
        notes: 'כולל 2 צלמי סטילס, צלם וידאו ואלבומים',
      },
      {
        id: 'v-dj',
        category: 'דיג׳יי ומוזיקה',
        vendorName: 'דיג׳יי לחתונה',
        phone: '052-4005000',
        totalPrice: 7500,
        paidAmount: 2000,
        status: 'DEPOSIT_PAID',
        notes: 'כולל הגברה ותאורה',
      },
      {
        id: 'v-dress',
        category: 'שמלת כלה והתארגנות',
        vendorName: 'סטודיו שמלות כלה',
        phone: '050-6007000',
        totalPrice: 9500,
        paidAmount: 4500,
        status: 'DEPOSIT_PAID',
        notes: '',
      },
      {
        id: 'v-makeup',
        category: 'איפור ועיצוב שיער',
        vendorName: 'איפור ושיער כלה',
        phone: '054-8009000',
        totalPrice: 3800,
        paidAmount: 800,
        status: 'DEPOSIT_PAID',
        notes: 'כולל ליווי לאולם',
      },
    ],
    tasks: [
      {
        id: 't-1',
        title: 'פתיחת תיק נישואין ברבנות / ארגון צוהר ותיאום רב מחתן',
        category: 'רבנות וטקס',
        assignee: 'BOTH',
        dueTiming: 'חודשיים לפני האירוע',
        completed: true,
      },
      {
        id: 't-2',
        title: 'טעימות באולם ובחירת תפריט סופי מול השף',
        category: 'אולם וקייטרינג',
        assignee: 'FAMILY',
        dueTiming: 'חודש לפני האירוע',
        completed: true,
      },
      {
        id: 't-3',
        title: 'רכישת טבעות נישואין, כוס לשבירה ואיסוף כתובה',
        category: 'רבנות וטקס',
        assignee: 'GROOM',
        dueTiming: '3 שבועות לפני האירוע',
        completed: false,
      },
      {
        id: 't-4',
        title: 'פגישת מוזיקה עם הדיג׳יי (בחירת שיר כניסה לחופה ושבירת כוס)',
        category: 'מוזיקה',
        assignee: 'BOTH',
        dueTiming: '3 שבועות לפני האירוע',
        completed: false,
      },
      {
        id: 't-5',
        title: 'הפצת הזמנות דיגיטליות בוואטסאפ לכל ספר המוזמנים',
        category: 'מוזמנים',
        assignee: 'BOTH',
        dueTiming: '3 שבועות לפני האירוע',
        completed: false,
      },
      {
        id: 't-6',
        title: 'סבב טלפונים לאורחים שטרם השיבו להזמנה ועדכון סטטוס במערכת',
        category: 'מוזמנים',
        assignee: 'FAMILY',
        dueTiming: '7 ימים לפני האירוע',
        completed: false,
      },
      {
        id: 't-7',
        title: 'מסירת התחייבות מנות סופית לאולם (בניכוי 10% רזרבה!)',
        category: 'אולם וקייטרינג',
        assignee: 'FAMILY',
        dueTiming: '4 ימים לפני האירוע',
        completed: false,
      },
      {
        id: 't-8',
        title: 'סגירת סידורי הושבה והדפסת דוח שולחנות ומנות מיוחדות למנהל האירוע',
        category: 'סידורי הושבה',
        assignee: 'BOTH',
        dueTiming: 'יומיים לפני האירוע',
        completed: false,
      },
      {
        id: 't-9',
        title: 'הכנת מעטפות תשלום לספקים וטיפים למנהל האירוע והמלצרים',
        category: 'תקציב וספקים',
        assignee: 'GROOM',
        dueTiming: 'יום לפני האירוע',
        completed: false,
      },
    ],
    timeline: [
      {
        id: 'tl-1',
        time: '10:00',
        title: 'תחילת התארגנות, איפור ועיצוב שיער',
        location: 'מלון / סטודיו התארגנות',
        notes: 'ארוחת בוקר קלה ושתייה',
      },
      {
        id: 'tl-2',
        time: '14:30',
        title: 'מפגש חתן-כלה ויציאה לצילומי חוץ',
        location: 'לוקיישן צילומים',
        notes: 'לוודא הגעת צלמי סטילס ווידאו בזמן',
      },
      {
        id: 'tl-3',
        time: '17:30',
        title: 'הגעה לאולם וצילומי משפחות מדרגה ראשונה',
        location: wedding.venueName,
        notes: 'חשוב שההורים והאחים יהיו לבושים ומוכנים באולם ב-17:30',
      },
      {
        id: 'tl-4',
        time: '18:45',
        title: 'מעמד חתימת הכתובה עם הרב והעדים',
        location: 'חדר ייחוד / מתחם החופה',
        notes: 'להכין תעודות זהות של העדים, כתובה וטבעת',
      },
      {
        id: 'tl-5',
        time: wedding.receptionTime || '19:30',
        title: 'פתיחת קבלת פנים וקליטת אורחים בעמדת הכניסה',
        location: wedding.venueName,
        notes: 'פתיחת עמדות האוכל והבר',
      },
      {
        id: 'tl-6',
        time: wedding.ceremonyTime || '20:30',
        title: 'טקס חופה וקידושין',
        location: 'מתחם החופה',
        notes: 'יין לקידוש, כוס לשבירה וטבעות אצל המלווה',
      },
      {
        id: 'tl-7',
        time: '21:15',
        title: 'פתיחת רחבת הריקודים והגשת מנות לשולחנות',
        location: 'אולם מרכזי',
        notes: 'בדיקת פתיחת שולחנות רזרבה רק באישור אחראי המשפחה',
      },
    ],
  };
}

interface WeddingManagementPageProps {
  wedding: Wedding;
  statistics: WeddingStatistics;
  totalGiftsReported: number;
  onUpdateWedding: (updatedWedding: Wedding, saveToServer?: boolean) => Promise<void>;
}

export function WeddingManagementPage({
  wedding,
  statistics,
  totalGiftsReported,
  onUpdateWedding,
}: WeddingManagementPageProps) {
  const [config, setConfig] = useState<ManagementConfig>(() =>
    wedding.managementConfig && wedding.managementConfig.vendors
      ? wedding.managementConfig
      : getDefaultManagementConfig(wedding)
  );
  const [saving, setSaving] = useState(false);

  // New Vendor Form State
  const [newVendorCategory, setNewVendorCategory] = useState<string>(ISRAELI_VENDOR_CATEGORIES[0]);
  const [newVendorName, setNewVendorName] = useState('');
  const [newVendorPhone, setNewVendorPhone] = useState('');
  const [newVendorPrice, setNewVendorPrice] = useState<number>(5000);
  const [newVendorPaid, setNewVendorPaid] = useState<number>(1000);

  // New Task Form State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] =
    useState<WeddingTaskItem['assignee']>('BOTH');
  const [newTaskDue, setNewTaskDue] = useState('שבוע לפני האירוע');

  // New Timeline Item State
  const [newTlTime, setNewTlTime] = useState('22:30');
  const [newTlTitle, setNewTlTitle] = useState('');
  const [newTlLocation, setNewTlLocation] = useState(wedding.venueName);

  useEffect(() => {
    if (wedding.managementConfig && wedding.managementConfig.vendors) {
      setConfig(wedding.managementConfig);
    } else {
      setConfig(getDefaultManagementConfig(wedding));
    }
  }, [wedding]);

  const persistConfig = async (nextConfig: ManagementConfig, nextWeddingFields?: Partial<Wedding>) => {
    setConfig(nextConfig);
    setSaving(true);
    try {
      await onUpdateWedding(
        {
          ...wedding,
          ...(nextWeddingFields || {}),
          managementConfig: nextConfig,
        },
        true
      );
    } finally {
      setSaving(false);
    }
  };

  // Financial & Catering Reserve Calculations
  const financialSummary = useMemo(() => {
    const confirmedGuests = statistics.totalConfirmedPeople;
    const reserveFactor = Math.max(0, Math.min(30, config.reservePercentage || 10)) / 100;
    const committedPlatesToVenue = Math.max(
      0,
      Math.floor(confirmedGuests * (1 - reserveFactor))
    );
    const reservePlatesCount = Math.max(0, confirmedGuests - committedPlatesToVenue);
    const venueCateringTotal =
      committedPlatesToVenue * Math.max(0, config.cateringPricePerPlate || 0);
    const venueFullIfAllArrive =
      confirmedGuests * Math.max(0, config.cateringPricePerPlate || 0);

    const vendorsTotal = config.vendors.reduce((acc, v) => acc + (Number(v.totalPrice) || 0), 0);
    const vendorsPaid = config.vendors.reduce((acc, v) => acc + (Number(v.paidAmount) || 0), 0);
    const vendorsRemaining = Math.max(0, vendorsTotal - vendorsPaid);

    const grandTotalEstimated = venueFullIfAllArrive + vendorsTotal;
    const breakEvenPerGuest =
      confirmedGuests > 0 ? Math.round(grandTotalEstimated / confirmedGuests) : 0;

    return {
      confirmedGuests,
      committedPlatesToVenue,
      reservePlatesCount,
      venueCateringTotal,
      venueFullIfAllArrive,
      vendorsTotal,
      vendorsPaid,
      vendorsRemaining,
      grandTotalEstimated,
      breakEvenPerGuest,
    };
  }, [
    config.cateringPricePerPlate,
    config.reservePercentage,
    config.vendors,
    statistics.totalConfirmedPeople,
  ]);

  const handleAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendorName.trim()) return;
    const item: WeddingVendorItem = {
      id: `v-${Date.now()}`,
      category: newVendorCategory,
      vendorName: newVendorName.trim(),
      phone: newVendorPhone.trim(),
      totalPrice: Number(newVendorPrice) || 0,
      paidAmount: Number(newVendorPaid) || 0,
      status:
        Number(newVendorPaid) >= Number(newVendorPrice)
          ? 'PAID_IN_FULL'
          : Number(newVendorPaid) > 0
            ? 'DEPOSIT_PAID'
            : 'QUOTE',
      notes: '',
    };
    const next = { ...config, vendors: [...config.vendors, item] };
    setNewVendorName('');
    setNewVendorPhone('');
    await persistConfig(next);
  };

  const handleUpdateVendorPaid = async (vendorId: string, paidAmount: number) => {
    const nextVendors = config.vendors.map((v) => {
      if (v.id !== vendorId) return v;
      const cleanPaid = Math.max(0, paidAmount);
      return {
        ...v,
        paidAmount: cleanPaid,
        status:
          cleanPaid >= v.totalPrice
            ? ('PAID_IN_FULL' as const)
            : cleanPaid > 0
              ? ('DEPOSIT_PAID' as const)
              : ('QUOTE' as const),
      };
    });
    await persistConfig({ ...config, vendors: nextVendors });
  };

  const handleDeleteVendor = async (vendorId: string) => {
    const nextVendors = config.vendors.filter((v) => v.id !== vendorId);
    await persistConfig({ ...config, vendors: nextVendors });
  };

  const handleToggleTask = async (taskId: string) => {
    const nextTasks = config.tasks.map((t) =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    await persistConfig({ ...config, tasks: nextTasks });
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const item: WeddingTaskItem = {
      id: `t-${Date.now()}`,
      title: newTaskTitle.trim(),
      category: 'משימה מותאמת',
      assignee: newTaskAssignee,
      dueTiming: newTaskDue.trim() || 'לפני האירוע',
      completed: false,
    };
    setNewTaskTitle('');
    await persistConfig({ ...config, tasks: [...config.tasks, item] });
  };

  const handleDeleteTask = async (taskId: string) => {
    await persistConfig({
      ...config,
      tasks: config.tasks.filter((t) => t.id !== taskId),
    });
  };

  const handleAddTimelineItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTlTitle.trim()) return;
    const item: WeddingTimelineItem = {
      id: `tl-${Date.now()}`,
      time: newTlTime,
      title: newTlTitle.trim(),
      location: newTlLocation.trim() || wedding.venueName,
      notes: '',
    };
    const nextTimeline = [...config.timeline, item].sort((a, b) =>
      a.time.localeCompare(b.time)
    );
    setNewTlTitle('');
    await persistConfig({ ...config, timeline: nextTimeline });
  };

  const handleDeleteTimelineItem = async (tlId: string) => {
    await persistConfig({
      ...config,
      timeline: config.timeline.filter((item) => item.id !== tlId),
    });
  };

  const handleExportManagementCsv = () => {
    const header = 'קטגוריית ספק,שם הספק,טלפון,עלות כוללת (ש"ח),שולם עד כה (ש"ח),יתרה לתשלום (ש"ח)\n';
    const rows = config.vendors
      .map(
        (v) =>
          `"${v.category}","${v.vendorName}","${v.phone}",${v.totalPrice},${v.paidAmount},${Math.max(
            0,
            v.totalPrice - v.paidAmount
          )}`
      )
      .join('\n');
    const summaryRows = [
      '',
      `"מחיר מנה באולם","${wedding.venueName}","",${config.cateringPricePerPlate},0,0`,
      `"כמות מנות להתחייבות (בניכוי ${config.reservePercentage}% רזרבה)","${financialSummary.committedPlatesToVenue} מנות","",${financialSummary.venueCateringTotal},0,${financialSummary.venueCateringTotal}`,
      `"סה"כ תקציב חתונה משוער","","",${financialSummary.grandTotalEstimated},${financialSummary.vendorsPaid},${
        financialSummary.grandTotalEstimated - financialSummary.vendorsPaid
      }`,
    ].join('\n');

    const blob = new Blob(['\uFEFF' + header + rows + summaryRows], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `דוח-ניהול-תקציב-וספקים-${wedding.partner1Name}-${wedding.partner2Name}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const completedTasksCount = config.tasks.filter((t) => t.completed).length;
  const tasksProgressPct =
    config.tasks.length > 0
      ? Math.round((completedTasksCount / config.tasks.length) * 100)
      : 0;

  return (
    <div dir="rtl" className="space-y-6">
      {/* Top Management Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-white p-5">
        <div>
          <h1 className="text-lg font-bold text-neutral-900">
            דף ניהול החתונה — {wedding.partner1Name} ו{wedding.partner2Name}
          </h1>
          <p className="mt-0.5 text-xs text-neutral-500">
            ניהול תקציב וספקים, מחשבון התחייבות מנות ורזרבות מול האולם, משימות ולו״ז יום האירוע
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportManagementCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-800 hover:bg-neutral-50"
          >
            <Download className="h-3.5 w-3.5" />
            ייצוא דוח תקציב וספקים (CSV)
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void persistConfig(config)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-2 text-xs font-bold text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? 'שומר...' : 'שמירת נתוני ניהול'}
          </button>
        </div>
      </div>

      {/* SECTION 1: FINANCIAL & VENUE RESERVE CALCULATOR KPI CARDS */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <div className="text-xs font-medium text-neutral-500">אורחים שאישרו הגעה</div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-neutral-900">
            {financialSummary.confirmedGuests}
          </div>
          <div className="mt-1 text-[11px] text-neutral-500">לפי אישורי ההגעה במערכת</div>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
          <div className="text-xs font-semibold text-emerald-900">
            התחייבות מנות מומלצת לאולם
          </div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-emerald-800">
            {financialSummary.committedPlatesToVenue}
          </div>
          <div className="mt-1 text-[11px] text-emerald-700">
            בניכוי {config.reservePercentage}% רזרבה ({financialSummary.reservePlatesCount} מנות רזרבה)
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <div className="text-xs font-medium text-neutral-500">עלות מנות באולם</div>
          <div className="mt-1 text-xl font-bold tabular-nums text-neutral-900">
            ₪{financialSummary.venueCateringTotal.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-neutral-500">
            לפי ₪{config.cateringPricePerPlate} למנה
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <div className="text-xs font-medium text-neutral-500">סה״כ ספקים חיצוניים</div>
          <div className="mt-1 text-xl font-bold tabular-nums text-neutral-900">
            ₪{financialSummary.vendorsTotal.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-neutral-500">
            שולם: ₪{financialSummary.vendorsPaid.toLocaleString()}
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <div className="text-xs font-medium text-neutral-500">יתרה לתשלום לספקים</div>
          <div className="mt-1 text-xl font-bold tabular-nums text-amber-700">
            ₪{financialSummary.vendorsRemaining.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-neutral-500">להכנה במעטפות ליום האירוע</div>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <div className="text-xs font-medium text-neutral-500">עלות כוללת לאורח (Break-Even)</div>
          <div className="mt-1 text-xl font-bold tabular-nums text-neutral-900">
            ₪{financialSummary.breakEvenPerGuest.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-neutral-500">
            סה״כ תקציב: ₪{financialSummary.grandTotalEstimated.toLocaleString()}
          </div>
        </div>
      </div>

      {/* SECTION 2: VENUE RESERVE CALCULATOR & CORE WEDDING SETTINGS */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left: Catering & Reserve Settings + Key Wedding Day Contacts */}
        <div className="space-y-5 lg:col-span-5">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4 text-xs">
            <h2 className="flex items-center gap-2 text-sm font-bold text-neutral-900">
              <Calculator className="h-4 w-4 text-neutral-700" />
              מחשבון מנות, רזרבות ואנשי קשר באולם
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-neutral-700">מחיר מנה באולם (₪ כולל מע״מ)</label>
                <input
                  type="number"
                  min={0}
                  value={config.cateringPricePerPlate}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      cateringPricePerPlate: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 font-bold tabular-nums"
                />
              </div>
              <div>
                <label className="font-semibold text-neutral-700">אחוז רזרבה מול האולם (%)</label>
                <select
                  value={config.reservePercentage}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      reservePercentage: Number(e.target.value) || 10,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 font-bold"
                >
                  <option value={10}>10% רזרבה (מומלץ בישראל)</option>
                  <option value={15}>15% רזרבה</option>
                  <option value={5}>5% רזרבה</option>
                  <option value={0}>0% (ללא ניכוי רזרבה)</option>
                </select>
              </div>
            </div>

            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-[11px] leading-relaxed text-neutral-700">
              <strong>כלל אצבע חשוב מול האולם:</strong> מתוך{' '}
              <strong>{financialSummary.confirmedGuests}</strong> אורחים שאישרו הגעה, מומלץ להתחייב
              לאולם על <strong>{financialSummary.committedPlatesToVenue} מנות סגורות</strong> בלבד,
              ולהשאיר <strong>{financialSummary.reservePlatesCount} מנות ברזרבה</strong> (שנפתחות
              בערב האירוע רק באישור אחראי מטעם המשפחה).
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-neutral-100 pt-3">
              <div>
                <label className="font-semibold text-neutral-700">שם מנהל האירוע באולם</label>
                <input
                  type="text"
                  value={config.eventManagerName}
                  onChange={(e) => setConfig({ ...config, eventManagerName: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2"
                />
              </div>
              <div>
                <label className="font-semibold text-neutral-700">טלפון מנהל האירוע</label>
                <input
                  type="text"
                  value={config.eventManagerPhone}
                  onChange={(e) => setConfig({ ...config, eventManagerPhone: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-neutral-700">אחראי משפחה / מלווה באירוע</label>
                <input
                  type="text"
                  value={config.bestManName}
                  onChange={(e) => setConfig({ ...config, bestManName: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2"
                />
              </div>
              <div>
                <label className="font-semibold text-neutral-700">טלפון אחראי משפחה</label>
                <input
                  type="text"
                  value={config.bestManPhone}
                  onChange={(e) => setConfig({ ...config, bestManPhone: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2"
                />
              </div>
            </div>

            {/* Quick Venue & Date Management */}
            <div className="border-t border-neutral-100 pt-3">
              <IsraeliVenueSelector
                venueName={wedding.venueName}
                venueAddress={wedding.venueAddress}
                compact
                onSelectVenue={(sel) => {
                  void persistConfig(config, {
                    venueName: sel.venueName,
                    venueAddress: sel.venueAddress,
                    venueCity: sel.venueCity,
                    wazeUrl: sel.wazeUrl,
                    googleMapsUrl: sel.googleMapsUrl,
                  });
                }}
              />
            </div>

            <button
              type="button"
              onClick={() => void persistConfig(config)}
              className="w-full rounded-lg bg-neutral-900 py-2.5 text-xs font-bold text-white hover:bg-neutral-800"
            >
              שמירת הגדרות מחשבון ואנשי קשר
            </button>
          </div>
        </div>

        {/* Right: Vendors & Budget Table */}
        <div className="rounded-xl border border-neutral-200 bg-white p-5 lg:col-span-7 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-bold text-neutral-900">
              <Wallet className="h-4 w-4 text-neutral-700" />
              ניהול ספקים, מקדמות ויתרות לתשלום
            </h2>
            <span className="text-xs font-semibold text-neutral-500">
              {config.vendors.length} ספקים פעילים
            </span>
          </div>

          {/* Add Vendor Form (Closed-List Category Dropdown) */}
          <form onSubmit={handleAddVendor} className="grid gap-2 sm:grid-cols-6 text-xs">
            <select
              value={newVendorCategory}
              onChange={(e) => setNewVendorCategory(e.target.value)}
              className="rounded-lg border border-neutral-300 bg-neutral-50 px-2.5 py-2 font-medium sm:col-span-2"
            >
              {ISRAELI_VENDOR_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <input
              type="text"
              required
              value={newVendorName}
              onChange={(e) => setNewVendorName(e.target.value)}
              placeholder="שם הספק / החברה"
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2"
            />
            <input
              type="text"
              value={newVendorPhone}
              onChange={(e) => setNewVendorPhone(e.target.value)}
              placeholder="טלפון ספק"
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2"
            />
            <div className="flex gap-1.5">
              <input
                type="number"
                min={0}
                value={newVendorPrice}
                onChange={(e) => setNewVendorPrice(Number(e.target.value) || 0)}
                placeholder="עלות ₪"
                title="עלות כוללת בש״ח"
                className="w-1/2 rounded-lg border border-neutral-300 bg-white px-2 py-2 text-center tabular-nums"
              />
              <input
                type="number"
                min={0}
                value={newVendorPaid}
                onChange={(e) => setNewVendorPaid(Number(e.target.value) || 0)}
                placeholder="שולם ₪"
                title="מקדמה ששולמה בש״ח"
                className="w-1/2 rounded-lg border border-neutral-300 bg-white px-2 py-2 text-center tabular-nums"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1 rounded-lg bg-neutral-900 px-3 py-2 font-bold text-white hover:bg-neutral-800"
            >
              <Plus className="h-3.5 w-3.5" />
              הוספה
            </button>
          </form>

          {/* Vendors Table */}
          <div className="overflow-x-auto rounded-lg border border-neutral-200">
            <table className="w-full text-right text-xs">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
                <tr>
                  <th className="px-3 py-2.5 font-semibold">תחום</th>
                  <th className="px-3 py-2.5 font-semibold">שם הספק</th>
                  <th className="px-3 py-2.5 font-semibold">עלות מסוכמת</th>
                  <th className="px-3 py-2.5 font-semibold">שולם עד כה</th>
                  <th className="px-3 py-2.5 font-semibold">יתרה לתשלום</th>
                  <th className="px-3 py-2.5 font-semibold">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {config.vendors.map((v) => {
                  const remaining = Math.max(0, v.totalPrice - v.paidAmount);
                  return (
                    <tr key={v.id} className="hover:bg-neutral-50">
                      <td className="px-3 py-2.5 font-semibold text-neutral-700">{v.category}</td>
                      <td className="px-3 py-2.5">
                        <div className="font-bold text-neutral-900">{v.vendorName}</div>
                        {v.phone && (
                          <div className="flex items-center gap-1 text-[11px] text-neutral-500">
                            <Phone className="h-2.5 w-2.5" />
                            <span dir="ltr">{v.phone}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 font-bold tabular-nums">
                        ₪{v.totalPrice.toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5">
                        <input
                          type="number"
                          min={0}
                          max={v.totalPrice}
                          value={v.paidAmount}
                          onChange={(e) =>
                            void handleUpdateVendorPaid(v.id, Number(e.target.value) || 0)
                          }
                          className="w-24 rounded border border-neutral-300 bg-white px-2 py-1 text-center font-semibold tabular-nums text-emerald-800"
                        />
                      </td>
                      <td className="px-3 py-2.5 font-bold tabular-nums">
                        {remaining === 0 ? (
                          <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-800">
                            שולם במלואו
                          </span>
                        ) : (
                          <span className="text-amber-800">₪{remaining.toLocaleString()}</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <button
                          type="button"
                          onClick={() => void handleDeleteVendor(v.id)}
                          title="מחיקת ספק"
                          className="rounded border border-neutral-200 p-1 text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 3: WEDDING TASK CHECKLIST & WEDDING DAY TIMELINE */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Wedding Task Checklist */}
        <div className="rounded-xl border border-neutral-200 bg-white p-5 lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold text-neutral-900">
              <ClipboardList className="h-4 w-4 text-neutral-700" />
              צ׳ק-ליסט משימות לחתונה
            </h2>
            <span className="text-xs font-bold tabular-nums text-emerald-800">
              הושלמו {completedTasksCount} מתוך {config.tasks.length} ({tasksProgressPct}%)
            </span>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
            <div
              className="h-full bg-emerald-700 transition-all"
              style={{ width: `${tasksProgressPct}%` }}
            />
          </div>

          <form onSubmit={handleAddTask} className="grid gap-2 sm:grid-cols-5 text-xs">
            <input
              type="text"
              required
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="הוספת משימה חדשה לחתונה..."
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2 sm:col-span-2"
            />
            <input
              type="text"
              value={newTaskDue}
              onChange={(e) => setNewTaskDue(e.target.value)}
              placeholder="מועד יעד (למשל: שבוע לפני)"
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2"
            />
            <select
              value={newTaskAssignee}
              onChange={(e) =>
                setNewTaskAssignee(e.target.value as WeddingTaskItem['assignee'])
              }
              className="rounded-lg border border-neutral-300 bg-white px-2.5 py-2"
            >
              <option value="BOTH">זוג (משותף)</option>
              <option value="BRIDE">צד כלה</option>
              <option value="GROOM">צד חתן</option>
              <option value="FAMILY">משפחה / מלווים</option>
            </select>
            <button
              type="submit"
              className="rounded-lg bg-neutral-900 px-3 py-2 font-bold text-white hover:bg-neutral-800"
            >
              + הוספת משימה
            </button>
          </form>

          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {config.tasks.map((task) => {
              const assigneeLabel =
                task.assignee === 'BRIDE'
                  ? wedding.partner1Name
                  : task.assignee === 'GROOM'
                    ? wedding.partner2Name
                    : task.assignee === 'FAMILY'
                      ? 'משפחה'
                      : 'משותף';
              return (
                <div
                  key={task.id}
                  className={`flex items-center justify-between gap-3 rounded-lg border p-3 text-xs transition ${
                    task.completed
                      ? 'border-neutral-200 bg-neutral-50 text-neutral-400'
                      : 'border-neutral-200 bg-white text-neutral-900'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => void handleToggleTask(task.id)}
                    className="flex flex-1 items-center gap-3 text-right"
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                        task.completed
                          ? 'border-emerald-700 bg-emerald-700 text-white'
                          : 'border-neutral-300 bg-white'
                      }`}
                    >
                      {task.completed && <Check className="h-3.5 w-3.5" />}
                    </span>
                    <div>
                      <div className={`font-semibold ${task.completed ? 'line-through' : ''}`}>
                        {task.title}
                      </div>
                      <div className="mt-0.5 text-[11px] text-neutral-500">
                        אחריות: {assigneeLabel} • יעד: {task.dueTiming}
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteTask(task.id)}
                    className="rounded p-1 text-neutral-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Wedding Day Schedule (לו"ז יום החתונה) */}
        <div className="rounded-xl border border-neutral-200 bg-white p-5 lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold text-neutral-900">
              <Clock className="h-4 w-4 text-neutral-700" />
              לו״ז יום החתונה
            </h2>
            <span className="inline-flex items-center gap-1 text-xs text-neutral-500">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(wedding.eventDate).toLocaleDateString('he-IL')}
            </span>
          </div>

          <form onSubmit={handleAddTimelineItem} className="grid grid-cols-4 gap-2 text-xs">
            <input
              type="text"
              required
              value={newTlTime}
              onChange={(e) => setNewTlTime(e.target.value)}
              placeholder="21:30"
              className="rounded-lg border border-neutral-300 bg-white px-2.5 py-2 text-center font-bold tabular-nums"
            />
            <input
              type="text"
              required
              value={newTlTitle}
              onChange={(e) => setNewTlTitle(e.target.value)}
              placeholder="אירוע בלו״ז (למשל: סלואו ראשון)"
              className="col-span-2 rounded-lg border border-neutral-300 bg-white px-3 py-2"
            />
            <button
              type="submit"
              className="rounded-lg bg-neutral-900 px-3 py-2 font-bold text-white hover:bg-neutral-800"
            >
              + הוספה
            </button>
          </form>

          <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
            {config.timeline.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-neutral-200 bg-neutral-50/70 p-3 text-xs"
              >
                <div className="flex items-start gap-3">
                  <span className="rounded-md bg-neutral-900 px-2.5 py-1 font-bold tabular-nums text-white">
                    {item.time}
                  </span>
                  <div>
                    <div className="font-bold text-neutral-900">{item.title}</div>
                    <div className="mt-0.5 text-[11px] text-neutral-500">{item.location}</div>
                    {item.notes && (
                      <div className="mt-0.5 text-[11px] text-neutral-600">{item.notes}</div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void handleDeleteTimelineItem(item.id)}
                  className="rounded p-1 text-neutral-400 hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

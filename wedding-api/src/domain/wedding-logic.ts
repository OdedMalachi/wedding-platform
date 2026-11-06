import crypto from 'node:crypto';
import type {
  CampaignType,
  DeliveryStatus,
  Guest,
  Locale,
  MealPreferences,
  RsvpStatus,
  SeatAssignment,
  SeatingTable,
  Wedding,
  WeddingSide,
  WeddingStatistics,
} from '../types/wedding.ts';

export function normalizePhoneE164(rawPhone: string, defaultCountryCode = '+972'): string {
  const digitsAndPlus = rawPhone.trim().replace(/[^\d+]/g, '');
  if (!digitsAndPlus) {
    throw new Error('Phone number cannot be empty');
  }
  if (digitsAndPlus.startsWith('+')) {
    return digitsAndPlus;
  }
  if (digitsAndPlus.startsWith('00')) {
    return '+' + digitsAndPlus.slice(2);
  }
  if (digitsAndPlus.startsWith('972') && digitsAndPlus.length >= 11) {
    return '+' + digitsAndPlus;
  }
  if (digitsAndPlus.startsWith('0')) {
    return `${defaultCountryCode}${digitsAndPlus.slice(1)}`;
  }
  return `${defaultCountryCode}${digitsAndPlus}`;
}

export function generateInvitationCredentials(): { shortCode: string; tokenHash: string } {
  const shortCode = crypto.randomBytes(5).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(shortCode).digest('hex');
  return { shortCode, tokenHash };
}

export interface RsvpSubmissionInput {
  rsvpStatus: RsvpStatus;
  confirmedAdults: number;
  confirmedChildren: number;
  mealPreferences?: Partial<MealPreferences>;
  guestDietaryNotes?: string;
}

export function validateAndNormalizeRsvp(
  guest: Guest,
  input: RsvpSubmissionInput
): {
  rsvpStatus: RsvpStatus;
  confirmedAdults: number;
  confirmedChildren: number;
  mealPreferences: MealPreferences;
  guestDietaryNotes: string;
} {
  if (input.rsvpStatus === 'DECLINED') {
    return {
      rsvpStatus: 'DECLINED',
      confirmedAdults: 0,
      confirmedChildren: 0,
      mealPreferences: { regular: 0, vegetarian: 0, vegan: 0, kids: 0, glatt: 0 },
      guestDietaryNotes: (input.guestDietaryNotes || '').trim(),
    };
  }

  const adults = Math.max(0, Math.floor(Number(input.confirmedAdults) || 0));
  const children = Math.max(0, Math.floor(Number(input.confirmedChildren) || 0));
  const totalConfirmed = adults + children;

  if (input.rsvpStatus === 'ATTENDING' && totalConfirmed < 1) {
    throw new Error('At least 1 attendee is required when confirming attendance.');
  }

  if (totalConfirmed > guest.maxInvitedCount) {
    throw new Error(
      `Total attendees (${totalConfirmed}) cannot exceed reserved invitations (${guest.maxInvitedCount}).`
    );
  }

  const defaultMeals: MealPreferences = {
    regular: input.mealPreferences?.regular ?? adults,
    vegetarian: input.mealPreferences?.vegetarian ?? 0,
    vegan: input.mealPreferences?.vegan ?? 0,
    kids: input.mealPreferences?.kids ?? children,
    glatt: input.mealPreferences?.glatt ?? 0,
  };

  return {
    rsvpStatus: input.rsvpStatus,
    confirmedAdults: adults,
    confirmedChildren: children,
    mealPreferences: defaultMeals,
    guestDietaryNotes: (input.guestDietaryNotes || '').trim(),
  };
}

export interface CsvGuestRow {
  fullName: string;
  phoneE164: string;
  maxInvitedCount: number;
  groupName: string;
  side: WeddingSide;
  notes: string;
}

export function parseGuestCsv(csvText: string): CsvGuestRow[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const results: CsvGuestRow[] = [];

  for (let i = 0; i < lines.length; i++) {
    const cols = lines[i].split(/[,\t;]/).map((c) => c.trim().replace(/^["']|["']$/g, ''));
    if (cols.length < 2) continue;

    const firstLower = cols[0].toLowerCase();
    if (
      i === 0 &&
      (firstLower.includes('name') ||
        firstLower.includes('שם') ||
        firstLower.includes('الاسم') ||
        cols[1].toLowerCase().includes('phone') ||
        cols[1].includes('טלפון'))
    ) {
      continue;
    }

    const fullName = cols[0];
    const rawPhone = cols[1];
    if (!fullName || !rawPhone) continue;

    const phoneE164 = normalizePhoneE164(rawPhone);
    const maxInvitedCount = Math.max(1, parseInt(cols[2] || '2', 10) || 2);
    const groupName = cols[3] || 'Family & Friends';
    const rawSide = (cols[4] || 'BOTH').toUpperCase();
    const side: WeddingSide =
      rawSide === 'PARTNER_1' || rawSide === 'PARTNER_2' ? rawSide : 'BOTH';
    const notes = cols[5] || '';

    results.push({
      fullName,
      phoneE164,
      maxInvitedCount,
      groupName,
      side,
      notes,
    });
  }

  return results;
}

export function validateSeatAssignment(
  table: SeatingTable,
  guest: Guest,
  existingAssignmentsForTable: SeatAssignment[]
): { seatsNeeded: number; currentOccupied: number; remainingAfter: number } {
  const seatsNeeded =
    guest.invitation.rsvpStatus === 'ATTENDING'
      ? Math.max(1, guest.invitation.confirmedAdults + guest.invitation.confirmedChildren)
      : guest.maxInvitedCount;

  const currentOccupied = existingAssignmentsForTable
    .filter((a) => a.guestId !== guest.id)
    .reduce((sum, a) => sum + a.seatsAllocated, 0);

  if (currentOccupied + seatsNeeded > table.capacity) {
    throw new Error(
      `Table "${table.tableNumber}" only has ${table.capacity - currentOccupied} free seats (needs ${seatsNeeded}).`
    );
  }

  return {
    seatsNeeded,
    currentOccupied,
    remainingAfter: table.capacity - (currentOccupied + seatsNeeded),
  };
}

export function getDefaultCampaignTemplate(campaign: CampaignType, locale: Locale): string {
  if (locale === 'he') {
    switch (campaign) {
      case 'SAVE_THE_DATE':
        return 'היי {{guest_name}}! 💍 שמרו את התאריך: {{couple_names}} מתחתנים ב-{{event_date}} ב{{venue_name}}. הזמנה רשמית תישלח בקרוב!';
      case 'INITIAL_INVITATION':
        return 'היי {{guest_name}} היקרים! 🎉 אנו מתרגשים להזמין אתכם לחתונה של {{couple_names}} ב-{{event_date}} ב{{venue_name}}. לצפייה בהזמנה ולאישור הגעה מהיר: {{rsvp_link}}';
      case 'RSVP_REMINDER':
        return 'היי {{guest_name}} ❤️ נשמח מאוד לדעת אם תוכלו לחגוג איתנו בחתונה של {{couple_names}}! אנא עדכנו אישור הגעה בקישור: {{rsvp_link}}';
      case 'DAY_OF_TABLE':
        return 'היי {{guest_name}}! מתרגשים לראותכם הערב בחתונה של {{couple_names}} ב{{venue_name}} 🥂 מספר השולחן שלכם הוא: *{{table_number}}*. כרטיס הכניסה שלכם: {{rsvp_link}}';
      case 'THANK_YOU':
        return 'היי {{guest_name}} היקרים! תודה ענקית שהגעתם לשמוח איתנו והפכתם את הערב שלנו לבלתי נשכח ❤️ אוהבים, {{couple_names}}';
    }
  }

  if (locale === 'ar') {
    switch (campaign) {
      case 'SAVE_THE_DATE':
        return 'مرحباً {{guest_name}}! 💍 احفظوا التاريخ: حفل زفاف {{couple_names}} يوم {{event_date}} في {{venue_name}}.';
      case 'INITIAL_INVITATION':
        return 'أهلاً {{guest_name}}! 🎉 يسعدنا دعوتكم لحفل زفاف {{couple_names}} يوم {{event_date}} في {{venue_name}}. لمشاهدة الدعوة وتأكيد الحضور: {{rsvp_link}}';
      case 'RSVP_REMINDER':
        return 'مرحباً {{guest_name}} ❤️ نود تذكيركم بتأكيد حضوركم لحفل زفاف {{couple_names}} عبر الرابط: {{rsvp_link}}';
      case 'DAY_OF_TABLE':
        return 'أهلاً {{guest_name}}! ننتظركم الليلة في حفل زفاف {{couple_names}} 🥂 رقم طاولتكم هو: *{{table_number}}*. بطاقة الدخول: {{rsvp_link}}';
      case 'THANK_YOU':
        return 'شكراً جزيلاً {{guest_name}} على مشاركتنا فرحتنا! محبتنا، {{couple_names}} ❤️';
    }
  }

  switch (campaign) {
    case 'SAVE_THE_DATE':
      return 'Hi {{guest_name}}! 💍 Save the Date: {{couple_names}} are getting married on {{event_date}} at {{venue_name}}!';
    case 'INITIAL_INVITATION':
      return 'Hi {{guest_name}}! 🎉 You are invited to the wedding of {{couple_names}} on {{event_date}} at {{venue_name}}. View your personal invitation & RSVP here: {{rsvp_link}}';
    case 'RSVP_REMINDER':
      return 'Hi {{guest_name}} ❤️ Friendly reminder to confirm your attendance for {{couple_names}}’s wedding here: {{rsvp_link}}';
    case 'DAY_OF_TABLE':
      return 'Hi {{guest_name}}! We cannot wait to celebrate with you tonight at {{venue_name}} 🥂 Your assigned table is *{{table_number}}*. Entry pass: {{rsvp_link}}';
    case 'THANK_YOU':
      return 'Dear {{guest_name}}, thank you so much for celebrating with us and making our wedding unforgettable! With love, {{couple_names}} ❤️';
  }
}

export function buildWhatsAppInvitationLink(params: {
  template: string;
  wedding: Wedding;
  guest: Guest;
  baseUrl: string;
}): { renderedMessage: string; whatsappUrl: string; rsvpLink: string } {
  const { template, wedding, guest, baseUrl } = params;
  const cleanBase = baseUrl.replace(/\/$/, '');
  const rsvpLink = `${cleanBase}/i/${guest.invitation.shortCode}`;
  const coupleNames = `${wedding.partner1Name} & ${wedding.partner2Name}`;
  const formattedDate = new Date(wedding.eventDate).toLocaleDateString(
    wedding.defaultLocale === 'he' ? 'he-IL' : wedding.defaultLocale === 'ar' ? 'ar-IL' : 'en-US',
    { day: 'numeric', month: 'long', year: 'numeric' }
  );

  const renderedMessage = template
    .replace(/\{\{guest_name\}\}/g, guest.fullName)
    .replace(/\{\{couple_names\}\}/g, coupleNames)
    .replace(/\{\{event_date\}\}/g, formattedDate)
    .replace(/\{\{venue_name\}\}/g, wedding.venueName)
    .replace(/\{\{rsvp_link\}\}/g, rsvpLink)
    .replace(/\{\{table_number\}\}/g, guest.tableName || 'VIP / Reception');

  const phoneDigits = guest.phoneE164.replace(/[^\d]/g, '');
  const whatsappUrl = `https://wa.me/${phoneDigits}?text=${encodeURIComponent(renderedMessage)}`;

  return { renderedMessage, whatsappUrl, rsvpLink };
}

export function calculateWeddingStatistics(
  guests: Guest[],
  seatAssignments: SeatAssignment[]
): WeddingStatistics {
  const deliveryBreakdown: Record<DeliveryStatus, number> = {
    NOT_SENT: 0,
    SENT: 0,
    DELIVERED: 0,
    OPENED: 0,
    FAILED: 0,
  };

  const sideBreakdown: Record<WeddingSide, { invited: number; confirmed: number }> = {
    PARTNER_1: { invited: 0, confirmed: 0 },
    PARTNER_2: { invited: 0, confirmed: 0 },
    BOTH: { invited: 0, confirmed: 0 },
  };

  const mealTotals: MealPreferences = {
    regular: 0,
    vegetarian: 0,
    vegan: 0,
    kids: 0,
    glatt: 0,
  };

  let totalInvitedPeople = 0;
  let attendingHouseholds = 0;
  let confirmedAdults = 0;
  let confirmedChildren = 0;
  let declinedHouseholds = 0;
  let maybeHouseholds = 0;
  let pendingHouseholds = 0;
  let checkedInPeople = 0;
  let checkedInHouseholds = 0;

  for (const guest of guests) {
    const inv = guest.invitation;
    totalInvitedPeople += guest.maxInvitedCount;
    deliveryBreakdown[inv.deliveryStatus] = (deliveryBreakdown[inv.deliveryStatus] || 0) + 1;
    sideBreakdown[guest.side].invited += guest.maxInvitedCount;

    if (inv.rsvpStatus === 'ATTENDING') {
      attendingHouseholds++;
      confirmedAdults += inv.confirmedAdults;
      confirmedChildren += inv.confirmedChildren;
      const guestConfirmed = inv.confirmedAdults + inv.confirmedChildren;
      sideBreakdown[guest.side].confirmed += guestConfirmed;

      mealTotals.regular += inv.mealPreferences?.regular || 0;
      mealTotals.vegetarian += inv.mealPreferences?.vegetarian || 0;
      mealTotals.vegan += inv.mealPreferences?.vegan || 0;
      mealTotals.kids += inv.mealPreferences?.kids || 0;
      mealTotals.glatt += inv.mealPreferences?.glatt || 0;
    } else if (inv.rsvpStatus === 'DECLINED') {
      declinedHouseholds++;
    } else if (inv.rsvpStatus === 'MAYBE') {
      maybeHouseholds++;
    } else {
      pendingHouseholds++;
    }

    if (inv.checkedIn) {
      checkedInHouseholds++;
      checkedInPeople += inv.checkedInCount;
    }
  }

  const totalConfirmedPeople = confirmedAdults + confirmedChildren;
  const seatedPeople = seatAssignments.reduce((acc, s) => acc + s.seatsAllocated, 0);
  const unseatedConfirmedPeople = Math.max(0, totalConfirmedPeople - seatedPeople);

  return {
    totalHouseholds: guests.length,
    totalInvitedPeople,
    attendingHouseholds,
    confirmedAdults,
    confirmedChildren,
    totalConfirmedPeople,
    declinedHouseholds,
    maybeHouseholds,
    pendingHouseholds,
    seatedPeople,
    unseatedConfirmedPeople,
    checkedInPeople,
    checkedInHouseholds,
    deliveryBreakdown,
    sideBreakdown,
    mealTotals,
  };
}

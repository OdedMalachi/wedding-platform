import { describe, expect, it } from 'vitest';
import {
  buildWhatsAppInvitationLink,
  calculateWeddingStatistics,
  normalizePhoneE164,
  parseGuestCsv,
  validateAndNormalizeRsvp,
  validateSeatAssignment,
} from '../wedding-logic.ts';
import type { Guest, SeatingTable, Wedding } from '../../types/wedding.ts';

const mockWedding: Wedding = {
  id: 'w-test',
  slug: 'dana-and-omer',
  partner1Name: 'דנה',
  partner2Name: 'עומר',
  eventDate: '2026-11-24T19:30:00.000Z',
  receptionTime: '19:30',
  ceremonyTime: '20:30',
  venueName: 'Alma Events',
  venueAddress: 'Even Yehuda',
  venueCity: 'Even Yehuda',
  wazeUrl: 'https://waze.com/ul',
  googleMapsUrl: 'https://maps.google.com',
  defaultLocale: 'he',
  themeConfig: {
    templateId: 'editorial-gold',
    primaryColor: '#92400e',
    accentColor: '#d97706',
    backgroundColor: '#fffbeb',
    fontFamily: 'serif',
    coverImageUrl: 'https://example.com/cover.jpg',
    heroSubtitle: 'Subtitle',
    customInvitationMessage: 'Welcome',
    showCountdown: true,
    showGreetingWall: true,
    showGiftLinks: true,
  },
  giftConfig: {
    bitUrl: 'https://bitpay.co.il',
    payboxUrl: 'https://paybox.co.il',
    creditCardUrl: '',
    bankDetails: '',
  },
  createdAt: '2026-10-01T00:00:00.000Z',
};

const createMockGuest = (overrides?: Partial<Guest>): Guest => ({
  id: 'g-1',
  weddingId: 'w-test',
  groupId: 'grp-1',
  groupName: 'Family',
  side: 'PARTNER_1',
  fullName: 'משפחת כהן',
  phoneE164: '+972541234567',
  maxInvitedCount: 3,
  notes: '',
  createdAt: '2026-10-01T00:00:00.000Z',
  tableName: 'שולחן 1',
  invitation: {
    id: 'inv-1',
    guestId: 'g-1',
    tokenHash: 'hash1',
    shortCode: 'code123',
    deliveryStatus: 'OPENED',
    rsvpStatus: 'ATTENDING',
    confirmedAdults: 2,
    confirmedChildren: 1,
    mealPreferences: { regular: 2, vegetarian: 0, vegan: 0, kids: 1, glatt: 0 },
    guestDietaryNotes: '',
    checkedIn: true,
    checkedInCount: 3,
  },
  ...overrides,
});

describe('Wedding API Domain Logic', () => {
  it('normalizes local Israeli and international phone numbers to E.164', () => {
    expect(normalizePhoneE164('054-221-1001')).toBe('+972542211001');
    expect(normalizePhoneE164('+1 (212) 555-0199')).toBe('+12125550199');
    expect(normalizePhoneE164('972523344556')).toBe('+972523344556');
  });

  it('enforces RSVP headcount limits against maxInvitedCount', () => {
    const guest = createMockGuest({ maxInvitedCount: 3 });

    const valid = validateAndNormalizeRsvp(guest, {
      rsvpStatus: 'ATTENDING',
      confirmedAdults: 2,
      confirmedChildren: 1,
    });
    expect(valid.confirmedAdults + valid.confirmedChildren).toBe(3);

    expect(() =>
      validateAndNormalizeRsvp(guest, {
        rsvpStatus: 'ATTENDING',
        confirmedAdults: 3,
        confirmedChildren: 1,
      })
    ).toThrow(/cannot exceed reserved invitations/);
  });

  it('parses CSV guest import rows and skips header lines', () => {
    const csv = [
      'Full Name,Phone,Max Invited,Group,Side,Notes',
      'משפחת לוי,052-9988776,4,משפחה,PARTNER_2,ללא גלוטן',
      'Alex & Sam,054-1122334,2,Friends,BOTH,',
    ].join('\n');

    const parsed = parseGuestCsv(csv);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].fullName).toBe('משפחת לוי');
    expect(parsed[0].phoneE164).toBe('+972529988776');
    expect(parsed[0].maxInvitedCount).toBe(4);
    expect(parsed[0].side).toBe('PARTNER_2');
  });

  it('validates table capacity before assigning seats', () => {
    const table: SeatingTable = {
      id: 't-1',
      weddingId: 'w-test',
      tableNumber: 'Table 1',
      category: 'VIP',
      tableShape: 'ROUND',
      capacity: 10,
      posX: 0,
      posY: 0,
    };
    const guest = createMockGuest();

    const okResult = validateSeatAssignment(table, guest, [
      { id: 'sa-existing', weddingId: 'w-test', tableId: 't-1', guestId: 'g-other', seatsAllocated: 6 },
    ]);
    expect(okResult.remainingAfter).toBe(1);

    expect(() =>
      validateSeatAssignment(table, guest, [
        { id: 'sa-full', weddingId: 'w-test', tableId: 't-1', guestId: 'g-other', seatsAllocated: 8 },
      ])
    ).toThrow(/only has 2 free seats/);
  });

  it('interpolates WhatsApp message variables and creates a valid wa.me link', () => {
    const guest = createMockGuest();
    const { renderedMessage, whatsappUrl, rsvpLink } = buildWhatsAppInvitationLink({
      template: 'שלום {{guest_name}}! הזמנה לחתונה של {{couple_names}}: {{rsvp_link}} ({{table_number}})',
      wedding: mockWedding,
      guest,
      baseUrl: 'https://wedding.example.com',
    });

    expect(rsvpLink).toBe('https://wedding.example.com/i/code123');
    expect(renderedMessage).toContain('משפחת כהן');
    expect(renderedMessage).toContain('דנה & עומר');
    expect(renderedMessage).toContain('שולחן 1');
    expect(whatsappUrl).toContain('https://wa.me/972541234567?text=');
  });

  it('calculates real-time RSVP, meal, side, seating, and check-in statistics', () => {
    const g1 = createMockGuest();
    const g2 = createMockGuest({
      id: 'g-2',
      side: 'PARTNER_2',
      maxInvitedCount: 2,
      invitation: {
        ...g1.invitation,
        id: 'inv-2',
        guestId: 'g-2',
        rsvpStatus: 'PENDING',
        confirmedAdults: 0,
        confirmedChildren: 0,
        checkedIn: false,
        checkedInCount: 0,
      },
    });

    const stats = calculateWeddingStatistics(
      [g1, g2],
      [{ id: 'sa-1', weddingId: 'w-test', tableId: 't-1', guestId: 'g-1', seatsAllocated: 3 }]
    );

    expect(stats.totalHouseholds).toBe(2);
    expect(stats.totalInvitedPeople).toBe(5);
    expect(stats.totalConfirmedPeople).toBe(3);
    expect(stats.seatedPeople).toBe(3);
    expect(stats.checkedInPeople).toBe(3);
  });
});

export type Locale = 'he' | 'en';

export interface User {
  id: string;
  email: string;
  fullName: string;
  createdAt: string;
}

export type WeddingSide = 'PARTNER_1' | 'PARTNER_2' | 'BOTH';

export type RsvpStatus = 'PENDING' | 'ATTENDING' | 'DECLINED' | 'MAYBE';

export type DeliveryStatus = 'NOT_SENT' | 'SENT' | 'DELIVERED' | 'OPENED' | 'FAILED';

export type TableShape = 'ROUND' | 'RECTANGLE' | 'SQUARE';

export type InvitationTemplateId = 'editorial-gold' | 'mediterranean-olive' | 'modern-minimal' | 'midnight-velvet';

export interface MealPreferences {
  regular: number;
  vegetarian: number;
  vegan: number;
  kids: number;
  glatt: number;
}

export interface ThemeConfig {
  templateId: InvitationTemplateId;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  fontFamily: 'serif' | 'sans' | 'display';
  coverImageUrl: string;
  heroSubtitle: string;
  customInvitationMessage: string;
  musicUrl?: string;
  showCountdown: boolean;
  showGreetingWall: boolean;
  showGiftLinks: boolean;
}

export interface GiftConfig {
  bitUrl: string;
  payboxUrl: string;
  creditCardUrl: string;
  bankDetails: string;
}

export interface Wedding {
  id: string;
  slug: string;
  partner1Name: string;
  partner2Name: string;
  eventDate: string; // ISO date string
  receptionTime: string;
  ceremonyTime: string;
  venueName: string;
  venueAddress: string;
  venueCity: string;
  wazeUrl: string;
  googleMapsUrl: string;
  defaultLocale: Locale;
  themeConfig: ThemeConfig;
  giftConfig: GiftConfig;
  createdAt: string;
}

export interface GuestGroup {
  id: string;
  weddingId: string;
  name: string;
  color: string;
}

export interface Invitation {
  id: string;
  guestId: string;
  tokenHash: string;
  shortCode: string;
  deliveryStatus: DeliveryStatus;
  lastSentAt?: string;
  rsvpStatus: RsvpStatus;
  confirmedAdults: number;
  confirmedChildren: number;
  mealPreferences: MealPreferences;
  guestDietaryNotes: string;
  checkedIn: boolean;
  checkedInCount: number;
  checkedInAt?: string;
  respondedAt?: string;
}

export interface Guest {
  id: string;
  weddingId: string;
  groupId: string;
  groupName: string;
  side: WeddingSide;
  fullName: string;
  phoneE164: string;
  maxInvitedCount: number;
  notes: string;
  createdAt: string;
  invitation: Invitation;
  tableId?: string;
  tableName?: string;
}

export interface SeatingTable {
  id: string;
  weddingId: string;
  tableNumber: string;
  category: string;
  tableShape: TableShape;
  capacity: number;
  posX: number;
  posY: number;
}

export interface SeatAssignment {
  id: string;
  weddingId: string;
  tableId: string;
  guestId: string;
  seatsAllocated: number;
}

export interface Greeting {
  id: string;
  weddingId: string;
  guestId?: string;
  authorName: string;
  relationship: string;
  message: string;
  mediaUrl?: string;
  giftAmountReported?: number;
  isApproved: boolean;
  createdAt: string;
}

export type CampaignType =
  | 'SAVE_THE_DATE'
  | 'INITIAL_INVITATION'
  | 'RSVP_REMINDER'
  | 'DAY_OF_TABLE'
  | 'THANK_YOU';

export interface MessageLog {
  id: string;
  weddingId: string;
  guestId: string;
  campaignType: CampaignType;
  channel: 'WHATSAPP_LINK' | 'WHATSAPP_API' | 'SMS';
  status: DeliveryStatus;
  renderedMessage: string;
  sentAt: string;
}

export interface WeddingStatistics {
  totalHouseholds: number;
  totalInvitedPeople: number;
  attendingHouseholds: number;
  confirmedAdults: number;
  confirmedChildren: number;
  totalConfirmedPeople: number;
  declinedHouseholds: number;
  maybeHouseholds: number;
  pendingHouseholds: number;
  seatedPeople: number;
  unseatedConfirmedPeople: number;
  checkedInPeople: number;
  checkedInHouseholds: number;
  deliveryBreakdown: Record<DeliveryStatus, number>;
  sideBreakdown: Record<WeddingSide, { invited: number; confirmed: number }>;
  mealTotals: MealPreferences;
}

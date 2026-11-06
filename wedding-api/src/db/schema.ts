import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  text,
  integer,
  boolean,
  jsonb,
  real,
  numeric,
} from 'drizzle-orm/pg-core';
import type { GiftConfig, MealPreferences, ThemeConfig } from '../types/wedding.ts';

export const weddings = pgTable('weddings', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: varchar('slug', { length: 120 }).notNull().unique(),
  partner1Name: varchar('partner1_name', { length: 120 }).notNull(),
  partner2Name: varchar('partner2_name', { length: 120 }).notNull(),
  eventDate: timestamp('event_date', { withTimezone: true }).notNull(),
  receptionTime: varchar('reception_time', { length: 20 }).notNull().default('19:30'),
  ceremonyTime: varchar('ceremony_time', { length: 20 }).notNull().default('20:30'),
  venueName: varchar('venue_name', { length: 255 }).notNull(),
  venueAddress: varchar('venue_address', { length: 500 }).notNull(),
  venueCity: varchar('venue_city', { length: 120 }).notNull().default(''),
  wazeUrl: text('waze_url').notNull().default(''),
  googleMapsUrl: text('google_maps_url').notNull().default(''),
  defaultLocale: varchar('default_locale', { length: 10 }).notNull().default('he'),
  themeConfig: jsonb('theme_config').$type<ThemeConfig>().notNull(),
  giftConfig: jsonb('gift_config').$type<GiftConfig>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const guestGroups = pgTable('guest_groups', {
  id: uuid('id').defaultRandom().primaryKey(),
  weddingId: uuid('wedding_id')
    .notNull()
    .references(() => weddings.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 120 }).notNull(),
  color: varchar('color', { length: 32 }).notNull().default('#d97706'),
});

export const guests = pgTable('guests', {
  id: uuid('id').defaultRandom().primaryKey(),
  weddingId: uuid('wedding_id')
    .notNull()
    .references(() => weddings.id, { onDelete: 'cascade' }),
  groupId: uuid('group_id').references(() => guestGroups.id, { onDelete: 'set null' }),
  groupName: varchar('group_name', { length: 120 }).notNull().default('General'),
  side: varchar('side', { length: 32 }).notNull().default('BOTH'),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  phoneE164: varchar('phone_e164', { length: 32 }).notNull(),
  maxInvitedCount: integer('max_invited_count').notNull().default(2),
  notes: text('notes').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const invitations = pgTable('invitations', {
  id: uuid('id').defaultRandom().primaryKey(),
  guestId: uuid('guest_id')
    .notNull()
    .unique()
    .references(() => guests.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 128 }).notNull().unique(),
  shortCode: varchar('short_code', { length: 32 }).notNull().unique(),
  deliveryStatus: varchar('delivery_status', { length: 32 }).notNull().default('NOT_SENT'),
  lastSentAt: timestamp('last_sent_at', { withTimezone: true }),
  rsvpStatus: varchar('rsvp_status', { length: 32 }).notNull().default('PENDING'),
  confirmedAdults: integer('confirmed_adults').notNull().default(0),
  confirmedChildren: integer('confirmed_children').notNull().default(0),
  mealPreferences: jsonb('meal_preferences').$type<MealPreferences>().notNull(),
  guestDietaryNotes: text('guest_dietary_notes').notNull().default(''),
  checkedIn: boolean('checked_in').notNull().default(false),
  checkedInCount: integer('checked_in_count').notNull().default(0),
  checkedInAt: timestamp('checked_in_at', { withTimezone: true }),
  respondedAt: timestamp('responded_at', { withTimezone: true }),
});

export const seatingTables = pgTable('seating_tables', {
  id: uuid('id').defaultRandom().primaryKey(),
  weddingId: uuid('wedding_id')
    .notNull()
    .references(() => weddings.id, { onDelete: 'cascade' }),
  tableNumber: varchar('table_number', { length: 64 }).notNull(),
  category: varchar('category', { length: 120 }).notNull().default('General'),
  tableShape: varchar('table_shape', { length: 32 }).notNull().default('ROUND'),
  capacity: integer('capacity').notNull().default(12),
  posX: real('pos_x').notNull().default(100),
  posY: real('pos_y').notNull().default(100),
});

export const seatAssignments = pgTable('seat_assignments', {
  id: uuid('id').defaultRandom().primaryKey(),
  weddingId: uuid('wedding_id')
    .notNull()
    .references(() => weddings.id, { onDelete: 'cascade' }),
  tableId: uuid('table_id')
    .notNull()
    .references(() => seatingTables.id, { onDelete: 'cascade' }),
  guestId: uuid('guest_id')
    .notNull()
    .unique()
    .references(() => guests.id, { onDelete: 'cascade' }),
  seatsAllocated: integer('seats_allocated').notNull().default(1),
});

export const greetings = pgTable('greetings', {
  id: uuid('id').defaultRandom().primaryKey(),
  weddingId: uuid('wedding_id')
    .notNull()
    .references(() => weddings.id, { onDelete: 'cascade' }),
  guestId: uuid('guest_id').references(() => guests.id, { onDelete: 'set null' }),
  authorName: varchar('author_name', { length: 255 }).notNull(),
  relationship: varchar('relationship', { length: 120 }).notNull().default(''),
  message: text('message').notNull(),
  mediaUrl: text('media_url'),
  giftAmountReported: numeric('gift_amount_reported', { precision: 10, scale: 2 }),
  isApproved: boolean('is_approved').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

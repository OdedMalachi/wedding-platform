-- PostgreSQL Schema for Multi-Wedding SaaS Platform

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS weddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(120) UNIQUE NOT NULL,
  partner1_name VARCHAR(120) NOT NULL,
  partner2_name VARCHAR(120) NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  reception_time VARCHAR(20) NOT NULL DEFAULT '19:30',
  ceremony_time VARCHAR(20) NOT NULL DEFAULT '20:30',
  venue_name VARCHAR(255) NOT NULL,
  venue_address VARCHAR(500) NOT NULL,
  venue_city VARCHAR(120) NOT NULL DEFAULT '',
  waze_url TEXT NOT NULL DEFAULT '',
  google_maps_url TEXT NOT NULL DEFAULT '',
  default_locale VARCHAR(10) NOT NULL DEFAULT 'he',
  theme_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  gift_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wedding_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(32) NOT NULL DEFAULT 'OWNER',
  UNIQUE (wedding_id, user_id)
);

CREATE TABLE IF NOT EXISTS guest_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  color VARCHAR(32) NOT NULL DEFAULT '#d97706'
);

CREATE TABLE IF NOT EXISTS guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  group_id UUID REFERENCES guest_groups(id) ON DELETE SET NULL,
  group_name VARCHAR(120) NOT NULL DEFAULT 'General',
  side VARCHAR(32) NOT NULL DEFAULT 'BOTH',
  full_name VARCHAR(255) NOT NULL,
  phone_e164 VARCHAR(32) NOT NULL,
  max_invited_count INTEGER NOT NULL DEFAULT 2 CHECK (max_invited_count >= 1),
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID UNIQUE NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  token_hash VARCHAR(128) UNIQUE NOT NULL,
  short_code VARCHAR(32) UNIQUE NOT NULL,
  delivery_status VARCHAR(32) NOT NULL DEFAULT 'NOT_SENT',
  last_sent_at TIMESTAMPTZ,
  rsvp_status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  confirmed_adults INTEGER NOT NULL DEFAULT 0,
  confirmed_children INTEGER NOT NULL DEFAULT 0,
  meal_preferences JSONB NOT NULL DEFAULT '{"regular":0,"vegetarian":0,"vegan":0,"kids":0,"glatt":0}'::jsonb,
  guest_dietary_notes TEXT NOT NULL DEFAULT '',
  checked_in BOOLEAN NOT NULL DEFAULT FALSE,
  checked_in_count INTEGER NOT NULL DEFAULT 0,
  checked_in_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS seating_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  table_number VARCHAR(64) NOT NULL,
  category VARCHAR(120) NOT NULL DEFAULT 'General',
  table_shape VARCHAR(32) NOT NULL DEFAULT 'ROUND',
  capacity INTEGER NOT NULL DEFAULT 12 CHECK (capacity >= 1),
  pos_x REAL NOT NULL DEFAULT 100,
  pos_y REAL NOT NULL DEFAULT 100
);

CREATE TABLE IF NOT EXISTS seat_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  table_id UUID NOT NULL REFERENCES seating_tables(id) ON DELETE CASCADE,
  guest_id UUID UNIQUE NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  seats_allocated INTEGER NOT NULL DEFAULT 1 CHECK (seats_allocated >= 1)
);

CREATE TABLE IF NOT EXISTS greetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
  author_name VARCHAR(255) NOT NULL,
  relationship VARCHAR(120) NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  media_url TEXT,
  gift_amount_reported NUMERIC(10, 2),
  is_approved BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS message_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  campaign_type VARCHAR(64) NOT NULL,
  channel VARCHAR(32) NOT NULL DEFAULT 'WHATSAPP_LINK',
  status VARCHAR(32) NOT NULL DEFAULT 'SENT',
  rendered_message TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Production Performance Indexes
CREATE INDEX IF NOT EXISTS idx_wedding_members_user_id ON wedding_members(user_id);
CREATE INDEX IF NOT EXISTS idx_wedding_members_wedding_id ON wedding_members(wedding_id);
CREATE INDEX IF NOT EXISTS idx_guests_wedding_id ON guests(wedding_id);
CREATE INDEX IF NOT EXISTS idx_invitations_short_code ON invitations(short_code);
CREATE INDEX IF NOT EXISTS idx_seating_tables_wedding_id ON seating_tables(wedding_id);
CREATE INDEX IF NOT EXISTS idx_seat_assignments_wedding_id ON seat_assignments(wedding_id);
CREATE INDEX IF NOT EXISTS idx_greetings_wedding_id ON greetings(wedding_id);
CREATE INDEX IF NOT EXISTS idx_message_logs_wedding_id ON message_logs(wedding_id);


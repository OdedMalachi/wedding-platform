import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import type {
  CampaignType,
  Greeting,
  Guest,
  GuestGroup,
  Locale,
  MessageLog,
  RsvpStatus,
  SeatAssignment,
  SeatingTable,
  User,
  Wedding,
  WeddingSide,
} from '../types/wedding.ts';
import {
  generateInvitationCredentials,
  normalizePhoneE164,
  parseGuestCsv,
  type RsvpSubmissionInput,
  validateAndNormalizeRsvp,
  validateSeatAssignment,
} from '../domain/wedding-logic.ts';
import { hashPassword, verifyPassword } from '../auth/security.ts';

const { Pool, Client } = pg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_SQL_PATH = path.join(__dirname, 'schema.sql');

function loadEnvFile() {
  const candidates = [
    path.resolve(__dirname, '../../.env'),
    path.resolve(__dirname, '../../../.env'),
  ];
  for (const envPath of candidates) {
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed
          .slice(eqIdx + 1)
          .trim()
          .replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnvFile();

export function getDatabaseUrl(): string {
  return (
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/wedding_platform'
  );
}

function shouldUseSsl(dbUrl: string): boolean {
  if (process.env.DATABASE_SSL === 'true') return true;
  if (process.env.DATABASE_SSL === 'false') return false;
  if (dbUrl.includes('sslmode=require') || dbUrl.includes('ssl=true')) return true;
  try {
    const parsed = new URL(dbUrl);
    const isLocal =
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname === 'postgres';
    return process.env.NODE_ENV === 'production' && !isLocal;
  } catch {
    return false;
  }
}

let pool: pg.Pool | null = null;
let initialized = false;

export async function getPool(): Promise<pg.Pool> {
  if (pool && initialized) {
    return pool;
  }

  const dbUrl = getDatabaseUrl();
  const useSsl = shouldUseSsl(dbUrl);
  const parsed = new URL(dbUrl);
  const targetDbName = parsed.pathname.replace(/^\//, '') || 'wedding_platform';
  const isLocalHost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';

  // Step 1: In local development only, ensure target database exists
  if (isLocalHost && process.env.NODE_ENV !== 'production') {
    const adminUrl = new URL(dbUrl);
    adminUrl.pathname = '/postgres';
    const adminClient = new Client({ connectionString: adminUrl.toString() });
    try {
      await adminClient.connect();
      const check = await adminClient.query(
        'SELECT 1 FROM pg_database WHERE datname = $1',
        [targetDbName]
      );
      if (check.rowCount === 0) {
        await adminClient.query(`CREATE DATABASE "${targetDbName}"`);
        console.log(`✅ Created PostgreSQL database "${targetDbName}"`);
      }
    } catch {
      // Managed Postgres or restricted user: continue directly to target database
    } finally {
      await adminClient.end().catch(() => {});
    }
  }

  // Step 2: Connect pool to target database and apply schema.sql
  pool = new Pool({
    connectionString: dbUrl,
    max: Number(process.env.DB_POOL_MAX) || 20,
    idleTimeoutMillis: 30000,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  });

  const schemaSql = fs.readFileSync(SCHEMA_SQL_PATH, 'utf8');
  await pool.query(schemaSql);

  // Step 3: Seed initial demo user & wedding in development (or if SEED_DEMO_DATA=true)
  const shouldSeedDemo =
    process.env.SEED_DEMO_DATA === 'true' ||
    (process.env.NODE_ENV !== 'production' && process.env.SEED_DEMO_DATA !== 'false');

  if (shouldSeedDemo) {
    const existingWeddings = await pool.query('SELECT COUNT(*)::int AS cnt FROM weddings');
    if (existingWeddings.rows[0].cnt === 0) {
      await seedInitialPostgresData(pool);
    } else {
      await ensureDemoUserLinksOrphanWeddings(pool);
    }
  }

  initialized = true;
  return pool;
}

async function ensureDemoUserLinksOrphanWeddings(db: pg.Pool) {
  let userRes = await db.query('SELECT id FROM users WHERE email = $1', ['demo@wedding.co.il']);
  if (userRes.rowCount === 0) {
    userRes = await db.query(
      `INSERT INTO users (email, full_name, password_hash)
       VALUES ($1, $2, $3) RETURNING id`,
      ['demo@wedding.co.il', 'דנה ועומר (חשבון הדגמה)', hashPassword('Wedding2026!')]
    );
  }
  const demoUserId = userRes.rows[0].id;

  await db.query(
    `INSERT INTO wedding_members (wedding_id, user_id, role)
     SELECT w.id, $1, 'OWNER'
     FROM weddings w
     WHERE NOT EXISTS (
       SELECT 1 FROM wedding_members wm WHERE wm.wedding_id = w.id
     )
     ON CONFLICT (wedding_id, user_id) DO NOTHING`,
    [demoUserId]
  );
}

async function seedInitialPostgresData(db: pg.Pool) {
  const userRes = await db.query(
    `INSERT INTO users (email, full_name, password_hash)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
     RETURNING id`,
    ['demo@wedding.co.il', 'דנה ועומר (חשבון הדגמה)', hashPassword('Wedding2026!')]
  );
  const demoUserId = userRes.rows[0].id;

  const wRes = await db.query(
    `INSERT INTO weddings (
      slug, partner1_name, partner2_name, event_date, reception_time, ceremony_time,
      venue_name, venue_address, venue_city, waze_url, google_maps_url, default_locale,
      theme_config, gift_config
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    RETURNING id`,
    [
      'dana-and-omer',
      'דנה כהן',
      'עומר לוי',
      '2026-11-24T19:30:00.000Z',
      '19:30',
      '20:45',
      'עלמה - מתחם אירועים (Alma Events)',
      'דרך השרון 14, אבן יהודה',
      'אבן יהודה',
      'https://waze.com/ul?q=Even%20Yehuda',
      'https://maps.google.com/?q=Even+Yehuda',
      'he',
      JSON.stringify({
        templateId: 'editorial-gold',
        primaryColor: '#92400e',
        accentColor: '#d97706',
        backgroundColor: '#fffbeb',
        fontFamily: 'serif',
        coverImageUrl:
          'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80',
        heroSubtitle: 'אנו מתרגשים להזמינכם לחגוג איתנו את הרגע המאושר בחיינו',
        customInvitationMessage:
          'אחרי שנים של אהבה, צחוק וחלומות משותפים, אנחנו עומדים תחת חופה אחת ונשמח שתהיו חלק מהשמחה שלנו.',
        showCountdown: true,
        showGreetingWall: true,
        showGiftLinks: true,
      }),
      JSON.stringify({
        bitUrl: 'https://www.bitpay.co.il/',
        payboxUrl: 'https://payboxapp.page.link/',
        creditCardUrl: 'https://meshulam.co.il/',
        bankDetails: 'בנק הפועלים (12), סניף 600, חשבון 482910 - דנה ועומר',
      }),
    ]
  );
  const weddingId = wRes.rows[0].id;

  await db.query(
    `INSERT INTO wedding_members (wedding_id, user_id, role)
     VALUES ($1, $2, 'OWNER')
     ON CONFLICT (wedding_id, user_id) DO NOTHING`,
    [weddingId, demoUserId]
  );

  const grpFam = await db.query(
    `INSERT INTO guest_groups (wedding_id, name, color) VALUES ($1, $2, $3) RETURNING id`,
    [weddingId, 'משפחה קרובה', '#d97706']
  );
  const grpFriends = await db.query(
    `INSERT INTO guest_groups (wedding_id, name, color) VALUES ($1, $2, $3) RETURNING id`,
    [weddingId, 'חברים מהאוניברסיטה', '#2563eb']
  );

  const tbl1 = await db.query(
    `INSERT INTO seating_tables (wedding_id, table_number, category, table_shape, capacity, pos_x, pos_y)
     VALUES ($1, $2, $3, $4, $5, 80, 80) RETURNING id`,
    [weddingId, 'שולחן 1 - משפחת הכלה', 'משפחה קרובה', 'ROUND', 12]
  );
  const tbl2 = await db.query(
    `INSERT INTO seating_tables (wedding_id, table_number, category, table_shape, capacity, pos_x, pos_y)
     VALUES ($1, $2, $3, $4, $5, 340, 80) RETURNING id`,
    [weddingId, 'שולחן 2 - חברים מהאוניברסיטה', 'חברים מהאוניברסיטה', 'RECTANGLE', 14]
  );

  const g1 = await db.query(
    `INSERT INTO guests (wedding_id, group_id, group_name, side, full_name, phone_e164, max_invited_count, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [
      weddingId,
      grpFam.rows[0].id,
      'משפחה קרובה',
      'PARTNER_1',
      'משפחת אברהם ורחל כהן',
      '+972542211001',
      4,
      'דודים של דנה',
    ]
  );

  await db.query(
    `INSERT INTO invitations (
      guest_id, token_hash, short_code, delivery_status, rsvp_status,
      confirmed_adults, confirmed_children, meal_preferences, guest_dietary_notes,
      checked_in, checked_in_count, responded_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())`,
    [
      g1.rows[0].id,
      'hash-dana-001',
      'dana001vip',
      'OPENED',
      'ATTENDING',
      3,
      1,
      JSON.stringify({ regular: 2, vegetarian: 1, vegan: 0, kids: 1, glatt: 0 }),
      'מנה אחת ללא גלוטן בבקשה',
      true,
      4,
    ]
  );

  await db.query(
    `INSERT INTO seat_assignments (wedding_id, table_id, guest_id, seats_allocated)
     VALUES ($1, $2, $3, 4)`,
    [weddingId, tbl1.rows[0].id, g1.rows[0].id]
  );

  const g2 = await db.query(
    `INSERT INTO guests (wedding_id, group_id, group_name, side, full_name, phone_e164, max_invited_count, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [
      weddingId,
      grpFriends.rows[0].id,
      'חברים מהאוניברסיטה',
      'PARTNER_2',
      'עדי וגיא רוזנברג',
      '+972509988776',
      2,
      'חברים מהתואר',
    ]
  );

  await db.query(
    `INSERT INTO invitations (
      guest_id, token_hash, short_code, delivery_status, rsvp_status,
      confirmed_adults, confirmed_children, meal_preferences, guest_dietary_notes,
      checked_in, checked_in_count, responded_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())`,
    [
      g2.rows[0].id,
      'hash-dana-003',
      'dana003ros',
      'OPENED',
      'ATTENDING',
      2,
      0,
      JSON.stringify({ regular: 1, vegetarian: 0, vegan: 1, kids: 0, glatt: 0 }),
      'גיא טבעוני 🌱',
      false,
      0,
    ]
  );

  await db.query(
    `INSERT INTO seat_assignments (wedding_id, table_id, guest_id, seats_allocated)
     VALUES ($1, $2, $3, 2)`,
    [weddingId, tbl2.rows[0].id, g2.rows[0].id]
  );

  await db.query(
    `INSERT INTO greetings (wedding_id, guest_id, author_name, relationship, message, gift_amount_reported, is_approved)
     VALUES ($1, $2, $3, $4, $5, $6, TRUE)`,
    [
      weddingId,
      g1.rows[0].id,
      'משפחת אברהם ורחל כהן',
      'דודים אוהבים',
      'לדנה ועומר האהובים! שתזכו לבנות בית מלא באור, שמחה ואהבה אינסופית.',
      1500,
    ]
  );
}

function mapUserRow(row: any): User {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

function mapWeddingRow(row: any): Wedding {
  return {
    id: row.id,
    slug: row.slug,
    partner1Name: row.partner1_name,
    partner2Name: row.partner2_name,
    eventDate: new Date(row.event_date).toISOString(),
    receptionTime: row.reception_time,
    ceremonyTime: row.ceremony_time,
    venueName: row.venue_name,
    venueAddress: row.venue_address,
    venueCity: row.venue_city || '',
    wazeUrl: row.waze_url || '',
    googleMapsUrl: row.google_maps_url || '',
    defaultLocale: (row.default_locale === 'en' ? 'en' : 'he') as Locale,
    themeConfig: row.theme_config,
    giftConfig: row.gift_config,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

function mapGuestRow(row: any): Guest {
  return {
    id: row.guest_id,
    weddingId: row.wedding_id,
    groupId: row.group_id || '',
    groupName: row.group_name,
    side: row.side as WeddingSide,
    fullName: row.full_name,
    phoneE164: row.phone_e164,
    maxInvitedCount: row.max_invited_count,
    notes: row.notes || '',
    createdAt: new Date(row.guest_created_at).toISOString(),
    tableId: row.table_id || undefined,
    tableName: row.table_number || undefined,
    invitation: {
      id: row.inv_id,
      guestId: row.guest_id,
      tokenHash: row.token_hash,
      shortCode: row.short_code,
      deliveryStatus: row.delivery_status,
      lastSentAt: row.last_sent_at ? new Date(row.last_sent_at).toISOString() : undefined,
      rsvpStatus: row.rsvp_status,
      confirmedAdults: row.confirmed_adults,
      confirmedChildren: row.confirmed_children,
      mealPreferences: row.meal_preferences,
      guestDietaryNotes: row.guest_dietary_notes || '',
      checkedIn: row.checked_in,
      checkedInCount: row.checked_in_count,
      checkedInAt: row.checked_in_at ? new Date(row.checked_in_at).toISOString() : undefined,
      respondedAt: row.responded_at ? new Date(row.responded_at).toISOString() : undefined,
    },
  };
}

// ============================================================================
// AUTHENTICATION & TENANT ISOLATION FUNCTIONS
// ============================================================================

export async function registerUserRecord(input: {
  email: string;
  password: string;
  fullName: string;
  partner1Name?: string;
  partner2Name?: string;
  eventDate?: string;
  venueName?: string;
  venueAddress?: string;
  defaultLocale?: 'he' | 'en';
}): Promise<{ user: User; wedding: Wedding }> {
  const db = await getPool();
  const normalizedEmail = input.email.trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('כתובת אימייל לא תקינה');
  }
  if (!input.password || input.password.length < 6) {
    throw new Error('הסיסמה חייבת להכיל לפחות 6 תווים');
  }

  const existing = await db.query('SELECT id FROM users WHERE LOWER(email) = $1', [
    normalizedEmail,
  ]);
  if ((existing.rowCount ?? 0) > 0) {
    throw new Error('כתובת האימייל כבר רשומה במערכת');
  }

  const userRes = await db.query(
    `INSERT INTO users (email, full_name, password_hash)
     VALUES ($1, $2, $3) RETURNING *`,
    [normalizedEmail, input.fullName.trim() || normalizedEmail, hashPassword(input.password)]
  );
  const user = mapUserRow(userRes.rows[0]);

  const wedding = await createWeddingRecord(
    {
      partner1Name: input.partner1Name?.trim() || 'כלה',
      partner2Name: input.partner2Name?.trim() || 'חתן',
      eventDate: input.eventDate || new Date(Date.now() + 90 * 86400000).toISOString(),
      venueName: input.venueName?.trim() || 'גן האירועים',
      venueAddress: input.venueAddress?.trim() || 'ישראל',
      defaultLocale: input.defaultLocale || 'he',
    },
    user.id
  );

  return { user, wedding };
}

export async function authenticateUserRecord(
  email: string,
  password: string
): Promise<User> {
  const db = await getPool();
  const normalizedEmail = email.trim().toLowerCase();
  const res = await db.query('SELECT * FROM users WHERE LOWER(email) = $1', [normalizedEmail]);
  if (res.rowCount === 0) {
    throw new Error('אימייל או סיסמה שגויים');
  }
  const row = res.rows[0];
  if (!verifyPassword(password, row.password_hash)) {
    throw new Error('אימייל או סיסמה שגויים');
  }
  return mapUserRow(row);
}

export async function getUserById(userId: string): Promise<User | null> {
  const db = await getPool();
  const res = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
  if (res.rowCount === 0) return null;
  return mapUserRow(res.rows[0]);
}

export async function verifyUserWeddingAccess(
  userId: string,
  weddingId: string
): Promise<boolean> {
  const db = await getPool();
  const res = await db.query(
    'SELECT 1 FROM wedding_members WHERE user_id = $1 AND wedding_id = $2',
    [userId, weddingId]
  );
  return (res.rowCount ?? 0) > 0;
}

export async function getGuestWeddingId(guestId: string): Promise<string | null> {
  const db = await getPool();
  const res = await db.query('SELECT wedding_id FROM guests WHERE id = $1', [guestId]);
  if (res.rowCount === 0) return null;
  return res.rows[0].wedding_id;
}

// ============================================================================
// WEDDING & BUNDLE QUERIES
// ============================================================================

export async function getHydratedWeddingBundle(weddingIdOrSlug?: string, userId?: string) {
  const db = await getPool();

  let allWeddingsRes;
  if (userId) {
    allWeddingsRes = await db.query(
      `SELECT w.*
       FROM weddings w
       INNER JOIN wedding_members wm ON wm.wedding_id = w.id
       WHERE wm.user_id = $1
       ORDER BY w.created_at ASC`,
      [userId]
    );
  } else {
    allWeddingsRes = await db.query('SELECT * FROM weddings ORDER BY created_at ASC');
  }

  const allWeddings = allWeddingsRes.rows.map(mapWeddingRow);
  if (allWeddings.length === 0) {
    throw new Error('לא נמצאו אירועים משויכים למשתמש זה');
  }

  let wedding = allWeddings.find(
    (w) => w.id === weddingIdOrSlug || w.slug === weddingIdOrSlug
  );
  if (weddingIdOrSlug && !wedding && userId) {
    throw new Error('אין לך הרשאת גישה לאירוע זה');
  }
  if (!wedding) {
    wedding = allWeddings[0];
  }

  const guestsRes = await db.query(
    `SELECT
      g.id AS guest_id, g.wedding_id, g.group_id, g.group_name, g.side, g.full_name,
      g.phone_e164, g.max_invited_count, g.notes, g.created_at AS guest_created_at,
      i.id AS inv_id, i.token_hash, i.short_code, i.delivery_status, i.last_sent_at,
      i.rsvp_status, i.confirmed_adults, i.confirmed_children, i.meal_preferences,
      i.guest_dietary_notes, i.checked_in, i.checked_in_count, i.checked_in_at, i.responded_at,
      sa.table_id, st.table_number
    FROM guests g
    INNER JOIN invitations i ON i.guest_id = g.id
    LEFT JOIN seat_assignments sa ON sa.guest_id = g.id
    LEFT JOIN seating_tables st ON st.id = sa.table_id
    WHERE g.wedding_id = $1
    ORDER BY g.created_at DESC`,
    [wedding.id]
  );

  const guests: Guest[] = guestsRes.rows.map(mapGuestRow);

  const groupsRes = await db.query(
    'SELECT * FROM guest_groups WHERE wedding_id = $1 ORDER BY name ASC',
    [wedding.id]
  );
  const groups: GuestGroup[] = groupsRes.rows.map((r) => ({
    id: r.id,
    weddingId: r.wedding_id,
    name: r.name,
    color: r.color,
  }));

  const tablesRes = await db.query(
    'SELECT * FROM seating_tables WHERE wedding_id = $1 ORDER BY table_number ASC',
    [wedding.id]
  );
  const tables: SeatingTable[] = tablesRes.rows.map((r) => ({
    id: r.id,
    weddingId: r.wedding_id,
    tableNumber: r.table_number,
    category: r.category,
    tableShape: r.table_shape,
    capacity: r.capacity,
    posX: r.pos_x,
    posY: r.pos_y,
  }));

  const assignRes = await db.query(
    'SELECT * FROM seat_assignments WHERE wedding_id = $1',
    [wedding.id]
  );
  const assignments: SeatAssignment[] = assignRes.rows.map((r) => ({
    id: r.id,
    weddingId: r.wedding_id,
    tableId: r.table_id,
    guestId: r.guest_id,
    seatsAllocated: r.seats_allocated,
  }));

  const greetRes = await db.query(
    'SELECT * FROM greetings WHERE wedding_id = $1 ORDER BY created_at DESC',
    [wedding.id]
  );
  const greetings: Greeting[] = greetRes.rows.map((r) => ({
    id: r.id,
    weddingId: r.wedding_id,
    guestId: r.guest_id || undefined,
    authorName: r.author_name,
    relationship: r.relationship,
    message: r.message,
    mediaUrl: r.media_url || undefined,
    giftAmountReported: r.gift_amount_reported ? Number(r.gift_amount_reported) : undefined,
    isApproved: r.is_approved,
    createdAt: new Date(r.created_at).toISOString(),
  }));

  const logsRes = await db.query(
    'SELECT * FROM message_logs WHERE wedding_id = $1 ORDER BY sent_at DESC LIMIT 100',
    [wedding.id]
  );
  const messageLogs: MessageLog[] = logsRes.rows.map((r) => ({
    id: r.id,
    weddingId: r.wedding_id,
    guestId: r.guest_id,
    campaignType: r.campaign_type,
    channel: r.channel,
    status: r.status,
    renderedMessage: r.rendered_message,
    sentAt: new Date(r.sent_at).toISOString(),
  }));

  return {
    allWeddings,
    wedding,
    guests,
    groups,
    tables,
    assignments,
    greetings,
    messageLogs,
  };
}

export async function findInvitationByCode(
  shortCode: string,
  options?: { markOpened?: boolean }
): Promise<{
  wedding: Wedding;
  guest: Guest;
  greetings: Greeting[];
} | null> {
  const db = await getPool();

  if (options?.markOpened !== false) {
    await db.query(
      `UPDATE invitations
       SET delivery_status = 'OPENED'
       WHERE short_code = $1 AND delivery_status IN ('NOT_SENT', 'SENT', 'DELIVERED')`,
      [shortCode]
    );
  }

  const guestRes = await db.query(
    `SELECT
      g.id AS guest_id, g.wedding_id, g.group_id, g.group_name, g.side, g.full_name,
      g.phone_e164, g.max_invited_count, g.notes, g.created_at AS guest_created_at,
      i.id AS inv_id, i.token_hash, i.short_code, i.delivery_status, i.last_sent_at,
      i.rsvp_status, i.confirmed_adults, i.confirmed_children, i.meal_preferences,
      i.guest_dietary_notes, i.checked_in, i.checked_in_count, i.checked_in_at, i.responded_at,
      sa.table_id, st.table_number
    FROM invitations i
    INNER JOIN guests g ON g.id = i.guest_id
    LEFT JOIN seat_assignments sa ON sa.guest_id = g.id
    LEFT JOIN seating_tables st ON st.id = sa.table_id
    WHERE i.short_code = $1`,
    [shortCode]
  );
  if (guestRes.rowCount === 0) return null;

  const guest = mapGuestRow(guestRes.rows[0]);
  const wRes = await db.query('SELECT * FROM weddings WHERE id = $1', [guest.weddingId]);
  if (wRes.rowCount === 0) return null;
  const wedding = mapWeddingRow(wRes.rows[0]);

  // Privacy: Never expose gift_amount_reported on public guest endpoints
  const greetRes = await db.query(
    `SELECT id, wedding_id, guest_id, author_name, relationship, message, is_approved, created_at
     FROM greetings
     WHERE wedding_id = $1 AND is_approved = TRUE
     ORDER BY created_at DESC`,
    [wedding.id]
  );
  const greetings: Greeting[] = greetRes.rows.map((r) => ({
    id: r.id,
    weddingId: r.wedding_id,
    guestId: r.guest_id || undefined,
    authorName: r.author_name,
    relationship: r.relationship,
    message: r.message,
    isApproved: r.is_approved,
    createdAt: new Date(r.created_at).toISOString(),
  }));

  return { wedding, guest, greetings };
}

export async function createWeddingRecord(
  input: {
    partner1Name: string;
    partner2Name: string;
    eventDate: string;
    venueName: string;
    venueAddress: string;
    venueCity?: string;
    defaultLocale?: 'he' | 'en';
  },
  ownerUserId?: string
): Promise<Wedding> {
  const db = await getPool();
  const slug = `wedding-${Date.now().toString(36)}`;
  const locale = input.defaultLocale || 'he';

  const res = await db.query(
    `INSERT INTO weddings (
      slug, partner1_name, partner2_name, event_date, reception_time, ceremony_time,
      venue_name, venue_address, venue_city, waze_url, google_maps_url, default_locale,
      theme_config, gift_config
    ) VALUES ($1,$2,$3,$4,'19:30','20:30',$5,$6,$7,$8,$9,$10,$11,$12)
    RETURNING *`,
    [
      slug,
      input.partner1Name.trim(),
      input.partner2Name.trim(),
      new Date(input.eventDate).toISOString(),
      input.venueName.trim(),
      input.venueAddress.trim(),
      (input.venueCity || '').trim(),
      `https://waze.com/ul?q=${encodeURIComponent(input.venueName)}`,
      `https://maps.google.com/?q=${encodeURIComponent(input.venueAddress || input.venueName)}`,
      locale,
      JSON.stringify({
        templateId: 'editorial-gold',
        primaryColor: '#92400e',
        accentColor: '#d97706',
        backgroundColor: '#fffbeb',
        fontFamily: 'serif',
        coverImageUrl:
          'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80',
        heroSubtitle: 'מתרגשים להזמינכם לחגוג איתנו את יום נישואינו!',
        customInvitationMessage: 'נשמח מאוד לראותכם בינינו! אנא אשרו הגעה למטה.',
        showCountdown: true,
        showGreetingWall: true,
        showGiftLinks: true,
      }),
      JSON.stringify({
        bitUrl: 'https://www.bitpay.co.il/',
        payboxUrl: 'https://payboxapp.page.link/',
        creditCardUrl: '',
        bankDetails: '',
      }),
    ]
  );

  const wedding = mapWeddingRow(res.rows[0]);

  if (ownerUserId) {
    await db.query(
      `INSERT INTO wedding_members (wedding_id, user_id, role)
       VALUES ($1, $2, 'OWNER')
       ON CONFLICT (wedding_id, user_id) DO NOTHING`,
      [wedding.id, ownerUserId]
    );
  }

  await db.query(
    `INSERT INTO seating_tables (wedding_id, table_number, category, table_shape, capacity)
     VALUES ($1, 'שולחן 1 - משפחה', 'משפחה קרובה', 'ROUND', 12)`,
    [wedding.id]
  );
  return wedding;
}

export async function updateWeddingRecord(
  body: Partial<Wedding> & { id: string }
): Promise<Wedding> {
  const db = await getPool();
  const existingRes = await db.query('SELECT * FROM weddings WHERE id = $1', [body.id]);
  if (existingRes.rowCount === 0) {
    throw new Error('Wedding not found');
  }
  const existing = mapWeddingRow(existingRes.rows[0]);

  const updatedTheme = { ...existing.themeConfig, ...(body.themeConfig || {}) };
  const updatedGift = { ...existing.giftConfig, ...(body.giftConfig || {}) };
  const updatedEventDate = body.eventDate
    ? new Date(body.eventDate).toISOString()
    : existing.eventDate;

  const res = await db.query(
    `UPDATE weddings SET
      partner1_name = $1,
      partner2_name = $2,
      event_date = $3,
      reception_time = $4,
      ceremony_time = $5,
      venue_name = $6,
      venue_address = $7,
      venue_city = $8,
      waze_url = $9,
      google_maps_url = $10,
      default_locale = $11,
      theme_config = $12,
      gift_config = $13
    WHERE id = $14
    RETURNING *`,
    [
      body.partner1Name ?? existing.partner1Name,
      body.partner2Name ?? existing.partner2Name,
      updatedEventDate,
      body.receptionTime ?? existing.receptionTime,
      body.ceremonyTime ?? existing.ceremonyTime,
      body.venueName ?? existing.venueName,
      body.venueAddress ?? existing.venueAddress,
      body.venueCity ?? existing.venueCity,
      body.wazeUrl ?? existing.wazeUrl,
      body.googleMapsUrl ?? existing.googleMapsUrl,
      body.defaultLocale ?? existing.defaultLocale,
      JSON.stringify(updatedTheme),
      JSON.stringify(updatedGift),
      body.id,
    ]
  );

  return mapWeddingRow(res.rows[0]);
}

export async function addGuestRecord(input: {
  weddingId: string;
  fullName: string;
  phone: string;
  maxInvitedCount: number;
  groupName: string;
  side: WeddingSide;
  notes?: string;
}): Promise<Guest> {
  const db = await getPool();
  const phoneE164 = normalizePhoneE164(input.phone);
  const { shortCode, tokenHash } = generateInvitationCredentials();

  let groupRes = await db.query(
    'SELECT id, name FROM guest_groups WHERE wedding_id = $1 AND name = $2',
    [input.weddingId, input.groupName || 'General']
  );
  if (groupRes.rowCount === 0) {
    groupRes = await db.query(
      'INSERT INTO guest_groups (wedding_id, name, color) VALUES ($1, $2, $3) RETURNING id, name',
      [input.weddingId, input.groupName || 'General', '#d97706']
    );
  }
  const group = groupRes.rows[0];

  const gRes = await db.query(
    `INSERT INTO guests (wedding_id, group_id, group_name, side, full_name, phone_e164, max_invited_count, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [
      input.weddingId,
      group.id,
      group.name,
      input.side,
      input.fullName.trim(),
      phoneE164,
      Math.max(1, Number(input.maxInvitedCount) || 2),
      (input.notes || '').trim(),
    ]
  );

  await db.query(
    `INSERT INTO invitations (guest_id, token_hash, short_code, delivery_status, rsvp_status, meal_preferences)
     VALUES ($1, $2, $3, 'NOT_SENT', 'PENDING', $4)`,
    [
      gRes.rows[0].id,
      tokenHash,
      shortCode,
      JSON.stringify({ regular: 0, vegetarian: 0, vegan: 0, kids: 0, glatt: 0 }),
    ]
  );

  const found = await findInvitationByCode(shortCode, { markOpened: false });
  return found!.guest;
}

export async function updateGuestRecord(input: {
  guestId: string;
  fullName?: string;
  phone?: string;
  maxInvitedCount?: number;
  groupName?: string;
  side?: WeddingSide;
  notes?: string;
  rsvpStatus?: RsvpStatus;
  confirmedAdults?: number;
  confirmedChildren?: number;
  guestDietaryNotes?: string;
}): Promise<Guest> {
  const db = await getPool();
  const existingRes = await db.query(
    `SELECT g.*, i.short_code, i.rsvp_status, i.confirmed_adults, i.confirmed_children, i.guest_dietary_notes
     FROM guests g
     INNER JOIN invitations i ON i.guest_id = g.id
     WHERE g.id = $1`,
    [input.guestId]
  );
  if (existingRes.rowCount === 0) {
    throw new Error('Guest not found');
  }
  const row = existingRes.rows[0];

  const nextPhone = input.phone ? normalizePhoneE164(input.phone) : row.phone_e164;
  const nextGroupName = input.groupName ? input.groupName.trim() : row.group_name;
  const nextMax =
    input.maxInvitedCount !== undefined
      ? Math.max(1, Number(input.maxInvitedCount) || 1)
      : row.max_invited_count;

  await db.query(
    `UPDATE guests SET
      full_name = $1,
      phone_e164 = $2,
      max_invited_count = $3,
      group_name = $4,
      side = $5,
      notes = $6
     WHERE id = $7`,
    [
      input.fullName ? input.fullName.trim() : row.full_name,
      nextPhone,
      nextMax,
      nextGroupName,
      input.side || row.side,
      input.notes !== undefined ? input.notes.trim() : row.notes,
      input.guestId,
    ]
  );

  if (
    input.rsvpStatus !== undefined ||
    input.confirmedAdults !== undefined ||
    input.confirmedChildren !== undefined ||
    input.guestDietaryNotes !== undefined
  ) {
    const nextRsvp = input.rsvpStatus ?? row.rsvp_status;
    const nextAdults =
      nextRsvp === 'DECLINED'
        ? 0
        : input.confirmedAdults !== undefined
          ? Math.max(0, Number(input.confirmedAdults))
          : row.confirmed_adults;
    const nextChildren =
      nextRsvp === 'DECLINED'
        ? 0
        : input.confirmedChildren !== undefined
          ? Math.max(0, Number(input.confirmedChildren))
          : row.confirmed_children;

    await db.query(
      `UPDATE invitations SET
        rsvp_status = $1,
        confirmed_adults = $2,
        confirmed_children = $3,
        guest_dietary_notes = $4,
        responded_at = COALESCE(responded_at, NOW())
       WHERE guest_id = $5`,
      [
        nextRsvp,
        nextAdults,
        nextChildren,
        input.guestDietaryNotes !== undefined
          ? input.guestDietaryNotes.trim()
          : row.guest_dietary_notes,
        input.guestId,
      ]
    );
  }

  const found = await findInvitationByCode(row.short_code, { markOpened: false });
  return found!.guest;
}

export async function deleteGuestRecord(guestId: string): Promise<void> {
  const db = await getPool();
  await db.query('DELETE FROM guests WHERE id = $1', [guestId]);
}

export async function importGuestsFromCsvText(
  weddingId: string,
  csvText: string
): Promise<Guest[]> {
  const rows = parseGuestCsv(csvText);
  const created: Guest[] = [];
  for (const row of rows) {
    created.push(
      await addGuestRecord({
        weddingId,
        fullName: row.fullName,
        phone: row.phoneE164,
        maxInvitedCount: row.maxInvitedCount,
        groupName: row.groupName,
        side: row.side,
        notes: row.notes,
      })
    );
  }
  return created;
}

export async function submitGuestRsvpByCode(
  shortCode: string,
  input: RsvpSubmissionInput
): Promise<Guest> {
  const db = await getPool();
  const found = await findInvitationByCode(shortCode, { markOpened: true });
  if (!found) {
    throw new Error('Invitation not found');
  }

  const normalized = validateAndNormalizeRsvp(found.guest, input);

  await db.query(
    `UPDATE invitations SET
      rsvp_status = $1,
      confirmed_adults = $2,
      confirmed_children = $3,
      meal_preferences = $4,
      guest_dietary_notes = $5,
      responded_at = NOW(),
      delivery_status = 'OPENED'
    WHERE short_code = $6`,
    [
      normalized.rsvpStatus,
      normalized.confirmedAdults,
      normalized.confirmedChildren,
      JSON.stringify(normalized.mealPreferences),
      normalized.guestDietaryNotes,
      shortCode,
    ]
  );

  if (normalized.rsvpStatus === 'DECLINED') {
    await db.query('DELETE FROM seat_assignments WHERE guest_id = $1', [found.guest.id]);
  } else if (normalized.rsvpStatus === 'ATTENDING') {
    await db.query(
      'UPDATE seat_assignments SET seats_allocated = $1 WHERE guest_id = $2',
      [normalized.confirmedAdults + normalized.confirmedChildren, found.guest.id]
    );
  }

  const updated = await findInvitationByCode(shortCode, { markOpened: false });
  return updated!.guest;
}

export async function assignGuestToTable(params: {
  weddingId: string;
  guestId: string;
  tableId: string | null;
}): Promise<void> {
  const db = await getPool();
  const { weddingId, guestId, tableId } = params;

  if (!tableId) {
    await db.query('DELETE FROM seat_assignments WHERE guest_id = $1', [guestId]);
    return;
  }

  const bundle = await getHydratedWeddingBundle(weddingId);
  const table = bundle.tables.find((t) => t.id === tableId);
  const guest = bundle.guests.find((g) => g.id === guestId);
  if (!table || !guest) {
    throw new Error('Table or guest not found');
  }

  const existingForTable = bundle.assignments.filter((a) => a.tableId === tableId);
  const { seatsNeeded } = validateSeatAssignment(table, guest, existingForTable);

  await db.query('DELETE FROM seat_assignments WHERE guest_id = $1', [guestId]);
  await db.query(
    `INSERT INTO seat_assignments (wedding_id, table_id, guest_id, seats_allocated)
     VALUES ($1, $2, $3, $4)`,
    [weddingId, tableId, guestId, seatsNeeded]
  );
}

export async function createSeatingTableRecord(input: {
  weddingId: string;
  tableNumber: string;
  category: string;
  tableShape: 'ROUND' | 'RECTANGLE' | 'SQUARE';
  capacity: number;
}): Promise<SeatingTable> {
  const db = await getPool();
  const res = await db.query(
    `INSERT INTO seating_tables (wedding_id, table_number, category, table_shape, capacity)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [
      input.weddingId,
      input.tableNumber.trim(),
      input.category || 'General',
      input.tableShape,
      Math.max(2, Number(input.capacity) || 12),
    ]
  );
  const r = res.rows[0];
  return {
    id: r.id,
    weddingId: r.wedding_id,
    tableNumber: r.table_number,
    category: r.category,
    tableShape: r.table_shape,
    capacity: r.capacity,
    posX: r.pos_x,
    posY: r.pos_y,
  };
}

export async function deleteSeatingTableRecord(
  weddingId: string,
  tableId: string
): Promise<void> {
  const db = await getPool();
  await db.query('DELETE FROM seating_tables WHERE id = $1 AND wedding_id = $2', [
    tableId,
    weddingId,
  ]);
}

export async function checkInGuestRecord(params: {
  guestId: string;
  checkedIn: boolean;
  checkedInCount?: number;
}): Promise<void> {
  const db = await getPool();
  const invRes = await db.query(
    `SELECT i.*, g.max_invited_count
     FROM invitations i
     INNER JOIN guests g ON g.id = i.guest_id
     WHERE i.guest_id = $1`,
    [params.guestId]
  );
  if (invRes.rowCount === 0) {
    throw new Error('Guest not found');
  }
  const row = invRes.rows[0];
  const defaultCount =
    row.rsvp_status === 'ATTENDING'
      ? row.confirmed_adults + row.confirmed_children
      : row.max_invited_count;

  const count = params.checkedIn
    ? params.checkedInCount ?? Math.max(1, defaultCount)
    : 0;

  await db.query(
    `UPDATE invitations
     SET checked_in = $1, checked_in_count = $2, checked_in_at = CASE WHEN $1 THEN NOW() ELSE NULL END
     WHERE guest_id = $3`,
    [params.checkedIn, count, params.guestId]
  );
}

export async function addGreetingRecord(input: {
  weddingId: string;
  guestId?: string;
  authorName: string;
  relationship?: string;
  message: string;
  giftAmountReported?: number;
}): Promise<Greeting> {
  const db = await getPool();
  const res = await db.query(
    `INSERT INTO greetings (wedding_id, guest_id, author_name, relationship, message, gift_amount_reported, is_approved)
     VALUES ($1, $2, $3, $4, $5, $6, TRUE) RETURNING *`,
    [
      input.weddingId,
      input.guestId || null,
      input.authorName.trim(),
      (input.relationship || '').trim(),
      input.message.trim(),
      input.giftAmountReported ? Number(input.giftAmountReported) : null,
    ]
  );
  const r = res.rows[0];
  return {
    id: r.id,
    weddingId: r.wedding_id,
    guestId: r.guest_id || undefined,
    authorName: r.author_name,
    relationship: r.relationship,
    message: r.message,
    giftAmountReported: r.gift_amount_reported ? Number(r.gift_amount_reported) : undefined,
    isApproved: r.is_approved,
    createdAt: new Date(r.created_at).toISOString(),
  };
}

export async function deleteGreetingRecord(
  weddingId: string,
  greetingId: string
): Promise<void> {
  const db = await getPool();
  await db.query('DELETE FROM greetings WHERE id = $1 AND wedding_id = $2', [
    greetingId,
    weddingId,
  ]);
}

export async function logWhatsAppDispatch(input: {
  weddingId: string;
  guestId: string;
  campaignType: CampaignType;
  channel: 'WHATSAPP_LINK' | 'WHATSAPP_API' | 'SMS';
  renderedMessage: string;
}): Promise<MessageLog> {
  const db = await getPool();

  let status: 'SENT' | 'DELIVERED' | 'FAILED' = 'SENT';

  if (input.channel === 'WHATSAPP_API') {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!token || !phoneId) {
      throw new Error(
        'חיבור WhatsApp Cloud API דורש הגדרת WHATSAPP_ACCESS_TOKEN ו-WHATSAPP_PHONE_NUMBER_ID בקובץ הסביבה (.env). עד אז ניתן לשלוח בלחיצה ישירה לוואטסאפ.'
      );
    }

    const guestRes = await db.query('SELECT phone_e164 FROM guests WHERE id = $1', [
      input.guestId,
    ]);
    if (guestRes.rowCount === 0) {
      throw new Error('Guest not found');
    }
    const phoneDigits = guestRes.rows[0].phone_e164.replace(/[^\d]/g, '');

    const waRes = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phoneDigits,
        type: 'text',
        text: { preview_url: true, body: input.renderedMessage },
      }),
    });

    if (!waRes.ok) {
      const errJson = await waRes.json().catch(() => ({}));
      throw new Error(
        `שגיאה בשליחה מול WhatsApp Cloud API: ${errJson?.error?.message || waRes.statusText}`
      );
    }
    status = 'DELIVERED';
  }

  await db.query(
    `UPDATE invitations
     SET delivery_status = CASE WHEN delivery_status = 'NOT_SENT' THEN $1 ELSE delivery_status END,
         last_sent_at = NOW()
     WHERE guest_id = $2`,
    [status, input.guestId]
  );

  const res = await db.query(
    `INSERT INTO message_logs (wedding_id, guest_id, campaign_type, channel, status, rendered_message)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [
      input.weddingId,
      input.guestId,
      input.campaignType,
      input.channel,
      status,
      input.renderedMessage,
    ]
  );
  const r = res.rows[0];
  return {
    id: r.id,
    weddingId: r.wedding_id,
    guestId: r.guest_id,
    campaignType: r.campaign_type,
    channel: r.channel,
    status: r.status,
    renderedMessage: r.rendered_message,
    sentAt: new Date(r.sent_at).toISOString(),
  };
}

import type { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';
import {
  addGreetingRecord,
  addGuestRecord,
  assignGuestToTable,
  authenticateUserRecord,
  checkInGuestRecord,
  createSeatingTableRecord,
  createWeddingRecord,
  deleteGreetingRecord,
  deleteGuestRecord,
  deleteSeatingTableRecord,
  findInvitationByCode,
  getGuestWeddingId,
  getHydratedWeddingBundle,
  getUserById,
  importGuestsFromCsvText,
  loadEnvFile,
  logWhatsAppDispatch,
  registerUserRecord,
  submitGuestRsvpByCode,
  updateGuestRecord,
  updateWeddingRecord,
  verifyUserWeddingAccess,
} from '../db/store.ts';
import { calculateWeddingStatistics } from '../domain/wedding-logic.ts';
import {
  buildClearSessionCookie,
  buildSessionCookie,
  checkRateLimit,
  extractAuthSession,
  getClientIp,
  signSessionToken,
} from '../auth/security.ts';

const MAX_BODY_BYTES = 2 * 1024 * 1024; // 2MB max payload (supports CSV & compressed cover photos)

function getAllowedOrigin(req: IncomingMessage): string {
  const configured = process.env.ALLOWED_ORIGIN;
  const reqOrigin = req.headers.origin;
  if (configured) {
    const allowedList = configured.split(',').map((s) => s.trim());
    if (reqOrigin && allowedList.includes(reqOrigin)) {
      return reqOrigin;
    }
    return allowedList[0];
  }
  return reqOrigin || 'http://localhost:3000';
}

function sendJson(
  req: IncomingMessage,
  res: ServerResponse,
  status: number,
  payload: unknown,
  extraHeaders?: Record<string, string>
) {
  const origin = getAllowedOrigin(req);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    ...extraHeaders,
  });
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req: IncomingMessage): Promise<Record<string, any>> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buf.length;
    if (totalBytes > MAX_BODY_BYTES) {
      throw new Error('Request payload exceeds maximum allowed size (2MB)');
    }
    chunks.push(buf);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

const registerSchema = z.object({
  email: z.string().email('כתובת אימייל לא תקינה'),
  password: z.string().min(6, 'הסיסמה חייבת להכיל לפחות 6 תווים'),
  fullName: z.string().min(1, 'נא להזין שם מלא'),
  partner1Name: z.string().optional(),
  partner2Name: z.string().optional(),
  eventDate: z.string().optional(),
  venueName: z.string().optional(),
  venueAddress: z.string().optional(),
  defaultLocale: z.enum(['he', 'en']).optional(),
});

const loginSchema = z.object({
  email: z.string().email('כתובת אימייל לא תקינה'),
  password: z.string().min(1, 'נא להזין סיסמה'),
});

export async function handleApiRequest(req: IncomingMessage, res: ServerResponse) {
  if (req.method === 'OPTIONS') {
    return sendJson(req, res, 204, {});
  }

  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost:4000'}`);
  const pathname = url.pathname;
  const clientIp = getClientIp(req);

  try {
    // 1. Healthcheck
    if (pathname === '/api/health' && req.method === 'GET') {
      return sendJson(req, res, 200, {
        status: 'ok',
        service: 'wedding-api',
        db: 'postgresql',
        whatsappCloudConfigured: Boolean(process.env.WHATSAPP_ACCESS_TOKEN),
      });
    }

    // 2. Authentication Endpoints (/api/auth/*)
    if (pathname === '/api/auth/register' && req.method === 'POST') {
      const rate = checkRateLimit(`auth:${clientIp}`, 15, 15 * 60 * 1000);
      if (!rate.allowed) {
        return sendJson(req, res, 429, {
          error: `יותר מדי ניסיונות. נסו שוב בעוד ${rate.retryAfterSeconds} שניות.`,
        });
      }

      const body = await readJsonBody(req);
      const parsed = registerSchema.safeParse(body);
      if (!parsed.success) {
        return sendJson(req, res, 400, {
          error: parsed.error.issues[0]?.message || 'נתוני הרשמה חסרים',
        });
      }

      const { user, wedding } = await registerUserRecord(parsed.data);
      const token = signSessionToken({ userId: user.id, email: user.email });
      return sendJson(
        req,
        res,
        201,
        { user, wedding, token },
        { 'Set-Cookie': buildSessionCookie(token) }
      );
    }

    if (pathname === '/api/auth/login' && req.method === 'POST') {
      const rate = checkRateLimit(`auth:${clientIp}`, 20, 15 * 60 * 1000);
      if (!rate.allowed) {
        return sendJson(req, res, 429, {
          error: `יותר מדי ניסיונות התחברות. נסו שוב בעוד ${rate.retryAfterSeconds} שניות.`,
        });
      }

      const body = await readJsonBody(req);
      const parsed = loginSchema.safeParse(body);
      if (!parsed.success) {
        return sendJson(req, res, 400, {
          error: parsed.error.issues[0]?.message || 'אימייל או סיסמה חסרים',
        });
      }

      const user = await authenticateUserRecord(parsed.data.email, parsed.data.password);
      const token = signSessionToken({ userId: user.id, email: user.email });
      return sendJson(
        req,
        res,
        200,
        { user, token },
        { 'Set-Cookie': buildSessionCookie(token) }
      );
    }

    if (pathname === '/api/auth/logout' && req.method === 'POST') {
      return sendJson(
        req,
        res,
        200,
        { ok: true },
        { 'Set-Cookie': buildClearSessionCookie() }
      );
    }

    if (pathname === '/api/auth/me' && req.method === 'GET') {
      const session = extractAuthSession(req);
      if (!session) {
        return sendJson(req, res, 401, { error: 'לא מחובר' });
      }
      const user = await getUserById(session.userId);
      if (!user) {
        return sendJson(req, res, 401, { error: 'משתמש לא נמצא' });
      }
      return sendJson(req, res, 200, { user });
    }

    // 3. Public Invitation & Guest RSVP Endpoints (/api/invitations/:code)
    if (pathname.startsWith('/api/invitations/')) {
      const code = decodeURIComponent(pathname.replace('/api/invitations/', ''));
      if (req.method === 'GET') {
        const rate = checkRateLimit(`inv-get:${clientIp}`, 60, 60 * 1000);
        if (!rate.allowed) {
          return sendJson(req, res, 429, { error: 'Too many requests, please try again shortly.' });
        }

        const isMetaPreview = url.searchParams.get('meta') === '1';
        const found = await findInvitationByCode(code, { markOpened: !isMetaPreview });
        if (!found) return sendJson(req, res, 404, { error: 'Invitation not found' });
        return sendJson(req, res, 200, found);
      }

      if (req.method === 'PUT') {
        const rate = checkRateLimit(`inv-rsvp:${clientIp}`, 25, 60 * 1000);
        if (!rate.allowed) {
          return sendJson(req, res, 429, { error: 'Too many RSVP updates, please wait a moment.' });
        }

        const body = await readJsonBody(req);
        const guest = await submitGuestRsvpByCode(code, {
          rsvpStatus: body.rsvpStatus,
          confirmedAdults: Number(body.confirmedAdults) || 0,
          confirmedChildren: Number(body.confirmedChildren) || 0,
          mealPreferences: body.mealPreferences,
          guestDietaryNotes: body.guestDietaryNotes || '',
        });
        return sendJson(req, res, 200, { guest });
      }
    }

    // 4. Public Greeting Submission (POST /api/greetings)
    if (pathname === '/api/greetings' && req.method === 'POST') {
      const rate = checkRateLimit(`greet:${clientIp}`, 15, 60 * 1000);
      if (!rate.allowed) {
        return sendJson(req, res, 429, { error: 'Too many greetings submitted. Please wait.' });
      }

      const body = await readJsonBody(req);
      if (!body.weddingId || !body.authorName?.trim() || !body.message?.trim()) {
        return sendJson(req, res, 400, { error: 'Name and blessing message are required' });
      }
      const greeting = await addGreetingRecord({
        weddingId: body.weddingId,
        guestId: body.guestId,
        authorName: body.authorName,
        relationship: body.relationship || '',
        message: body.message,
        giftAmountReported: body.giftAmountReported ? Number(body.giftAmountReported) : undefined,
      });
      return sendJson(req, res, 201, { greeting });
    }

    // ========================================================================
    // 5. PROTECTED ADMIN ENDPOINTS (Require Authenticated User & Tenant Access)
    // ========================================================================
    const session = extractAuthSession(req);
    if (!session) {
      return sendJson(req, res, 401, {
        error: 'נדרשת התחברות למערכת הניהול (Unauthorized)',
      });
    }

    if (pathname === '/api/weddings') {
      if (req.method === 'GET') {
        loadEnvFile();
        const weddingId = url.searchParams.get('weddingId') || undefined;
        const bundle = await getHydratedWeddingBundle(weddingId, session.userId);
        const statistics = calculateWeddingStatistics(bundle.guests, bundle.assignments);
        return sendJson(req, res, 200, {
          ...bundle,
          statistics,
          whatsappCloudConfigured: Boolean(process.env.WHATSAPP_ACCESS_TOKEN),
        });
      }

      if (req.method === 'POST') {
        const body = await readJsonBody(req);
        if (!body.partner1Name || !body.partner2Name || !body.eventDate || !body.venueName) {
          return sendJson(req, res, 400, {
            error: 'Couple names, wedding date, and venue name are required.',
          });
        }
        const wedding = await createWeddingRecord(
          {
            partner1Name: body.partner1Name,
            partner2Name: body.partner2Name,
            eventDate: body.eventDate,
            venueName: body.venueName,
            venueAddress: body.venueAddress || body.venueName,
            venueCity: body.venueCity || '',
            defaultLocale: body.defaultLocale || 'he',
          },
          session.userId
        );
        return sendJson(req, res, 201, { wedding });
      }

      if (req.method === 'PUT') {
        const body = await readJsonBody(req);
        if (!body.id || !(await verifyUserWeddingAccess(session.userId, body.id))) {
          return sendJson(req, res, 403, { error: 'אין הרשאה לערוך אירוע זה' });
        }
        const wedding = await updateWeddingRecord(body as any);
        return sendJson(req, res, 200, { wedding });
      }
    }

    if (pathname === '/api/guests') {
      if (req.method === 'POST') {
        const body = await readJsonBody(req);
        if (!body.weddingId || !(await verifyUserWeddingAccess(session.userId, body.weddingId))) {
          return sendJson(req, res, 403, { error: 'אין הרשאה להוסיף מוזמנים לאירוע זה' });
        }
        if (body.mode === 'csv') {
          const imported = await importGuestsFromCsvText(body.weddingId, body.csvText || '');
          return sendJson(req, res, 201, { importedCount: imported.length, guests: imported });
        }
        const guest = await addGuestRecord({
          weddingId: body.weddingId,
          fullName: body.fullName,
          phone: body.phone,
          maxInvitedCount: Number(body.maxInvitedCount) || 2,
          groupName: body.groupName || 'Family & Friends',
          side: body.side || 'BOTH',
          notes: body.notes || '',
        });
        return sendJson(req, res, 201, { guest });
      }

      if (req.method === 'PUT') {
        const body = await readJsonBody(req);
        if (!body.guestId) {
          return sendJson(req, res, 400, { error: 'guestId is required' });
        }
        const weddingId = await getGuestWeddingId(body.guestId);
        if (!weddingId || !(await verifyUserWeddingAccess(session.userId, weddingId))) {
          return sendJson(req, res, 403, { error: 'אין הרשאה לערוך מוזמן זה' });
        }
        const guest = await updateGuestRecord({
          guestId: body.guestId,
          fullName: body.fullName,
          phone: body.phone,
          maxInvitedCount: body.maxInvitedCount,
          groupName: body.groupName,
          side: body.side,
          notes: body.notes,
          rsvpStatus: body.rsvpStatus,
          confirmedAdults: body.confirmedAdults,
          confirmedChildren: body.confirmedChildren,
          guestDietaryNotes: body.guestDietaryNotes,
        });
        return sendJson(req, res, 200, { guest });
      }

      if (req.method === 'DELETE') {
        const guestId = url.searchParams.get('guestId');
        if (!guestId) return sendJson(req, res, 400, { error: 'guestId is required' });
        const weddingId = await getGuestWeddingId(guestId);
        if (!weddingId || !(await verifyUserWeddingAccess(session.userId, weddingId))) {
          return sendJson(req, res, 403, { error: 'אין הרשאה למחוק מוזמן זה' });
        }
        await deleteGuestRecord(guestId);
        return sendJson(req, res, 200, { ok: true });
      }
    }

    if (pathname === '/api/seating' && req.method === 'POST') {
      const body = await readJsonBody(req);
      if (!body.weddingId || !(await verifyUserWeddingAccess(session.userId, body.weddingId))) {
        return sendJson(req, res, 403, { error: 'אין הרשאה לנהל הושבה באירוע זה' });
      }

      if (body.action === 'create_table') {
        const table = await createSeatingTableRecord({
          weddingId: body.weddingId,
          tableNumber: body.tableNumber,
          category: body.category || 'General',
          tableShape: body.tableShape || 'ROUND',
          capacity: Number(body.capacity) || 12,
        });
        return sendJson(req, res, 201, { table });
      }
      if (body.action === 'assign_seat') {
        await assignGuestToTable({
          weddingId: body.weddingId,
          guestId: body.guestId,
          tableId: body.tableId || null,
        });
        return sendJson(req, res, 200, { ok: true });
      }
      if (body.action === 'delete_table') {
        await deleteSeatingTableRecord(body.weddingId, body.tableId);
        return sendJson(req, res, 200, { ok: true });
      }
    }

    if (pathname === '/api/checkin' && req.method === 'POST') {
      const body = await readJsonBody(req);
      if (!body.guestId) {
        return sendJson(req, res, 400, { error: 'guestId is required' });
      }
      const weddingId = await getGuestWeddingId(body.guestId);
      if (!weddingId || !(await verifyUserWeddingAccess(session.userId, weddingId))) {
        return sendJson(req, res, 403, { error: 'אין הרשאה לבצע צ׳ק-אין לאירוע זה' });
      }
      await checkInGuestRecord({
        guestId: body.guestId,
        checkedIn: Boolean(body.checkedIn),
        checkedInCount: body.checkedInCount !== undefined ? Number(body.checkedInCount) : undefined,
      });
      return sendJson(req, res, 200, { ok: true });
    }

    if (pathname === '/api/greetings' && req.method === 'DELETE') {
      const weddingId = url.searchParams.get('weddingId');
      const greetingId = url.searchParams.get('greetingId');
      if (!weddingId || !greetingId) {
        return sendJson(req, res, 400, { error: 'weddingId and greetingId are required' });
      }
      if (!(await verifyUserWeddingAccess(session.userId, weddingId))) {
        return sendJson(req, res, 403, { error: 'אין הרשאה למחוק ברכה זו' });
      }
      await deleteGreetingRecord(weddingId, greetingId);
      return sendJson(req, res, 200, { ok: true });
    }

    if (pathname === '/api/messages' && req.method === 'POST') {
      const body = await readJsonBody(req);
      if (!body.weddingId || !(await verifyUserWeddingAccess(session.userId, body.weddingId))) {
        return sendJson(req, res, 403, { error: 'אין הרשאה לשלוח הודעות באירוע זה' });
      }
      const log = await logWhatsAppDispatch({
        weddingId: body.weddingId,
        guestId: body.guestId,
        campaignType: body.campaignType,
        channel: body.channel || 'WHATSAPP_LINK',
        renderedMessage: body.renderedMessage,
      });
      return sendJson(req, res, 201, { log });
    }

    return sendJson(req, res, 404, { error: `Route ${pathname} not found on wedding-api` });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Database / Server error';
    const status = message.includes('אין לך הרשאת גישה') || message.includes('אין הרשאה') ? 403 : 400;
    return sendJson(req, res, status, { error: message });
  }
}

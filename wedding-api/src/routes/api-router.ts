import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  addGreetingRecord,
  addGuestRecord,
  assignGuestToTable,
  checkInGuestRecord,
  createSeatingTableRecord,
  createWeddingRecord,
  deleteGuestRecord,
  findInvitationByCode,
  getHydratedWeddingBundle,
  importGuestsFromCsvText,
  logWhatsAppDispatch,
  submitGuestRsvpByCode,
  updateWeddingRecord,
} from '../db/store.ts';
import { calculateWeddingStatistics } from '../domain/wedding-logic.ts';

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req: IncomingMessage): Promise<Record<string, any>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

export async function handleApiRequest(req: IncomingMessage, res: ServerResponse) {
  if (req.method === 'OPTIONS') {
    return sendJson(res, 204, {});
  }

  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost:4000'}`);
  const pathname = url.pathname;

  try {
    if (pathname === '/api/health' && req.method === 'GET') {
      return sendJson(res, 200, { status: 'ok', service: 'wedding-api', db: 'postgresql' });
    }

    if (pathname === '/api/weddings') {
      if (req.method === 'GET') {
        const weddingId = url.searchParams.get('weddingId') || undefined;
        const bundle = await getHydratedWeddingBundle(weddingId);
        const statistics = calculateWeddingStatistics(bundle.guests, bundle.assignments);
        return sendJson(res, 200, { ...bundle, statistics });
      }

      if (req.method === 'POST') {
        const body = await readJsonBody(req);
        if (!body.partner1Name || !body.partner2Name || !body.eventDate || !body.venueName) {
          return sendJson(res, 400, {
            error: 'Couple names, wedding date, and venue name are required.',
          });
        }
        const wedding = await createWeddingRecord({
          partner1Name: body.partner1Name,
          partner2Name: body.partner2Name,
          eventDate: body.eventDate,
          venueName: body.venueName,
          venueAddress: body.venueAddress || body.venueName,
          venueCity: body.venueCity || '',
          defaultLocale: body.defaultLocale || 'he',
        });
        return sendJson(res, 201, { wedding });
      }

      if (req.method === 'PUT') {
        const body = await readJsonBody(req);
        const wedding = await updateWeddingRecord(body as any);
        return sendJson(res, 200, { wedding });
      }
    }

    if (pathname === '/api/guests') {
      if (req.method === 'POST') {
        const body = await readJsonBody(req);
        if (body.mode === 'csv') {
          const imported = await importGuestsFromCsvText(body.weddingId, body.csvText || '');
          return sendJson(res, 201, { importedCount: imported.length, guests: imported });
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
        return sendJson(res, 201, { guest });
      }

      if (req.method === 'DELETE') {
        const guestId = url.searchParams.get('guestId');
        if (!guestId) return sendJson(res, 400, { error: 'guestId is required' });
        await deleteGuestRecord(guestId);
        return sendJson(res, 200, { ok: true });
      }
    }

    if (pathname.startsWith('/api/invitations/')) {
      const code = decodeURIComponent(pathname.replace('/api/invitations/', ''));
      if (req.method === 'GET') {
        const found = await findInvitationByCode(code);
        if (!found) return sendJson(res, 404, { error: 'Invitation not found' });
        return sendJson(res, 200, found);
      }

      if (req.method === 'PUT') {
        const body = await readJsonBody(req);
        const guest = await submitGuestRsvpByCode(code, {
          rsvpStatus: body.rsvpStatus,
          confirmedAdults: Number(body.confirmedAdults) || 0,
          confirmedChildren: Number(body.confirmedChildren) || 0,
          mealPreferences: body.mealPreferences,
          guestDietaryNotes: body.guestDietaryNotes || '',
        });
        return sendJson(res, 200, { guest });
      }
    }

    if (pathname === '/api/seating' && req.method === 'POST') {
      const body = await readJsonBody(req);
      if (body.action === 'create_table') {
        const table = await createSeatingTableRecord({
          weddingId: body.weddingId,
          tableNumber: body.tableNumber,
          category: body.category || 'General',
          tableShape: body.tableShape || 'ROUND',
          capacity: Number(body.capacity) || 12,
        });
        return sendJson(res, 201, { table });
      }
      if (body.action === 'assign_seat') {
        await assignGuestToTable({
          weddingId: body.weddingId,
          guestId: body.guestId,
          tableId: body.tableId || null,
        });
        return sendJson(res, 200, { ok: true });
      }
    }

    if (pathname === '/api/checkin' && req.method === 'POST') {
      const body = await readJsonBody(req);
      await checkInGuestRecord({
        guestId: body.guestId,
        checkedIn: Boolean(body.checkedIn),
        checkedInCount: body.checkedInCount !== undefined ? Number(body.checkedInCount) : undefined,
      });
      return sendJson(res, 200, { ok: true });
    }

    if (pathname === '/api/greetings' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const greeting = await addGreetingRecord({
        weddingId: body.weddingId,
        guestId: body.guestId,
        authorName: body.authorName,
        relationship: body.relationship || '',
        message: body.message,
        giftAmountReported: body.giftAmountReported ? Number(body.giftAmountReported) : undefined,
      });
      return sendJson(res, 201, { greeting });
    }

    if (pathname === '/api/messages' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const log = await logWhatsAppDispatch({
        weddingId: body.weddingId,
        guestId: body.guestId,
        campaignType: body.campaignType,
        channel: body.channel || 'WHATSAPP_LINK',
        renderedMessage: body.renderedMessage,
      });
      return sendJson(res, 201, { log });
    }

    return sendJson(res, 404, { error: `Route ${pathname} not found on wedding-api` });
  } catch (err) {
    return sendJson(res, 400, {
      error: err instanceof Error ? err.message : 'Database / Server error',
    });
  }
}

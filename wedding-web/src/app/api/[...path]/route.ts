import { Readable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { NextRequest, NextResponse } from 'next/server';
import { handleApiRequest } from '../../../../../wedding-api/src/routes/api-router.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function dispatchToApiRouter(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const bodyBuffer =
    request.method !== 'GET' && request.method !== 'HEAD'
      ? Buffer.from(await request.arrayBuffer())
      : Buffer.alloc(0);

  const reqStream = Readable.from(bodyBuffer.length > 0 ? [bodyBuffer] : []) as unknown as IncomingMessage;
  reqStream.method = request.method;
  reqStream.url = `${url.pathname}${url.search}`;
  const headersObj: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headersObj[key.toLowerCase()] = value;
  });
  reqStream.headers = headersObj;
  (reqStream as any).socket = {
    remoteAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
  };

  let statusCode = 200;
  let responseHeaders: Record<string, string> = {};
  const responseChunks: Buffer[] = [];

  const mockRes = {
    writeHead(status: number, headers?: Record<string, string>) {
      statusCode = status;
      if (headers) {
        responseHeaders = { ...responseHeaders, ...headers };
      }
      return this;
    },
    end(chunk?: string | Buffer) {
      if (chunk) {
        responseChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), 'utf8'));
      }
      return this;
    },
  } as unknown as ServerResponse;

  await handleApiRequest(reqStream, mockRes);

  const responseBody = Buffer.concat(responseChunks);
  return new NextResponse(statusCode === 204 ? null : responseBody, {
    status: statusCode,
    headers: responseHeaders,
  });
}

export async function GET(req: NextRequest) {
  return dispatchToApiRouter(req);
}

export async function POST(req: NextRequest) {
  return dispatchToApiRouter(req);
}

export async function PUT(req: NextRequest) {
  return dispatchToApiRouter(req);
}

export async function PATCH(req: NextRequest) {
  return dispatchToApiRouter(req);
}

export async function DELETE(req: NextRequest) {
  return dispatchToApiRouter(req);
}

export async function OPTIONS(req: NextRequest) {
  return dispatchToApiRouter(req);
}

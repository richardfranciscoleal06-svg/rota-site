import crypto from 'node:crypto';
import type { HandlerEvent } from '@netlify/functions';
import { getDatabase } from '@netlify/database';
import { MAX_BODY_BYTES, PATENTE_OPTIONS } from '../../../src/types';

export const SESSION_COOKIE_NAME = 'rota_session';
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export function getSessionSecret(): string | null {
  const secret = process.env.SESSION_SECRET?.trim();
  if (secret && secret.length >= 32) return secret;

  if (process.env.NODE_ENV === 'development') {
    return 'rota-jaguare-local-dev-secret-123456';
  }

  return null;
}

export function signSessionPayload(payload: string, secret: string) {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

export function parseCookieHeader(cookieHeader?: string | null) {
  if (!cookieHeader) return null;

  const sessionCookie = cookieHeader
    .split(';')
    .map((chunk) => chunk.trim())
    .find((chunk) => chunk.startsWith(`${SESSION_COOKIE_NAME}=`));

  if (!sessionCookie) return null;

  const rawValue = sessionCookie.split('=')[1];
  if (!rawValue) return null;

  const firstDot = rawValue.indexOf('.');
  if (firstDot <= 0) return null;

  const payloadBase64 = rawValue.slice(0, firstDot);
  const signature = rawValue.slice(firstDot + 1);
  if (!payloadBase64 || !signature) return null;

  return { payloadBase64, signature };
}

export function readSessionCookie(cookieHeader?: string | null) {
  const secret = getSessionSecret();
  if (!secret) return null;

  const parsed = parseCookieHeader(cookieHeader);
  if (!parsed) return null;

  const expected = signSessionPayload(parsed.payloadBase64, secret);
  if (parsed.signature.length !== expected.length) return null;

  if (!crypto.timingSafeEqual(Buffer.from(parsed.signature), Buffer.from(expected))) return null;

  try {
    const payload = JSON.parse(Buffer.from(parsed.payloadBase64, 'base64url').toString('utf-8')) as {
      id: string;
      id_jogo: string;
      is_admin: boolean;
      exp: number;
    };

    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function buildSessionCookie(user: { id: string; id_jogo: string; is_admin: boolean }, secret: string) {
  const payload = Buffer.from(
    JSON.stringify({
      id: user.id,
      id_jogo: user.id_jogo,
      is_admin: user.is_admin,
      exp: Date.now() + SESSION_TTL_MS,
    })
  ).toString('base64url');

  const signature = signSessionPayload(payload, secret);
  return `${SESSION_COOKIE_NAME}=${payload}.${signature}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}; Secure`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure`;
}

export type SessionUser = {
  id: string;
  idJogo: string;
  isAdmin: boolean;
};

export async function getSessionUser(event: Pick<HandlerEvent, 'headers'>): Promise<SessionUser | null> {
  const cookieHeader = event.headers.cookie ?? event.headers.Cookie ?? undefined;
  const session = readSessionCookie(cookieHeader);
  if (!session) return null;

  const db = getDatabase();
  const rows = await db.sql<{ id: string; id_jogo: string; is_admin: boolean }>`
    SELECT id, id_jogo, is_admin
    FROM members
    WHERE id = ${session.id}
    LIMIT 1
  `;

  const member = rows[0];
  if (!member) return null;

  return {
    id: member.id,
    idJogo: member.id_jogo,
    isAdmin: Boolean(member.is_admin),
  };
}

export async function requireAuth(
  event: Pick<HandlerEvent, 'headers'>
): Promise<{ ok: true; user: SessionUser } | { ok: false; status: number; error: string }> {
  const user = await getSessionUser(event);
  if (!user) {
    return { ok: false, status: 401, error: 'Sessão não autenticada.' };
  }

  return { ok: true, user };
}

export async function requireAdmin(
  event: Pick<HandlerEvent, 'headers'>
): Promise<{ ok: true; user: SessionUser } | { ok: false; status: number; error: string }> {
  const auth = await requireAuth(event);
  if (!auth.ok) return auth;

  if (!auth.user.isAdmin) {
    return { ok: false, status: 403, error: 'Acesso restrito ao comando.' };
  }

  return auth;
}

export function enforceRequestSafety(
  event: Pick<HandlerEvent, 'headers' | 'httpMethod'>,
  rawBody?: string | null
): { ok: true } | { ok: false; status: number; error: string } {
  const host = (event.headers.host ?? event.headers.Host ?? '').trim().toLowerCase();
  const origin = (event.headers.origin ?? event.headers.Origin ?? '').trim();

  if (event.httpMethod === 'POST') {
    if (!host) {
      return { ok: false, status: 403, error: 'Host obrigatório para requisições POST.' };
    }

    if (origin) {
      try {
        const originUrl = new URL(origin);
        const hostname = host.replace(/:\d+$/, '');
        const originHost = originUrl.hostname;

        const isLocalHost = ['localhost', '127.0.0.1', '[::1]'].includes(hostname);
        if (!isLocalHost && originHost !== hostname && !host.endsWith('.netlify.app') && !host.endsWith('.netlify.com')) {
          return { ok: false, status: 403, error: 'Origem inválida para esta requisição.' };
        }
      } catch {
        return { ok: false, status: 403, error: 'Origem inválida para esta requisição.' };
      }
    }

    if (rawBody && Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) {
      return { ok: false, status: 413, error: 'Corpo excede o limite permitido.' };
    }
  }

  return { ok: true };
}

export function isValidPatente(value: string): boolean {
  return PATENTE_OPTIONS.some((patente) => patente === value);
}

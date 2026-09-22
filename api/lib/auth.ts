import crypto from 'node:crypto';

export type SessionPayload = {
  id: string;
  idJogo: string;
  isAdmin: boolean;
  exp: number;
};

function getSecret(): string {
  const secret = process.env.SESSION_SECRET ?? (process.env.NODE_ENV === 'development' ? 'rota-dev-secret-fallback' : undefined);
  if (!secret) {
    throw new Error('SESSION_SECRET não configurado.');
  }
  return secret;
}

function toBase64Url(value: string): string {
  return Buffer.from(value).toString('base64url');
}

function fromBase64Url(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

export function hashPassword(senha: string, salt?: string) {
  const actualSalt = salt ?? crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(senha, actualSalt, 64).toString('hex');
  return { salt: actualSalt, hash };
}

export function verifyPassword(senha: string, storedHash: string, salt: string) {
  const candidate = crypto.scryptSync(senha, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(storedHash, 'hex'));
}

export function signSession(payload: Omit<SessionPayload, 'exp'>) {
  const secret = getSecret();
  const now = Math.floor(Date.now() / 1000);
  const session: SessionPayload = { ...payload, exp: now + 60 * 60 * 24 * 7 };
  const header = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const claim = toBase64Url(JSON.stringify(session));
  const signingInput = `${header}.${claim}`;
  const signature = crypto.createHmac('sha256', secret).update(signingInput).digest('base64url');
  return `${signingInput}.${signature}`;
}

export function verifySession(token: string): SessionPayload | null {
  try {
    const [header, claim, signature] = token.split('.');
    if (!header || !claim || !signature) return null;
    const expected = crypto.createHmac('sha256', getSecret()).update(`${header}.${claim}`).digest('base64url');
    if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
      const payload = JSON.parse(fromBase64Url(claim)) as SessionPayload;
      if (!payload.id || !payload.idJogo || typeof payload.isAdmin !== 'boolean') return null;
      if (typeof payload.exp === 'number' && payload.exp > Math.floor(Date.now() / 1000)) {
        return payload;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function parseCookieHeader(header: string | null): Record<string, string> {
  if (!header) return {};
  return Object.fromEntries(
    header.split(';').map((cookie) => {
      const [name, ...rest] = cookie.trim().split('=');
      if (!name || rest.length === 0) return [name, ''];
      return [name, decodeURIComponent(rest.join('='))];
    }).filter(([name]) => !!name)
  );
}

export function buildCookieString(name: string, value: string, options: Record<string, string | number | boolean> = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];

  if (options.maxAge) parts.push(`Max-Age=${options.maxAge}`);
  if (options.httpOnly) parts.push('HttpOnly');
  if (options.secure) parts.push('Secure');
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  if (options.path) parts.push(`Path=${options.path}`);

  return parts.join('; ');
}

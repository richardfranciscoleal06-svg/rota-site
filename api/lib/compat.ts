export type LegacyRequest = {
  method?: string;
  url?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: unknown;
  on?: (event: string, callback: (chunk?: unknown) => void) => void;
};

function toHeaderValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value.join(', ');
  return value;
}

function normalizeBody(value: unknown): BodyInit | undefined {
  if (typeof value === 'undefined' || value === null) return undefined;
  if (typeof value === 'string') return value;
  if (value instanceof Uint8Array) return value;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function toWebRequest(req: LegacyRequest): Request {
  const headers = new Headers();
  const rawHeaders = req.headers ?? {};

  for (const [key, value] of Object.entries(rawHeaders)) {
    const normalized = toHeaderValue(value);
    if (normalized) headers.set(key, normalized);
  }

  const protocol = headers.get('x-forwarded-proto') ?? 'https';
  const host = headers.get('host') ?? 'localhost';
  const target = req.url ?? '/';
  const absoluteUrl = /^https?:\/\//i.test(target) ? target : `${protocol}://${host}${target}`;

  return new Request(absoluteUrl, {
    method: req.method ?? 'GET',
    headers,
    body: req.method && req.method !== 'GET' && req.method !== 'HEAD' && typeof req.body !== 'undefined'
      ? normalizeBody(req.body)
      : undefined,
  });
}

export async function runLegacyHandler(
  req: any,
  res: any,
  handler: (request: Request) => Promise<Response>
): Promise<Response | undefined> {
  const request = req instanceof Request ? req : toWebRequest(req);
  const response = await handler(request);

  if (!res) {
    return response;
  }

  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  const text = await response.text();
  res.end(text);
  return undefined;
}

export function normalizeVercelRequest(req: any): Request {
  const headers = new Headers();

  for (const [key, value] of Object.entries(req.headers ?? {})) {
    if (Array.isArray(value)) {
      for (const item of value) headers.append(key, String(item));
      continue;
    }

    if (typeof value !== 'undefined') {
      headers.set(key, String(value));
    }
  }

  const protocol = req.headers?.['x-forwarded-proto'] ?? 'https';
  const host = req.headers?.host ?? 'localhost';
  const url = typeof req.url === 'string' ? req.url : '/';
  const absoluteUrl = url.startsWith('http') ? url : `${protocol}://${host}${url}`;

  let body: BodyInit | undefined;
  const rawBody = req.body;
  if (req.method && req.method !== 'GET' && req.method !== 'HEAD' && typeof rawBody !== 'undefined') {
    if (typeof rawBody === 'string') {
      body = rawBody;
    } else if (Buffer.isBuffer(rawBody)) {
      body = rawBody;
    } else if (rawBody instanceof Uint8Array) {
      body = rawBody;
    } else if (typeof rawBody === 'object') {
      body = JSON.stringify(rawBody);
    } else {
      body = String(rawBody);
    }
  }

  return new Request(absoluteUrl, {
    method: req.method ?? 'GET',
    headers,
    body,
  });
}

export async function writeVercelResponse(res: any, response: Response): Promise<void> {
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') {
      res.setHeader('set-cookie', value);
      return;
    }

    res.setHeader(key, value);
  });

  res.statusCode = response.status;
  res.end(await response.text());
}

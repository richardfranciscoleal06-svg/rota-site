import type { Handler } from '@netlify/functions';

/**
 * Adapts a Netlify Functions `handler` to a Vercel Serverless Function
 * using the Web `Request`/`Response` signature.
 *
 * The backend logic lives in `netlify/functions/*` and is shared as-is;
 * on Vercel the `netlify/functions` directory is not executed, so each
 * `api/*.ts` entrypoint wraps the corresponding Netlify handler with this
 * adapter. Header keys arrive lowercased (Web `Headers` semantics), which
 * matches how the handlers read them.
 */
export function toVercelHandler(handler: Handler) {
  return async function (req: Request): Promise<Response> {
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const method = req.method ?? 'GET';

    let body: string | null = null;
    if (method !== 'GET' && method !== 'HEAD') {
      const text = await req.text();
      body = text.length > 0 ? text : null;
    }

    const url = new URL(req.url);
    const queryStringParameters: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      queryStringParameters[key] = value;
    });

    const event = {
      httpMethod: method,
      headers,
      body,
      rawUrl: req.url,
      path: url.pathname,
      queryStringParameters,
      isBase64Encoded: false,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = (await handler(event as any, {} as any)) as
      | { statusCode?: number; headers?: Record<string, unknown>; body?: string }
      | undefined;

    const status = result?.statusCode ?? 200;
    const responseHeaders = new Headers();
    for (const [key, value] of Object.entries(result?.headers ?? {})) {
      if (value != null) responseHeaders.set(key, String(value));
    }

    return new Response(result?.body ?? '', { status, headers: responseHeaders });
  };
}

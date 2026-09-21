import { getDatabase } from '@netlify/database';

type NetlifyDatabase = ReturnType<typeof getDatabase>;

let cached: NetlifyDatabase | null = null;

/**
 * Resolve a connection string from the environment.
 *
 * The app was originally wired to Netlify Database (which injects
 * `NETLIFY_DB_URL`). When the database is provided by the Supabase
 * integration on Vercel, the injected variables are `POSTGRES_URL`
 * (pooled) and `POSTGRES_URL_NON_POOLING` (direct) instead. We accept
 * all of them so the same code works on Netlify and on Vercel/Supabase.
 */
function resolveConnectionString(): string {
  const candidates = [
    process.env.NETLIFY_DB_URL,
    process.env.NETLIFY_DATABASE_URL,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.DATABASE_URL,
  ];

  const connectionString = candidates.find(
    (value) => typeof value === 'string' && value.trim().length > 0
  );

  if (!connectionString) {
    throw new Error(
      'Nenhuma string de conexão de banco encontrada. Configure POSTGRES_URL (Supabase) ou NETLIFY_DB_URL no ambiente.'
    );
  }

  return connectionString.trim();
}

/**
 * Returns a shared database client. The client is memoized per warm
 * runtime instance so the underlying pg pool is reused across
 * invocations instead of opening a new connection every time.
 */
export function getDb(): NetlifyDatabase {
  if (cached) return cached;
  cached = getDatabase({ connectionString: resolveConnectionString() });
  return cached;
}

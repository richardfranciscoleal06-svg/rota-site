import type { Handler } from '@netlify/functions';
import { getDatabase } from '@netlify/database';

const formatNumber = (value: number | null | undefined) =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

const getPreviousMonthRange = (date: Date) => {
  const currentYear = date.getFullYear();
  const currentMonth = date.getMonth();

  const start = new Date(Date.UTC(currentYear, currentMonth, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(currentYear, currentMonth + 1, 0, 23, 59, 59, 999));

  const previousStart = new Date(Date.UTC(currentYear, currentMonth - 1, 1, 0, 0, 0, 0));
  const previousEnd = new Date(Date.UTC(currentYear, currentMonth, 0, 23, 59, 59, 999));

  return {
    currentStart: start,
    currentEnd: end,
    previousStart,
    previousEnd,
  };
};

const computeTendency = (current: number, previous: number) => {
  if (previous === 0) return null;
  return Number((((current - previous) / previous) * 100).toFixed(1));
};

export const handler: Handler = async () => {
  try {
    const db = getDatabase();
    const now = new Date();
    const { currentStart, currentEnd, previousStart, previousEnd } = getPreviousMonthRange(now);

    const [validatedSummary, membersActive, patrolSummary, lastUpdateRow] = await Promise.all([
      db.sql<{
        drogas: number;
        armamento: number;
        municoes: number;
        bombas: number;
        dinheiro_marcado: number;
        ocorrencias_mes: number;
        detidos_mes: number;
        ocorrencias_prev: number;
        detidos_prev: number;
      }>`
        SELECT
          COALESCE(SUM(CASE WHEN status = 'validated' THEN drogas ELSE 0 END), 0) AS drogas,
          COALESCE(SUM(CASE WHEN status = 'validated' THEN armamento ELSE 0 END), 0) AS armamento,
          COALESCE(SUM(CASE WHEN status = 'validated' THEN municoes ELSE 0 END), 0) AS municoes,
          COALESCE(SUM(CASE WHEN status = 'validated' THEN bombas ELSE 0 END), 0) AS bombas,
          COALESCE(SUM(CASE WHEN status = 'validated' THEN dinheiro_marcado ELSE 0 END), 0) AS dinheiro_marcado,
          COALESCE(SUM(CASE WHEN status = 'validated' AND data_envio >= ${currentStart.toISOString()} AND data_envio < ${currentEnd.toISOString()} THEN ocorrencias ELSE 0 END), 0) AS ocorrencias_mes,
          COALESCE(SUM(CASE WHEN status = 'validated' AND data_envio >= ${currentStart.toISOString()} AND data_envio < ${currentEnd.toISOString()} THEN detidos ELSE 0 END), 0) AS detidos_mes,
          COALESCE(SUM(CASE WHEN status = 'validated' AND data_envio >= ${previousStart.toISOString()} AND data_envio < ${previousEnd.toISOString()} THEN ocorrencias ELSE 0 END), 0) AS ocorrencias_prev,
          COALESCE(SUM(CASE WHEN status = 'validated' AND data_envio >= ${previousStart.toISOString()} AND data_envio < ${previousEnd.toISOString()} THEN detidos ELSE 0 END), 0) AS detidos_prev
        FROM rso_reports
      `,
      db.sql<{ count: number }>`
        SELECT COUNT(*)::int AS count
        FROM members
        WHERE status = 'ATIVO' AND is_admin = false
      `,
      db.sql<{ patrulhas_mes: number; patrulhas_prev: number; updated_at: string | null }>`
        SELECT
          COALESCE(COUNT(CASE WHEN status = 'ended' AND ended_at >= ${currentStart.toISOString()} AND ended_at < ${currentEnd.toISOString()} THEN 1 END), 0)::int AS patrulhas_mes,
          COALESCE(COUNT(CASE WHEN status = 'ended' AND ended_at >= ${previousStart.toISOString()} AND ended_at < ${previousEnd.toISOString()} THEN 1 END), 0)::int AS patrulhas_prev,
          MAX(ended_at) AS updated_at
        FROM patrol_sessions
        WHERE status = 'ended'
      `,
      db.sql<{ updated_at: string | null }>`
        SELECT MAX(updated_at) AS updated_at
        FROM (
          SELECT data_envio AS updated_at FROM rso_reports WHERE status = 'validated'
          UNION ALL
          SELECT ended_at AS updated_at FROM patrol_sessions WHERE status = 'ended'
        ) AS combined
      `,
    ]);

    const summary = validatedSummary[0];
    const activeMembers = Number(membersActive[0]?.count ?? 0);
    const patrolStatus = patrolSummary[0];
    const lastUpdate = lastUpdateRow[0]?.updated_at ?? null;

    const currentPatrulhasMes = Number(patrolStatus?.patrulhas_mes ?? 0);
    const previousPatrulhasMes = Number(patrolStatus?.patrulhas_prev ?? 0);

    const currentOcorrencias = formatNumber(Number(summary?.ocorrencias_mes ?? 0));
    const previousOcorrencias = formatNumber(Number(summary?.ocorrencias_prev ?? 0));
    const currentDetidos = formatNumber(Number(summary?.detidos_mes ?? 0));
    const previousDetidos = formatNumber(Number(summary?.detidos_prev ?? 0));

    const result = {
      drogas: formatNumber(Number(summary?.drogas ?? 0)),
      armamento: formatNumber(Number(summary?.armamento ?? 0)),
      municoes: formatNumber(Number(summary?.municoes ?? 0)),
      bombas: formatNumber(Number(summary?.bombas ?? 0)),
      dinheiroMarcado: formatNumber(Number(summary?.dinheiro_marcado ?? 0)),
      operadoresAtivos: activeMembers,
      viaturasAtivas: Number((await db.sql<{ count: number }>`
        SELECT COUNT(*)::int AS count
        FROM patrol_sessions
        WHERE status = 'active'
      `)[0]?.count ?? 0),
      ocorrenciasMes: currentOcorrencias,
      patrulhasMes: currentPatrulhasMes,
      detidosMes: currentDetidos,
      tendencias: {
        ocorrenciasMes: computeTendency(currentOcorrencias, previousOcorrencias),
        patrulhasMes: computeTendency(currentPatrulhasMes, previousPatrulhasMes),
        detidosMes: computeTendency(currentDetidos, previousDetidos),
      },
      ultimaAtualizacao: lastUpdate ? new Date(lastUpdate).toISOString() : null,
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300, s-maxage=300',
      },
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('stats failed', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
      body: JSON.stringify({ error: 'Não foi possível carregar as estatísticas.' }),
    };
  }
};

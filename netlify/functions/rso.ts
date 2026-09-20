import type { Handler } from '@netlify/functions';
import { getDatabase } from '@netlify/database';
import { enforceRequestSafety, requireAdmin, requireAuth } from './_lib/auth';
import { MAX_RESUMO_LENGTH } from '../../src/types';

const MAX_RSO_COUNTER = 5000;
const MAX_RSO_MONEY = 5000000;
const MAX_PATROL_HOURS = 12;
const SEIZURE_CREDIT_MODE = 'full_per_member';
const REQUIRED_BARCA_KEYS = ['chefe', 'motorista', 'auxiliar', 'anotador', 'estagiario'] as const;

function getPatrolHours(startedAt: string | null, endedAt: string | null) {
  if (!startedAt || !endedAt) return 0;
  const seconds = (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000;
  const hours = Math.max(0, seconds / 3600);
  return Math.min(hours, MAX_PATROL_HOURS);
}

function getBarcaValues(barca: Record<string, string> | undefined) {
  const values = REQUIRED_BARCA_KEYS.map((key) => String(barca?.[key] ?? '').trim()).filter(Boolean);
  return Array.from(new Set(values));
}

export const handler: Handler = async (event) => {
  const safety = enforceRequestSafety(event, event.body ?? null);
  if (!safety.ok) {
    return {
      statusCode: safety.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: safety.error }),
    };
  }

  if (event.httpMethod === 'POST') {
    try {
      const auth = await requireAuth(event);
      if (!auth.ok) {
        return {
          statusCode: auth.status,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ok: false, error: auth.error }),
        };
      }

      const body = JSON.parse(event.body ?? '{}') as {
        action?: 'create' | 'validate' | 'reject' | 'reset';
        id?: string;
        patrolId?: string;
        barca?: Record<string, string>;
        ocorrencias?: number;
        detidos?: number;
        armamento?: number;
        drogas?: number;
        municoes?: number;
        bombas?: number;
        dinheiroMarcado?: number;
        resumo?: string;
      };

      const db = getDatabase();

      if (body.action === 'create') {
        const patrolId = (body.patrolId ?? '').trim();
        if (!patrolId) {
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ok: false, error: 'Patrulha inválida.' }),
          };
        }

        const patrolRow = await db.sql<{
          id: string;
          viatura: string;
          operators: string[] | null;
          started_at: string;
          ended_at: string | null;
          status: 'active' | 'ended';
        }>`
          SELECT id, viatura, operators, started_at, ended_at, status
          FROM patrol_sessions
          WHERE id = ${patrolId}
          LIMIT 1
        `;

        const patrol = patrolRow[0];
        if (!patrol) {
          return {
            statusCode: 404,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ok: false, error: 'Patrulha não encontrada.' }),
          };
        }

        if (patrol.status !== 'ended') {
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ok: false, error: 'A patrulha precisa estar encerrada para transmitir o RSO.' }),
          };
        }

        const operators = Array.isArray(patrol.operators) ? patrol.operators : [];
        if (!operators.includes(auth.user.idJogo)) {
          return {
            statusCode: 403,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ok: false, error: 'Você não participou desta patrulha.' }),
          };
        }

        const barca = body.barca ?? {};
        const selectedBarca = getBarcaValues(barca);
        if (selectedBarca.length < 3) {
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ok: false, error: 'A barca deve conter no mínimo 3 operadores da patrulha.' }),
          };
        }

        if (selectedBarca.some((member) => !operators.includes(member))) {
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ok: false, error: 'A barca deve ser composta apenas por operadores da patrulha.' }),
          };
        }

        const duplicatePatrol = await db.sql<{ id: string }>`
          SELECT id
          FROM rso_reports
          WHERE patrol_id = ${patrolId}
            AND status IN ('pending', 'validated')
          LIMIT 1
        `;

        if (duplicatePatrol[0]) {
          return {
            statusCode: 409,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ok: false, error: 'Esta patrulha já possui um RSO pendente ou validado.' }),
          };
        }

        const counters = {
          ocorrencias: Number(body.ocorrencias ?? 0),
          detidos: Number(body.detidos ?? 0),
          armamento: Number(body.armamento ?? 0),
          drogas: Number(body.drogas ?? 0),
          municoes: Number(body.municoes ?? 0),
          bombas: Number(body.bombas ?? 0),
          dinheiroMarcado: Number(body.dinheiroMarcado ?? 0),
        };

        const invalidCounter = Object.values(counters).some((value) => !Number.isInteger(value) || value < 0 || value > MAX_RSO_COUNTER);
        if (invalidCounter || counters.dinheiroMarcado > MAX_RSO_MONEY) {
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ok: false, error: 'Contadores do RSO fora do limite permitido.' }),
          };
        }

        const resumo = String(body.resumo ?? '').trim();
        if (resumo.length > MAX_RESUMO_LENGTH) {
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ok: false, error: 'Resumo excede o tamanho máximo permitido.' }),
          };
        }

        await db.sql`
          INSERT INTO rso_reports (
            enviado_por,
            id_militar,
            viatura,
            patrol_id,
            barca,
            ocorrencias,
            detidos,
            armamento,
            drogas,
            municoes,
            bombas,
            dinheiro_marcado,
            resumo,
            status
          ) VALUES (
            ${auth.user.idJogo},
            ${auth.user.idJogo},
            ${patrol.viatura},
            ${patrolId},
            ${JSON.stringify(barca)},
            ${counters.ocorrencias},
            ${counters.detidos},
            ${counters.armamento},
            ${counters.drogas},
            ${counters.municoes},
            ${counters.bombas},
            ${counters.dinheiroMarcado},
            ${resumo},
            'pending'
          )
        `;

        return {
          statusCode: 201,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ok: true }),
        };
      }

      if (body.action === 'reset') {
        const admin = await requireAdmin(event);
        if (!admin.ok) {
          return {
            statusCode: admin.status,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ok: false, error: admin.error }),
          };
        }

        await db.sql`DELETE FROM rso_reports`;
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ok: true }),
        };
      }

      if (body.id && (body.action === 'validate' || body.action === 'reject')) {
        const admin = await requireAdmin(event);
        if (!admin.ok) {
          return {
            statusCode: admin.status,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ok: false, error: admin.error }),
          };
        }

        const rows = await db.sql<{
          id: string;
          patrol_id: string | null;
          barca: Record<string, string> | null;
          dinheiro_marcado: number;
          status: string;
          started_at: string | null;
          ended_at: string | null;
          operators: string[] | null;
        }>`
          SELECT r.id, r.patrol_id, r.barca, r.dinheiro_marcado, r.status, p.started_at, p.ended_at, p.operators
          FROM rso_reports r
          LEFT JOIN patrol_sessions p ON p.id = r.patrol_id
          WHERE r.id = ${body.id}
          LIMIT 1
        `;

        const target = rows[0];
        if (!target) {
          return {
            statusCode: 404,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ok: false, error: 'RSO não encontrado.' }),
          };
        }

        if (target.status !== 'pending') {
          return {
            statusCode: 409,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ok: false, error: 'Só é possível validar ou rejeitar RSOs pendentes.' }),
          };
        }

        if (body.action === 'reject') {
          await db.sql`
            UPDATE rso_reports
            SET status = 'rejected'
            WHERE id = ${body.id}
              AND status = 'pending'
          `;

          return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ok: true }),
          };
        }

        const operatorIds = Array.isArray(target.operators) ? [...new Set(target.operators.map((value) => String(value).trim()).filter(Boolean))] : [];
        const barcaIds = getBarcaValues(target.barca ?? {});
        const moneyPerMember = SEIZURE_CREDIT_MODE === 'full_per_member' ? Number(target.dinheiro_marcado ?? 0) : Number(target.dinheiro_marcado ?? 0) / Math.max(barcaIds.length, 1);
        const hoursCredited = Number(getPatrolHours(target.started_at, target.ended_at).toFixed(2));

        await db.sql`
          WITH target AS (
            SELECT r.id, p.operators, p.started_at, p.ended_at
            FROM rso_reports r
            JOIN patrol_sessions p ON p.id = r.patrol_id
            WHERE r.id = ${body.id}
              AND r.status = 'pending'
              AND p.status = 'ended'
            LIMIT 1
          )
          UPDATE rso_reports r
          SET status = 'validated',
              hours_credited = ${hoursCredited},
              credited_at = now()
          FROM target
          WHERE r.id = target.id
            AND r.status = 'pending'
        `;

        await db.sql`
          UPDATE members m
          SET horas_patrulha = m.horas_patrulha + CASE WHEN m.id_jogo = ANY(${operatorIds}) THEN ${hoursCredited} ELSE 0 END,
              apreensoes_rs = m.apreensoes_rs + CASE WHEN m.id_jogo = ANY(${barcaIds}) THEN ${moneyPerMember} ELSE 0 END
          WHERE m.id_jogo = ANY(${operatorIds})
             OR m.id_jogo = ANY(${barcaIds})
        `;

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ok: true }),
        };
      }

      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'Ação inválida.' }),
      };
    } catch (error) {
      console.error('rso action failed', error);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'Não foi possível processar o RSO.' }),
      };
    }
  }

  try {
    const admin = await requireAdmin(event);
    if (!admin.ok) {
      return {
        statusCode: admin.status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: admin.error }),
      };
    }

    const db = getDatabase();
    const rows = await db.sql<{
      id: string;
      enviado_por: string;
      id_militar: string;
      viatura: string;
      patrol_id: string | null;
      barca: Record<string, string> | null;
      ocorrencias: number;
      detidos: number;
      armamento: number;
      drogas: number;
      municoes: number;
      bombas: number;
      dinheiro_marcado: number;
      resumo: string;
      data_envio: string;
      started_at: string | null;
      ended_at: string | null;
    }>`
      SELECT r.id, r.enviado_por, r.id_militar, r.viatura, r.patrol_id, r.barca, r.ocorrencias, r.detidos, r.armamento, r.drogas, r.municoes, r.bombas, r.dinheiro_marcado, r.resumo, r.data_envio, p.started_at, p.ended_at
      FROM rso_reports r
      LEFT JOIN patrol_sessions p ON p.id = r.patrol_id
      WHERE r.status = 'pending'
      ORDER BY r.created_at DESC
    `;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reports: rows.map((row) => {
          const barca = row.barca ?? { chefe: '', motorista: '', auxiliar: '', anotador: '', estagiario: '' };
          const barcaMembers = getBarcaValues(barca);
          const moneyPerMember = SEIZURE_CREDIT_MODE === 'full_per_member' ? Number(row.dinheiro_marcado ?? 0) : Number(row.dinheiro_marcado ?? 0) / Math.max(barcaMembers.length, 1);
          const hoursPerOperator = Number(getPatrolHours(row.started_at, row.ended_at).toFixed(2));

          return {
            id: row.id,
            patrolId: row.patrol_id ?? undefined,
            enviadoPor: row.enviado_por,
            idMilitar: row.id_militar,
            viatura: row.viatura,
            barca,
            ocorrencias: Number(row.ocorrencias ?? 0),
            detidos: Number(row.detidos ?? 0),
            armamento: Number(row.armamento ?? 0),
            drogas: Number(row.drogas ?? 0),
            municoes: Number(row.municoes ?? 0),
            bombas: Number(row.bombas ?? 0),
            dinheiroMarcado: Number(row.dinheiro_marcado ?? 0),
            resumo: row.resumo ?? '',
            dataEnvio: row.data_envio ?? new Date().toISOString(),
            creditPreview: {
              hoursPerOperator,
              moneyPerMember,
            },
          };
        }),
      }),
    };
  } catch (error) {
    console.error('rso list failed', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Não foi possível listar os RSOs.' }),
    };
  }
};

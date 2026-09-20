import crypto from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildSessionCookie } from '../netlify/functions/_lib/auth';
import { handler as bootstrapHandler } from '../netlify/functions/bootstrap';
import { handler as membersHandler } from '../netlify/functions/members';
import { handler as rsoHandler } from '../netlify/functions/rso';
import { handler as statsHandler } from '../netlify/functions/stats';
import { handler as loginHandler } from '../netlify/functions/login';
import { handler as sessionHandler } from '../netlify/functions/session';

const SECRET = '12345678901234567890123456789012';
const OLD_SECRET = 'rota-jaguare-dev-secret';

type MemberRow = {
  id: string;
  nome: string;
  sobrenome: string;
  id_jogo: string;
  discord_id: string;
  patente: string;
  funcao: string;
  status: 'ATIVO' | 'INATIVO';
  horas_patrulha: number;
  apreensoes_rs: number;
  is_admin: boolean;
  senha_hash: string;
  senha_salt: string;
};

type PatrolRow = {
  id: string;
  viatura: string;
  operators: string[];
  started_at: string;
  ended_at?: string | null;
  status: string;
};

type RsoReportRow = {
  id: string;
  enviado_por: string;
  id_militar: string;
  viatura: string;
  patrol_id: unknown;
  barca: unknown;
  ocorrencias: number;
  detidos: number;
  armamento: number;
  drogas: number;
  municoes: number;
  bombas: number;
  dinheiro_marcado: number;
  resumo: string;
  status: string;
};

const dbState = {
  members: [] as MemberRow[],
  rsoReports: [] as RsoReportRow[],
  patrols: [] as PatrolRow[],
};

const db = {
  state: dbState,
  sql: vi.fn((strings: TemplateStringsArray | string[], ...values: unknown[]) => {
    const query = Array.isArray(strings)
      ? strings.reduce((acc, part, index) => acc + part + (index < values.length ? `__VAL_${index}__` : ''), '')
      : String(strings);

    if (query.includes('SELECT COUNT(*)') && query.includes('is_admin = true')) {
      return [{ count: dbState.members.filter((member) => member.is_admin).length }];
    }

    if (query.includes('SELECT id, id_jogo, is_admin') && query.includes('FROM members') && !query.includes('WHERE id_jogo')) {
      const memberId = values[0];
      return dbState.members
        .filter((member) => member.id === memberId)
        .map((member) => ({ id: member.id, id_jogo: member.id_jogo, is_admin: member.is_admin }));
    }

    if (query.includes('SELECT id, id_jogo, is_admin, senha_hash, senha_salt') && query.includes('WHERE id_jogo')) {
      const loginId = values[0];
      return dbState.members
        .filter((member) => member.id_jogo === loginId)
        .map((member) => ({
          id: member.id,
          id_jogo: member.id_jogo,
          is_admin: member.is_admin,
          senha_hash: member.senha_hash,
          senha_salt: member.senha_salt,
        }));
    }

    if (query.includes('SELECT id, nome, sobrenome, id_jogo, patente, funcao, status, horas_patrulha, apreensoes_rs')) {
      return dbState.members.map((member) => ({
        id: member.id,
        nome: member.nome,
        sobrenome: member.sobrenome,
        id_jogo: member.id_jogo,
        patente: member.patente,
        funcao: member.funcao,
        status: member.status,
        horas_patrulha: member.horas_patrulha,
        apreensoes_rs: member.apreensoes_rs,
      }));
    }

    if (query.includes('INSERT INTO members') && query.includes('senha_hash')) {
      const [nome, sobrenome, idJogo, discordId, patente, funcao, status, senhaHash, senhaSalt, isAdmin] = values;
      dbState.members.push({
        id: crypto.randomUUID(),
        nome: String(nome),
        sobrenome: String(sobrenome),
        id_jogo: String(idJogo),
        discord_id: String(discordId),
        patente: String(patente),
        funcao: String(funcao),
        status: String(status) as 'ATIVO' | 'INATIVO',
        horas_patrulha: 0,
        apreensoes_rs: 0,
        is_admin: Boolean(isAdmin),
        senha_hash: String(senhaHash),
        senha_salt: String(senhaSalt),
      });
      return [] as unknown[];
    }

    if (query.includes('INSERT INTO rso_reports')) {
      const [enviadoPor, idMilitar, viatura, patrolId, barca, ocorrencias, detidos, armamento, drogas, municoes, bombas, dinheiroMarcado, resumo, status] = values;
      dbState.rsoReports.push({
        id: crypto.randomUUID(),
        enviado_por: String(enviadoPor),
        id_militar: String(idMilitar),
        viatura: String(viatura),
        patrol_id: patrolId,
        barca: barca,
        ocorrencias: Number(ocorrencias ?? 0),
        detidos: Number(detidos ?? 0),
        armamento: Number(armamento ?? 0),
        drogas: Number(drogas ?? 0),
        municoes: Number(municoes ?? 0),
        bombas: Number(bombas ?? 0),
        dinheiro_marcado: Number(dinheiroMarcado ?? 0),
        resumo: String(resumo),
        status: String(status),
      });
      return [] as unknown[];
    }

    if (query.includes('SELECT id, viatura, operators, started_at, ended_at, status') && query.includes('FROM patrol_sessions')) {
      const patrolId = values[0];
      const match = dbState.patrols.find((patrol) => patrol.id === patrolId);
      return match ? [{ ...match }] : [];
    }

    if (query.includes('SELECT id FROM rso_reports') && query.includes('patrol_id')) {
      const patrolId = values[0];
      return dbState.rsoReports.filter((report) => report.patrol_id === patrolId).slice(0, 1).map((report) => ({ id: report.id }));
    }

    if (query.includes('UPDATE members') && query.includes('horas_patrulha')) {
      const [hoursCredited, moneyPerMember, operatorIds, barcaIds] = values;
      const operatorSet = Array.isArray(operatorIds) ? operatorIds : [];
      const barcaSet = Array.isArray(barcaIds) ? barcaIds : [];
      for (const member of dbState.members) {
        if (operatorSet.includes(member.id_jogo)) {
          member.horas_patrulha += Number(hoursCredited ?? 0);
        }
        if (barcaSet.includes(member.id_jogo)) {
          member.apreensoes_rs += Number(moneyPerMember ?? 0);
        }
      }
      return [] as unknown[];
    }

    if (query.includes('SELECT id, nome, sobrenome, id_jogo, discord_id, senha_hash, senha_salt') && query.includes('FROM members')) {
      const pending = values[0];
      return dbState.members.filter((member) => member.id_jogo === pending).map((member) => ({
        id: member.id,
        nome: member.nome,
        sobrenome: member.sobrenome,
        id_jogo: member.id_jogo,
        discord_id: member.discord_id,
        senha_hash: member.senha_hash,
        senha_salt: member.senha_salt,
      }));
    }

    return [] as unknown[];
  }),
};

vi.mock('@netlify/database', () => ({
  getDatabase: () => db,
}));

describe('Netlify handlers security and bootstrap', () => {
  beforeEach(() => {
    vi.stubEnv('SESSION_SECRET', SECRET);
    vi.stubEnv('BOOTSTRAP_TOKEN', 'bootstrap-token');
    dbState.members = [];
    dbState.rsoReports = [];
    dbState.patrols = [];
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('rotas protegidas dão 401 sem cookie', async () => {
    const membersResponse = await membersHandler({
      httpMethod: 'GET',
      headers: { host: 'localhost:8888' },
      body: null,
    } as Parameters<typeof membersHandler>[0]);

    const rsoResponse = await rsoHandler({
      httpMethod: 'POST',
      headers: { host: 'localhost:8888' },
      body: JSON.stringify({ action: 'create' }),
    } as Parameters<typeof rsoHandler>[0]);

    expect(membersResponse.statusCode).toBe(401);
    expect(rsoResponse.statusCode).toBe(401);
    expect(JSON.stringify(membersResponse.body)).toContain('Sessão não autenticada');
    expect(JSON.stringify(rsoResponse.body)).toContain('Sessão não autenticada');
  });

  it('rotas de admin dão 403 para usuário comum', async () => {
    const commonUser = {
      id: 'member-1',
      id_jogo: 'user-1',
      is_admin: false,
    };

    const cookie = buildSessionCookie(commonUser, SECRET);
    dbState.members.push({
      id: commonUser.id,
      nome: 'João',
      sobrenome: 'Silva',
      id_jogo: commonUser.id_jogo,
      discord_id: 'discord-1',
      patente: 'Soldado',
      funcao: 'Operador',
      status: 'ATIVO',
      horas_patrulha: 5,
      apreensoes_rs: 200,
      is_admin: false,
      senha_hash: 'aa',
      senha_salt: 'bb',
    });

    const response = await membersHandler({
      httpMethod: 'POST',
      headers: { host: 'localhost:8888', cookie },
      body: JSON.stringify({ action: 'update', id: commonUser.id, patente: 'Cabo', funcao: 'Operador', status: 'ATIVO' }),
    } as Parameters<typeof membersHandler>[0]);

    expect(response.statusCode).toBe(403);
    expect(response.body).toContain('Acesso restrito ao comando');
  });

  it('cookie assinado com o segredo antigo é rejeitado', async () => {
    const oldCookie = buildSessionCookie({ id: 'member-1', id_jogo: 'user-1', is_admin: true }, OLD_SECRET);

    const response = await sessionHandler({
      httpMethod: 'GET',
      headers: { host: 'localhost:8888', cookie: oldCookie },
      body: null,
    } as Parameters<typeof sessionHandler>[0]);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ user: null });
  });

  it('em desenvolvimento usa secret de fallback para não bloquear o login local', async () => {
    vi.unstubAllEnvs();
    vi.stubEnv('NODE_ENV', 'development');
    dbState.members.push({
      id: 'member-local-dev',
      nome: 'Teste',
      sobrenome: 'User',
      id_jogo: 'u-local',
      discord_id: 'd-local',
      patente: 'Soldado',
      funcao: 'Operador',
      status: 'ATIVO',
      horas_patrulha: 0,
      apreensoes_rs: 0,
      is_admin: false,
      senha_hash: crypto.scryptSync('pass123456', 'salt-dev', 64).toString('hex'),
      senha_salt: 'salt-dev',
    });

    const response = await loginHandler({
      httpMethod: 'POST',
      headers: { host: 'localhost:8888' },
      body: JSON.stringify({ id: 'u-local', password: 'pass123456' }),
    } as Parameters<typeof loginHandler>[0]);

    expect(response.statusCode).toBe(200);
    expect(response.headers['Set-Cookie']).toBeDefined();
    expect(JSON.stringify(response.body)).toContain('u-local');
  });

  it('sem SESSION_SECRET as funções dão 500 e não emitem cookie', async () => {
    vi.unstubAllEnvs();
    dbState.members.push({
      id: 'member-1',
      nome: 'Teste',
      sobrenome: 'User',
      id_jogo: 'u1',
      discord_id: 'd1',
      patente: 'Soldado',
      funcao: 'Operador',
      status: 'ATIVO',
      horas_patrulha: 0,
      apreensoes_rs: 0,
      is_admin: false,
      senha_hash: crypto.scryptSync('pass123456', 'salt', 64).toString('hex'),
      senha_salt: 'salt',
    });

    const response = await loginHandler({
      httpMethod: 'POST',
      headers: { host: 'localhost:8888' },
      body: JSON.stringify({ id: 'u1', password: 'pass123456' }),
    } as Parameters<typeof loginHandler>[0]);

    expect(response.statusCode).toBe(500);
    expect(response.headers['Set-Cookie']).toBeUndefined();
    expect(JSON.stringify(response.body)).toContain('Erro interno de autenticação');
  });

  it('nenhuma resposta contém senha_hash, senha_salt nem password_hash', async () => {
    dbState.members.push({
      id: 'member-2',
      nome: 'João',
      sobrenome: 'Silva',
      id_jogo: 'op-2',
      discord_id: 'd2',
      patente: 'Soldado',
      funcao: 'Operador',
      status: 'ATIVO',
      horas_patrulha: 1,
      apreensoes_rs: 50,
      is_admin: false,
      senha_hash: crypto.scryptSync('pass123456', 'salt', 64).toString('hex'),
      senha_salt: 'salt',
    });

    const cookie = buildSessionCookie({ id: 'member-2', id_jogo: 'op-2', is_admin: false }, SECRET);

    const loginResponse = await loginHandler({
      httpMethod: 'POST',
      headers: { host: 'localhost:8888' },
      body: JSON.stringify({ id: 'op-2', password: 'pass123456' }),
    } as Parameters<typeof loginHandler>[0]);

    const membersResponse = await membersHandler({
      httpMethod: 'GET',
      headers: { host: 'localhost:8888', cookie },
      body: null,
    } as Parameters<typeof membersHandler>[0]);

    const payload = JSON.stringify({
      login: loginResponse.body,
      members: membersResponse.body,
    });

    expect(payload).not.toContain('senha_hash');
    expect(payload).not.toContain('senha_salt');
    expect(payload).not.toContain('password_hash');
  });

  it('/api/members para usuário comum não traz discordId nem isAdmin', async () => {
    dbState.members.push({
      id: 'member-3',
      nome: 'Maria',
      sobrenome: 'Souza',
      id_jogo: 'op-3',
      discord_id: 'discord-3',
      patente: 'Soldado',
      funcao: 'Operador',
      status: 'ATIVO',
      horas_patrulha: 0,
      apreensoes_rs: 0,
      is_admin: false,
      senha_hash: 'hash',
      senha_salt: 'salt',
    });

    const cookie = buildSessionCookie({ id: 'member-3', id_jogo: 'op-3', is_admin: false }, SECRET);
    const response = await membersHandler({
      httpMethod: 'GET',
      headers: { host: 'localhost:8888', cookie },
      body: null,
    } as Parameters<typeof membersHandler>[0]);

    const body = JSON.parse(response.body);
    expect(response.statusCode).toBe(200);
    expect(body.members[0]).not.toHaveProperty('discordId');
    expect(body.members[0]).not.toHaveProperty('isAdmin');
  });

  it('bootstrap dá 404 sem token, 404 quando já existe admin e cria o admin só uma vez', async () => {
    vi.stubEnv('BOOTSTRAP_TOKEN', '');
    const withoutToken = await bootstrapHandler({
      httpMethod: 'POST',
      headers: { host: 'localhost:8888' },
      body: JSON.stringify({ token: '', nome: 'Admin', sobrenome: 'Root', discordId: 'd8', idJogo: 'admin-1', senha: 'senha12345678' }),
    } as Parameters<typeof bootstrapHandler>[0]);
    expect(withoutToken.statusCode).toBe(404);

    vi.stubEnv('BOOTSTRAP_TOKEN', 'bootstrap-token');
    const first = await bootstrapHandler({
      httpMethod: 'POST',
      headers: { host: 'localhost:8888' },
      body: JSON.stringify({ token: 'bootstrap-token', nome: 'Admin', sobrenome: 'Root', discordId: 'd9', idJogo: 'admin-1', senha: 'senha12345678' }),
    } as Parameters<typeof bootstrapHandler>[0]);

    const second = await bootstrapHandler({
      httpMethod: 'POST',
      headers: { host: 'localhost:8888' },
      body: JSON.stringify({ token: 'bootstrap-token', nome: 'Admin2', sobrenome: 'Root2', discordId: 'd10', idJogo: 'admin-2', senha: 'senha12345678' }),
    } as Parameters<typeof bootstrapHandler>[0]);

    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(404);
    expect(dbState.members.filter((member) => member.is_admin)).toHaveLength(1);
  });

  it('RSO ignora enviadoPor e idMilitar do corpo', async () => {
    const user = { id: 'op-7', id_jogo: 'op-7', is_admin: false };
    dbState.members.push({
      id: user.id,
      nome: 'Operador',
      sobrenome: 'Sete',
      id_jogo: user.id_jogo,
      discord_id: 'd7',
      patente: 'Soldado',
      funcao: 'Operador',
      status: 'ATIVO',
      horas_patrulha: 0,
      apreensoes_rs: 0,
      is_admin: false,
      senha_hash: 'hash',
      senha_salt: 'salt',
    });

    dbState.patrols.push({
      id: 'patrulha-1',
      viatura: 'ROTA 9100',
      operators: ['op-7', 'op-8', 'op-9'],
      started_at: '2025-01-01T00:00:00.000Z',
      ended_at: '2025-01-01T02:00:00.000Z',
      status: 'ended',
    });

    const response = await rsoHandler({
      httpMethod: 'POST',
      headers: { host: 'localhost:8888', cookie: buildSessionCookie(user, SECRET) },
      body: JSON.stringify({
        action: 'create',
        patrolId: 'patrulha-1',
        enviadoPor: 'malicioso',
        idMilitar: 'id-externo',
        barca: { chefe: 'op-7', motorista: 'op-8', auxiliar: 'op-9', anotador: 'op-7', estagiario: 'op-8' },
        ocorrencias: 1,
        detidos: 1,
        armamento: 0,
        drogas: 0,
        municoes: 0,
        bombas: 0,
        dinheiroMarcado: 100,
        resumo: 'ok',
      }),
    } as Parameters<typeof rsoHandler>[0]);

    expect(response.statusCode).toBe(201);
    expect(dbState.rsoReports[0].enviado_por).toBe('op-7');
    expect(dbState.rsoReports[0].id_militar).toBe('op-7');
  });

  it('/api/stats não contém nomes nem IDs', async () => {
    const response = await statsHandler({ httpMethod: 'GET', headers: { host: 'localhost:8888' } } as Parameters<typeof statsHandler>[0]);
    const serialized = String(response.body ?? '');

    expect(response.statusCode).toBe(200);
    expect(serialized).not.toContain('nome');
    expect(serialized).not.toContain('idJogo');
    expect(serialized).not.toContain('id_jogo');
    expect(serialized).not.toContain('discord');
  });
});

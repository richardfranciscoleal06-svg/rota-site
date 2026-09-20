export type View =
  | 'home'
  | 'historia'
  | 'hierarquia'
  | 'regulamentos'
  | 'login'
  | 'operacional'
  | 'comando';

export type OpTab =
  | 'perfis'
  | 'promocao'
  | 'rankings'
  | 'rso'
  | 'bateponto'
  | 'qualificacao';

export type CmdTab = 'cadastros' | 'rso' | 'patrulhas' | 'basedados';

export interface Member {
  id: string;
  nome: string;
  idJogo: string;
  discordId: string;
  patente: Patente;
  funcao: string;
  status: 'ATIVO' | 'INATIVO';
  horasPatrulha: number;
  apreensoesRs: number;
  isAdmin: boolean;
}

export type Patente =
  | 'General'
  | 'Coronel'
  | 'Tenente-Coronel'
  | 'Major'
  | 'Capitão'
  | '1º Tenente'
  | '2º Tenente'
  | 'Aspirante'
  | 'Subtenente'
  | '1º Sargento'
  | '2º Sargento'
  | '3º Sargento'
  | 'Cabo'
  | 'Soldado'
  | 'Recruta';

export interface PendingRegistration {
  id: string;
  nome: string;
  sobrenome: string;
  rgDiscord: string;
  idMilitar: string;
  senha: string;
  dataSolicitacao: string;
}

export type RSOStatus = 'pending' | 'validated' | 'rejected';

export interface RSOReport {
  id: string;
  patrolId?: string;
  enviadoPor: string;
  idMilitar: string;
  viatura: string;
  barca: {
    chefe: string;
    motorista: string;
    auxiliar: string;
    anotador: string;
    estagiario: string;
  };
  ocorrencias: number;
  detidos: number;
  armamento: number;
  drogas: number;
  municoes: number;
  bombas: number;
  dinheiroMarcado: number;
  resumo: string;
  dataEnvio: string;
  status: RSOStatus;
  hoursCredited?: number;
  creditedAt?: string;
  creditPreview?: {
    hoursPerOperator: number;
    moneyPerMember: number;
  };
}

export interface ActivePatrol {
  id: string;
  viatura: string;
  operadores: string[];
  inicio: number;
  status: 'ativa' | 'encerrada';
}

export const CREW_ROLES = [
  'chefe',
  'motorista',
  'auxiliar',
  'anotador',
  'estagiario',
] as const;
export type CrewRole = (typeof CREW_ROLES)[number];
export const CREW_LABELS: Record<CrewRole, string> = {
  chefe: 'Chefe de Barca',
  motorista: 'Motorista',
  auxiliar: 'Auxiliar',
  anotador: 'Anotador',
  estagiario: 'Estagiário',
};
export const MIN_CREW_TO_START = 3;

export const PATENTE_OPTIONS = [
  'General',
  'Coronel',
  'Tenente-Coronel',
  'Major',
  'Capitão',
  '1º Tenente',
  '2º Tenente',
  'Aspirante',
  'Subtenente',
  '1º Sargento',
  '2º Sargento',
  '3º Sargento',
  'Cabo',
  'Soldado',
  'Recruta',
] as const;

export const VIATURAS = [
  'ROTA 9100',
  'ROTA 9101',
  'ROTA 9102',
  'ROTA 9103',
  'ROTA 9104',
  'ROTA 9105',
  'ROTA 9106',
  'ROTA 9107',
  'ROTA 9108',
  'ROTA 9109',
] as const;

export const MAX_BODY_BYTES = 64 * 1024;
export const MAX_NAME_LENGTH = 80;
export const MAX_ID_LENGTH = 32;
export const MAX_DISCORD_LENGTH = 64;
export const MAX_RESUMO_LENGTH = 1000;

export interface RankingEntry {
  id: string;
  nome: string;
  patente: Patente;
  valor: number;
}

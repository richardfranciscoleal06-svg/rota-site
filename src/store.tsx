import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Member, PendingRegistration, RSOReport, ActivePatrol } from '@/types';
import { api } from '@/lib/api';

interface StoreValue {
  members: Member[];
  pendingRegs: PendingRegistration[];
  reports: RSOReport[];
  patrols: ActivePatrol[];
  loadMembers: () => Promise<void>;
  loadPendingRegs: () => Promise<void>;
  loadReports: () => Promise<void>;
  loadPatrols: () => Promise<void>;
  updateMember: (id: string, patch: Partial<Member>) => Promise<void>;
  removeMember: (id: string) => Promise<void>;
  approvePendingRegistration: (pending: PendingRegistration) => Promise<void>;
  approveRegistration: (pending: PendingRegistration) => Promise<void>;
  denyRegistration: (pending: PendingRegistration) => Promise<void>;
  submitRegistration: (payload: {
    nome: string;
    sobrenome: string;
    rgDiscord: string;
    idMilitar: string;
    senha: string;
  }) => Promise<void>;
  validateReport: (id: string) => Promise<void>;
  rejectReport: (id: string) => Promise<void>;
  submitReport: (payload: {
    patrolId: string;
    barca: Record<string, string>;
    ocorrencias: number;
    detidos: number;
    armamento: number;
    drogas: number;
    municoes: number;
    bombas: number;
    dinheiroMarcado: number;
    resumo: string;
    enviadoPor?: string;
  }) => Promise<void>;
  startPatrol: (payload: { viatura: string; operadores: string[] }) => Promise<string | null>;
  endPatrol: (id: string) => Promise<void>;
  resetRSOs: () => Promise<void>;
  resetPatrols: () => Promise<void>;
  resetAccounting: () => Promise<void>;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({
  children,
  userId,
  isAdmin,
}: {
  children: ReactNode;
  userId: string | null;
  isAdmin: boolean;
}) {
  const [members, setMembers] = useState<Member[]>([]);
  const [pendingRegs, setPendingRegs] = useState<PendingRegistration[]>([]);
  const [reports, setReports] = useState<RSOReport[]>([]);
  const [patrols, setPatrols] = useState<ActivePatrol[]>([]);

  const loadMembers = async () => {
    try {
      const data = await api.get<{ members?: Member[] }>('/api/members');
      setMembers(data.members ?? []);
    } catch (error) {
      console.error('loadMembers failed', error);
    }
  };

  const loadPendingRegs = async () => {
    try {
      const data = await api.get<{ pending?: PendingRegistration[] }>('/api/pending');
      setPendingRegs(data.pending ?? []);
    } catch (error) {
      console.error('loadPendingRegs failed', error);
    }
  };

  const loadReports = async () => {
    try {
      const data = await api.get<{ reports?: RSOReport[] }>('/api/rso');
      setReports(data.reports ?? []);
    } catch (error) {
      console.error('loadReports failed', error);
    }
  };

  const loadPatrols = async () => {
    try {
      const data = await api.get<{ patrols?: ActivePatrol[] }>('/api/patrols');
      setPatrols(data.patrols ?? []);
    } catch (error) {
      console.error('loadPatrols failed', error);
    }
  };

  useEffect(() => {
    if (!userId) {
      return;
    }

    if (isAdmin) {
      void loadMembers();
      void loadPendingRegs();
      void loadReports();
      void loadPatrols();
      return;
    }

    void loadMembers();
    void loadPatrols();
  }, [userId, isAdmin]);

  const updateMember = async (id: string, patch: Partial<Member>) => {
    const response = await api.post<{ ok?: boolean }>('/api/members', {
      action: 'update',
      id,
      ...patch,
    });

    if (response.ok) {
      await loadMembers();
    }
  };

  const removeMember = async (id: string) => {
    const response = await api.post<{ ok?: boolean }>('/api/members', {
      action: 'delete',
      id,
    });

    if (response.ok) {
      await loadMembers();
    }
  };

  const approvePendingRegistration = async (pending: PendingRegistration) => {
    const result = await api.post<{ ok?: boolean }>('/api/pending', {
      action: 'approve',
      id: pending.id,
    });

    if (!result.ok) {
      throw new Error('Não foi possível aprovar a solicitação.');
    }

    await loadMembers();
    await loadPendingRegs();
  };

  const approveRegistration = approvePendingRegistration;

  const denyRegistration = async (pending: PendingRegistration) => {
    const result = await api.post<{ ok?: boolean }>('/api/pending', {
      action: 'deny',
      id: pending.id,
    });

    if (!result.ok) {
      throw new Error('Não foi possível rejeitar a solicitação.');
    }

    await loadPendingRegs();
  };

  const submitRegistration = async (payload: {
    nome: string;
    sobrenome: string;
    rgDiscord: string;
    idMilitar: string;
    senha: string;
  }) => {
    const response = await api.post<{ ok?: boolean }>('/api/register', payload);
    if (response.ok) {
      await loadPendingRegs();
    }
  };

  const validateReport = async (id: string) => {
    const result = await api.post<{ ok?: boolean }>('/api/rso', { action: 'validate', id });
    if (!result.ok) {
      throw new Error('Não foi possível validar o relatório.');
    }

    await loadMembers();
    await loadReports();
  };

  const rejectReport = async (id: string) => {
    const result = await api.post<{ ok?: boolean }>('/api/rso', { action: 'reject', id });
    if (!result.ok) {
      throw new Error('Não foi possível rejeitar o relatório.');
    }

    await loadReports();
  };

  const submitReport = async (payload: {
    patrolId: string;
    barca: Record<string, string>;
    ocorrencias: number;
    detidos: number;
    armamento: number;
    drogas: number;
    municoes: number;
    bombas: number;
    dinheiroMarcado: number;
    resumo: string;
    enviadoPor?: string;
  }) => {
    const response = await api.post<{ ok?: boolean }>('/api/rso', {
      action: 'create',
      ...payload,
    });

    if (response.ok) {
      await loadReports();
    }
  };

  const startPatrol = async (payload: { viatura: string; operadores: string[] }) => {
    const result = await api.post<{ ok?: boolean; id?: string }>('/api/patrols', {
      action: 'create',
      viatura: payload.viatura,
      operadores: payload.operadores,
    });

    if (!result.ok) {
      throw new Error('Não foi possível iniciar a patrulha.');
    }

    await loadPatrols();
    return result.id ?? null;
  };

  const endPatrol = async (id: string) => {
    const result = await api.post<{ ok?: boolean }>('/api/patrols', { action: 'stop', id });
    if (!result.ok) {
      throw new Error('Não foi possível encerrar a patrulha.');
    }

    await loadPatrols();
  };

  const resetRSOs = async () => {
    const response = await api.post<{ ok?: boolean }>('/api/rso', { action: 'reset' });
    if (response.ok) {
      await loadReports();
    }
  };

  const resetPatrols = async () => {
    const response = await api.post<{ ok?: boolean }>('/api/patrols', { action: 'reset' });
    if (response.ok) {
      await loadPatrols();
    }
  };

  const resetAccounting = async () => {
    const response = await api.post<{ ok?: boolean }>('/api/members', {
      action: 'reset-accounting',
    });

    if (response.ok) {
      await loadMembers();
    }
  };

  return (
    <StoreContext.Provider
      value={{
        members,
        pendingRegs,
        reports,
        patrols,
        loadMembers, loadPendingRegs, loadReports, loadPatrols,
        updateMember,
        removeMember,
        approvePendingRegistration,
        approveRegistration,
        denyRegistration,
        submitRegistration,
        validateReport,
        rejectReport,
        submitReport,
        startPatrol,
        endPatrol,
        resetRSOs,
        resetPatrols,
        resetAccounting,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

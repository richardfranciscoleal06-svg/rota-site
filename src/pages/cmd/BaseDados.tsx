import { useState } from 'react';
import { useStore } from '@/store';
import { PATENTE_OPTIONS, type Patente } from '@/types';
import {
  Database, Trash2, RotateCcw, Save, UserMinus, AlertTriangle,
  CheckCircle2, Users, FileText, Clock, X,
} from 'lucide-react';

export default function BaseDados() {
  const {
    members, updateMember, removeMember,
    reports, resetRSOs,
    patrols, resetPatrols,
    resetAccounting,
  } = useStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPatente, setEditPatente] = useState<Patente>('Recruta');
  const [editFuncao, setEditFuncao] = useState('');
  const [editStatus, setEditStatus] = useState<'ATIVO' | 'INATIVO'>('ATIVO');
  const [confirm, setConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const patenteOptions = PATENTE_OPTIONS;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const startEdit = (id: string, patente: Patente, funcao: string, status: 'ATIVO' | 'INATIVO') => {
    setEditingId(id);
    setEditPatente(patente);
    setEditFuncao(funcao);
    setEditStatus(status);
  };

  const saveEdit = (id: string) => {
    updateMember(id, { patente: editPatente, funcao: editFuncao, status: editStatus });
    setEditingId(null);
    showToast('Membro atualizado com sucesso.');
  };

  const handleRemove = (id: string, nome: string) => {
    removeMember(id);
    setConfirm(null);
    showToast(`${nome} removido da base.`);
  };

  const handleResetRSOs = () => {
    resetRSOs();
    setConfirm(null);
    showToast('Todos os RSOs foram resetados.');
  };

  const handleResetPatrols = () => {
    resetPatrols();
    setConfirm(null);
    showToast('Todas as patrulhas foram encerradas.');
  };

  const handleResetAccounting = () => {
    resetAccounting();
    setConfirm(null);
    showToast('Contabilidade reiniciada (horas e apreensões zeradas).');
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-rota-white mb-1">Base de Dados</h1>
          <p className="text-sm text-rota-muted">
            Gestão direta da base — alterar cargos, remover membros e reiniciar contabilidade
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rota-red/10 border border-rota-red/30">
          <Database className="w-4 h-4 text-rota-red-light" />
          <span className="text-sm font-semibold text-rota-red-light">
            {members.length} membros cadastrados
          </span>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="rota-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-rota-gold" />
            <span className="text-xs font-semibold text-rota-light uppercase tracking-wide">RSOs</span>
          </div>
          <p className="text-2xl font-bold text-rota-white mb-2">{reports.length}</p>
          <button
            onClick={() => setConfirm('rsos')}
            className="rota-btn-red w-full text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Resetar RSOs
          </button>
        </div>

        <div className="rota-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-rota-gold" />
            <span className="text-xs font-semibold text-rota-light uppercase tracking-wide">Patrulhas</span>
          </div>
          <p className="text-2xl font-bold text-rota-white mb-2">{patrols.length}</p>
          <button
            onClick={() => setConfirm('patrols')}
            className="rota-btn-red w-full text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Encerrar Patrulhas
          </button>
        </div>

        <div className="rota-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-rota-gold" />
            <span className="text-xs font-semibold text-rota-light uppercase tracking-wide">Contabilidade</span>
          </div>
          <p className="text-2xl font-bold text-rota-white mb-2">Semanal</p>
          <button
            onClick={() => setConfirm('accounting')}
            className="rota-btn-red w-full text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reiniciar Contabilidade
          </button>
        </div>
      </div>

      {/* Members table */}
      <div className="rota-card overflow-hidden">
        <div className="flex items-center gap-2 p-4 border-b border-rota-border">
          <Users className="w-4 h-4 text-rota-gold" />
          <h2 className="text-sm font-bold text-rota-white uppercase tracking-wide">
            Quadro de Membros
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-rota-panel text-rota-muted text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3 font-semibold">Nome</th>
                <th className="text-left px-4 py-3 font-semibold">ID Jogo</th>
                <th className="text-left px-4 py-3 font-semibold">Patente</th>
                <th className="text-left px-4 py-3 font-semibold">Função</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold">Horas</th>
                <th className="text-left px-4 py-3 font-semibold">Apreensões</th>
                <th className="text-center px-4 py-3 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const isEditing = editingId === m.id;
                return (
                  <tr
                    key={m.id}
                    className="border-t border-rota-border hover:bg-rota-panel/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-rota-white">{m.nome}</td>
                    <td className="px-4 py-3 text-rota-light">{m.idJogo}</td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <select
                          value={editPatente}
                          onChange={(e) => setEditPatente(e.target.value as Patente)}
                          className="rota-input text-xs py-1 w-full"
                        >
                          {patenteOptions.map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="rota-badge bg-rota-gold/10 text-rota-gold">{m.patente}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editFuncao}
                          onChange={(e) => setEditFuncao(e.target.value)}
                          className="rota-input text-xs py-1 w-full"
                        />
                      ) : (
                        <span className="text-rota-light">{m.funcao}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value as 'ATIVO' | 'INATIVO')}
                          className="rota-input text-xs py-1"
                        >
                          <option value="ATIVO">ATIVO</option>
                          <option value="INATIVO">Inativo</option>
                        </select>
                      ) : (
                        <span
                          className={`rota-badge ${
                            m.status === 'ATIVO'
                              ? 'bg-rota-green/15 text-rota-green-light'
                              : 'bg-rota-muted/15 text-rota-muted'
                          }`}
                        >
                          {m.status}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-rota-light tabular-nums">{m.horasPatrulha}h</td>
                    <td className="px-4 py-3 text-rota-gold tabular-nums">
                      R$ {m.apreensoesRs.toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => saveEdit(m.id)}
                              className="rota-btn-green text-xs px-2.5 py-1"
                            >
                              <Save className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="rota-btn-ghost text-xs px-2.5 py-1"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(m.id, m.patente, m.funcao, m.status)}
                              className="rota-btn-ghost text-xs px-2.5 py-1"
                            >
                              <Save className="w-3 h-3" />
                              Editar
                            </button>
                            <button
                              onClick={() => setConfirm(`member-${m.id}`)}
                              className="text-xs px-2.5 py-1 rounded-md bg-rota-red/15 text-rota-red-light hover:bg-rota-red/25 border border-rota-red/30 transition-colors flex items-center gap-1"
                            >
                              <UserMinus className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm modal */}
      {confirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setConfirm(null)}
        >
          <div
            className="w-full max-w-sm rota-card p-6 shadow-2xl animate-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-rota-red/15 border border-rota-red/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rota-red-light" />
              </div>
              <h3 className="text-base font-bold text-rota-white">Confirmar ação</h3>
            </div>
            <p className="text-sm text-rota-light mb-5">
              {confirm === 'rsos' && 'Tem certeza que deseja resetar todos os RSOs? Esta ação não pode ser desfeita.'}
              {confirm === 'patrols' && 'Tem certeza que deseja encerrar todas as patrulhas ativas? Esta ação não pode ser desfeita.'}
              {confirm === 'accounting' && 'Reiniciar a contabilidade vai zerar horas de patrulha e apreensões de todos os membros. Continuar?'}
              {confirm.startsWith('member-') && (() => {
                const m = members.find((mm) => mm.id === confirm.split('-')[1]);
                return `Remover ${m?.nome} da base de dados? Esta ação não pode ser desfeita.`;
              })()}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (confirm === 'rsos') handleResetRSOs();
                  else if (confirm === 'patrols') handleResetPatrols();
                  else if (confirm === 'accounting') handleResetAccounting();
                  else if (confirm.startsWith('member-')) {
                    const m = members.find((mm) => mm.id === confirm.split('-')[1]);
                    if (m) handleRemove(m.id, m.nome);
                  }
                }}
                className="rota-btn-red flex-1"
              >
                <Trash2 className="w-4 h-4" />
                Confirmar
              </button>
              <button
                onClick={() => setConfirm(null)}
                className="rota-btn-ghost flex-1"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 rota-card p-3 shadow-2xl animate-slide-in flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-rota-green-light" />
          <p className="text-sm text-rota-white">{toast}</p>
        </div>
      )}
    </div>
  );
}

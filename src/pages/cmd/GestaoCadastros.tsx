import { useState } from 'react';
import { useStore } from '@/store';
import { CheckCircle2, XCircle, UserPlus, ShieldCheck, Inbox } from 'lucide-react';

export default function GestaoCadastros() {
  const {
    pendingRegs: pending,
    approveRegistration,
    denyRegistration,
  } = useStore();
  const [action, setAction] = useState<{ id: string; type: 'approve' | 'deny' } | null>(null);

  const handleApprove = (id: string) => {
    const record = pending.find((item) => item.id === id);
    if (!record) return;

    setAction({ id, type: 'approve' });
    setTimeout(() => {
      void approveRegistration(record);
      setAction(null);
    }, 800);
  };

  const handleDeny = (id: string) => {
    const record = pending.find((item) => item.id === id);
    if (!record) return;

    setAction({ id, type: 'deny' });
    setTimeout(() => {
      void denyRegistration(record);
      setAction(null);
    }, 800);
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-rota-white mb-1">Gestão de Cadastros</h1>
          <p className="text-sm text-rota-muted">
            Solicitações de nova credencial aguardando aprovação
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rota-gold/10 border border-rota-gold/30">
          <Inbox className="w-4 h-4 text-rota-gold" />
          <span className="text-sm font-semibold text-rota-gold">
            {pending.length} {pending.length === 1 ? 'pendente' : 'pendentes'}
          </span>
        </div>
      </div>

      {pending.length === 0 ? (
        <div className="rota-card p-12 text-center">
          <ShieldCheck className="w-12 h-12 text-rota-green-light mx-auto mb-3" />
          <p className="text-lg font-bold text-rota-white mb-1">Tudo em dia</p>
          <p className="text-sm text-rota-muted">
            Não há solicitações de cadastro pendentes no momento.
          </p>
        </div>
      ) : (
        <div className="rota-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-rota-panel text-rota-muted text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-semibold">Nome</th>
                  <th className="text-left px-4 py-3 font-semibold">ID Militar</th>
                  <th className="text-left px-4 py-3 font-semibold">Discord</th>
                  <th className="text-left px-4 py-3 font-semibold">Data</th>
                  <th className="text-center px-4 py-3 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((r) => {
                  const isActing = action?.id === r.id;
                  return (
                    <tr
                      key={r.id}
                      className={`border-t border-rota-border transition-all duration-500 ${
                        isActing
                          ? action.type === 'approve'
                            ? 'bg-rota-green/10'
                            : 'bg-rota-red/10'
                          : 'hover:bg-rota-panel/30'
                      } ${
                        isActing ? 'opacity-50' : 'opacity-100'
                      }`}
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-rota-gold/10 border border-rota-gold/30 flex items-center justify-center">
                            <UserPlus className="w-4 h-4 text-rota-gold" />
                          </div>
                          <div>
                            <p className="font-medium text-rota-white">
                              {r.nome} {r.sobrenome}
                            </p>
                            <p className="text-xs text-rota-muted">Recruta</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-rota-light">{r.idMilitar}</td>
                      <td className="px-4 py-3.5 text-rota-light">{r.rgDiscord}</td>
                      <td className="px-4 py-3.5 text-rota-muted text-xs">{r.dataSolicitacao}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-center gap-2">
                          {isActing ? (
                            <span
                              className={`text-xs font-semibold ${
                                action.type === 'approve'
                                  ? 'text-rota-green-light'
                                  : 'text-rota-red-light'
                              }`}
                            >
                              {action.type === 'approve' ? 'Aprovando...' : 'Negando...'}
                            </span>
                          ) : (
                            <>
                              <button
                                onClick={() => handleApprove(r.id)}
                                className="rota-btn-green text-xs px-3 py-1.5"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Aprovar Recruta
                              </button>
                              <button
                                onClick={() => handleDeny(r.id)}
                                className="rota-btn-red text-xs px-3 py-1.5"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Negar
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
      )}
    </div>
  );
}

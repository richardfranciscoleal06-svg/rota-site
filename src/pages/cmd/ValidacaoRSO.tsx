import { useState } from 'react';
import { useStore } from '@/store';
import { CREW_ROLES, CREW_LABELS } from '@/types';
import {
  CheckCircle2, XCircle, FileText, Car, Users, Package, Pill,
  Crosshair, Bomb, DollarSign, Inbox,
} from 'lucide-react';

export default function ValidacaoRSO() {
  const { reports, validateReport, rejectReport } = useStore();
  const [action, setAction] = useState<{ id: string; type: 'validate' | 'reject' } | null>(null);

  const handleValidate = async (id: string) => {
    const report = reports.find((item) => item.id === id);
    if (!report) return;

    const previewHours = report.creditPreview?.hoursPerOperator ?? 0;
    const previewMoney = report.creditPreview?.moneyPerMember ?? 0;
    const confirmed = window.confirm(
      `Validar RSO?\n\n+${previewHours.toFixed(1)} h para cada operador\n+R$ ${previewMoney.toLocaleString('pt-BR')} para cada membro da barca`
    );
    if (!confirmed) return;

    setAction({ id, type: 'validate' });
    try {
      await validateReport(id);
    } finally {
      setAction(null);
    }
  };

  const handleReject = async (id: string) => {
    setAction({ id, type: 'reject' });
    try {
      await rejectReport(id);
    } finally {
      setAction(null);
    }
  };

  const items = [
    { key: 'ocorrencias', label: 'Ocorrências', icon: FileText },
    { key: 'detidos', label: 'Detidos', icon: Users },
    { key: 'armamento', label: 'Armamento', icon: Crosshair },
    { key: 'drogas', label: 'Drogas', icon: Pill },
    { key: 'municoes', label: 'Munições', icon: Package },
    { key: 'bombas', label: 'Bombas', icon: Bomb },
  ] as const;

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-rota-white mb-1">Validação de RSO</h1>
          <p className="text-sm text-rota-muted">
            Caixa de entrada — Relatórios de Serviço aguardando validação
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rota-gold/10 border border-rota-gold/30">
          <Inbox className="w-4 h-4 text-rota-gold" />
          <span className="text-sm font-semibold text-rota-gold">
            {reports.length} {reports.length === 1 ? 'relatório' : 'relatórios'}
          </span>
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="rota-card p-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-rota-green-light mx-auto mb-3" />
          <p className="text-lg font-bold text-rota-white mb-1">Caixa vazia</p>
          <p className="text-sm text-rota-muted">
            Todos os relatórios de serviço foram validados.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((r) => {
            const isActing = action?.id === r.id;
            return (
              <div
                key={r.id}
                className={`rota-card p-5 transition-all duration-500 ${
                  isActing
                    ? action.type === 'validate'
                      ? 'border-rota-green/40 bg-rota-green/5'
                      : 'border-rota-red/40 bg-rota-red/5'
                    : ''
                } ${isActing ? 'opacity-50 scale-[0.98]' : 'opacity-100'}`}
              >
                <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-rota-gold/10 border border-rota-gold/30 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-rota-gold" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-rota-white">{r.enviadoPor}</p>
                      <p className="text-xs text-rota-muted">
                        {r.idMilitar} · Enviado em {r.dataEnvio}
                      </p>
                    </div>
                  </div>
                  <span className="rota-badge bg-rota-gold/10 text-rota-gold">
                    <Car className="w-3 h-3" />
                    {r.viatura}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
                  {items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.key} className="bg-rota-panel rounded-md p-2.5 text-center">
                        <Icon className="w-4 h-4 text-rota-muted mx-auto mb-1" />
                        <p className="text-lg font-bold text-rota-white">
                          {r[item.key]}
                        </p>
                        <p className="text-[10px] text-rota-muted uppercase">{item.label}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <div className="bg-rota-panel rounded-md p-2.5 flex items-center gap-2 flex-1">
                    <DollarSign className="w-4 h-4 text-rota-gold" />
                    <span className="text-xs text-rota-muted">Dinheiro Marcado:</span>
                    <span className="text-sm font-bold text-rota-gold">
                      R$ {r.dinheiroMarcado.toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>

                <div className="bg-rota-panel rounded-md p-3 mb-4">
                  <p className="text-xs text-rota-muted uppercase tracking-wide mb-2">
                    Crédito previsto
                  </p>
                  <p className="text-sm text-rota-light">
                    +{(r.creditPreview?.hoursPerOperator ?? 0).toFixed(1)} h para cada operador · +R$ {(r.creditPreview?.moneyPerMember ?? 0).toLocaleString('pt-BR')} para cada membro da barca
                  </p>
                </div>

                <div className="bg-rota-panel rounded-md p-3 mb-4">
                  <p className="text-xs text-rota-muted uppercase tracking-wide mb-2">
                    Composição da Barca
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-rota-light">
                    {CREW_ROLES.map((role) => (
                      <div key={role} className="flex items-center gap-1.5">
                        <span className="text-rota-muted text-xs">{CREW_LABELS[role]}:</span>
                        <strong className="text-rota-white">
                          {r.barca[role] || '—'}
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-rota-panel rounded-md p-3 mb-4">
                  <p className="text-xs text-rota-muted uppercase tracking-wide mb-1">
                    Resumo da Ocorrência
                  </p>
                  <p className="text-sm text-rota-light leading-relaxed">{r.resumo}</p>
                </div>

                <div className="flex items-center gap-2">
                  {isActing ? (
                    <span
                      className={`text-sm font-semibold ${
                        action.type === 'validate'
                          ? 'text-rota-green-light'
                          : 'text-rota-red-light'
                      }`}
                    >
                      {action.type === 'validate' ? 'Validando RSO...' : 'Rejeitando RSO...'}
                    </span>
                  ) : (
                    <>
                      <button
                        onClick={() => handleValidate(r.id)}
                        className="rota-btn-green flex-1"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Validar RSO
                      </button>
                      <button
                        onClick={() => handleReject(r.id)}
                        className="rota-btn-red flex-1"
                      >
                        <XCircle className="w-4 h-4" />
                        Rejeitar / Invalidar
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

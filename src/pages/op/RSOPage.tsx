import { useEffect, useState } from 'react';
import { useStore } from '@/store';
import { CREW_ROLES, CREW_LABELS, MIN_CREW_TO_START } from '@/types';
import { api } from '@/lib/api';
import {
  FileText, Send, CheckCircle2, Plus, Minus, Car, AlertCircle,
} from 'lucide-react';

interface Counter {
  key: string;
  label: string;
  value: number;
}

interface PatrolOption {
  id: string;
  viatura: string;
  operadores: string[];
  inicio: number;
  fim: number | null;
  status: 'ativa' | 'encerrada';
}

export default function RSOPage() {
  const { members, submitReport } = useStore();
  const [patrulhas, setPatrulhas] = useState<PatrolOption[]>([]);
  const [patrolId, setPatrolId] = useState<string>('');
  const [barca, setBarca] = useState<Record<string, string>>({});
  const [counters, setCounters] = useState<Counter[]>([
    { key: 'ocorrencias', label: 'Ocorrências', value: 0 },
    { key: 'detidos', label: 'Detidos', value: 0 },
    { key: 'armamento', label: 'Armamento', value: 0 },
    { key: 'drogas', label: 'Drogas', value: 0 },
    { key: 'municoes', label: 'Munições', value: 0 },
    { key: 'bombas', label: 'Bombas', value: 0 },
    { key: 'dinheiro', label: 'Dinheiro Marcado', value: 0 },
  ]);
  const [resumo, setResumo] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<{ patrols?: PatrolOption[] }>('/api/patrols?mine=1&ended=1')
      .then((data) => setPatrulhas(data.patrols ?? []))
      .catch(() => setPatrulhas([]));
  }, []);

  const selectedPatrol = patrulhas.find((item) => item.id === patrolId) ?? null;
  const allowedOperators = selectedPatrol?.operadores ?? [];
  const filledCrew = CREW_ROLES.filter((r) => barca[r]?.trim());

  const adjust = (key: string, delta: number) => {
    setCounters((prev) =>
      prev.map((c) =>
        c.key === key ? { ...c, value: Math.max(0, c.value + delta) } : c
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatrol) {
      setError('Selecione uma patrulha encerrada para transmitir o RSO.');
      return;
    }
    if (filledCrew.length < MIN_CREW_TO_START) {
      setError(`Mínimo de ${MIN_CREW_TO_START} operadores na barca para transmitir o RSO.`);
      return;
    }
    setError('');

    try {
      await submitReport({
        patrolId: selectedPatrol.id,
        barca: {
          chefe: barca.chefe ?? '',
          motorista: barca.motorista ?? '',
          auxiliar: barca.auxiliar ?? '',
          anotador: barca.anotador ?? '',
          estagiario: barca.estagiario ?? '',
        },
        ocorrencias: counters[0].value,
        detidos: counters[1].value,
        armamento: counters[2].value,
        drogas: counters[3].value,
        municoes: counters[4].value,
        bombas: counters[5].value,
        dinheiroMarcado: counters[6].value,
        resumo,
      });
      setSubmitted(true);
      setCounters(counters.map((c) => ({ ...c, value: 0 })));
      setBarca({});
      setResumo('');
      setTimeout(() => setSubmitted(false), 3000);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Não foi possível transmitir o RSO.');
    }
  };

  return (
    <div className="animate-fade-in max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-rota-white mb-1">
          Relatório de Serviço Ostensivo
        </h1>
        <p className="text-sm text-rota-muted">
          Transmissão de RSO ao final da patrulha
        </p>
      </div>

      <form onSubmit={handleSubmit} className="rota-card p-6 space-y-5">
        <div>
          <label className="block text-xs font-semibold text-rota-light mb-2 uppercase tracking-wide">
            <Car className="w-3.5 h-3.5 inline mr-1" />
            Patrulha Encerrada
          </label>
          <select
            value={patrolId}
            onChange={(e) => {
              setPatrolId(e.target.value);
              setBarca({});
            }}
            className="rota-input w-full"
          >
            <option value="">Selecione sua patrulha encerrada...</option>
            {patrulhas.map((patrol) => (
              <option key={patrol.id} value={patrol.id}>
                {patrol.viatura} · {new Date(patrol.inicio).toLocaleDateString('pt-BR')} · {patrol.operadores.length} operadores
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-rota-light uppercase tracking-wide">
              Composição da Barca
            </p>
            <span className={`text-xs font-semibold ${filledCrew.length >= MIN_CREW_TO_START ? 'text-rota-green-light' : 'text-rota-muted'}`}>
              {filledCrew.length}/5 preenchidos · mínimo {MIN_CREW_TO_START}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {CREW_ROLES.map((role) => (
              <div key={role}>
                <label className="block text-[10px] text-rota-muted mb-1 uppercase">
                  {CREW_LABELS[role]}
                </label>
                <select
                  value={barca[role] ?? ''}
                  onChange={(e) => setBarca({ ...barca, [role]: e.target.value })}
                  className="rota-input w-full"
                  disabled={!selectedPatrol}
                >
                  <option value="">Selecione...</option>
                  {members
                    .filter((m) => allowedOperators.includes(m.idJogo))
                    .filter((m) => !Object.values(barca).includes(m.idJogo) || barca[role] === m.idJogo)
                    .map((m) => (
                      <option key={m.id} value={m.idJogo}>
                        {m.idJogo} — {m.nome}
                      </option>
                    ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-rota-red/10 border border-rota-red/30 text-xs text-rota-red-light">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <div>
          <p className="text-xs font-semibold text-rota-light mb-2 uppercase tracking-wide">
            Contadores de Apreensão
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {counters.map((c) => (
              <div key={c.key} className="rota-card bg-rota-panel p-3">
                <p className="text-[10px] text-rota-muted uppercase mb-2">{c.label}</p>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => adjust(c.key, -1)}
                    className="w-7 h-7 rounded-md bg-rota-red/20 text-rota-red-light hover:bg-rota-red/30 flex items-center justify-center transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-xl font-bold text-rota-white tabular-nums">
                    {c.value}
                  </span>
                  <button
                    type="button"
                    onClick={() => adjust(c.key, 1)}
                    className="w-7 h-7 rounded-md bg-rota-green/20 text-rota-green-light hover:bg-rota-green/30 flex items-center justify-center transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-rota-light mb-2 uppercase tracking-wide">
            Resumo da Ocorrência
          </label>
          <textarea
            value={resumo}
            onChange={(e) => setResumo(e.target.value)}
            rows={4}
            placeholder="Descreva os fatos da patrulha..."
            className="rota-input w-full resize-none"
          />
        </div>

        <button
          type="submit"
          className="rota-btn-green w-full"
          disabled={submitted || !selectedPatrol}
        >
          {submitted ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              RSO Transmitido com Sucesso!
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Transmitir RSO
            </>
          )}
        </button>
      </form>

      <div className="mt-4 flex items-center gap-2 text-xs text-rota-muted">
        <FileText className="w-4 h-4" />
        <span>O RSO será enviado para validação do Comando antes de contabilizar no ranking.</span>
      </div>
    </div>
  );
}

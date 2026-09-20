import { useState, useEffect } from 'react';
import { Play, Square, Car, Clock, Users, AlertCircle } from 'lucide-react';
import { useStore } from '@/store';
import { VIATURAS, CREW_ROLES, CREW_LABELS, MIN_CREW_TO_START } from '@/types';

export default function BatePontoPage() {
  const { members, patrols, startPatrol, endPatrol } = useStore();
  const [viatura, setViatura] = useState<string>(VIATURAS[0]);
  const [crew, setCrew] = useState<Record<string, string>>({});
  const [elapsed, setElapsed] = useState(0);
  const [active, setActive] = useState(false);
  const [patrulhaId, setPatrulhaId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!patrols.length) {
      setActive(false);
      setPatrulhaId(null);
      setElapsed(0);
      return;
    }

    const current = patrols[0];
    const now = Date.now();
    const started = current.inicio ?? now;
    const nextElapsed = Math.max(0, Math.floor((now - started) / 1000));
    setPatrulhaId(current.id);
    setElapsed(nextElapsed);
    setActive(true);
  }, [patrols]);

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => setElapsed((p) => p + 1), 1000);
    return () => clearInterval(interval);
  }, [active]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const filledCrew = CREW_ROLES.filter((r) => crew[r]?.trim());

  const handleStart = async () => {
    if (filledCrew.length < MIN_CREW_TO_START) {
      setError(`Mínimo de ${MIN_CREW_TO_START} operadores para iniciar a patrulha.`);
      return;
    }

    try {
      setError('');
      const resultId = await startPatrol({
        viatura,
        operadores: filledCrew.map((r) => crew[r]),
      });

      setPatrulhaId(resultId ?? null);
      setElapsed(0);
      setActive(Boolean(resultId));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Não foi possível iniciar a patrulha.');
    }
  };

  const handleStop = async () => {
    if (!patrulhaId) {
      setActive(false);
      return;
    }

    try {
      await endPatrol(patrulhaId);
      setActive(false);
      setPatrulhaId(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Não foi possível encerrar a patrulha.');
    }
  };

  return (
    <div className="animate-fade-in max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-rota-white mb-1">Bate-Ponto</h1>
        <p className="text-sm text-rota-muted">Registro de patrulha em tempo real</p>
      </div>

      <div className="rota-card p-6 space-y-5">
        {/* Viatura */}
        <div>
          <label className="block text-xs font-semibold text-rota-light mb-2 uppercase tracking-wide">
            <Car className="w-3.5 h-3.5 inline mr-1" />
            Viatura
          </label>
          <select
            value={viatura}
            onChange={(e) => setViatura(e.target.value)}
            disabled={active}
            className="rota-input w-full"
          >
            {VIATURAS.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>

        {/* Crew */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-rota-light uppercase tracking-wide">
              <Users className="w-3.5 h-3.5 inline mr-1" />
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
                  value={crew[role] ?? ''}
                  onChange={(e) => setCrew({ ...crew, [role]: e.target.value })}
                  disabled={active}
                  className="rota-input w-full"
                >
                  <option value="">Selecione...</option>
                  {members
                    .filter((m) => m.status === 'ATIVO' && !m.isAdmin)
                    .filter((m) => !Object.values(crew).includes(m.idJogo) || crew[role] === m.idJogo)
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

        {/* Timer */}
        <div className="text-center py-2">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Clock className={`w-5 h-5 ${active ? 'text-rota-green-light' : 'text-rota-muted'}`} />
            <span className="text-xs uppercase tracking-wide text-rota-muted">
              {active ? 'Patrulha em Andamento' : 'Aguardando Início'}
            </span>
          </div>
          <div className={`font-mono text-5xl font-bold tabular-nums ${active ? 'text-rota-green-light' : 'text-rota-white'}`}>
            {formatTime(elapsed)}
          </div>
          {active && (
            <div className="mt-2 flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rota-green-light animate-pulse-slow" />
              <span className="text-xs text-rota-green-light font-semibold">REGISTRANDO</span>
            </div>
          )}
        </div>

        <button
          onClick={active ? handleStop : handleStart}
          className={active ? 'rota-btn-red w-full' : 'rota-btn-green w-full'}
          disabled={!active && filledCrew.length < MIN_CREW_TO_START}
        >
          {active ? (
            <>
              <Square className="w-4 h-4" />
              Finalizar Patrulha
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Iniciar Patrulha
            </>
          )}
        </button>
      </div>

      {/* Active patrols preview */}
      {patrols.length > 0 && (
        <div className="mt-4 rota-card p-4">
          <h3 className="text-xs font-semibold text-rota-muted uppercase tracking-wide mb-2">
            Patrulhas Ativas no Sistema
          </h3>
          <div className="space-y-2 text-sm">
            {patrols.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-rota-border last:border-0">
                <div>
                  <span className="text-rota-light font-medium">{p.viatura}</span>
                  <span className="text-rota-muted text-xs ml-2">{p.operadores.length} operadores</span>
                </div>
                <span className="text-rota-green-light text-xs font-semibold">ATIVA</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

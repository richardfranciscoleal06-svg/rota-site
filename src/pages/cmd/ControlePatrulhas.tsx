import { useState, useEffect } from 'react';
import { useStore } from '@/store';
import { AlertTriangle, Car, Users, Radio, Activity } from 'lucide-react';

export default function ControlePatrulhas() {
  const { patrols, endPatrol } = useStore();
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatElapsed = (inicio: number) => {
    const s = Math.floor((Date.now() - inicio) / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const handleForceEnd = async (id: string) => {
    await endPatrol(id);
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-rota-white mb-1">Controle de Patrulhas</h1>
          <p className="text-sm text-rota-muted">
            Bate-ponto ativo — Monitoramento em tempo real
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rota-green/10 border border-rota-green/30">
          <Activity className="w-4 h-4 text-rota-green-light" />
          <span className="text-sm font-semibold text-rota-green-light">
            {patrols.length} {patrols.length === 1 ? 'patrulha ativa' : 'patrulhas ativas'}
          </span>
        </div>
      </div>

      {patrols.length === 0 ? (
        <div className="rota-card p-12 text-center">
          <Radio className="w-12 h-12 text-rota-muted mx-auto mb-3" />
          <p className="text-lg font-bold text-rota-white mb-1">Nenhuma patrulha ativa</p>
          <p className="text-sm text-rota-muted">
            Não há operadores em patrulhamento no momento.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {patrols.map((p) => (
            <div key={p.id} className="rota-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-rota-green/15 border border-rota-green/30 flex items-center justify-center">
                    <Car className="w-5 h-5 text-rota-green-light" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-rota-white">{p.viatura}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-rota-green-light animate-pulse-slow" />
                      <span className="text-xs text-rota-green-light font-semibold">
                        PATRULHANDO
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-rota-muted uppercase tracking-wide">Tempo</p>
                  <p className="text-lg font-bold text-rota-gold font-mono tabular-nums">
                    {formatElapsed(p.inicio)}
                  </p>
                </div>
              </div>

              <div className="bg-rota-panel rounded-md p-3 mb-4">
                <p className="text-xs text-rota-muted uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  Operadores Logados
                </p>
                <div className="flex flex-wrap gap-2">
                  {p.operadores.map((op, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-md bg-rota-card border border-rota-border text-xs font-medium text-rota-light"
                    >
                      {op}
                    </span>
                  ))}
                </div>
              </div>

              <button
                onClick={() => handleForceEnd(p.id)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold bg-rota-red/15 border border-rota-red/30 text-rota-red-light hover:bg-rota-red/25 hover:border-rota-red/50 transition-colors"
              >
                <AlertTriangle className="w-4 h-4" />
                Forçar Encerramento de Turno
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

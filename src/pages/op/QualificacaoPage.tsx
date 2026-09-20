import { useState, useMemo, useEffect } from 'react';
import { useStore } from '@/store';
import { ClipboardCheck, Star } from 'lucide-react';

const criteria = [
  { key: 'postura', label: 'Postura', weight: 0.2 },
  { key: 'disciplina', label: 'Disciplina', weight: 0.25 },
  { key: 'atencao', label: 'Atenção', weight: 0.2 },
  { key: 'tatica', label: 'Tática Operacional', weight: 0.2 },
  { key: 'armamento', label: 'Manejo de Armamento', weight: 0.15 },
];

export default function QualificacaoPage() {
  const { members } = useStore();
  const [selectedId, setSelectedId] = useState('');
  const [scores, setScores] = useState<Record<string, number>>(
    Object.fromEntries(criteria.map((c) => [c.key, 3.0]))
  );

  useEffect(() => {
    if (!members.length) return;
    if (!selectedId || !members.some((m) => m.id === selectedId)) {
      setSelectedId(members[0].id);
    }
  }, [members, selectedId]);

  const average = useMemo(() => {
    const total = criteria.reduce(
      (sum, c) => sum + scores[c.key] * c.weight,
      0
    );
    return total.toFixed(1);
  }, [scores]);

  const member = members.find((m) => m.id === selectedId) ?? members[0];

  return (
    <div className="animate-fade-in max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-rota-white mb-1">Qualificação Operacional</h1>
        <p className="text-sm text-rota-muted">Avaliação de desempenho do operador</p>
      </div>

      <div className="rota-card p-6">
        <div className="mb-5">
          <label className="block text-xs font-semibold text-rota-light mb-2 uppercase tracking-wide">
            ID do Avaliado
          </label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="rota-input w-full"
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.idJogo} — {m.nome} ({m.patente})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-4 mb-6">
          {criteria.map((c) => (
            <div key={c.key}>
              <div className="flex items-center justify-between mb-1.5">
                <div>
                  <span className="text-sm font-medium text-rota-white">{c.label}</span>
                  <span className="text-xs text-rota-muted ml-2">
                    Peso: {Math.round(c.weight * 100)}%
                  </span>
                </div>
                <span className="text-sm font-bold text-rota-gold tabular-nums">
                  {scores[c.key].toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={5}
                step={0.1}
                value={scores[c.key]}
                onChange={(e) =>
                  setScores({ ...scores, [c.key]: parseFloat(e.target.value) })
                }
                className="w-full accent-rota-gold"
              />
            </div>
          ))}
        </div>

        <div className="rota-card bg-rota-panel p-5 text-center mb-4">
          <p className="text-xs text-rota-muted uppercase tracking-wide mb-1">
            Média Ponderada Final
          </p>
          <div className="flex items-center justify-center gap-2">
            <Star className="w-7 h-7 text-rota-gold fill-rota-gold" />
            <span className="text-4xl font-bold text-rota-gold tabular-nums">
              {average}
            </span>
            <span className="text-lg text-rota-muted">/ 5.0</span>
          </div>
        </div>

        <button
          onClick={() => {
            setScores(Object.fromEntries(criteria.map((c) => [c.key, 3.0])));
          }}
          className="rota-btn-ghost w-full"
        >
          <ClipboardCheck className="w-4 h-4" />
          Registrar Avaliação
        </button>
      </div>

      <div className="mt-4 text-xs text-rota-muted text-center">
        Avaliando: <span className="text-rota-light font-semibold">{member.nome}</span> — {member.patente}
      </div>
    </div>
  );
}

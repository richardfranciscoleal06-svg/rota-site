import { useState } from 'react';
import { useStore } from '@/store';
import { Trophy, Clock, DollarSign, Medal } from 'lucide-react';

const medalColors = ['text-rota-gold', 'text-rota-light', 'text-rota-red-light'];

export default function RankingsPage() {
  const { members } = useStore();
  const [tab, setTab] = useState<'horas' | 'apreensoes'>('horas');

  const data = [...members]
    .filter((m) => m.status === 'ATIVO' && !m.isAdmin)
    .sort((a, b) =>
      tab === 'horas'
        ? b.horasPatrulha - a.horasPatrulha
        : b.apreensoesRs - a.apreensoesRs
    )
    .slice(0, 10)
    .map((m) => ({
      id: m.id,
      nome: m.nome,
      patente: m.patente,
      valor: tab === 'horas' ? m.horasPatrulha : m.apreensoesRs,
    }));

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-rota-white mb-1">Central de Rankings</h1>
        <p className="text-sm text-rota-muted">Classificação dos operadores por desempenho</p>
      </div>

      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setTab('horas')}
          className={`rota-btn ${tab === 'horas' ? 'bg-rota-gold text-black' : 'bg-rota-card text-rota-light hover:text-rota-white'}`}
        >
          <Clock className="w-4 h-4" />
          Horas de Patrulha
        </button>
        <button
          onClick={() => setTab('apreensoes')}
          className={`rota-btn ${tab === 'apreensoes' ? 'bg-rota-gold text-black' : 'bg-rota-card text-rota-light hover:text-rota-white'}`}
        >
          <DollarSign className="w-4 h-4" />
          Apreensões R$
        </button>
      </div>

      <div className="rota-card overflow-hidden">
        <div className="flex items-center gap-2 p-4 border-b border-rota-border">
          <Trophy className="w-5 h-5 text-rota-gold" />
          <h2 className="text-sm font-bold text-rota-white uppercase tracking-wide">
            {tab === 'horas' ? 'Leaderboard — Horas de Patrulha' : 'Leaderboard — Apreensões R$'}
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-rota-panel text-rota-muted text-xs uppercase tracking-wide">
                <th className="text-center px-4 py-3 font-semibold w-16">Pos.</th>
                <th className="text-left px-4 py-3 font-semibold">Operador</th>
                <th className="text-left px-4 py-3 font-semibold">Patente</th>
                <th className="text-right px-4 py-3 font-semibold">
                  {tab === 'horas' ? 'Horas' : 'R$ Apreendido'}
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((entry, i) => (
                <tr
                  key={entry.id}
                  className={`border-t border-rota-border hover:bg-rota-panel/30 transition-colors ${
                    i < 3 ? 'bg-rota-panel/20' : ''
                  }`}
                >
                  <td className="text-center px-4 py-3">
                    {i < 3 ? (
                      <Medal className={`w-5 h-5 inline ${medalColors[i]}`} />
                    ) : (
                      <span className="text-rota-muted font-semibold">#{i + 1}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-rota-white">{entry.nome}</td>
                  <td className="px-4 py-3">
                    <span className="rota-badge bg-rota-gold/10 text-rota-gold">
                      {entry.patente}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-rota-gold">
                    {tab === 'horas'
                      ? `${entry.valor}h`
                      : `R$ ${entry.valor.toLocaleString('pt-BR')}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { patenteOrder } from '@/data';
import { useStore } from '@/store';
import { Search, ChevronDown, ChevronRight } from 'lucide-react';
import type { Patente } from '@/types';

export default function HierarquiaPage() {
  const { members } = useStore();
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const visibleMembers = members.filter((m) => !m.isAdmin);

  const grouped = patenteOrder.reduce((acc, patente) => {
    const filteredMembers = visibleMembers.filter(
      (m) =>
        m.patente === (patente as Patente) &&
        (m.nome.toLowerCase().includes(search.toLowerCase()) ||
          m.idJogo.toLowerCase().includes(search.toLowerCase()) ||
          m.discordId.toLowerCase().includes(search.toLowerCase()))
    );
    if (filteredMembers.length > 0) acc.push({ patente, members: filteredMembers });
    return acc;
  }, [] as { patente: string; members: typeof visibleMembers }[]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-rota-white mb-2">
          Hierarquia <span className="text-rota-gold">Militar</span>
        </h1>
        <p className="text-rota-light text-sm">
          Quadro de membros do 1º Batalhão de Choque por patente
        </p>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rota-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, ID do jogo ou Discord..."
          className="rota-input w-full pl-10"
        />
      </div>

      <div className="space-y-3">
        {grouped.length === 0 && (
          <div className="text-center py-12 text-rota-muted">
            Nenhum membro encontrado para "{search}"
          </div>
        )}
        {grouped.map(({ patente, members }) => {
          const isOpen = expanded === patente || !!search;
          return (
            <div key={patente} className="rota-card overflow-hidden">
              <button
                onClick={() => setExpanded(isOpen ? null : patente)}
                className="w-full flex items-center justify-between p-4 hover:bg-rota-panel/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isOpen ? (
                    <ChevronDown className="w-4 h-4 text-rota-gold" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-rota-gold" />
                  )}
                  <span className="font-bold text-rota-white">{patente}</span>
                  <span className="rota-badge bg-rota-gold/10 text-rota-gold">
                    {members.length} {members.length === 1 ? 'membro' : 'membros'}
                  </span>
                </div>
              </button>
              {isOpen && (
                <div className="border-t border-rota-border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-rota-panel text-rota-muted text-xs uppercase tracking-wide">
                        <th className="text-left px-4 py-2.5 font-semibold">Nome Completo</th>
                        <th className="text-left px-4 py-2.5 font-semibold">ID no Jogo</th>
                        <th className="text-left px-4 py-2.5 font-semibold">Discord ID</th>
                        <th className="text-left px-4 py-2.5 font-semibold">Patente</th>
                        <th className="text-left px-4 py-2.5 font-semibold">Função</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((m) => (
                        <tr
                          key={m.id}
                          className="border-t border-rota-border hover:bg-rota-panel/30 transition-colors"
                        >
                          <td className="px-4 py-3 font-medium text-rota-white">{m.nome}</td>
                          <td className="px-4 py-3 text-rota-light">{m.idJogo}</td>
                          <td className="px-4 py-3 text-rota-light">{m.discordId}</td>
                          <td className="px-4 py-3">
                            <span className="rota-badge bg-rota-gold/10 text-rota-gold">
                              {m.patente}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-rota-light">{m.funcao}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

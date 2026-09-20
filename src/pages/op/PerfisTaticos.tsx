import { useStore } from '@/store';
import { Shield, Star } from 'lucide-react';

export default function PerfisTaticos() {
  const { members } = useStore();
  const active = members.filter((m) => m.status === 'ATIVO');

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-rota-white mb-1">Perfis Táticos</h1>
        <p className="text-sm text-rota-muted">Operadores ativos do batalhão</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {active.map((m) => (
          <div
            key={m.id}
            className="rota-card p-4 hover:border-rota-gold/30 transition-colors group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-rota-gold/20 to-rota-red/20 border border-rota-border flex items-center justify-center">
                <Shield className="w-6 h-6 text-rota-gold" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-rota-white truncate">{m.nome}</p>
                <p className="text-xs text-rota-muted">{m.idJogo} · {m.discordId}</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="rota-badge bg-rota-gold/10 text-rota-gold">
                  {m.patente}
                </span>
                <p className="text-xs text-rota-light mt-1.5">{m.funcao}</p>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-rota-green/15 border border-rota-green/30">
                <span className="w-1.5 h-1.5 rounded-full bg-rota-green-light animate-pulse-slow" />
                <span className="text-xs font-semibold text-rota-green-light">ATIVO</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-rota-border flex items-center justify-between text-xs">
              <span className="text-rota-muted flex items-center gap-1">
                <Star className="w-3 h-3" /> {m.horasPatrulha}h patrulhadas
              </span>
              <span className="text-rota-gold font-semibold">
                R$ {m.apreensoesRs.toLocaleString('pt-BR')}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

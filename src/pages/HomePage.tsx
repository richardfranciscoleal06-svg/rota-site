import { useEffect, useState } from 'react';
import {
  Pill, Crosshair, Package, Bomb, DollarSign, TrendingUp, Activity, Users, Shield,
} from 'lucide-react';
import { api } from '@/lib/api';

interface StatsResponse {
  drogas: number;
  armamento: number;
  municoes: number;
  bombas: number;
  dinheiroMarcado: number;
  operadoresAtivos: number;
  viaturasAtivas: number;
  ocorrenciasMes: number;
  patrulhasMes: number;
  detidosMes: number;
  tendencias: {
    ocorrenciasMes: number | null;
    patrulhasMes: number | null;
    detidosMes: number | null;
  };
  ultimaAtualizacao: string | null;
}

const numberFormatter = new Intl.NumberFormat('pt-BR');
const compactNumberFormatter = new Intl.NumberFormat('pt-BR', {
  notation: 'compact',
  maximumFractionDigits: 1,
});
const compactCurrencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
});

const formatNumber = (value: number | null | undefined) =>
  typeof value === 'number' ? numberFormatter.format(value) : '—';

const formatCurrencyCompact = (value: number | null | undefined) =>
  typeof value === 'number' ? compactCurrencyFormatter.format(value) : '—';

const formatTrend = (value: number | null | undefined) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  const signal = value > 0 ? '+' : '';
  return `${signal}${value.toFixed(1)}%`;
};

export default function HomePage() {
  const [stats, setStats] = useState<StatsResponse | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadStats = async () => {
      try {
        const data = await api.get<StatsResponse>('/api/stats');
        if (isMounted) setStats(data);
      } catch {
        if (isMounted) setStats(null);
      }
    };

    void loadStats();
    return () => {
      isMounted = false;
    };
  }, []);

  const statCards = [
    { label: 'Drogas Apreendidas', value: formatNumber(stats?.drogas), unit: 'porções', icon: Pill, color: 'text-rota-gold' },
    { label: 'Armamentos', value: formatNumber(stats?.armamento), unit: 'unidades', icon: Crosshair, color: 'text-rota-red-light' },
    { label: 'Munições', value: formatNumber(stats?.municoes), unit: 'projéteis', icon: Package, color: 'text-rota-light' },
    { label: 'Bombas', value: formatNumber(stats?.bombas), unit: 'artefatos', icon: Bomb, color: 'text-rota-red-light' },
    { label: 'Dinheiro Marcado', value: formatCurrencyCompact(stats?.dinheiroMarcado), unit: 'contabilizado', icon: DollarSign, color: 'text-rota-gold' },
    { label: 'Operadores Ativos', value: formatNumber(stats?.operadoresAtivos), unit: 'militares', icon: Users, color: 'text-rota-green-light' },
  ];

  const highlights = [
    {
      label: 'Ocorrências no mês',
      value: formatNumber(stats?.ocorrenciasMes),
      icon: Activity,
      trend: formatTrend(stats?.tendencias?.ocorrenciasMes),
    },
    {
      label: 'Patrulhas realizadas',
      value: formatNumber(stats?.patrulhasMes),
      icon: Shield,
      trend: formatTrend(stats?.tendencias?.patrulhasMes),
    },
    {
      label: 'Detidos no mês',
      value: formatNumber(stats?.detidosMes),
      icon: TrendingUp,
      trend: formatTrend(stats?.tendencias?.detidosMes),
    },
  ];

  const formattedLastUpdate = stats?.ultimaAtualizacao
    ? new Date(stats.ultimaAtualizacao).toLocaleDateString('pt-BR')
    : '—';

  return (
    <div className="animate-fade-in">
      <section className="relative overflow-hidden border-b border-rota-border">
        <div className="absolute inset-0 bg-gradient-to-br from-rota-red/10 via-transparent to-rota-gold/5" />
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(139,26,26,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(201,162,39,0.1) 0%, transparent 50%)',
        }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rota-red/20 border border-rota-red/30 mb-6">
            <span className="w-2 h-2 rounded-full bg-rota-red-light animate-pulse-slow" />
            <span className="text-xs font-semibold text-rota-red-light uppercase tracking-widest">
              Policiamento Ostensivo
            </span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-rota-white mb-4">
            ROTA EM <span className="text-rota-gold">NÚMEROS</span>
          </h1>
          <p className="text-lg text-rota-light max-w-2xl mx-auto mb-8">
            1º Batalhão de Choque — Rondas Ostensivas Tobias de Aguiar.
            Disciplina, hierarquia e honra no policiamento do Jaguaré RP.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="px-4 py-2 rounded-lg bg-rota-card border border-rota-border">
              <span className="text-xs text-rota-muted uppercase tracking-wide">Patrulhando agora</span>
              <p className="text-lg font-bold text-rota-green-light">{stats ? `${compactNumberFormatter.format(stats.viaturasAtivas)} viaturas ativas` : '—'}</p>
            </div>
            <div className="px-4 py-2 rounded-lg bg-rota-card border border-rota-border">
              <span className="text-xs text-rota-muted uppercase tracking-wide">Última atualização</span>
              <p className="text-lg font-bold text-rota-white">{formattedLastUpdate}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {statCards.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className="rota-card p-5 hover:border-rota-gold/30 transition-colors group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-11 h-11 rounded-lg bg-rota-dark flex items-center justify-center ${s.color} group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-rota-white">{s.value}</p>
                <p className="text-xs text-rota-muted mt-1">{s.unit}</p>
                <p className="text-sm font-medium text-rota-light mt-2">{s.label}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        <h2 className="text-lg font-bold text-rota-white mb-4 uppercase tracking-wide">
          Indicadores Operacionais
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {highlights.map((h) => {
            const Icon = h.icon;
            return (
              <div key={h.label} className="rota-card p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-rota-dark flex items-center justify-center text-rota-gold">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-rota-white">{h.value}</p>
                    <p className="text-xs text-rota-muted">{h.label}</p>
                  </div>
                </div>
                {h.trend && (
                  <span className="text-xs font-semibold text-rota-green-light bg-rota-green/20 px-2 py-1 rounded">
                    {h.trend}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

import { historiaRota } from '@/data';
import { ScrollText } from 'lucide-react';

export default function HistoriaPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 animate-fade-in">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 text-rota-gold mb-3">
          <ScrollText className="w-6 h-6" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-rota-white mb-3">
          História da <span className="text-rota-gold">ROTA</span>
        </h1>
        <p className="text-rota-light max-w-2xl mx-auto">
          Rondas Ostensivas Tobias de Aguiar — a elite do policiamento ostensivo.
        </p>
      </div>

      <div className="space-y-6">
        {historiaRota.map((item, i) => (
          <div key={i} className="rota-card p-6 hover:border-rota-gold/20 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <span className="w-8 h-8 rounded-full bg-rota-gold/10 border border-rota-gold/30 flex items-center justify-center text-xs font-bold text-rota-gold">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h2 className="text-lg font-bold text-rota-white">{item.titulo}</h2>
            </div>
            <p className="text-sm leading-relaxed text-rota-light pl-11">
              {item.texto}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

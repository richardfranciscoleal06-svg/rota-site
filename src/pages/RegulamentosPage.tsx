import { useState } from 'react';
import { regulamentoDocs } from '@/data';
import { BookOpen, FileText } from 'lucide-react';

export default function RegulamentosPage() {
  const [activeDoc, setActiveDoc] = useState(regulamentoDocs[0].id);
  const doc = regulamentoDocs.find((d) => d.id === activeDoc)!;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 animate-fade-in">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 text-rota-gold mb-2">
          <BookOpen className="w-6 h-6" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-rota-white mb-2">
          Regulamentos <span className="text-rota-gold">Internos</span>
        </h1>
        <p className="text-rota-light text-sm">
          Normas e diretrizes do 1º Batalhão de Choque — ROTA
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
        <aside className="rota-card p-3 h-fit sticky top-24">
          <p className="text-xs font-semibold text-rota-muted uppercase tracking-wide px-2 py-1.5 mb-1">
            Índice
          </p>
          {regulamentoDocs.map((d) => (
            <button
              key={d.id}
              onClick={() => setActiveDoc(d.id)}
              className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-md text-sm text-left transition-colors ${
                activeDoc === d.id
                  ? 'bg-rota-gold/10 text-rota-gold border border-rota-gold/30'
                  : 'text-rota-light hover:bg-rota-panel hover:text-rota-white'
              }`}
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span className="text-xs leading-tight">{d.titulo}</span>
            </button>
          ))}
        </aside>

        <div className="rota-card p-6 md:p-8">
          <h2 className="text-xl font-bold text-rota-gold mb-6 pb-4 border-b border-rota-border">
            {doc.titulo}
          </h2>
          <div className="space-y-5">
            {doc.secoes.map((sec, i) => (
              <div key={i} className="animate-fade-in">
                <h3 className="text-sm font-bold text-rota-white mb-1.5">
                  {sec.subtitulo}
                </h3>
                <p className="text-sm leading-relaxed text-rota-light pl-4 border-l-2 border-rota-border">
                  {sec.texto}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

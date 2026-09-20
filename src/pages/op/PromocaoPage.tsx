import { useState, useEffect } from 'react';
import { useStore } from '@/store';
import { ArrowUpCircle, Send, CheckCircle2 } from 'lucide-react';

export default function PromocaoPage() {
  const { members } = useStore();
  const [selectedId, setSelectedId] = useState('');
  const [link, setLink] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!members.length) return;
    if (!selectedId || !members.some((m) => m.id === selectedId)) {
      setSelectedId(members[0].id);
    }
  }, [members, selectedId]);

  const member = members.find((m) => m.id === selectedId) ?? members[0];
  const currentIndex = members.findIndex((m) => m.id === member?.id);
  const nextPatente = currentIndex > 0 ? members[currentIndex - 1].patente : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (link.trim()) {
      setSubmitted(true);
      setLink('');
      setTimeout(() => setSubmitted(false), 3000);
    }
  };

  return (
    <div className="animate-fade-in max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-rota-white mb-1">Solicitação de Promoção</h1>
        <p className="text-sm text-rota-muted">
          Preencha o formulário para solicitar ascensão na hierarquia
        </p>
      </div>

      <div className="rota-card p-6">
        <div className="mb-5">
          <label className="block text-xs font-semibold text-rota-light mb-2 uppercase tracking-wide">
            Operador
          </label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="rota-input w-full"
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome} — {m.patente}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="rota-card p-3 bg-rota-panel">
            <p className="text-xs text-rota-muted uppercase tracking-wide mb-1">Patente Atual</p>
            <p className="text-lg font-bold text-rota-white">{member.patente}</p>
          </div>
          <div className="rota-card p-3 bg-rota-panel">
            <p className="text-xs text-rota-muted uppercase tracking-wide mb-1">Próxima Patente</p>
            <p className="text-lg font-bold text-rota-gold">
              {nextPatente || '— Máximo alcançado'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="rota-card p-3 bg-rota-panel">
            <p className="text-xs text-rota-muted uppercase tracking-wide mb-1">Horas de Patrulha</p>
            <p className="text-lg font-bold text-rota-white">{member.horasPatrulha}h</p>
          </div>
          <div className="rota-card p-3 bg-rota-panel">
            <p className="text-xs text-rota-muted uppercase tracking-wide mb-1">Apreensões R$</p>
            <p className="text-lg font-bold text-rota-gold">
              R$ {member.apreensoesRs.toLocaleString('pt-BR')}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-xs font-semibold text-rota-light mb-2 uppercase tracking-wide">
              Link do Relatório de Promoção
            </label>
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://docs.google.com/..."
              className="rota-input w-full"
            />
            <p className="text-xs text-rota-muted mt-1.5">
              Cole o link do seu relatório com prints e justificativa para promoção
            </p>
          </div>

          <button type="submit" className="rota-btn-gold w-full">
            {submitted ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Solicitação Enviada!
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Solicitar Promoção
              </>
            )}
          </button>
        </form>
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-rota-muted">
        <ArrowUpCircle className="w-4 h-4" />
        <span>A solicitação será avaliada pelo Comando e respondida via Discord.</span>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { X, UserPlus, LogIn, AlertCircle } from 'lucide-react';
import RotaLogo from '@/components/RotaLogo';
import { api } from '@/lib/api';

interface LoginModalProps {
  onClose: () => void;
  onLogin: (id: string, isAdmin: boolean) => void;
  onRegister: (data: {
    nome: string;
    sobrenome: string;
    rgDiscord: string;
    idMilitar: string;
    senha: string;
  }) => void;
}

export default function LoginModal({ onClose, onLogin, onRegister }: LoginModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [id, setId] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [reg, setReg] = useState({
    nome: '',
    sobrenome: '',
    rgDiscord: '',
    idMilitar: '',
    senha: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'login') {
      if (!id.trim() || !senha.trim()) {
        setError('Preencha todos os campos.');
        return;
      }

      try {
        const data = await api.post<{ user: { id: string; isAdmin: boolean } }>(
          '/api/login',
          { id: id.trim(), password: senha }
        );
        setError('');
        onLogin(data.user.id, data.user.isAdmin);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Credencial inválida.');
      }
      return;
    }

    if (reg.nome && reg.sobrenome && reg.rgDiscord && reg.idMilitar && reg.senha) {
      onRegister(reg);
      return;
    }

    setError('Preencha todos os campos do cadastro.');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rota-card shadow-2xl animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-rota-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-rota-card border border-rota-border flex items-center justify-center">
              <RotaLogo size={20} className="rounded-md" />
            </div>
            <div>
              <h2 className="text-base font-bold text-rota-white">
                {mode === 'login' ? 'Acesso ao Sistema' : 'Nova Credencial'}
              </h2>
              <p className="text-xs text-rota-muted">
                {mode === 'login'
                  ? 'Autentique-se para acessar o painel'
                  : 'Solicite seu cadastro como recruta'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-rota-muted hover:text-rota-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {mode === 'login' ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-rota-light mb-1.5 uppercase tracking-wide">
                  ID Operacional
                </label>
                <input
                  type="text"
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  placeholder="Ex: ID 101"
                  className="rota-input w-full"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-rota-light mb-1.5 uppercase tracking-wide">
                  Senha
                </label>
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  className="rota-input w-full"
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-rota-red/10 border border-rota-red/30 text-xs text-rota-red-light">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}
              <button type="submit" className="rota-btn-gold w-full">
                <LogIn className="w-4 h-4" />
                Validar Acesso
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                className="w-full text-center text-sm text-rota-light hover:text-rota-gold transition-colors"
              >
                Nova Credencial? Solicite aqui
              </button>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-rota-light mb-1.5 uppercase tracking-wide">
                    Nome
                  </label>
                  <input
                    type="text"
                    value={reg.nome}
                    onChange={(e) => setReg({ ...reg, nome: e.target.value })}
                    className="rota-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-rota-light mb-1.5 uppercase tracking-wide">
                    Sobrenome
                  </label>
                  <input
                    type="text"
                    value={reg.sobrenome}
                    onChange={(e) => setReg({ ...reg, sobrenome: e.target.value })}
                    className="rota-input w-full"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-rota-light mb-1.5 uppercase tracking-wide">
                  RG Discord
                </label>
                <input
                  type="text"
                  value={reg.rgDiscord}
                  onChange={(e) => setReg({ ...reg, rgDiscord: e.target.value })}
                  placeholder="usuario#0000"
                  className="rota-input w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-rota-light mb-1.5 uppercase tracking-wide">
                  ID Militar
                </label>
                <input
                  type="text"
                  value={reg.idMilitar}
                  onChange={(e) => setReg({ ...reg, idMilitar: e.target.value })}
                  placeholder="Ex: ID 201"
                  className="rota-input w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-rota-light mb-1.5 uppercase tracking-wide">
                  Senha
                </label>
                <input
                  type="password"
                  value={reg.senha}
                  onChange={(e) => setReg({ ...reg, senha: e.target.value })}
                  className="rota-input w-full"
                />
              </div>
              <button type="submit" className="rota-btn-green w-full">
                <UserPlus className="w-4 h-4" />
                Enviar Solicitação
              </button>
              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-full text-center text-sm text-rota-light hover:text-rota-gold transition-colors"
              >
                Já tem credencial? Faça login
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

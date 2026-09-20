import { useEffect, useState } from 'react';
import { Menu, Command } from 'lucide-react';
import RotaLogo from '@/components/RotaLogo';
import type { View, OpTab, CmdTab, PendingRegistration } from '@/types';
import { api } from '@/lib/api';
import Header from '@/components/Header';
import PublicFooter from '@/components/PublicFooter';
import LoginModal from '@/components/LoginModal';
import Sidebar from '@/components/Sidebar';
import HomePage from '@/pages/HomePage';
import HistoriaPage from '@/pages/HistoriaPage';
import HierarquiaPage from '@/pages/HierarquiaPage';
import RegulamentosPage from '@/pages/RegulamentosPage';
import PerfisTaticos from '@/pages/op/PerfisTaticos';
import PromocaoPage from '@/pages/op/PromocaoPage';
import RankingsPage from '@/pages/op/RankingsPage';
import RSOPage from '@/pages/op/RSOPage';
import BatePontoPage from '@/pages/op/BatePontoPage';
import QualificacaoPage from '@/pages/op/QualificacaoPage';
import GestaoCadastros from '@/pages/cmd/GestaoCadastros';
import ValidacaoRSO from '@/pages/cmd/ValidacaoRSO';
import ControlePatrulhas from '@/pages/cmd/ControlePatrulhas';
import BaseDados from '@/pages/cmd/BaseDados';
import { StoreProvider } from '@/store';

function App() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  return (
    <StoreProvider userId={userId} isAdmin={isAdmin}>
      <AppInner userId={userId} setUserId={setUserId} setIsAdmin={setIsAdmin} />
    </StoreProvider>
  );
}

function AppInner({
  userId,
  setUserId,
  setIsAdmin,
}: {
  userId: string | null;
  setUserId: (value: string | null) => void;
  setIsAdmin: (value: boolean) => void;
}) {
  const [view, setView] = useState<View>('home');
  const [opTab, setOpTab] = useState<OpTab>('perfis');
  const [cmdTab, setCmdTab] = useState<CmdTab>('cadastros');
  const [showLogin, setShowLogin] = useState(false);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ user?: { id: string; isAdmin: boolean } }>('/api/session')
      .then((data) => {
        if (!data.user) {
          setUserId(null);
          setIsAdmin(false);
          return;
        }

        setUserId(data.user.id);
        setIsAdmin(data.user.isAdmin);
        if (data.user.isAdmin) {
          setView('comando');
          setCmdTab('cadastros');
        } else {
          setView('operacional');
          setOpTab('perfis');
        }
      })
      .catch(() => {
        setUserId(null);
        setIsAdmin(false);
      });
  }, [setUserId, setIsAdmin]);

  const handleLogin = (id: string, isAdminValue: boolean) => {
    setUserId(id);
    setIsAdmin(isAdminValue);
    setShowLogin(false);
    if (isAdminValue) {
      setView('comando');
      setCmdTab('cadastros');
      setToast(`Bem-vindo, Comandante ${id}. Acesso administrativo liberado.`);
    } else {
      setView('operacional');
      setOpTab('perfis');
      setToast(`Bem-vindo, ${id}. Acesso operacional liberado.`);
    }
    setTimeout(() => setToast(null), 3000);
  };

  const handleRegister = async (data: Omit<PendingRegistration, 'id' | 'dataSolicitacao'>) => {
    try {
      await api.post('/api/register', {
        nome: data.nome,
        sobrenome: data.sobrenome,
        rgDiscord: data.rgDiscord,
        idMilitar: data.idMilitar,
        senha: data.senha,
      });

      setShowLogin(false);
      setToast(
        `Solicitação de cadastro enviada para ${data.nome} ${data.sobrenome}. Aguarde aprovação do Comando.`
      );
      setTimeout(() => setToast(null), 4000);
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Não foi possível enviar a solicitação.');
      setTimeout(() => setToast(null), 4000);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/api/logout', {});
    } catch {
      // Ignore logout errors and still clear session locally.
    }

    setUserId(null);
    setIsAdmin(false);
    setView('home');
    setOpTab('perfis');
    setCmdTab('cadastros');
  };

  const isInternal = view === 'operacional' || view === 'comando';

  const renderPublic = () => {
    switch (view) {
      case 'home':
        return <HomePage />;
      case 'historia':
        return <HistoriaPage />;
      case 'hierarquia':
        return <HierarquiaPage />;
      case 'regulamentos':
        return <RegulamentosPage />;
      default:
        return <HomePage />;
    }
  };

  const renderOp = () => {
    switch (opTab) {
      case 'perfis':
        return <PerfisTaticos />;
      case 'promocao':
        return <PromocaoPage />;
      case 'rankings':
        return <RankingsPage />;
      case 'rso':
        return <RSOPage />;
      case 'bateponto':
        return <BatePontoPage />;
      case 'qualificacao':
        return <QualificacaoPage />;
      default:
        return <PerfisTaticos />;
    }
  };

  const renderCmd = () => {
    switch (cmdTab) {
      case 'cadastros':
        return <GestaoCadastros />;
      case 'rso':
        return <ValidacaoRSO />;
      case 'patrulhas':
        return <ControlePatrulhas />;
      case 'basedados':
        return <BaseDados />;
      default:
        return <GestaoCadastros />;
    }
  };

  if (isInternal && userId) {
    return (
      <div className="min-h-screen flex bg-rota-black">
        <Sidebar
          view={view}
          opTab={opTab}
          setOpTab={(t) => {
            setOpTab(t);
            setView('operacional');
          }}
          cmdTab={cmdTab}
          setCmdTab={(t) => {
            setCmdTab(t);
            setView('comando');
          }}
          onLogout={handleLogout}
          userId={userId}
          mobileOpen={mobileSidebar}
          setMobileOpen={setMobileSidebar}
        />

        <div className="flex-1 min-w-0 flex flex-col">
          <div className="md:hidden sticky top-0 z-30 bg-rota-dark border-b border-rota-border flex items-center justify-between px-4 h-14">
            <button
              onClick={() => setMobileSidebar(true)}
              className="text-rota-light hover:text-rota-white"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              {view === 'comando' ? (
                <Command className="w-4 h-4 text-rota-red-light" />
              ) : (
                <RotaLogo size={16} className="rounded-sm" />
              )}
              <span className="text-sm font-bold text-rota-white">
                {view === 'comando' ? 'Painel de Comando' : 'Operacional'}
              </span>
            </div>
            <div className="w-5" />
          </div>

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full">
            {view === 'comando' && (
              <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-rota-red/10 border border-rota-red/30">
                <Command className="w-4 h-4 text-rota-red-light" />
                <span className="text-xs font-semibold text-rota-red-light uppercase tracking-wide">
                  Área de Alto Privilégio — Acesso Restrito ao Comando
                </span>
              </div>
            )}
            {view === 'comando' ? renderCmd() : renderOp()}
          </main>
        </div>

        {toast && (
          <div className="fixed bottom-4 right-4 z-50 rota-card p-4 shadow-2xl animate-slide-in max-w-sm">
            <p className="text-sm text-rota-white">{toast}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-rota-black">
      <Header
        view={view}
        setView={setView}
        onLoginClick={() => setShowLogin(true)}
      />
      <main className="flex-1">{renderPublic()}</main>
      <PublicFooter />

      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onLogin={handleLogin}
          onRegister={handleRegister}
        />
      )}

      {toast && (
        <div className="fixed bottom-4 right-4 z-50 rota-card p-4 shadow-2xl animate-slide-in max-w-sm">
          <p className="text-sm text-rota-white">{toast}</p>
        </div>
      )}
    </div>
  );
}

export default App;


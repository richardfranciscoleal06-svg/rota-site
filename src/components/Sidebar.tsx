import {
  Users, ArrowUpCircle, Trophy, FileText, Clock, ClipboardCheck,
  Command, LogOut, X, Database,
} from 'lucide-react';
import type { View, OpTab, CmdTab } from '@/types';
import RotaLogo from '@/components/RotaLogo';

interface SidebarProps {
  view: View;
  opTab: OpTab;
  setOpTab: (t: OpTab) => void;
  cmdTab: CmdTab;
  setCmdTab: (t: CmdTab) => void;
  onLogout: () => void;
  userId: string;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}

const opItems: { id: OpTab; label: string; icon: typeof Users }[] = [
  { id: 'perfis', label: 'Perfis Táticos', icon: Users },
  { id: 'promocao', label: 'Solicitação de Promoção', icon: ArrowUpCircle },
  { id: 'rankings', label: 'Central de Rankings', icon: Trophy },
  { id: 'rso', label: 'Relatório de Serviço (RSO)', icon: FileText },
  { id: 'bateponto', label: 'Bate-Ponto', icon: Clock },
  { id: 'qualificacao', label: 'Qualificação Operacional', icon: ClipboardCheck },
];

const cmdItems: { id: CmdTab; label: string; icon: typeof Users }[] = [
  { id: 'cadastros', label: 'Gestão de Cadastros', icon: Users },
  { id: 'rso', label: 'Validação de RSO', icon: FileText },
  { id: 'patrulhas', label: 'Controle de Patrulhas', icon: Clock },
  { id: 'basedados', label: 'Base de Dados', icon: Database },
];

export default function Sidebar({
  view,
  opTab,
  setOpTab,
  cmdTab,
  setCmdTab,
  onLogout,
  userId,
  mobileOpen,
  setMobileOpen,
}: SidebarProps) {
  const isCmd = view === 'comando';

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 h-screen w-64 bg-rota-dark border-r border-rota-border flex flex-col transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-rota-border">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-md bg-rota-card border border-rota-border flex items-center justify-center">
              <RotaLogo size={22} className="rounded-md" />
            </div>
            <div className="leading-tight">
              <p className="text-xs font-bold text-rota-white">PAINEL INTERNO</p>
              <p className="text-[10px] text-rota-gold">ROTA | Jaguaré RP</p>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden text-rota-muted hover:text-rota-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-rota-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-rota-gold/20 border border-rota-gold/40 flex items-center justify-center">
              <span className="text-xs font-bold text-rota-gold">
                {userId.slice(-2)}
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold text-rota-white">{userId}</p>
              <p className="text-[10px] text-rota-green-light flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rota-green-light" />
                Autenticado
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <p className="text-[10px] font-semibold text-rota-muted uppercase tracking-wider px-2 py-1.5">
            Operacional
          </p>
          {opItems.map((item) => {
            const Icon = item.icon;
            const active = !isCmd && opTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setOpTab(item.id);
                  setMobileOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  active
                    ? 'bg-rota-gold/10 text-rota-gold border border-rota-gold/30'
                    : 'text-rota-light hover:bg-rota-card hover:text-rota-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="text-xs leading-tight">{item.label}</span>
              </button>
            );
          })}

          <div className="pt-4">
            <div className="flex items-center gap-2 px-2 py-1.5">
              <Command className="w-3.5 h-3.5 text-rota-red-light" />
              <p className="text-[10px] font-semibold text-rota-red-light uppercase tracking-wider">
                Painel de Comando
              </p>
            </div>
            <div className="mt-1 rounded-lg border border-rota-red/20 bg-rota-red/5 p-1.5 space-y-1">
              {cmdItems.map((item) => {
                const Icon = item.icon;
                const active = isCmd && cmdTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCmdTab(item.id);
                      setMobileOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                      active
                        ? 'bg-rota-red/20 text-rota-red-light border border-rota-red/40'
                        : 'text-rota-light hover:bg-rota-red/10 hover:text-rota-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="text-xs leading-tight">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-3 border-t border-rota-border">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-rota-light hover:bg-rota-red/10 hover:text-rota-red-light transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-xs">Encerrar Sessão</span>
          </button>
        </div>
      </aside>
    </>
  );
}

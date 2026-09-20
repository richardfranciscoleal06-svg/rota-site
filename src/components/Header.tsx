import type { View } from '@/types';
import RotaLogo from '@/components/RotaLogo';

interface HeaderProps {
  view: View;
  setView: (v: View) => void;
  onLoginClick: () => void;
}

const navItems: { label: string; view: View }[] = [
  { label: 'Início', view: 'home' },
  { label: 'História', view: 'historia' },
  { label: 'Hierarquia', view: 'hierarquia' },
  { label: 'Regulamentos', view: 'regulamentos' },
];

export default function Header({ view, setView, onLoginClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-rota-black/95 backdrop-blur-sm border-b border-rota-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        <button
          onClick={() => setView('home')}
          className="flex items-center gap-3 group"
        >
          <div className="w-10 h-10 rounded-md bg-rota-card border border-rota-border flex items-center justify-center shadow-lg shadow-rota-red/10">
            <RotaLogo size={26} className="rounded-md" />
          </div>
          <div className="text-left leading-tight">
            <p className="text-sm font-bold text-rota-white tracking-wide">
              1º Batalhão de Choque
            </p>
            <p className="text-xs text-rota-gold font-medium">
              ROTA | Jaguaré RP
            </p>
          </div>
        </button>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <button
              key={item.view}
              onClick={() => setView(item.view)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                view === item.view
                  ? 'text-rota-gold bg-rota-card'
                  : 'text-rota-light hover:text-rota-white hover:bg-rota-card/50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <button
          onClick={onLoginClick}
          className="rota-btn-gold"
        >
          LOGIN
        </button>
      </div>

      <nav className="md:hidden flex items-center justify-center gap-1 pb-2 px-4 overflow-x-auto">
        {navItems.map((item) => (
          <button
            key={item.view}
            onClick={() => setView(item.view)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
              view === item.view
                ? 'text-rota-gold bg-rota-card'
                : 'text-rota-light hover:text-rota-white'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </header>
  );
}

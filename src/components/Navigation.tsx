import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useLibrary } from '../store/library';

const HomeIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);
const LibraryIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);
const SearchIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const UserIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export function Navigation() {
  const count = useLibrary(s => s.games.length);
  const { token } = useAuth();
  const location = useLocation();

  if (!token || location.pathname === '/auth') return null;

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
      isActive ? 'text-violet-400' : 'text-slate-500 hover:text-slate-300'
    }`;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-violet-900/30">
      <div className="max-w-lg mx-auto flex">
        <NavLink to="/" end className={navClass}>
          <HomeIcon />
          <span>Início</span>
        </NavLink>

        <NavLink to="/search" className={navClass}>
          <SearchIcon />
          <span>Buscar</span>
        </NavLink>

        <NavLink to="/library" className={navClass}>
          {({ isActive }) => (
            <>
              <span className="relative">
                <LibraryIcon />
                {count > 0 && (
                  <span className="absolute -top-1 -right-2 bg-violet-600 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </span>
              <span className={isActive ? 'text-violet-400' : ''}>Biblioteca</span>
            </>
          )}
        </NavLink>

        <NavLink to="/profile" className={navClass}>
          <UserIcon />
          <span>Perfil</span>
        </NavLink>
      </div>
    </nav>
  );
}

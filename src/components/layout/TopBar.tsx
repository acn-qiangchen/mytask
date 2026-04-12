import { Link, useLocation } from 'react-router-dom';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { useLang } from '../../hooks/useLang';
import { useApp } from '../../hooks/useApp';

export function TopBar() {
  const { t } = useLang();
  const { signOut } = useAuthenticator();
  const { syncing } = useApp();
  const location = useLocation();

  const navLinks = [
    { to: '/', label: t.nav.timer },
    { to: '/reports', label: t.nav.reports },
    { to: '/tickets', label: t.nav.tickets },
    { to: '/settings', label: t.nav.settings },
    { to: '/debug', label: 'Debug' },
  ];

  return (
    <header className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between shadow-md">
      <div className="flex items-center gap-6">
        <span className="font-bold text-lg tracking-wide">{t.app.name}</span>
        <nav className="flex gap-1">
          {navLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                location.pathname === link.to
                  ? 'bg-white/20 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <span className="text-gray-500 text-xs font-mono" title="Build date">{__BUILD_DATE__}</span>
        {syncing && <span className="text-gray-400 text-xs">{t.auth.syncing}</span>}
        <button
          onClick={signOut}
          className="text-gray-300 hover:text-white transition-colors"
        >
          {t.auth.signOut}
        </button>
      </div>
    </header>
  );
}

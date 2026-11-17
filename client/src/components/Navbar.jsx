import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Leaf, LogOut, Menu, ShieldCheck, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/risk-checker', label: 'Risk Checker' },
  { to: '/planner', label: 'Planner' },
  { to: '/compare', label: 'Compare' },
  { to: '/map', label: 'Climate Map' },
  { to: '/team', label: 'Our Team' },
];

function navClass({ isActive }) {
  return `rounded-full px-3 py-2 text-sm transition ${
    isActive ? 'font-semibold text-forest-800' : 'text-muted hover:text-forest-700'
  }`;
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-leaf text-forest-700">
            <Leaf className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="text-[15px] font-bold tracking-tight text-forest-700 sm:text-base">
            Climate Adaptation Assistant
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={navClass}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {user ? (
            <>
              <Link to="/dashboard" className="btn-outline btn-sm">
                Dashboard
              </Link>
              <Link
                to="/security"
                className="rounded-lg p-2 text-muted hover:bg-leaf hover:text-forest-700"
                aria-label="Account security"
                title="Account security"
              >
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              </Link>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-forest-600 text-xs font-bold uppercase text-white">
                {user.name.slice(0, 1)}
              </span>
              <button type="button" onClick={handleLogout} className="btn-ghost btn-sm">
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm font-medium text-muted hover:text-forest-700">
                Log in
              </Link>
              <Link to="/signup" className="btn-primary btn-sm">
                Get started
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-line text-ink lg:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-line bg-white lg:hidden">
          <div className="container-page flex flex-col gap-1 py-3">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `rounded-xl px-3 py-2.5 text-sm ${
                    isActive ? 'bg-leaf font-semibold text-forest-800' : 'text-muted'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-line pt-3">
              {user ? (
                <>
                  <Link to="/dashboard" className="btn-outline btn-sm">
                    Dashboard
                  </Link>
                  <Link to="/security" className="btn-outline btn-sm">
                    Account security
                  </Link>
                  <button type="button" onClick={handleLogout} className="btn-ghost btn-sm">
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="btn-outline btn-sm">
                    Log in
                  </Link>
                  <Link to="/signup" className="btn-primary btn-sm">
                    Get started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

import { Link, useLocation } from 'react-router-dom';
import { useSeo } from '../lib/seo';
import {
  ArrowLeft,
  BarChart3,
  ClipboardList,
  Compass,
  Home as HomeIcon,
  LayoutDashboard,
  MapPinned,
  SearchX,
  Users,
} from 'lucide-react';

const quickLinks = [
  { to: '/', label: 'Home', description: 'Back to the start page', icon: HomeIcon },
  { to: '/risk-checker', label: 'Risk Checker', description: 'Score heat, flood and water risk', icon: BarChart3 },
  { to: '/planner', label: 'Planner', description: 'Build a household plan', icon: ClipboardList },
  { to: '/compare', label: 'Compare Places', description: 'Compare up to three places', icon: MapPinned },
  { to: '/map', label: 'Climate Map', description: 'Explore satellite and weather maps', icon: Compass },
  { to: '/team', label: 'Our Team', description: 'Who built this project', icon: Users },
];

export default function NotFound() {
  const location = useLocation();

  useSeo({
    title: 'Page not found (404)',
    description:
      'That page could not be found. Head back to the home page or open one of the climate tools.',
    noIndex: true,
  });

  return (
    <div className="bg-canvas">
      <div className="container-page flex flex-col items-center py-16 text-center sm:py-20">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-leaf text-forest-700">
          <SearchX className="h-8 w-8" aria-hidden="true" />
        </span>
        <p className="mt-6 text-6xl font-extrabold tracking-tight text-forest-700 sm:text-7xl">404</p>
        <h1 className="mt-3 text-2xl font-extrabold sm:text-3xl">This page could not be found</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
          We could not find anything at{' '}
          <code className="rounded-md bg-white px-1.5 py-0.5 text-[13px] font-semibold text-forest-800">
            {location.pathname}
          </code>
          . The link may be out of date, or the page may have moved.
        </p>

        <div className="mt-7 flex flex-col gap-2 sm:flex-row">
          <Link to="/" className="btn-primary">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to home
          </Link>
          <Link to="/dashboard" className="btn-outline">
            <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
            Go to dashboard
          </Link>
        </div>

        <div className="mt-14 w-full max-w-4xl text-left">
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted">
            Popular pages
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {quickLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="group flex items-start gap-3 rounded-2xl border border-line bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-leaf text-forest-700">
                  <link.icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink group-hover:text-forest-700">
                    {link.label}
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                    {link.description}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

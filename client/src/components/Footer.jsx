import { Link } from 'react-router-dom';
import { Leaf } from 'lucide-react';
import { openConsentPreferences } from '../lib/consent';

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-line bg-canvas">
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-leaf text-forest-700">
              <Leaf className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="font-bold text-forest-700">Climate Adaptation Assistant</span>
          </div>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
            A student project that helps households understand local climate concerns and prepare
            practical, low-cost adaptation plans.
          </p>
          <p className="mt-4 text-xs text-muted">
            Educational concept prototype. Not an official warning, forecast or relocation service.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-ink">Tools</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>
              <Link to="/risk-checker" className="hover:text-forest-700">
                Climate risk checker
              </Link>
            </li>
            <li>
              <Link to="/planner" className="hover:text-forest-700">
                Adaptation planner
              </Link>
            </li>
            <li>
              <Link to="/compare" className="hover:text-forest-700">
                Compare places
              </Link>
            </li>
            <li>
              <Link to="/map" className="hover:text-forest-700">
                Climate map
              </Link>
            </li>
            <li>
              <Link to="/dashboard" className="hover:text-forest-700">
                Dashboard
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-ink">Project team</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>Aaditya Bhattarai</li>
            <li>Shivanshu Thakur</li>
            <li>Ritik Sharma</li>
            <li className="text-forest-700">WS Section</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <p>Climate Adaptation Assistant &bull; Student concept prototype &bull; WS Section</p>
            <button
              type="button"
              onClick={openConsentPreferences}
              className="text-left text-forest-700 hover:underline"
            >
              Cookie preferences
            </button>
          </div>
          <p>Built with React, Express and MongoDB</p>
        </div>
      </div>
    </footer>
  );
}

import { Link } from 'react-router-dom';
import { Leaf } from 'lucide-react';

export default function AuthLayout({ children, footer }) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col bg-canvas">
      <div className="border-b border-line bg-white">
        <div className="container-page flex h-14 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-leaf text-forest-700">
              <Leaf className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="text-sm font-bold text-forest-700">Climate Adaptation Assistant</span>
          </Link>
          <Link to="/" className="text-xs font-medium text-muted hover:text-forest-700">
            Back to Home
          </Link>
        </div>
      </div>

      <div className="flex flex-1 items-start justify-center px-5 py-12 sm:items-center">
        <div className="w-full max-w-md">
          {children}
          {footer ? <p className="mt-6 text-center text-xs text-muted">{footer}</p> : null}
        </div>
      </div>
    </div>
  );
}

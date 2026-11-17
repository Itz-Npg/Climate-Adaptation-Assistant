import { Link, Navigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LoadingBlock } from './ui';

/** Client guard for /admin. The API enforces the same rule server-side. */
export default function AdminRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="container-page py-16">
        <LoadingBlock label="Checking your access..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: '/admin' }} />;
  }

  if (user.role !== 'admin') {
    return (
      <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <ShieldAlert className="h-7 w-7" aria-hidden="true" />
        </span>
        <p className="mt-5 text-sm font-semibold uppercase tracking-[0.14em] text-muted">403</p>
        <h1 className="mt-2 text-2xl font-extrabold">You do not have access to this page</h1>
        <p className="mt-2 max-w-md text-sm text-muted">
          The admin panel is limited to accounts with the admin role. If you believe this is a
          mistake, ask an existing admin to promote your account.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Link to="/dashboard" className="btn-primary">
            Go to dashboard
          </Link>
          <Link to="/" className="btn-outline">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return children;
}

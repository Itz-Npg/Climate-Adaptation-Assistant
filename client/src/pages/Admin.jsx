import { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  ClipboardList,
  Loader2,
  MapPinned,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldOff,
  Trash2,
  UserCog,
  Users,
} from 'lucide-react';
import { adminApi, getErrorMessage } from '../api/client';
import { Alert, EmptyState, PageHeader, Skeleton } from '../components/ui';
import Breadcrumbs from '../components/Breadcrumbs';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastProvider';
import { useSeo } from '../lib/seo';

const STAT_CARDS = [
  { key: 'users', label: 'Total users', icon: Users },
  { key: 'admins', label: 'Admins', icon: ShieldCheck },
  { key: 'newUsers', label: 'New this week', icon: UserCog },
  { key: 'assessments', label: 'Assessments', icon: BarChart3 },
  { key: 'plans', label: 'Plans', icon: ClipboardList },
  { key: 'comparisons', label: 'Comparisons', icon: MapPinned },
];

export default function Admin() {
  const { user } = useAuth();
  const toast = useToast();

  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  useSeo({
    title: 'Admin Panel',
    description: 'Manage accounts and review platform activity.',
    noIndex: true,
  });

  const loadStats = useCallback(async () => {
    try {
      const { data } = await adminApi.stats();
      setStats(data.stats);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Could not load platform statistics.'));
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await adminApi.users({ page, limit: 20, search: appliedSearch });
      setUsers(data.users || []);
      setPagination(data.pagination || { page: 1, pages: 1, total: 0 });
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Could not load users.'));
    } finally {
      setLoading(false);
    }
  }, [page, appliedSearch]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Debounce the search box.
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setAppliedSearch(search.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  async function changeRole(target, role) {
    setBusyId(target.id);
    try {
      await adminApi.setRole(target.id, role);
      setUsers((current) =>
        current.map((item) => (item.id === target.id ? { ...item, role } : item))
      );
      loadStats();
      toast.success(`${target.email} is now ${role === 'admin' ? 'an admin' : 'a normal user'}.`);
    } catch (requestError) {
      toast.error(getErrorMessage(requestError, 'Could not change that role.'));
    } finally {
      setBusyId('');
    }
  }

  async function resetMfa(target) {
    if (!window.confirm(`Clear two-factor authentication for ${target.email}?`)) return;
    setBusyId(target.id);
    try {
      await adminApi.resetMfa(target.id);
      setUsers((current) =>
        current.map((item) => (item.id === target.id ? { ...item, mfaEnabled: false } : item))
      );
      toast.success(`Two-factor authentication cleared for ${target.email}.`);
    } catch (requestError) {
      toast.error(getErrorMessage(requestError, 'Could not reset MFA.'));
    } finally {
      setBusyId('');
    }
  }

  async function removeUser(target) {
    if (
      !window.confirm(
        `Delete ${target.email} and all of their assessments, plans and comparisons? This cannot be undone.`
      )
    ) {
      return;
    }
    setBusyId(target.id);
    try {
      await adminApi.remove(target.id);
      setUsers((current) => current.filter((item) => item.id !== target.id));
      setPagination((current) => ({ ...current, total: Math.max(0, current.total - 1) }));
      loadStats();
      toast.success('User and their data were deleted.');
    } catch (requestError) {
      toast.error(getErrorMessage(requestError, 'Could not delete that user.'));
    } finally {
      setBusyId('');
    }
  }

  return (
    <div className="container-page py-10">
      <Breadcrumbs items={[{ label: 'Admin panel' }]} className="mb-5" />
      <PageHeader
        eyebrow="Administration"
        title="Users and activity"
        description="Review registered accounts, manage roles, clear lost two-factor devices and remove abusive accounts. Every action is enforced by the server and written to the server log."
      />

      {error ? (
        <Alert type="error" className="mt-5">
          {error}
        </Alert>
      ) : null}

      {/* Stats */}
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {STAT_CARDS.map((card) => (
          <div key={card.key} className="card p-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-leaf text-forest-700">
              <card.icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <p className="mt-3 text-2xl font-extrabold text-forest-700">
              {stats ? stats[card.key] : <Skeleton className="h-7 w-10" />}
            </p>
            <p className="mt-0.5 text-xs text-muted">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Users */}
      <div className="card mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Registered users</h2>
            <p className="mt-1 text-sm text-muted">
              {pagination.total} account{pagination.total === 1 ? '' : 's'} in total.
            </p>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                aria-hidden="true"
              />
              <input
                className="input pl-10"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name or email"
                aria-label="Search users"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                loadUsers();
                loadStats();
              }}
              className="btn-outline btn-sm"
              aria-label="Refresh"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="mt-5 space-y-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 rounded-xl border border-line p-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="h-3 w-64" />
                </div>
              </div>
            ))}
          </div>
        ) : users.length ? (
          <div className="mt-5 w-full overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted">
                  <th className="pb-2 pr-3 font-semibold">User</th>
                  <th className="pb-2 pr-3 font-semibold">Role</th>
                  <th className="pb-2 pr-3 font-semibold">Joined</th>
                  <th className="pb-2 pr-3 font-semibold">Data</th>
                  <th className="pb-2 pr-3 font-semibold">MFA</th>
                  <th className="pb-2 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((item) => {
                  const isSelf = item.id === user?.id;
                  const busy = busyId === item.id;
                  return (
                    <tr key={item.id} className="table-row-line align-middle">
                      <td className="py-3 pr-3">
                        <p className="font-semibold text-ink">
                          {item.name}
                          {isSelf ? (
                            <span className="ml-2 rounded-full bg-leaf px-2 py-0.5 text-[10px] font-semibold text-forest-700">
                              You
                            </span>
                          ) : null}
                        </p>
                        <p className="text-xs text-muted">{item.email}</p>
                      </td>
                      <td className="py-3 pr-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${
                            item.role === 'admin'
                              ? 'bg-forest-600 text-white'
                              : 'bg-canvas text-muted'
                          }`}
                        >
                          {item.role || 'user'}
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-xs text-muted">
                        {new Date(item.createdAt).toLocaleDateString(undefined, {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 pr-3 text-xs text-muted">
                        {item.assessments} risks &bull; {item.plans} plans &bull;{' '}
                        {item.comparisons} comparisons
                      </td>
                      <td className="py-3 pr-3 text-xs">
                        {item.mfaEnabled ? (
                          <span className="font-semibold text-forest-700">On</span>
                        ) : (
                          <span className="text-muted">Off</span>
                        )}
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => changeRole(item, item.role === 'admin' ? 'user' : 'admin')}
                            className="btn-outline btn-sm"
                            disabled={busy || isSelf}
                            title={isSelf ? 'You cannot change your own role' : undefined}
                          >
                            {busy ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <ShieldCheck className="h-3.5 w-3.5" />
                            )}
                            {item.role === 'admin' ? 'Make user' : 'Make admin'}
                          </button>
                          {item.mfaEnabled ? (
                            <button
                              type="button"
                              onClick={() => resetMfa(item)}
                              className="btn-ghost btn-sm"
                              disabled={busy}
                            >
                              <ShieldOff className="h-3.5 w-3.5" /> Reset MFA
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => removeUser(item)}
                            className="btn-danger btn-sm"
                            disabled={busy || isSelf}
                            title={isSelf ? 'You cannot delete your own account here' : undefined}
                            aria-label={`Delete ${item.email}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-5">
            <EmptyState
              icon={Users}
              title="No matching users"
              description="Try a different name or email address."
            />
          </div>
        )}

        {pagination.pages > 1 ? (
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4 text-sm">
            <p className="text-xs text-muted">
              Page {pagination.page} of {pagination.pages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="btn-outline btn-sm"
                disabled={pagination.page <= 1}
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(pagination.pages, current + 1))}
                className="btn-outline btn-sm"
                disabled={pagination.page >= pagination.pages}
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <p className="mt-4 flex items-start gap-2 rounded-xl bg-canvas px-3.5 py-2.5 text-xs leading-relaxed text-muted">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-forest-600" aria-hidden="true" />
        Admins cannot change their own role, delete their own account, or remove the last remaining
        admin. Deletes also remove that user&apos;s assessments, plans and comparisons.
      </p>
    </div>
  );
}

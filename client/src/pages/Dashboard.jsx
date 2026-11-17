import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  ClipboardList,
  Gauge,
  MapPinned,
  Plus,
  RefreshCw,
  ThermometerSun,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { comparisonApi, getErrorMessage, planApi, riskApi } from '../api/client';
import {
  Alert,
  EmptyState,
  LoadingBlock,
  RiskBadge,
  ScoreBar,
  Spinner,
  scoreTone,
} from '../components/ui';
import Breadcrumbs from '../components/Breadcrumbs';
import { useSeo } from '../lib/seo';

const HAZARD_LABELS = [
  ['heat', 'Extreme heat'],
  ['flood', 'Flooding'],
  ['drought', 'Drought'],
  ['waterScarcity', 'Water scarcity'],
];

function relativeTime(value) {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;
  return date.toLocaleDateString();
}

function formatDate(value) {
  if (!value) return 'No deadline';
  return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Dashboard() {
  useSeo({
    title: 'Your Dashboard',
    description:
      'Your latest climate risk assessment, adaptation plan progress, pending tasks and recent activity in one place.',
    path: '/dashboard',
    noIndex: true,
    breadcrumbs: [{ label: 'Dashboard' }],
  });
  const { user } = useAuth();
  const [risks, setRisks] = useState([]);
  const [plans, setPlans] = useState([]);
  const [comparisons, setComparisons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [togglingTask, setTogglingTask] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [riskRes, planRes, comparisonRes] = await Promise.all([
        riskApi.list(),
        planApi.list(),
        comparisonApi.list(),
      ]);
      setRisks(riskRes.data.assessments || []);
      setPlans(planRes.data.plans || []);
      setComparisons(comparisonRes.data.comparisons || []);
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Could not load your dashboard.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const latest = risks[0] || null;

  const overallProgress = useMemo(() => {
    const tasks = plans.flatMap((plan) => plan.tasks || []);
    if (!tasks.length) return 0;
    return Math.round((tasks.filter((task) => task.completed).length / tasks.length) * 100);
  }, [plans]);

  const pendingTasks = useMemo(() => {
    const list = [];
    plans.forEach((plan) => {
      (plan.tasks || []).forEach((task) => {
        if (!task.completed) list.push({ plan, task });
      });
    });
    return list
      .sort((a, b) => {
        const aDate = a.task.dueDate ? new Date(a.task.dueDate).getTime() : Infinity;
        const bDate = b.task.dueDate ? new Date(b.task.dueDate).getTime() : Infinity;
        return aDate - bDate;
      })
      .slice(0, 5);
  }, [plans]);

  const activity = useMemo(() => {
    const items = [
      ...risks.map((risk) => ({
        id: `risk-${risk._id}`,
        type: 'Risk assessment',
        title: `${risk.location.city}${risk.location.state ? `, ${risk.location.state}` : ''}`,
        detail: `Risk level: ${risk.riskLevel}`,
        date: risk.createdAt,
        icon: Gauge,
      })),
      ...plans.map((plan) => ({
        id: `plan-${plan._id}`,
        type: 'Adaptation plan',
        title: plan.title,
        detail: `${plan.tasks?.length || 0} tasks • ${plan.progress || 0}% complete`,
        date: plan.updatedAt || plan.createdAt,
        icon: ClipboardList,
      })),
      ...comparisons.map((comparison) => ({
        id: `compare-${comparison._id}`,
        type: 'Place comparison',
        title: comparison.locations.map((location) => location.city).join(' vs '),
        detail: `${comparison.locations.length} places compared`,
        date: comparison.createdAt,
        icon: MapPinned,
      })),
    ];
    return items.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);
  }, [risks, plans, comparisons]);

  async function toggleTask(plan, task) {
    setTogglingTask(task._id);
    try {
      const updatedTasks = plan.tasks.map((item) =>
        item._id === task._id ? { ...item, completed: !item.completed } : item
      );
      const { data } = await planApi.update(plan._id, { tasks: updatedTasks });
      setPlans((current) => current.map((item) => (item._id === plan._id ? data.plan : item)));
    } catch (toggleError) {
      setError(getErrorMessage(toggleError));
    } finally {
      setTogglingTask('');
    }
  }

  const chartData = latest
    ? HAZARD_LABELS.map(([key, label]) => ({ name: label.replace('Extreme ', ''), score: latest.riskScores[key] }))
    : [];

  if (loading) {
    return (
      <div className="container-page py-12">
        <LoadingBlock label="Loading your dashboard..." />
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="eyebrow">Dashboard</span>
          <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">
            Welcome back, {user?.name?.split(' ')[0] || 'there'}
          </h1>
          <p className="mt-2 text-sm text-muted">
            Here is your climate readiness snapshot. Scores are illustrative estimates, not official forecasts.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={load} className="btn-outline btn-sm">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </button>
          <Link to="/risk-checker" className="btn-primary btn-sm">
            <Plus className="h-4 w-4" aria-hidden="true" />
            New assessment
          </Link>
        </div>
      </div>

      {error ? <Alert type="error" className="mt-5">{error}</Alert> : null}

      {/* Stats */}
      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Latest risk level</p>
          {latest ? (
            <>
              <div className="mt-3">
                <RiskBadge level={latest.riskLevel} />
              </div>
              <p className="mt-3 text-sm text-muted">
                {latest.location.city}
                {latest.location.state ? `, ${latest.location.state}` : ''}
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted">No assessment yet</p>
          )}
        </div>

        <div className="card">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Highest hazard score</p>
          {latest ? (
            <>
              <p className={`mt-2 text-3xl font-extrabold ${scoreTone(Math.max(...Object.values(latest.riskScores))).text}`}>
                {Math.max(...Object.values(latest.riskScores))}
                <span className="text-base font-semibold text-muted">/100</span>
              </p>
              <p className="mt-1 text-sm text-muted">
                {
                  HAZARD_LABELS.reduce(
                    (max, [key, label]) =>
                      latest.riskScores[key] > latest.riskScores[max.key] ? { key, label } : max,
                    { key: 'heat', label: 'Extreme heat' }
                  ).label
                }
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted">Run a risk check to see scores</p>
          )}
        </div>

        <div className="card">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Plan progress</p>
          <p className="mt-2 text-3xl font-extrabold text-forest-700">
            {overallProgress}
            <span className="text-base font-semibold text-muted">%</span>
          </p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-canvas">
            <div className="h-full rounded-full bg-forest-500" style={{ width: `${overallProgress}%` }} />
          </div>
          <p className="mt-2 text-sm text-muted">
            {plans.length} plan{plans.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="card">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Pending tasks</p>
          <p className="mt-2 text-3xl font-extrabold text-ink">
            {plans.reduce((sum, plan) => sum + (plan.tasks || []).filter((task) => !task.completed).length, 0)}
          </p>
          <p className="mt-1 text-sm text-muted">
            {comparisons.length} saved comparison{comparisons.length === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Latest assessment */}
        <div className="card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Latest risk assessment</h2>
              <p className="mt-1 text-sm text-muted">
                {latest
                  ? `${latest.location.city}${latest.location.state ? `, ${latest.location.state}` : ''}, ${latest.location.country} • ${relativeTime(latest.createdAt)}`
                  : 'You have not run a risk check yet.'}
              </p>
            </div>
            <Link to="/risk-checker" className="btn-ghost btn-sm shrink-0">
              Open tool
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          {latest ? (
            <>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {HAZARD_LABELS.map(([key, label]) => (
                  <ScoreBar key={key} label={label} score={latest.riskScores[key]} />
                ))}
              </div>
              <div className="mt-5 h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e3ebe4" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#61736a' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#61736a' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: '1px solid #e3ebe4', fontSize: 12 }}
                      formatter={(value) => [`${value}/100`, 'Score']}
                    />
                    <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                      {chartData.map((entry) => (
                        <Cell key={entry.name} fill="#2f6b4a" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <div className="mt-5">
              <EmptyState
                icon={Gauge}
                title="No assessment saved yet"
                description="Answer a few questions about your area to get an illustrative risk profile."
                action={
                  <Link to="/risk-checker" className="btn-primary btn-sm">
                    Check climate risks
                  </Link>
                }
              />
            </div>
          )}
        </div>

        {/* Plans + tasks */}
        <div className="card">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-bold">Adaptation plan progress</h2>
            <Link to="/planner" className="btn-ghost btn-sm shrink-0">
              Planner
            </Link>
          </div>

          {plans.length ? (
            <div className="mt-4 space-y-3">
              {plans.slice(0, 3).map((plan) => (
                <div key={plan._id} className="rounded-xl border border-line p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold">{plan.title}</p>
                    <span className="text-xs font-semibold text-forest-700">{plan.progress || 0}%</span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-canvas">
                    <div className="h-full rounded-full bg-forest-500" style={{ width: `${plan.progress || 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-xl bg-canvas px-3 py-4 text-sm text-muted">
              No plans yet. Create one to track the actions your household needs.
            </p>
          )}

          <h3 className="mt-6 flex items-center gap-2 text-sm font-bold">
            <CalendarClock className="h-4 w-4 text-forest-600" aria-hidden="true" />
            Pending tasks
          </h3>
          {pendingTasks.length ? (
            <ul className="mt-3 space-y-2">
              {pendingTasks.map(({ plan, task }) => (
                <li key={`${plan._id}-${task._id}`} className="flex items-start gap-2 rounded-xl bg-canvas px-3 py-2.5">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-line text-forest-600 focus:ring-forest-300"
                    checked={false}
                    onChange={() => toggleTask(plan, task)}
                    disabled={togglingTask === task._id}
                    aria-label={`Mark "${task.title}" complete`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink">{task.title}</p>
                    <p className="text-[11px] text-muted">
                      {plan.title} • {formatDate(task.dueDate)}
                    </p>
                  </div>
                  {togglingTask === task._id ? <Spinner className="h-4 w-4 text-forest-600" /> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted">
              {plans.length ? 'Everything is done. Nice work.' : 'No pending tasks.'}
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        {/* Quick access */}
        <div className="card">
          <h2 className="text-lg font-bold">Quick access</h2>
          <div className="mt-4 space-y-2">
            {[
              { to: '/risk-checker', label: 'Climate risk checker', icon: ThermometerSun, hint: 'Assess four hazards' },
              { to: '/planner', label: 'Adaptation planner', icon: ClipboardList, hint: 'Manage household tasks' },
              { to: '/compare', label: 'Compare places', icon: MapPinned, hint: 'Two or three locations' },
            ].map(({ to, label, icon: Icon, hint }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-3 rounded-xl border border-line px-3 py-3 transition hover:border-forest-200 hover:bg-forest-50/60"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-leaf text-forest-700">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink">{label}</span>
                  <span className="block text-xs text-muted">{hint}</span>
                </span>
                <ArrowRight className="h-4 w-4 text-muted" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>

        {/* Activity */}
        <div className="card">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Recent activity</h2>
            <BarChart3 className="h-4 w-4 text-forest-600" aria-hidden="true" />
          </div>
          {activity.length ? (
            <ul className="mt-4 divide-y divide-line">
              {activity.map((item) => (
                <li key={item.id} className="flex items-start gap-3 py-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-leaf text-forest-700">
                    <item.icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">
                      {item.type}: <span className="font-normal">{item.title}</span>
                    </p>
                    <p className="text-xs text-muted">
                      {item.detail} • {relativeTime(item.date)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-xl bg-canvas px-3 py-4 text-sm text-muted">
              Your saved assessments, plans and comparisons will appear here.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

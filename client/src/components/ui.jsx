import { AlertCircle, CheckCircle2, Info, Loader2 } from 'lucide-react';

export function Spinner({ className = 'h-5 w-5' }) {
  return <Loader2 className={`animate-spin ${className}`} aria-hidden="true" />;
}

export function LoadingBlock({ label = 'Loading...' }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-white px-5 py-6 text-sm text-muted">
      <Spinner />
      <span>{label}</span>
    </div>
  );
}

export function Alert({ type = 'error', children, className = '' }) {
  const styles = {
    error: 'alert-error',
    success: 'alert-success',
    info: 'alert-info',
  };
  const Icon = type === 'error' ? AlertCircle : type === 'success' ? CheckCircle2 : Info;

  return (
    <div role={type === 'error' ? 'alert' : 'status'} className={`${styles[type]} flex items-start gap-2 ${className}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

const LEVEL_STYLES = {
  low: 'bg-forest-50 text-forest-700 border-forest-200',
  moderate: 'bg-amber-50 text-amber-700 border-amber-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  severe: 'bg-red-50 text-red-700 border-red-200',
};

export function RiskBadge({ level = 'low', className = '' }) {
  const key = String(level).toLowerCase();
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${
        LEVEL_STYLES[key] || LEVEL_STYLES.low
      } ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {key}
    </span>
  );
}

export function scoreTone(score) {
  if (score >= 80) return { bar: 'bg-red-500', text: 'text-red-600' };
  if (score >= 60) return { bar: 'bg-orange-500', text: 'text-orange-600' };
  if (score >= 35) return { bar: 'bg-amber-400', text: 'text-amber-600' };
  return { bar: 'bg-forest-500', text: 'text-forest-700' };
}

export function ScoreBar({ label, score, hint }) {
  const tone = scoreTone(score);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-ink">{label}</span>
        <span className={`text-sm font-semibold ${tone.text}`}>{score}/100</span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-canvas">
        <div
          className={`h-full rounded-full ${tone.bar} transition-all`}
          style={{ width: `${Math.max(3, score)}%` }}
          role="progressbar"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label}
        />
      </div>
      {hint ? <p className="mt-1.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-canvas px-6 py-10 text-center">
      {Icon ? <Icon className="mx-auto h-7 w-7 text-forest-400" aria-hidden="true" /> : null}
      <p className="mt-3 text-sm font-semibold text-ink">{title}</p>
      {description ? <p className="mx-auto mt-1 max-w-md text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className = 'h-4 w-24' }) {
  return <span className={`skeleton block ${className}`} aria-hidden="true" />;
}

export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-card" aria-hidden="true">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-3 h-6 w-48" />
      <div className="mt-4 space-y-2">
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton key={index} className={`h-3 ${index % 2 ? 'w-2/3' : 'w-full'}`} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 3, className = 'md:grid-cols-2 xl:grid-cols-3' }) {
  return (
    <div className={`grid gap-4 ${className}`} role="status" aria-label="Loading content">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow ? <span className="eyebrow mb-3">{eyebrow}</span> : null}
        <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">{title}</h1>
        {description ? <p className="mt-3 text-base leading-relaxed text-muted">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

import { useState } from 'react';
import {
  Check,
  Copy,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
  ShieldOff,
} from 'lucide-react';
import { authApi, getErrorMessage } from '../api/client';
import { Alert, PageHeader, Skeleton } from '../components/ui';
import Breadcrumbs from '../components/Breadcrumbs';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastProvider';
import { useSeo } from '../lib/seo';

export default function Security() {
  const { user, setUser } = useAuth();
  const toast = useToast();

  const [setup, setSetup] = useState(null); // { secret, otpauthUri }
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [backupCodes, setBackupCodes] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [copied, setCopied] = useState('');

  useSeo({
    title: 'Account Security',
    description: 'Turn on two-factor authentication and review the security settings on your account.',
    noIndex: true,
    breadcrumbs: [
      { label: 'Dashboard', to: '/dashboard' },
      { label: 'Account security' },
    ],
  });

  async function startSetup() {
    setBusy('setup');
    setError('');
    try {
      const { data } = await authApi.setupMfa();
      setSetup({ secret: data.secret, otpauthUri: data.otpauthUri });
      toast.info('Secret ready — add it to your authenticator app.');
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Could not start two-factor setup.'));
    } finally {
      setBusy('');
    }
  }

  async function enable(event) {
    event.preventDefault();
    setBusy('enable');
    setError('');
    try {
      const { data } = await authApi.enableMfa({ code: code.trim() });
      setBackupCodes(data.backupCodes || []);
      setSetup(null);
      setCode('');
      setUser((current) => (current ? { ...current, mfaEnabled: true } : current));
      toast.success('Two-factor authentication is on.');
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Could not turn on two-factor authentication.'));
    } finally {
      setBusy('');
    }
  }

  async function disable(event) {
    event.preventDefault();
    setBusy('disable');
    setError('');
    try {
      await authApi.disableMfa({ password });
      setPassword('');
      setUser((current) => (current ? { ...current, mfaEnabled: false } : current));
      toast.success('Two-factor authentication has been turned off.');
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Could not turn off two-factor authentication.'));
    } finally {
      setBusy('');
    }
  }

  async function copyText(value, key) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      toast.success('Copied to clipboard.');
      setTimeout(() => setCopied(''), 2000);
    } catch {
      toast.error('Copy failed — select the text and copy it manually.');
    }
  }

  if (!user) {
    return (
      <div className="container-page py-10">
        <Skeleton className="h-8 w-64" />
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      <Breadcrumbs
        items={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Account security' }]}
        className="mb-5"
      />
      <PageHeader
        eyebrow="Account"
        title="Security settings"
        description="Protect your saved assessments and adaptation plans. Two-factor authentication is optional but strongly recommended."
      />

      {error ? (
        <Alert type="error" className="mt-5">
          {error}
        </Alert>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-start">
        <div className="card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <ShieldCheck className="h-4 w-4 text-forest-600" aria-hidden="true" />
                Two-factor authentication
              </h2>
              <p className="mt-1 text-sm text-muted">
                Use an authenticator app (Google Authenticator, Authy, 1Password) for a 6-digit code
                on every sign-in.
              </p>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                user.mfaEnabled ? 'bg-leaf text-forest-700' : 'bg-canvas text-muted'
              }`}
            >
              {user.mfaEnabled ? 'On' : 'Off'}
            </span>
          </div>

          {!user.mfaEnabled && !setup ? (
            <button type="button" onClick={startSetup} className="btn-primary btn-sm mt-5" disabled={busy === 'setup'}>
              {busy === 'setup' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
              Set up authenticator app
            </button>
          ) : null}

          {setup ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-xl bg-canvas p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                  Secret key
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <code className="break-all rounded-lg bg-white px-3 py-2 text-sm font-semibold tracking-wider text-forest-800">
                    {setup.secret}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyText(setup.secret, 'secret')}
                    className="btn-outline btn-sm"
                  >
                    {copied === 'secret' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    Copy
                  </button>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-muted">
                  Or open the setup link on the device with your authenticator app:{' '}
                  <button
                    type="button"
                    onClick={() => copyText(setup.otpauthUri, 'uri')}
                    className="font-semibold text-forest-700 underline"
                  >
                    copy otpauth:// link
                  </button>
                </p>
              </div>

              <form onSubmit={enable}>
                <label htmlFor="mfa-setup-code" className="label">
                  Enter the 6-digit code from the app
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    id="mfa-setup-code"
                    className="input tracking-[0.3em] sm:max-w-[180px]"
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="123456"
                  />
                  <button type="submit" className="btn-primary" disabled={busy === 'enable'}>
                    {busy === 'enable' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Turn on two-factor'
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : null}

          {backupCodes ? (
            <div className="mt-5 rounded-xl border border-forest-200 bg-forest-50 p-4">
              <p className="text-sm font-bold text-forest-800">Save your backup codes</p>
              <p className="mt-1 text-xs leading-relaxed text-forest-900/80">
                Each code works once if you lose your phone. Store them somewhere safe — they are not
                shown again.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {backupCodes.map((item) => (
                  <code key={item} className="rounded-lg bg-white px-2 py-1.5 text-center text-xs font-semibold tracking-wider">
                    {item}
                  </code>
                ))}
              </div>
              <button
                type="button"
                onClick={() => copyText(backupCodes.join('\n'), 'codes')}
                className="btn-outline btn-sm mt-3"
              >
                <Copy className="h-3.5 w-3.5" /> Copy all codes
              </button>
            </div>
          ) : null}

          {user.mfaEnabled ? (
            <form onSubmit={disable} className="mt-6 border-t border-line pt-5">
              <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                <ShieldOff className="h-4 w-4 text-red-500" aria-hidden="true" />
                Turn off two-factor authentication
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  type="password"
                  className="input sm:max-w-xs"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Current password"
                  autoComplete="current-password"
                />
                <button type="submit" className="btn-danger" disabled={busy === 'disable'}>
                  {busy === 'disable' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Turn off'}
                </button>
              </div>
            </form>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="card">
            <h2 className="flex items-center gap-2 text-base font-bold">
              <Lock className="h-4 w-4 text-forest-600" aria-hidden="true" />
              How your account is protected
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              {[
                'Passwords hashed with bcrypt (12 rounds) — never stored in plain text.',
                'Session tokens live in an HTTP-only cookie, never in browser storage.',
                'Every request is checked for same-origin and rate limits.',
                'Your saved data is scoped to your account on the server.',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-forest-600" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-line bg-canvas p-4">
            <p className="text-xs leading-relaxed text-muted">
              Losing access to both your authenticator and backup codes means the account cannot be
              recovered automatically. Keep the backup codes offline.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
import { Alert, Spinner } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../api/client';
import { useSeo } from '../lib/seo';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function Login() {
  const { user, loading: sessionLoading, login, verifyMfa } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/dashboard';

  const [form, setForm] = useState({ email: '', password: '', remember: false });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [mfa, setMfa] = useState(null);
  const [code, setCode] = useState('');

  useSeo({
    title: 'Log In',
    description: 'Sign in to your Climate Adaptation Assistant account to see your risk assessments and plans.',
    path: '/login',
    noIndex: true,
  });

  if (!sessionLoading && user) {
    return <Navigate to={from} replace />;
  }

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setServerError('');
  }

  function validate() {
    const next = {};
    if (!form.email.trim()) next.email = 'Email address is required.';
    else if (!emailPattern.test(form.email.trim())) next.email = 'Enter a valid email address.';
    if (!form.password) next.password = 'Password is required.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setServerError('');
    try {
      const result = await login({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        remember: form.remember,
      });
      if (result?.mfaRequired) {
        setMfa({ challenge: result.challenge, remember: form.remember });
        return;
      }
      navigate(from, { replace: true });
    } catch (error) {
      setServerError(getErrorMessage(error, 'Unable to sign in. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMfaSubmit(event) {
    event.preventDefault();
    if (!/^\d{6}$|^[A-Fa-f0-9]{10}$/.test(code.trim())) {
      setServerError('Enter the 6-digit code from your authenticator app, or a backup code.');
      return;
    }
    setSubmitting(true);
    setServerError('');
    try {
      await verifyMfa({ challenge: mfa.challenge, code: code.trim(), remember: mfa.remember });
      navigate(from, { replace: true });
    } catch (error) {
      setServerError(getErrorMessage(error, 'Could not verify that code.'));
    } finally {
      setSubmitting(false);
    }
  }

  if (mfa) {
    return (
      <AuthLayout footer="Two-factor authentication protects your saved plans and assessments">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-forest-600">
          One more step
        </p>
        <h1 className="mt-2 text-3xl font-extrabold">Enter your verification code</h1>
        <p className="mt-2 text-sm text-muted">
          Open your authenticator app and enter the current 6-digit code. Backup codes also work.
        </p>

        <form onSubmit={handleMfaSubmit} noValidate className="card mt-6">
          {serverError ? <Alert type="error" className="mb-4">{serverError}</Alert> : null}
          <label htmlFor="mfa-code" className="label">
            Verification code
          </label>
          <div className="relative">
            <ShieldCheck
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-forest-600"
              aria-hidden="true"
            />
            <input
              id="mfa-code"
              className="input pl-10 tracking-[0.3em]"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              autoFocus
            />
          </div>

          <button type="submit" className="btn-primary mt-5 w-full" disabled={submitting}>
            {submitting ? (
              <>
                <Spinner className="h-4 w-4" /> Verifying...
              </>
            ) : (
              'Verify and sign in'
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setMfa(null);
              setCode('');
              setServerError('');
            }}
            className="btn-ghost btn-sm mt-3 w-full"
          >
            Use a different account
          </button>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout footer="Student project demo • Use sample credentials only">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-forest-600">
        Welcome back
      </p>
      <h1 className="mt-2 text-3xl font-extrabold">Log in to your account</h1>
      <p className="mt-2 text-sm text-muted">Continue planning for a safer, more prepared future.</p>

      <form onSubmit={handleSubmit} noValidate className="card mt-6">
        {serverError ? <Alert type="error" className="mb-4">{serverError}</Alert> : null}
        {location.state?.notice ? (
          <Alert type="success" className="mb-4">{location.state.notice}</Alert>
        ) : null}

        <div>
          <label htmlFor="email" className="label">
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className={`input ${errors.email ? 'border-red-300 ring-2 ring-red-100' : ''}`}
            value={form.email}
            onChange={(event) => update('email', event.target.value)}
            aria-invalid={Boolean(errors.email)}
          />
          {errors.email ? <p className="mt-1 text-xs text-red-600">{errors.email}</p> : null}
        </div>

        <div className="mt-4">
          <label htmlFor="password" className="label">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter your password"
              className={`input pr-14 ${errors.password ? 'border-red-300 ring-2 ring-red-100' : ''}`}
              value={form.password}
              onChange={(event) => update('password', event.target.value)}
              aria-invalid={Boolean(errors.password)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-forest-700"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password ? <p className="mt-1 text-xs text-red-600">{errors.password}</p> : null}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-line text-forest-600 focus:ring-forest-300"
              checked={form.remember}
              onChange={(event) => update('remember', event.target.checked)}
            />
            Remember me
          </label>
          <Link to="/forgot-password" className="text-xs font-semibold text-forest-700 hover:underline">
            Forgot password?
          </Link>
        </div>

        <button type="submit" className="btn-primary mt-6 w-full" disabled={submitting}>
          {submitting ? (
            <>
              <Spinner className="h-4 w-4" /> Signing in...
            </>
          ) : (
            'Log In'
          )}
        </button>

        <p className="mt-5 text-center text-xs text-muted">
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="font-semibold text-forest-700 hover:underline">
            Sign up
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

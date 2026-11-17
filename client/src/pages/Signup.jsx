import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Check, Eye, EyeOff } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
import { Alert, Spinner } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../api/client';
import { useSeo } from '../lib/seo';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function strengthOf(password) {
  if (!password) return { score: 0, label: 'Enter a password', color: 'bg-line' };
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 2) return { score: 33, label: 'Weak', color: 'bg-red-500' };
  if (score === 3) return { score: 66, label: 'Fair', color: 'bg-amber-400' };
  if (score === 4) return { score: 85, label: 'Good', color: 'bg-forest-500' };
  return { score: 100, label: 'Strong', color: 'bg-forest-600' };
}

export default function Signup() {
  useSeo({
    title: 'Create an Account',
    description:
      'Create a free account to save climate risk assessments, build a household adaptation plan and compare places.',
    path: '/signup',
    noIndex: true,
  });

  const { user, loading: sessionLoading, register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirm: '',
    terms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const strength = useMemo(() => strengthOf(form.password), [form.password]);

  if (!sessionLoading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setServerError('');
  }

  function validate() {
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Please enter your full name.';
    if (!form.email.trim()) next.email = 'Email address is required.';
    else if (!emailPattern.test(form.email.trim())) next.email = 'Enter a valid email address.';
    if (!form.password) next.password = 'Password is required.';
    else if (form.password.length < 8) next.password = 'Use at least 8 characters.';
    else if (!/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      next.password = 'Include at least one letter and one number.';
    }
    if (!form.confirm) next.confirm = 'Please confirm your password.';
    else if (form.confirm !== form.password) next.confirm = 'Passwords do not match.';
    if (!form.terms) next.terms = 'Please accept the terms to continue.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setServerError('');
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setServerError(getErrorMessage(error, 'Unable to create your account.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout footer="Your password is hashed with bcrypt before it is stored">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-forest-600">
        Get started
      </p>
      <h1 className="mt-2 text-3xl font-extrabold">Create your account</h1>
      <p className="mt-2 text-sm text-muted">Join us and start building your climate readiness plan.</p>

      <form onSubmit={handleSubmit} noValidate className="card mt-6">
        {serverError ? <Alert type="error" className="mb-4">{serverError}</Alert> : null}

        <div>
          <label htmlFor="name" className="label">
            Full name
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            placeholder="Your name"
            className={`input ${errors.name ? 'border-red-300 ring-2 ring-red-100' : ''}`}
            value={form.name}
            onChange={(event) => update('name', event.target.value)}
            aria-invalid={Boolean(errors.name)}
          />
          {errors.name ? <p className="mt-1 text-xs text-red-600">{errors.name}</p> : null}
        </div>

        <div className="mt-4">
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
              autoComplete="new-password"
              placeholder="Create a password"
              className={`input pr-12 ${errors.password ? 'border-red-300 ring-2 ring-red-100' : ''}`}
              value={form.password}
              onChange={(event) => update('password', event.target.value)}
              aria-invalid={Boolean(errors.password)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute inset-y-0 right-3 flex items-center text-forest-700"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-canvas">
              <div
                className={`h-full rounded-full transition-all ${strength.color}`}
                style={{ width: `${strength.score}%` }}
              />
            </div>
            <span className="w-10 text-right text-[11px] font-medium text-muted">{strength.label}</span>
          </div>
          <p className="mt-1 text-[11px] text-muted">
            At least 8 characters, with a letter and a number.
          </p>
          {errors.password ? <p className="mt-1 text-xs text-red-600">{errors.password}</p> : null}
        </div>

        <div className="mt-4">
          <label htmlFor="confirm" className="label">
            Confirm password
          </label>
          <input
            id="confirm"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Re-enter your password"
            className={`input ${errors.confirm ? 'border-red-300 ring-2 ring-red-100' : ''}`}
            value={form.confirm}
            onChange={(event) => update('confirm', event.target.value)}
            aria-invalid={Boolean(errors.confirm)}
          />
          {errors.confirm ? <p className="mt-1 text-xs text-red-600">{errors.confirm}</p> : null}
          {!errors.confirm && form.confirm && form.confirm === form.password ? (
            <p className="mt-1 flex items-center gap-1 text-xs text-forest-700">
              <Check className="h-3 w-3" /> Passwords match
            </p>
          ) : null}
        </div>

        <div className="mt-5">
          <label className="flex items-start gap-2 text-xs leading-relaxed text-muted">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-line text-forest-600 focus:ring-forest-300"
              checked={form.terms}
              onChange={(event) => update('terms', event.target.checked)}
              aria-invalid={Boolean(errors.terms)}
            />
            <span>
              I agree to use this student project for learning purposes only and understand that its
              risk scores are illustrative estimates, not official forecasts.
            </span>
          </label>
          {errors.terms ? <p className="mt-1 text-xs text-red-600">{errors.terms}</p> : null}
        </div>

        <button type="submit" className="btn-primary mt-6 w-full" disabled={submitting}>
          {submitting ? (
            <>
              <Spinner className="h-4 w-4" /> Creating account...
            </>
          ) : (
            'Create Account'
          )}
        </button>

        <p className="mt-5 text-center text-xs text-muted">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-forest-700 hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

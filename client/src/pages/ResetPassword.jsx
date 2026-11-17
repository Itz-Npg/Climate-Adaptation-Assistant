import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { Alert, Spinner } from '../components/ui';
import { authApi, getErrorMessage } from '../api/client';
import { useSeo } from '../lib/seo';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useSeo({
    title: 'Reset Password',
    description: 'Choose a new password for your Climate Adaptation Assistant account.',
    path: '/reset-password',
    noIndex: true,
  });

  async function handleSubmit(event) {
    event.preventDefault();
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Use at least 8 characters including a letter and a number.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await authApi.resetPassword({ token, password });
      navigate('/login', {
        replace: true,
        state: { notice: 'Password updated. Please sign in with your new password.' },
      });
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout footer="Choose a password you have not used elsewhere">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-forest-600">
        Account recovery
      </p>
      <h1 className="mt-2 text-3xl font-extrabold">Choose a new password</h1>
      <p className="mt-2 text-sm text-muted">Your reset link is valid for 30 minutes and can be used once.</p>

      <form onSubmit={handleSubmit} noValidate className="card mt-6">
        {!token ? (
          <Alert type="error">
            This link is missing its reset token. Request a new link from the{' '}
            <Link to="/forgot-password" className="font-semibold underline">
              forgot password
            </Link>{' '}
            page.
          </Alert>
        ) : null}
        {error ? <Alert type="error" className="mb-4">{error}</Alert> : null}

        <label htmlFor="password" className="label">
          New password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          className="input"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setError('');
          }}
          placeholder="At least 8 characters"
        />

        <label htmlFor="confirm" className="label mt-4">
          Confirm new password
        </label>
        <input
          id="confirm"
          type="password"
          autoComplete="new-password"
          className="input"
          value={confirm}
          onChange={(event) => {
            setConfirm(event.target.value);
            setError('');
          }}
          placeholder="Re-enter your password"
        />

        <button type="submit" className="btn-primary mt-5 w-full" disabled={submitting || !token}>
          {submitting ? (
            <>
              <Spinner className="h-4 w-4" /> Saving...
            </>
          ) : (
            'Update password'
          )}
        </button>
      </form>
    </AuthLayout>
  );
}

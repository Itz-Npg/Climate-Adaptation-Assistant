import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { Alert, Spinner } from '../components/ui';
import { authApi, getErrorMessage } from '../api/client';
import { useSeo } from '../lib/seo';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [resetUrl, setResetUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useSeo({
    title: 'Forgot Password',
    description: 'Request a password reset link for your Climate Adaptation Assistant account.',
    path: '/forgot-password',
    noIndex: true,
  });

  async function handleSubmit(event) {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    setSubmitting(true);
    setError('');
    setMessage('');
    try {
      const { data } = await authApi.forgotPassword({ email: email.trim().toLowerCase() });
      setMessage(data.message);
      if (data.resetUrl) setResetUrl(data.resetUrl);
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout footer="Reset links expire after 30 minutes">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-forest-600">
        Account help
      </p>
      <h1 className="mt-2 text-3xl font-extrabold">Reset your password</h1>
      <p className="mt-2 text-sm text-muted">
        Enter the email you signed up with and we will generate a one-time reset link.
      </p>

      <form onSubmit={handleSubmit} noValidate className="card mt-6">
        {error ? <Alert type="error" className="mb-4">{error}</Alert> : null}
        {message ? (
          <Alert type="success" className="mb-4">
            <span className="block">{message}</span>
            <span className="mt-1 block text-xs text-forest-800/80">
              This project has no email service configured, so the link is printed in the backend
              terminal. Open that link to set a new password.
            </span>
          </Alert>
        ) : null}
        {resetUrl ? (
          <p className="mb-4 break-all rounded-xl bg-canvas px-3 py-2 text-xs text-forest-700">
            Development link: <Link to={resetUrl.replace(/^https?:\/\/[^/]+/, '')} className="underline">{resetUrl}</Link>
          </p>
        ) : null}

        <label htmlFor="email" className="label">
          Email address
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          className="input"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setError('');
          }}
        />

        <button type="submit" className="btn-primary mt-5 w-full" disabled={submitting}>
          {submitting ? (
            <>
              <Spinner className="h-4 w-4" /> Generating link...
            </>
          ) : (
            'Send reset link'
          )}
        </button>

        <p className="mt-5 text-center text-xs text-muted">
          <Link to="/login" className="font-semibold text-forest-700 hover:underline">
            Back to login
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '@/components/Button';
import { apiFetch } from '@/lib/api';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 8000);

      try {
        const res = await apiFetch('/api/admin/session', {
          credentials: 'include',
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!cancelled && res.ok) {
          navigate('/admin', { replace: true });
        }
      } catch {
        if (!cancelled) {
          setError('Session check timed out. Please continue login.');
        }
      } finally {
        window.clearTimeout(timeoutId);
        if (!cancelled) setChecking(false);
      }
    }

    checkSession();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const handleLogin = async () => {
    setError('');
    setSuccess('');
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required');
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/admin/password-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Login failed');
      }

      navigate('/admin', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Unable to login');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return <div className="py-20 text-center">Checking admin session...</div>;
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-10">
      <div className="w-full max-w-md rounded-3xl border border-brand-border bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-brand-text">Admin Login</h1>
        <p className="mt-2 text-sm text-gray-500">Enter your admin credentials to access the admin panel.</p>

        <div className="mt-6 space-y-4">
          <div>
            <label htmlFor="admin-email" className="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@l3modz.com"
              className="w-full rounded-xl border border-brand-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>

          <div>
            <label htmlFor="admin-password" className="mb-1 block text-sm font-medium text-gray-700">Password</label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              className="w-full rounded-xl border border-brand-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>

          <Button type="button" fullWidth size="lg" disabled={loading} onClick={handleLogin}>
            {loading ? 'Please wait...' : 'Login'}
          </Button>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          {success && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{success}</p>}
        </div>

        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-brand-primary hover:underline">
            ← Back to Store
          </Link>
        </div>
      </div>
    </div>
  );
}
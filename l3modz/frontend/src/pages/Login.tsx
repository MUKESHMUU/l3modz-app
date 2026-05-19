import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '@/components/Button';
import { apiFetch } from '@/lib/api';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');

      window.dispatchEvent(new Event('l3-auth-changed'));
      toast.success('Logged in successfully');
      navigate('/profile');
    } catch (error: any) {
      toast.error(error.message || 'Unable to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-10">
      <div className="w-full max-w-md rounded-3xl border border-brand-border bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-brand-text">User Login</h1>
        <p className="mt-2 text-sm text-gray-500">Login to track orders and manage your account.</p>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          <input
            type="email"
            required
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            className="w-full rounded-xl border border-brand-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
          <input
            type="password"
            required
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            className="w-full rounded-xl border border-brand-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
          <Button type="submit" fullWidth size="lg" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-gray-500">
          New here? <Link to="/register" className="font-medium text-brand-primary hover:underline">Create account</Link>
        </p>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '@/components/Button';
import { apiFetch } from '@/lib/api';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await apiFetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Registration failed');

      window.dispatchEvent(new Event('l3-auth-changed'));
      toast.success('Account created successfully');
      navigate('/profile');
    } catch (error: any) {
      toast.error(error.message || 'Unable to register');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-10">
      <div className="w-full max-w-md rounded-3xl border border-brand-border bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-brand-text">Create Account</h1>
        <p className="mt-2 text-sm text-gray-500">Register to track old and new orders from your profile.</p>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          <input
            type="text"
            required
            placeholder="Full Name"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            className="w-full rounded-xl border border-brand-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
          <input
            type="email"
            required
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            className="w-full rounded-xl border border-brand-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
          <input
            type="tel"
            required
            placeholder="Phone Number"
            value={form.phone}
            onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
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
            {loading ? 'Creating account...' : 'Create Account'}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-gray-500">
          Already have an account? <Link to="/login" className="font-medium text-brand-primary hover:underline">Login</Link>
        </p>
      </div>
    </div>
  );
}

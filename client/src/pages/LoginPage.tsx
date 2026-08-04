import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/store/auth';

export function LoginPage({ mode: initial = 'login' }: { mode?: 'login' | 'register' }) {
  const [mode, setMode] = useState<'login' | 'register'>(initial);
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await register(form.email, form.password, form.name);
      navigate('/cuenta');
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="container-page flex justify-center py-16">
      <div className="card w-full max-w-md rounded-4xl p-8">
        <div className="mb-6 text-center">
          <span className="text-3xl">🐾</span>
          <h1 className="mt-2 font-display text-2xl font-bold text-ink">
            {mode === 'login' ? 'Bienvenido de nuevo' : 'Crea tu cuenta'}
          </h1>
          <p className="mt-1 text-sm text-brand-900/60">
            {mode === 'login' ? 'Accede para ver tus pedidos' : 'Únete a la manada Chacho'}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === 'register' && (
            <Input label="Nombre" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          )}
          <Input
            label={mode === 'login' ? 'Email o usuario' : 'Email'}
            type={mode === 'login' ? 'text' : 'email'}
            value={form.email}
            onChange={(v) => setForm({ ...form, email: v })}
            required
          />
          <Input label="Contraseña" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} required />

          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={busy} className="btn-primary w-full py-3">
            {busy ? 'Un momento…' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-brand-900/60">
          {mode === 'login' ? '¿Aún no tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); }}
            className="font-semibold text-brand-700 hover:text-brand-800"
          >
            {mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
          </button>
        </p>

        <p className="mt-4 rounded-xl bg-brand-100/60 px-3 py-2 text-center text-xs text-brand-800">
          Demo admin: <strong>daniel</strong> / <strong>Test1234</strong> · <Link to="/admin" className="underline">panel</Link>
        </p>
      </div>
    </div>
  );
}

function Input({
  label, value, onChange, type = 'text', required = false,
}: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-brand-900/70">{label}</span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-brand-900/10 bg-white px-4 py-2.5 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
      />
    </label>
  );
}

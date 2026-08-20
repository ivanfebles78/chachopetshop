import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Facebook, Instagram, Mail, MapPin, Phone } from 'lucide-react';
import { Reveal } from '@/components/Reveal';
import { toast } from '@/store/toast';
import { api } from '@/lib/api';

// ⚠️ Datos de ejemplo — edítalos con los reales de Chacho Pet Shop.
const INFO = {
  address: 'Calle Ejemplo, 1 · 38001 Santa Cruz de Tenerife',
  phone: '922 00 00 00',
  phoneHref: '+34922000000',
  email: 'hola@chachopetshop.com',
  hours: 'Lunes a viernes de 9:30 a 20:00 · Sábados de 10:00 a 14:00',
};

export function ContactoPage() {
  // `phone` es opcional y `website` es el cebo para robots: invisible para una
  // persona, así que si llega con algo, quien envía es automático.
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
    website: '',
  });
  const [accept, setAccept] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accept) {
      toast.error('Debes aceptar la política de privacidad.');
      return;
    }
    setBusy(true);
    try {
      await api.contact({ ...form, consent: accept });
      toast.success('¡Gracias! Hemos recibido tu mensaje, te responderemos pronto.');
      setForm({ name: '', email: '', phone: '', subject: '', message: '', website: '' });
      setAccept(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const field = (key: keyof typeof form, label: string, type = 'text') => (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-brand-900/70">{label}</span>
      <input
        type={type}
        required
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="w-full rounded-2xl border border-brand-900/10 bg-white px-4 py-2.5 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
      />
    </label>
  );

  return (
    <div className="container-page py-10">
      <div className="mb-8 max-w-2xl">
        <span className="chip border-sky-500/25 bg-sky-500/10 text-brand-700">Contacto</span>
        <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">Hablemos</h1>
        <p className="mt-3 text-lg text-brand-900/70">
          ¿Dudas sobre nutrición, un pedido o qué producto elegir? Escríbenos y te ayudamos.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        {/* Formulario */}
        <Reveal>
          <form onSubmit={submit} className="card space-y-4 rounded-4xl p-6 sm:p-8">
            <div className="grid gap-4 sm:grid-cols-2">
              {field('name', 'Nombre')}
              {field('email', 'Email', 'email')}
            </div>
            {field('phone', 'Teléfono (opcional)', 'tel')}
            {field('subject', 'Asunto')}

            {/*
              Cebo para robots. No se oculta con `display:none` —algunos lo
              detectan— sino sacándolo de la vista y del recorrido de teclado, y
              se marca `aria-hidden` para que un lector de pantalla lo ignore.
            */}
            <div className="absolute left-[-9999px]" aria-hidden="true">
              <label>
                No rellenar
                <input
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                />
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-brand-900/70">Mensaje</span>
              <textarea
                required
                rows={5}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="w-full resize-y rounded-2xl border border-brand-900/10 bg-white px-4 py-2.5 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              />
            </label>
            <label className="flex items-start gap-2 text-sm text-brand-900/70">
              <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-brand-900/20 text-brand-600 focus:ring-sky-500" />
              <span>He leído y acepto la <Link to="/privacidad" className="font-semibold text-brand-700 underline">política de privacidad</Link>.</span>
            </label>
            <button type="submit" disabled={busy} className="btn-primary w-full py-3.5 text-base">
              {busy ? 'Enviando…' : 'Enviar mensaje'}
            </button>
          </form>
        </Reveal>

        {/* Datos de contacto */}
        <Reveal delay={0.1}>
          <div className="space-y-4">
            <div className="card space-y-4 rounded-4xl p-6">
              <ContactRow icon={<MapPin className="h-5 w-5" />} title="Dirección" value={INFO.address} />
              <ContactRow icon={<Phone className="h-5 w-5" />} title="Teléfono" value={<a href={`tel:${INFO.phoneHref}`} className="hover:text-brand-700">{INFO.phone}</a>} />
              <ContactRow icon={<Mail className="h-5 w-5" />} title="Email" value={<a href={`mailto:${INFO.email}`} className="hover:text-brand-700">{INFO.email}</a>} />
              <ContactRow icon={<Clock className="h-5 w-5" />} title="Horario" value={INFO.hours} />
            </div>

            <div className="card flex items-center justify-between rounded-4xl p-6">
              <span className="font-semibold text-brand-900/80">Síguenos</span>
              <div className="flex gap-2">
                <a href="#" aria-label="Instagram" className="rounded-full border border-brand-900/10 p-2.5 text-brand-900/60 hover:bg-brand-50 hover:text-brand-700"><Instagram className="h-4 w-4" /></a>
                <a href="#" aria-label="Facebook" className="rounded-full border border-brand-900/10 p-2.5 text-brand-900/60 hover:bg-brand-50 hover:text-brand-700"><Facebook className="h-4 w-4" /></a>
              </div>
            </div>

            {/* Placeholder de mapa (edita con un embed real de Google Maps) */}
            <div className="relative flex h-44 items-center justify-center overflow-hidden rounded-4xl bg-brand-100 text-brand-700">
              <MapPin className="h-8 w-8" />
              <span className="absolute bottom-3 left-4 text-xs font-medium text-brand-700/70">Aquí puedes incrustar Google Maps</span>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

function ContactRow({ icon, title, value }: { icon: React.ReactNode; title: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">{icon}</div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-brand-900/40">{title}</p>
        <p className="text-brand-900/80">{value}</p>
      </div>
    </div>
  );
}

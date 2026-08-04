import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="container-page flex flex-col items-center gap-4 py-32 text-center">
      <span className="text-6xl">🐕‍🦺</span>
      <h1 className="font-display text-5xl font-extrabold text-brand-800">404</h1>
      <p className="max-w-sm text-brand-900/60">
        Vaya… este hueso no está enterrado aquí. La página que buscas no existe.
      </p>
      <Link to="/" className="btn-primary">Volver al inicio</Link>
    </div>
  );
}

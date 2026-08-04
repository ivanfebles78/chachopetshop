import { Component, type ReactNode } from 'react';

/** Captura errores de render para que la app no muestre una pantalla en blanco. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('ErrorBoundary:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="container-page flex flex-col items-center gap-4 py-32 text-center">
          <span className="text-5xl">🐾</span>
          <h1 className="font-display text-2xl font-bold text-ink">Vaya, algo se ha roto</h1>
          <p className="max-w-sm text-brand-900/60">Recarga la página para volver a intentarlo.</p>
          <button onClick={() => window.location.reload()} className="btn-primary">Recargar</button>
        </div>
      );
    }
    return this.props.children;
  }
}

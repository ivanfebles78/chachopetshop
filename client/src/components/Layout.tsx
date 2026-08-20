import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { CartDrawer } from './CartDrawer';
import { Toaster } from './Toaster';
import { ErrorBoundary } from './ErrorBoundary';

function ScrollToTop() {
  const { pathname } = useLocation();
  /*
   * Cuerpo con llaves, no forma abreviada.
   *
   * `useEffect(() => window.scrollTo(...))` DEVUELVE lo que devuelva
   * `scrollTo`, y React interpreta el valor de retorno de un efecto como su
   * función de limpieza. Al desmontar intentaba invocarlo y reventaba con
   * «destroy is not a function», tumbando la pantalla entera contra el límite
   * de error del router.
   *
   * No se veía en producción porque sólo se dispara con el doble montaje de
   * StrictMode, que es de desarrollo. Efecto real: cualquiera que trabajara en
   * el catálogo veía la aplicación caída y no podía distinguir su error del de
   * fondo.
   */
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);
  return null;
}

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <Navbar />
      <main className="flex-1">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
      <Footer />
      <CartDrawer />
      <Toaster />
    </div>
  );
}

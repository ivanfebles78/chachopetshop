import { createBrowserRouter } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { CatalogPage } from './pages/CatalogPage';
import { ProductPage } from './pages/ProductPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { CheckoutResultPage } from './pages/CheckoutResultPage';
import { LoginPage } from './pages/LoginPage';
import { AccountPage } from './pages/AccountPage';
import { AdminPage } from './pages/AdminPage';
import { NotFoundPage } from './pages/NotFoundPage';

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/tienda', element: <CatalogPage /> },
      { path: '/producto/:slug', element: <ProductPage /> },
      { path: '/checkout', element: <CheckoutPage /> },
      { path: '/checkout/success', element: <CheckoutResultPage kind="success" /> },
      { path: '/checkout/cancel', element: <CheckoutResultPage kind="cancel" /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/registro', element: <LoginPage mode="register" /> },
      { path: '/cuenta', element: <AccountPage /> },
      { path: '/admin', element: <AdminPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

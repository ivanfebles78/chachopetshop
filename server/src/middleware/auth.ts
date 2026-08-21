import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../env.js';

export type AuthUser = { id: string; email: string; role: 'CUSTOMER' | 'ADMIN' };

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
      /**
       * Había cookie de sesión, pero no se pudo verificar: caducada, manipulada,
       * o firmada con un `JWT_SECRET` anterior a una rotación.
       *
       * NO es lo mismo que no traer cookie. Confundir las dos cosas es lo que
       * hizo que un cliente que se creía dentro comprara como invitado y su
       * pedido acabara sin dueño.
       */
      sesionInvalida?: boolean;
    }
  }
}

export function signToken(user: AuthUser): string {
  return jwt.sign(user, env.JWT_SECRET, { expiresIn: '7d' });
}

/** Lee el token de la cookie `token` o del header Authorization: Bearer. */
function readToken(req: Request): string | null {
  const cookieToken = (req as Request & { cookies?: Record<string, string> }).cookies?.token;
  if (cookieToken) return cookieToken;
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return null;
}

/**
 * Adjunta `req.user` si hay un token válido. No bloquea: navegar tiene que
 * seguir funcionando aunque la sesión esté rota.
 *
 * Lo que sí hace es DEJAR CONSTANCIA de que la cookie existía y no valía, para
 * que las rutas donde la identidad determina el resultado puedan negarse en
 * lugar de tratar al cliente como un invitado que nunca dijo ser.
 */
export function attachUser(req: Request, _res: Response, next: NextFunction): void {
  const token = readToken(req);
  if (token) {
    try {
      req.user = jwt.verify(token, env.JWT_SECRET) as AuthUser;
    } catch {
      req.sesionInvalida = true;
    }
  }
  next();
}

/**
 * Corta cuando la sesión está rota, en lugar de continuar como anónimo.
 *
 * Se monta SÓLO donde la identidad cambia el resultado —hoy, el checkout—. En
 * el catálogo sería peor que el defecto: una cookie vieja dejaría a alguien sin
 * poder ni mirar la tienda.
 *
 * Además borra la cookie: si no, el navegador seguiría mandándola en cada
 * petición y el cliente se quedaría atrapado en el mismo error hasta que la
 * borrase a mano.
 */
export function rejectBrokenSession(req: Request, res: Response, next: NextFunction): void {
  if (req.sesionInvalida) {
    res.clearCookie('token', { path: '/' });
    res.status(401).json({
      error: 'Tu sesión ha caducado. Vuelve a iniciar sesión para completar la compra.',
    });
    return;
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'No autenticado' });
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Acceso restringido' });
    return;
  }
  next();
}

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../db.js';
import { isProd } from '../env.js';
import { signToken, requireAuth, type AuthUser } from '../middleware/auth.js';

export const authRouter = Router();

const cookieOpts = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: isProd,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

// Registro: exige email válido. Login: acepta email o nombre de usuario.
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  name: z.string().min(1).optional(),
});
const loginSchema = z.object({
  email: z.string().min(1, 'Introduce tu email o usuario'),
  password: z.string().min(1, 'Introduce tu contraseña'),
});

authRouter.post('/register', async (req, res, next) => {
  try {
    const { email, password, name } = registerSchema.parse(req.body);
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ error: 'Ese email ya está registrado' });

    const user = await prisma.user.create({
      data: { email, name, passwordHash: await bcrypt.hash(password, 10) },
    });
    const payload: AuthUser = { id: user.id, email: user.email, role: user.role };
    res.cookie('token', signToken(payload), cookieOpts).json({ user: payload });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }
    const payload: AuthUser = { id: user.id, email: user.email, role: user.role };
    res.cookie('token', signToken(payload), cookieOpts).json({ user: payload });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/logout', (_req, res) => {
  res.clearCookie('token', { path: '/' }).json({ ok: true });
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { sendContactEmail } from '../lib/mailer.js';

export const contactRouter = Router();

const body = z.object({
  name: z.string().min(1, 'Indica tu nombre').max(120),
  email: z.string().email('Email no válido'),
  subject: z.string().min(1, 'Indica un asunto').max(160),
  message: z.string().min(1, 'Escribe tu mensaje').max(4000),
});

/** POST /api/contact — guarda el mensaje y (si hay SMTP) lo envía por email. */
contactRouter.post('/', async (req, res, next) => {
  try {
    const data = body.parse(req.body);
    const saved = await prisma.contactMessage.create({ data });
    // El email es best-effort: si falla, el mensaje ya está guardado en la BD.
    sendContactEmail(data).catch((err) => console.error('Envío de email de contacto falló:', err));
    res.status(201).json({ ok: true, id: saved.id });
  } catch (err) {
    next(err);
  }
});

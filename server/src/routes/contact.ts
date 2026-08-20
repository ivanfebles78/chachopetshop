import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { sendContactEmail } from '../lib/mailer.js';

export const contactRouter = Router();

/**
 * Rechaza saltos de línea en las cabeceras.
 *
 * El nombre y el asunto acaban dentro de una cabecera del correo (`subject`,
 * `replyTo`). Un `\r\n` ahí permite inyectar cabeceras nuevas —un `Bcc:`, por
 * ejemplo— y convertir el formulario en un relé de spam que envía desde nuestro
 * dominio. Se limpia aquí, en el borde, y no en el mailer: cuanto antes se
 * rechace, menos sitios hay que recordar.
 */
const sinSaltos = (campo: string) =>
  z
    .string()
    .refine((v) => !/[\r\n]/.test(v), `El campo ${campo} no puede contener saltos de línea`);

const body = z.object({
  name: sinSaltos('nombre').pipe(z.string().min(1, 'Indica tu nombre').max(120)),
  email: z.string().email('Email no válido').max(200),
  // Opcional: el negocio no exige teléfono para poder escribir.
  phone: sinSaltos('teléfono').pipe(z.string().max(30)).optional().or(z.literal('')),
  subject: sinSaltos('asunto').pipe(z.string().min(1, 'Indica un asunto').max(160)),
  message: z.string().min(1, 'Escribe tu mensaje').max(4000),
  /*
   * Consentimiento expreso. El RGPD lo exige para tratar los datos de contacto,
   * y tiene que ser un acto afirmativo: por eso se comprueba `=== true` y no
   * simplemente que el campo venga.
   */
  consent: z.literal(true, {
    errorMap: () => ({ message: 'Debes aceptar la política de privacidad' }),
  }),
  /*
   * Trampa para robots. Es un campo que una persona nunca ve ni rellena; si
   * llega con contenido, quien envía es automático. Se responde 201 igualmente
   * para no enseñarle al robot que ha sido detectado, pero no se guarda nada.
   */
  website: z.string().max(200).optional(),
});

/** POST /api/contact — guarda el mensaje y, si hay SMTP, lo envía por email. */
contactRouter.post('/', async (req, res, next) => {
  try {
    const datos = body.parse(req.body);

    if (datos.website) {
      return res.status(201).json({ ok: true });
    }

    const guardado = await prisma.contactMessage.create({
      data: {
        name: datos.name,
        email: datos.email,
        subject: datos.subject,
        // El teléfono no tiene columna propia todavía: se antepone al mensaje
        // para no perderlo. Ver el informe: añadir la columna es trabajo de otra
        // fase y una migración no urgente.
        message: datos.phone ? `Teléfono: ${datos.phone}\n\n${datos.message}` : datos.message,
      },
    });

    /*
     * El correo es best-effort y se queda como estaba: el mensaje ya está en la
     * base de datos y se lee desde el panel, así que un SMTP caído no puede
     * hacer que se pierda lo que alguien escribió.
     */
    sendContactEmail({
      name: datos.name,
      email: datos.email,
      subject: datos.subject,
      message: datos.message,
    }).catch((err) => console.error('Envío del email de contacto falló:', err));

    res.status(201).json({ ok: true, id: guardado.id });
  } catch (err) {
    next(err);
  }
});
